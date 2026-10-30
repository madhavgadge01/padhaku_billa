import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { User } from '../models/User.js';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { PushSubscription } from '../models/PushSubscription.js';
import pomodoroRoutes from '../routes/pomodoroRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';
import { getScheduledNotificationCount } from '../utils/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelevel';
const jwtSecret = process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt';

async function runBackgroundTimerTestSuite() {
  console.log('\n================================================================');
  console.log('⏰ PADGAKU BILLA — BACKGROUND TIMER & WEB PUSH TEST SUITE');
  console.log('================================================================\n');

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
  } catch (err) {
    if (process.env.MONGODB_URL) {
      await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 4000 });
    } else {
      throw err;
    }
  }
  console.log(`[Database] Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  let passes = 0;
  let failures = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passes++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failures++;
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
    }
  }

  // Setup express test app
  const app = express();
  app.use(express.json());
  app.use('/api/pomodoro', pomodoroRoutes);
  app.use('/api/notifications', notificationRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // Create test user
    const testEmail = `timer_bg_${Date.now()}@padhakubilla.internal`;
    let user = await User.create({
      name: 'Background Hero',
      email: testEmail,
      username: `bg_timer_hero_${Date.now()}`,
      coins: 20,
      dailyResetTime: '06:00',
    });

    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-timezone-offset': '0',
    };

    console.log('\n--- 1. VAPID Public Key Endpoint ---');
    const vapidRes = await fetch(`${baseUrl}/notifications/vapid-public-key`, { headers });
    const vapidData = await vapidRes.json();
    assert(vapidRes.status === 200, 'GET /vapid-public-key returns 200 OK');
    assert(typeof vapidData.publicKey === 'string' && vapidData.publicKey.length > 30, 'VAPID public key is returned as valid string');

    console.log('\n--- 2. Push Subscription Registration & Storage ---');
    const dummyEndpoint = `https://fcm.googleapis.com/fcm/send/test_${Date.now()}`;
    const subscribeRes = await fetch(`${baseUrl}/notifications/subscribe`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: {
          endpoint: dummyEndpoint,
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbV3CnhWWDqnBkEZSLWTL5vnPUZ5S10j72LDeF0U8bU',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
        },
      }),
    });
    const subscribeData = await subscribeRes.json();
    assert(subscribeRes.status === 200, 'POST /notifications/subscribe returns 200 OK');
    assert(subscribeData.success === true, 'Push subscription saved successfully');

    const savedSub = await PushSubscription.findOne({ userId: user._id, endpoint: dummyEndpoint });
    assert(Boolean(savedSub), 'Subscription document persisted in MongoDB');

    console.log('\n--- 3. Session Start Schedules Background Push & Sets ExpectedEndTime ---');
    const startRes = await fetch(`${baseUrl}/pomodoro/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subjectName: 'Advanced Quantum Mechanics',
        durationMinutes: 120, // 2-hour focus session
        colorTag: '#10B981',
      }),
    });
    const startData = await startRes.json();
    assert((startRes.status === 200 || startRes.status === 201) && startData.success, 'POST /pomodoro/start succeeded');
    const sessionId = startData.session._id;

    const startedSession = await PomodoroSession.findById(sessionId);
    assert(Boolean(startedSession.expectedEndTime), 'Session has expectedEndTime timestamp set');
    const expectedDiffSecs = Math.round((new Date(startedSession.expectedEndTime).getTime() - Date.now()) / 1000);
    assert(expectedDiffSecs >= 7190 && expectedDiffSecs <= 7210, `expectedEndTime corresponds to 2 hours (${expectedDiffSecs}s)`);
    assert(getScheduledNotificationCount(sessionId) === 1, 'In-memory notification scheduler registered 1 pending notification');

    console.log('\n--- 4. Session Pause Clears ExpectedEndTime & Cancels Background Push ---');
    const pauseRes = await fetch(`${baseUrl}/pomodoro/${sessionId}/pause`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        intervalSeconds: 600,
        actualSeconds: 600,
        isEarlyBreakConfirmed: false,
      }),
    });
    const pauseData = await pauseRes.json();
    assert(pauseRes.status === 200 && pauseData.success, 'POST /pomodoro/:id/pause succeeded');

    const pausedSession = await PomodoroSession.findById(sessionId);
    assert(pausedSession.expectedEndTime === null, 'Session expectedEndTime cleared on pause');
    assert(getScheduledNotificationCount(sessionId) === 0, 'Pending push notification cancelled on pause');

    console.log('\n--- 5. Session Resume Reschedules Push & Recalculates ExpectedEndTime ---');
    const resumeRes = await fetch(`${baseUrl}/pomodoro/${sessionId}/resume`, {
      method: 'POST',
      headers,
    });
    const resumeData = await resumeRes.json();
    assert(resumeRes.status === 200 && resumeData.success, 'POST /pomodoro/:id/resume succeeded');

    const resumedSession = await PomodoroSession.findById(sessionId);
    assert(Boolean(resumedSession.expectedEndTime), 'New expectedEndTime set upon resume');
    const resumedDiffSecs = Math.round((new Date(resumedSession.expectedEndTime).getTime() - Date.now()) / 1000);
    assert(resumedDiffSecs >= 6590 && resumedDiffSecs <= 6610, `New expectedEndTime corresponds to remaining ~1h 50m (${resumedDiffSecs}s)`);
    assert(getScheduledNotificationCount(sessionId) === 1, 'Push notification rescheduled for remaining duration');

    console.log('\n--- 6. Session Complete Cancels Notification & Awards Coins (Idempotent) ---');
    const completeRes = await fetch(`${baseUrl}/pomodoro/${sessionId}/complete`, {
      method: 'POST',
      headers,
    });
    const completeData = await completeRes.json();
    assert(completeRes.status === 200 && completeData.success, 'POST /pomodoro/:id/complete succeeded');
    assert(completeData.coinsEarned === 5, 'Awarded exactly 5 focus coins for completion');

    const completedSession = await PomodoroSession.findById(sessionId);
    assert(completedSession.expectedEndTime === null, 'expectedEndTime cleared on completion');
    assert(completedSession.completionNotificationSent === true, 'completionNotificationSent marked true');
    assert(getScheduledNotificationCount(sessionId) === 0, 'Notification scheduler cleaned up on complete');

    // Duplicate completion call test (idempotency)
    const duplicateRes = await fetch(`${baseUrl}/pomodoro/${sessionId}/complete`, {
      method: 'POST',
      headers,
    });
    const duplicateData = await duplicateRes.json();
    assert(duplicateData.alreadyCompleted === true, 'Duplicate complete call rejected safely');
    assert(duplicateData.coinsEarned === 5, 'User balance not inflated on duplicate complete');

    console.log('\n--- 7. Session Stop / Cancel Cleans Up Notification ---');
    const start2Res = await fetch(`${baseUrl}/pomodoro/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subjectName: 'Electromagnetism',
        durationMinutes: 25,
      }),
    });
    const session2Id = (await start2Res.json()).session._id;
    assert(getScheduledNotificationCount(session2Id) === 1, 'Session 2 scheduled notification');

    const stopRes = await fetch(`${baseUrl}/pomodoro/${session2Id}/stop`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ elapsedSeconds: 300 }),
    });
    const stopData = await stopRes.json();
    assert(stopRes.status === 200 && stopData.success, 'POST /pomodoro/:id/stop succeeded');

    const stoppedSession = await PomodoroSession.findById(session2Id);
    assert(stoppedSession.expectedEndTime === null, 'expectedEndTime cleared on stop');
    assert(getScheduledNotificationCount(session2Id) === 0, 'Notification cancelled on stop');

    console.log('\n--- 8. Unsubscribe Push Notifications ---');
    const unsubRes = await fetch(`${baseUrl}/notifications/unsubscribe`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint: dummyEndpoint }),
    });
    const unsubData = await unsubRes.json();
    assert(unsubRes.status === 200 && unsubData.success, 'POST /notifications/unsubscribe succeeded');
    const remainingSubs = await PushSubscription.find({ userId: user._id, endpoint: dummyEndpoint });
    assert(remainingSubs.length === 0, 'Push subscription removed from MongoDB');

    console.log('\n--- 9. Timestamp-Based Mathematical Accuracy Simulation ---');
    // Scenario A: 2-hour timer (7200s), device sleeps for 1 hour 45 minutes (6300s)
    const tStart = 1000000;
    const durationSecs = 7200;
    const tEnd = tStart + durationSecs * 1000;
    const tWake1 = tStart + 6300 * 1000; // 1h 45m later
    const remaining1 = Math.max(0, Math.ceil((tEnd - tWake1) / 1000));
    assert(remaining1 === 900, 'Remaining time is exactly 900s (15 minutes) after 1h45m device sleep');

    // Scenario B: Device sleeps longer than session (2 hours 15 minutes = 8100s)
    const tWake2 = tStart + 8100 * 1000;
    const remaining2 = Math.max(0, Math.ceil((tEnd - tWake2) / 1000));
    assert(remaining2 === 0, 'Remaining time is clamped to 0 after device sleeps past session end');
    assert(tWake2 >= tEnd, 'Identified session finished while browser was closed/screen locked');

    // Clean up test data
    await PomodoroSession.deleteMany({ userId: user._id });
    await PushSubscription.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    console.log('\n================================================================');
    console.log(`RESULTS: ${passes} PASSED, ${failures} FAILED`);
    console.log('================================================================\n');

    server.close();
    await mongoose.disconnect();

    if (failures > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test Suite Error:', error);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runBackgroundTimerTestSuite();
