import { PomodoroSession } from '../models/PomodoroSession.js';
import { cancelSessionNotification } from './notificationService.js';

/**
 * Calculates genuine elapsed focus seconds for a session document.
 * - Uses intervals array if available and populated.
 * - Otherwise uses persisted `actualSeconds` or `accumulatedFocusDuration`.
 * - Otherwise uses `actualMinutes * 60` if recorded.
 * - For older legacy completed sessions without `actualMinutes`/`actualSeconds`, uses `durationMinutes * 60`.
 * - For partial/interrupted sessions without verified time, returns 0 (never assumes planned duration).
 */
export function calculateSessionFocusSeconds(s) {
  if (!s) return 0;

  // 1. Calculate from active intervals if intervals array is available and populated
  if (Array.isArray(s.intervals) && s.intervals.length > 0) {
    let intervalTotal = 0;
    for (const interval of s.intervals) {
      if (typeof interval.durationSeconds === 'number' && interval.durationSeconds > 0) {
        intervalTotal += interval.durationSeconds;
      } else if (interval.startedAt && interval.endedAt) {
        const diff = Math.max(0, Math.round((new Date(interval.endedAt).getTime() - new Date(interval.startedAt).getTime()) / 1000));
        intervalTotal += diff;
      }
    }
    if (intervalTotal > 0) {
      return intervalTotal;
    }
  }

  // 2. Direct persisted actual seconds / accumulatedFocusDuration
  if (typeof s.actualSeconds === 'number' && s.actualSeconds > 0) {
    return s.actualSeconds;
  }
  if (typeof s.accumulatedFocusDuration === 'number' && s.accumulatedFocusDuration > 0) {
    return s.accumulatedFocusDuration;
  }
  if (typeof s.accumulatedSeconds === 'number' && s.accumulatedSeconds > 0) {
    return s.accumulatedSeconds;
  }

  // 3. Fallback to actualMinutes
  if (typeof s.actualMinutes === 'number' && s.actualMinutes > 0) {
    return Math.round(s.actualMinutes * 60);
  }

  // 4. Completed legacy sessions fallback
  if (s.status === 'completed' && typeof s.durationMinutes === 'number' && s.durationMinutes > 0) {
    return s.durationMinutes * 60;
  }

  return 0;
}

/**
 * Calculates genuine elapsed focus minutes for a session document.
 */
export function calculateSessionFocusMinutes(s) {
  const secs = calculateSessionFocusSeconds(s);
  return Math.round((secs / 60) * 10) / 10;
}

/**
 * Cleans up sessions older than 48 hours for uncompleted sessions.
 * CRITICAL RULE: Completed historical sessions (status === 'completed') are NEVER expired or deleted.
 */
export async function expireStaleRecoverySessions(userId = null) {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const filter = {
      status: { $in: ['in-progress', 'paused', 'interrupted'] },
      $or: [
        { expiresAt: { $ne: null, $lt: new Date() } },
        { lastHeartbeatAt: { $lt: fortyEightHoursAgo } },
        { lastHeartbeatAt: null, updatedAt: { $lt: fortyEightHoursAgo } },
      ],
    };
    if (userId) filter.userId = userId;

    const staleSessions = await PomodoroSession.find(filter);
    for (const session of staleSessions) {
      session.status = 'expired';
      session.activeSegmentStart = null;
      session.expectedEndTime = null;
      session.lastUpdatedAt = new Date();
      cancelSessionNotification(session._id);
      await session.save();
    }
  } catch (err) {
    console.warn('[FocusTimeHelper] Error expiring stale recovery sessions:', err.message);
  }
}

/**
 * Reconciles any orphaned in-progress sessions for a user.
 * Preserves active focus time verified through heartbeat or active segment timestamps.
 * Retains recovery data for 48 hours in 'paused' status so the user can resume.
 * Does NOT invent missing time.
 */
