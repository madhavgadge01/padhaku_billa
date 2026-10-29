import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import { PomodoroSession } from '../models/PomodoroSession.js';
import pomodoroRoutes from '../routes/pomodoroRoutes.js';
import analyticsRoutes from '../routes/analyticsRoutes.js';
import leaderboardRoutes from '../routes/leaderboardRoutes.js';
import taskRoutes from '../routes/taskRoutes.js';
import { getStudyDayDate, getStudyDayKey, getWeekdayDateStr } from '../utils/streakEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localMongoUri = 'mongodb://127.0.0.1:27017/lifelevel';
const remoteMongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL || localMongoUri;
const jwtSecret = process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt';

async function runTest() {
  console.log('\n================================================================');
  console.log('🛡️  LIFELEVEL DAILY QUESTS, COIN RULES & ACTUAL FOCUS TEST SUITE');
  console.log('================================================================\n');

  try {
    await mongoose.connect(localMongoUri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    console.log('[Database] Local MongoDB unavailable, attempting remote URI...');
    await mongoose.connect(remoteMongoUri, { serverSelectionTimeoutMS: 5000 });
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
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/tasks', taskRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[Test Server] Listening on ${baseUrl}`);

  try {
    const testEmail = `test_daily_focus_${Date.now()}@example.com`;
    let user = await User.create({
      email: testEmail,
      name: 'Focus Hero',
      passwordHash: 'dummy_hashed_password_123',
      coins: 50,
      dailyResetTime: '06:00',
      streaks: {
        currentGlobalStreak: 0,
        bestGlobalStreak: 0,
        completedDates: [],
      },
      weeklyTimetable: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
    });

    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '7d' });
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    console.log('\n--- 1. DAILY FOCUS QUESTS: REPEAT-BY-DEFAULT ---');
    // Test 1.1: Create task with repeatDaily: true (default)
    const resCreateDaily = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Quantum Physics',
        durationMinutes: 45,
        colorTag: '#3B82F6',
        repeatDaily: true,
      }),
    }).then((r) => r.json());

    assert(resCreateDaily.success === true, 'Task created with repeatDaily: true succeeds');
    assert(resCreateDaily.task.repeatDaily === true, 'Created task object has repeatDaily: true');
    assert(resCreateDaily.isDaily === true, 'API response marks isDaily: true');

    // Verify all 7 days in timetable received this subject with shared id
    const sharedId = resCreateDaily.task._id;
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const allDaysHaveIt = weekdays.every((d) => {
      const list = resCreateDaily.timetable?.[d] || [];
      return list.some((s) => s.id === sharedId && s.name === 'Quantum Physics' && s.color === '#3B82F6');
    });
    assert(allDaysHaveIt, 'Subject scheduled across all 7 days with shared ID and color');

    // Test 1.2: Create task with repeatDaily: false (single weekday)
    const todayKey = getStudyDayKey(new Date(), '06:00');
    const resCreateSingle = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'French Literature',
        durationMinutes: 30,
        colorTag: '#10B981',
        repeatDaily: false,
        weekday: todayKey,
      }),
    }).then((r) => r.json());

    assert(resCreateSingle.success === true, 'Task created with repeatDaily: false succeeds');
    assert(resCreateSingle.task.repeatDaily === false, 'Created task has repeatDaily: false');
    const singleId = resCreateSingle.task._id;
    const otherDays = weekdays.filter((d) => d !== todayKey);
    const notOnOtherDays = otherDays.every((d) => {
      const list = resCreateSingle.timetable?.[d] || [];
      return !list.some((s) => s.id === singleId);
    });
    assert(notOnOtherDays, 'Non-daily task is NOT scheduled on other weekdays');

    console.log('\n--- 2. COIN REWARD RULES: EXACTLY 5 COINS FOR COMPLETED SESSION ---');
    // Test 2.1: Start & Complete session with 0 pauses -> exactly 5 coins
    const resStart1 = await fetch(`${baseUrl}/api/pomodoro/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subjectName: 'Quantum Physics',
        subjectId: sharedId,
        durationMinutes: 25,
      }),
    }).then((r) => r.json());

    assert(resStart1.success === true, 'Session 1 started successfully');
    const sess1Id = resStart1.session._id;

    const resComp1 = await fetch(`${baseUrl}/api/pomodoro/${sess1Id}/complete`, {
      method: 'POST',
      headers,
    }).then((r) => r.json());

    assert(resComp1.success === true, 'Session 1 completed');
    assert(resComp1.sessionCoins === 5, 'Session 1 base coins is exactly 5');
    assert(resComp1.userCoins === 55, 'User balance is updated by exactly +5 (50 + 5 = 55)');

    // Test 2.2: Idempotent duplicate complete request
    const resComp1Dup = await fetch(`${baseUrl}/api/pomodoro/${sess1Id}/complete`, {
      method: 'POST',
      headers,
    }).then((r) => r.json());

    assert(resComp1Dup.alreadyCompleted === true, 'Duplicate completion detected as already completed');
    assert(resComp1Dup.userCoins === 55, 'Balance remains 55 without double-crediting');

    // Test 2.3: Pause penalty (-1 coin per pause)
    const resStart2 = await fetch(`${baseUrl}/api/pomodoro/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subjectName: 'French Literature',
        subjectId: singleId,
        durationMinutes: 25,
      }),
    }).then((r) => r.json());

    const sess2Id = resStart2.session._id;
    // Confirmed early pause twice (< 25m interval)
    await fetch(`${baseUrl}/api/pomodoro/${sess2Id}/pause`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ isEarlyBreakConfirmed: true, intervalSeconds: 120 }),
    });
    await fetch(`${baseUrl}/api/pomodoro/${sess2Id}/resume`, { method: 'POST', headers });
    await fetch(`${baseUrl}/api/pomodoro/${sess2Id}/pause`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ isEarlyBreakConfirmed: true, intervalSeconds: 120 }),
    });
    await fetch(`${baseUrl}/api/pomodoro/${sess2Id}/resume`, { method: 'POST', headers });

    const resComp2 = await fetch(`${baseUrl}/api/pomodoro/${sess2Id}/complete`, {
      method: 'POST',
      headers,
    }).then((r) => r.json());

    assert(resComp2.sessionCoins === 5, 'Session completion awards full 5 completion coins');
    // 55 - 2 (pause penalties during confirmed early breaks) + 5 (completion coins) = 58
    assert(resComp2.userCoins === 58, 'User balance accurately reflects pause deductions and reward');

    console.log('\n--- 3. DAILY BONUS: 2 COINS FOR >= 5 PAUSE-FREE TASKS ---');
    // Currently, 1 task was completed with 0 pauses (Quantum Physics).
    // Let's create 4 more distinct tasks and complete them with 0 pauses.
    const bonusTasks = ['Biology', 'World History', 'Organic Chemistry', 'Calculus III'];
    let lastBonusRes = null;

    for (let i = 0; i < bonusTasks.length; i++) {
      const taskName = bonusTasks[i];
      const taskRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: taskName,
          durationMinutes: 25,
          repeatDaily: true,
        }),
      }).then((r) => r.json());

      const sRes = await fetch(`${baseUrl}/api/pomodoro/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subjectName: taskName,
          subjectId: taskRes.task._id,
          durationMinutes: 25,
        }),
      }).then((r) => r.json());

      const cRes = await fetch(`${baseUrl}/api/pomodoro/${sRes.session._id}/complete`, {
        method: 'POST',
        headers,
      }).then((r) => r.json());

      if (i === bonusTasks.length - 1) {
        lastBonusRes = cRes;
      }
    }

    assert(lastBonusRes.dailyBonusAwarded === true, 'Daily bonus triggered on 5th pause-free completed task');
    assert(lastBonusRes.bonusCoins === 2, 'Daily bonus awards exactly 2 coins');

    // Test 3.2: 6th completed task on the same day does NOT re-award daily bonus (idempotency)
    const sixthTaskRes = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Philosophy 101',
        durationMinutes: 25,
        repeatDaily: true,
      }),
    }).then((r) => r.json());

    const sRes6 = await fetch(`${baseUrl}/api/pomodoro/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subjectName: 'Philosophy 101',
        subjectId: sixthTaskRes.task._id,
        durationMinutes: 25,
      }),
    }).then((r) => r.json());

    const cRes6 = await fetch(`${baseUrl}/api/pomodoro/${sRes6.session._id}/complete`, {
      method: 'POST',
      headers,
    }).then((r) => r.json());

    assert(cRes6.bonusCoins === 0, 'Subsequent tasks on same day do not re-award daily bonus');

    console.log('\n--- 4. PRESERVE FOCUS TIME WHEN INTERRUPTED ---');
    // Test 4.1: Start session, send checkpoint after 120s, simulate window close / abandon
    const resStartInterrupted = await fetch(`${baseUrl}/api/pomodoro/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subjectName: 'Advanced Algorithms',
        durationMinutes: 45,
      }),
    }).then((r) => r.json());

    const interruptedId = resStartInterrupted.session._id;

    // Send checkpoint simulating 120 genuine elapsed seconds (2 minutes)
    const chkRes = await fetch(`${baseUrl}/api/pomodoro/${interruptedId}/checkpoint`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        actualSeconds: 120,
        closing: true,
      }),
    }).then((r) => r.json());

    assert(chkRes.success === true, 'Checkpoint accepted');
    assert(chkRes.actualSeconds === 120, 'Checkpoint persisted 120 actual focus seconds');
    assert(chkRes.status === 'paused' || chkRes.status === 'interrupted', 'Session status set to paused/interrupted on close');

    // Verify session in database
    const savedSess = await PomodoroSession.findById(interruptedId);
    assert(savedSess.actualSeconds === 120, 'Persisted actualSeconds in DB is 120');
    assert(savedSess.actualMinutes === 2, 'Persisted actualMinutes in DB is 2');
    assert(savedSess.status === 'paused' || savedSess.status === 'interrupted', 'Persisted status is paused or interrupted');
    assert(savedSess.coinsEarned === 0, 'No completion coins awarded for interrupted session');

    console.log('\n--- 5. TOTAL FOCUS & ANALYTICS USE ACTUAL ELAPSED TIME ---');
    // Test 5.1: Call /api/analytics/dashboard
    const analyticsRes = await fetch(`${baseUrl}/api/analytics/dashboard`, {
      headers,
    }).then((r) => r.json());

    assert(analyticsRes.success === true, 'Analytics dashboard returns success');
    // Verify totalMinutesLogged includes the 2 minutes of interrupted focus time
    // Completed sessions:
    // Session 1: 25m
    // Session 2: 25m
    // 4 Bonus sessions: 4 * 25m = 100m
    // Sixth session: 25m
    // Total completed = 175m
    // Interrupted session: 2m
    // Expected total minutes = 177m
    assert(
      analyticsRes.summary.totalMinutesLogged >= 177,
      `Total minutes logged (${analyticsRes.summary.totalMinutesLogged}) reflects genuine actual minutes including partial sessions`
    );
    // Completed sessions count must strictly count completed sessions (7), NOT the interrupted one (8)
    assert(
      analyticsRes.summary.totalSessionsCount === 7,
      `Total sessions count (${analyticsRes.summary.totalSessionsCount}) strictly excludes interrupted session`
    );

    // Test 5.2: Verify Leaderboard mini-profile includes actual focus time
    const profileRes = await fetch(`${baseUrl}/api/leaderboard/${user._id}/profile`, {
      headers,
    }).then((r) => r.json());

    assert(profileRes.success === true, 'Leaderboard profile returns success');
    assert(
      profileRes.profile.lifetimeMinutes >= 177,
      `Leaderboard profile lifetime minutes (${profileRes.profile.lifetimeMinutes}) includes partial session focus time`
    );
    assert(
      profileRes.profile.totalSessions === 7,
      `Leaderboard profile total sessions (${profileRes.profile.totalSessions}) strictly counts completed sessions`
    );

    console.log('\n================================================================');
    console.log(`🏁 TEST COMPLETE: ${passes} Passed, ${failures} Failed`);
    console.log('================================================================\n');

    // Clean up test data
    await PomodoroSession.deleteMany({ userId: user._id });
    await Task.deleteMany({ userId: user._id });
    await CoinTransaction.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    server.close();
    await mongoose.disconnect();

    if (failures > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Unhandled test execution error:', err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTest();
