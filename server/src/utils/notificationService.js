import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';
import { PomodoroSession } from '../models/PomodoroSession.js';

let isVapidConfigured = false;

// Configure VAPID details on startup
export function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:madhvagadge03@gmail.com';

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      isVapidConfigured = true;
      console.log('[Notification Service] Web Push VAPID initialized successfully.');
    } catch (err) {
      console.error('[Notification Service] VAPID initialization failed:', err.message);
    }
  } else {
    console.warn('[Notification Service] VAPID keys not configured in environment.');
  }
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}

// Map for active in-memory timer jobs: sessionId -> TimeoutId
const scheduledJobs = new Map();

/**
 * Send push notification to all devices registered by a user
 */
export async function sendPushToUser(userId, payload) {
  if (!isVapidConfigured) {
    initVapid();
    if (!isVapidConfigured) return { sentCount: 0, failedCount: 0 };
  }

  const subscriptions = await PushSubscription.find({ userId });
  if (!subscriptions || subscriptions.length === 0) {
    return { sentCount: 0, failedCount: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;

  const notificationPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, notificationPayload);
      sentCount++;
    } catch (err) {
      failedCount++;
      // If subscription has expired or unsubscribed, remove from DB
      if (err.statusCode === 404 || err.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        console.log(`[Notification Service] Removed expired subscription ${sub._id}`);
      } else {
        console.warn(`[Notification Service] Push delivery warning for ${sub._id}:`, err.message);
      }
    }
  }

  return { sentCount, failedCount };
}

/**
 * Schedule session completion notification for a specific expected end time
 */
export async function scheduleSessionNotification(sessionId, userId, taskName, completionDate) {
  const sessionDocId = sessionId.toString();

  // Cancel any existing job for this session
  cancelSessionNotification(sessionDocId);

  const now = Date.now();
  const targetMs = new Date(completionDate).getTime();
  const delay = Math.max(0, targetMs - now);

  const triggerNotification = async () => {
    scheduledJobs.delete(sessionDocId);
    try {
      const session = await PomodoroSession.findById(sessionId);
      if (!session || session.status !== 'in-progress' || session.completionNotificationSent) {
        return;
      }

      await sendPushToUser(userId, {
        title: 'Focus Quest Complete! ⏰',
        body: `Time is up! You finished your goal for "${taskName}". Come claim your coins!`,
        icon: '/favicon.svg',
        tag: `session-complete-${sessionDocId}`,
        url: '/focus',
      });

      await PomodoroSession.updateOne(
        { _id: sessionId },
        { $set: { completionNotificationSent: true } }
      ).catch(() => {});

      console.log(`[Notification Service] Dispatched scheduled completion for session ${sessionDocId}`);
    } catch (err) {
      console.error(`[Notification Service] Error dispatching notification for ${sessionDocId}:`, err);
    }
  };

  if (delay <= 1000) {
    // If delay is <= 1s, run immediately
    triggerNotification();
  } else {
    // Schedule timeout immediately
    const timer = setTimeout(triggerNotification, delay);
    scheduledJobs.set(sessionDocId, timer);
    console.log(`[Notification Service] Scheduled notification for session ${sessionDocId} in ${Math.round(delay / 1000)}s`);
  }

  // Update DB record with expected end timestamp
  await PomodoroSession.updateOne(
    { _id: sessionId },
    { $set: { expectedEndTime: completionDate, completionNotificationSent: false } }
  ).catch(() => {});
}

/**
 * Cancel scheduled session notification (e.g. on pause, cancel, or completion)
 */
export function cancelSessionNotification(sessionId) {
  const sessionDocId = sessionId.toString();
  if (scheduledJobs.has(sessionDocId)) {
    clearTimeout(scheduledJobs.get(sessionDocId));
    scheduledJobs.delete(sessionDocId);
    console.log(`[Notification Service] Cancelled notification job for session ${sessionDocId}`);
  }
}

/**
 * Return scheduled notification count for a session or total
 */
export function getScheduledNotificationCount(sessionId) {
  if (sessionId) {
    return scheduledJobs.has(sessionId.toString()) ? 1 : 0;
  }
  return scheduledJobs.size;
}

/**
 * Background watchdog loop (every 10s):
 * Reconciles overdue in-progress sessions in case the server restarted or timeouts lapsed.
 */
let watchdogInterval = null;
export function startNotificationWatchdog() {
  if (watchdogInterval) return;

  initVapid();

  watchdogInterval = setInterval(async () => {
    try {
      const now = new Date();
      const overdueSessions = await PomodoroSession.find({
        status: 'in-progress',
        expectedEndTime: { $ne: null, $lte: now },
        completionNotificationSent: false,
      }).limit(20);

      for (const session of overdueSessions) {
        await sendPushToUser(session.userId, {
          title: 'Focus Quest Complete! ⏰',
          body: `Time is up! You finished your goal for "${session.taskName}". Open Padhaku Billa to collect your reward!`,
          icon: '/favicon.svg',
          tag: `session-complete-${session._id}`,
          url: '/focus',
        });

        session.completionNotificationSent = true;
        await session.save().catch(() => {});
        console.log(`[Notification Watchdog] Dispatched overdue notification for session ${session._id}`);
      }
    } catch (err) {
      // Quiet watchdog error catch
    }
  }, 10000);
}