export async function reconcileOrphanedSessions(userId) {
  try {
    // 1. Expire uncompleted sessions older than 48 hours
    await expireStaleRecoverySessions(userId);

    // 2. Reconcile in-progress sessions that missed heartbeats (> 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const orphaned = await PomodoroSession.find({
      userId,
      status: 'in-progress',
      $or: [
        { lastHeartbeatAt: { $lt: twoMinutesAgo } },
        { lastHeartbeatAt: null, updatedAt: { $lt: twoMinutesAgo } },
      ],
    });

    for (const session of orphaned) {
      const referenceEnd = session.lastHeartbeatAt || session.updatedAt || session.activeSegmentStart || new Date();

      if (session.activeSegmentStart) {
        const elapsedSinceSegment = Math.max(
          0,
          Math.round((new Date(referenceEnd).getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
        );
        const maxAllowed = Math.max(0, (session.durationMinutes * 60) - (session.accumulatedSeconds || 0));
        const verifiedSegment = Math.min(elapsedSinceSegment, maxAllowed);

        session.accumulatedSeconds = (session.accumulatedSeconds || 0) + verifiedSegment;
        session.actualSeconds = Math.max(session.actualSeconds || 0, session.accumulatedSeconds);
        session.accumulatedFocusDuration = session.actualSeconds;
        session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
        session.activeSegmentStart = null;
      }

      // Close open interval in intervals array if present
      if (Array.isArray(session.intervals) && session.intervals.length > 0) {
        const lastInterval = session.intervals[session.intervals.length - 1];
        if (!lastInterval.endedAt) {
          lastInterval.endedAt = referenceEnd;
          lastInterval.durationSeconds = Math.max(
            0,
            Math.round((new Date(referenceEnd).getTime() - new Date(lastInterval.startedAt).getTime()) / 1000)
          );
        }
      }

      // Mark as paused with 48h recovery retention
      session.status = 'paused';
      session.isInterrupted = true;
      session.pausedAt = referenceEnd;
      session.lastUpdatedAt = new Date();
      session.expiresAt = new Date(new Date(referenceEnd).getTime() + 48 * 60 * 60 * 1000);
      session.expectedEndTime = null;
      cancelSessionNotification(session._id);

      await session.save();
    }
  } catch (err) {
    console.warn('[FocusTimeHelper] Error reconciling sessions for user:', userId, err.message);
  }
}

/**
 * Reconciles orphaned sessions across all users (for global leaderboard and scheduler consistency).
 */
export async function reconcileAllOrphanedSessions() {
  try {
    await expireStaleRecoverySessions(null);

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const orphaned = await PomodoroSession.find({
      status: 'in-progress',
      $or: [
        { lastHeartbeatAt: { $lt: twoMinutesAgo } },
        { lastHeartbeatAt: null, updatedAt: { $lt: twoMinutesAgo } },
      ],
    });

    for (const session of orphaned) {
      const referenceEnd = session.lastHeartbeatAt || session.updatedAt || session.activeSegmentStart || new Date();

      if (session.activeSegmentStart) {
        const elapsedSinceSegment = Math.max(
          0,
          Math.round((new Date(referenceEnd).getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
        );
        const maxAllowed = Math.max(0, (session.durationMinutes * 60) - (session.accumulatedSeconds || 0));
        const verifiedSegment = Math.min(elapsedSinceSegment, maxAllowed);

        session.accumulatedSeconds = (session.accumulatedSeconds || 0) + verifiedSegment;
        session.actualSeconds = Math.max(session.actualSeconds || 0, session.accumulatedSeconds);
        session.accumulatedFocusDuration = session.actualSeconds;
        session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
        session.activeSegmentStart = null;
      }

      if (Array.isArray(session.intervals) && session.intervals.length > 0) {
        const lastInterval = session.intervals[session.intervals.length - 1];
        if (!lastInterval.endedAt) {
          lastInterval.endedAt = referenceEnd;
          lastInterval.durationSeconds = Math.max(
            0,
            Math.round((new Date(referenceEnd).getTime() - new Date(lastInterval.startedAt).getTime()) / 1000)
          );
        }
      }

      session.status = 'paused';
      session.isInterrupted = true;
      session.pausedAt = referenceEnd;
      session.lastUpdatedAt = new Date();
      session.expiresAt = new Date(new Date(referenceEnd).getTime() + 48 * 60 * 60 * 1000);
      session.expectedEndTime = null;
      cancelSessionNotification(session._id);

      await session.save();
    }
  } catch (err) {
    console.warn('[FocusTimeHelper] Error reconciling all sessions:', err.message);
  }
}
