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
import taskRoutes from '../routes/taskRoutes.js';
import { getStudyDayDate, getStudyDayKey, getWeekdayDateStr } from '../utils/streakEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelevel';
const jwtSecret = process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt';

async function runComprehensiveVerification() {
  console.log('\n================================================================');
  console.log('⏰  LIFELEVEL CRITICAL TIMER, REWARDS, STREAK & ALARM E2E SUITE');
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

  let failures = 0;
  let passes = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passes++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failures++;
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
    }
  }

  // Setup express test app with pomodoro, analytics, and task routes
  const app = express();
  app.use(express.json());
  app.use('/api/pomodoro', pomodoroRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/tasks', taskRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  try {
    const resetTime = '06:00';
    const todayStr = getStudyDayDate(new Date(), resetTime);
    const todayKey = getStudyDayKey(new Date(), resetTime);

    // Setup Test User with 2 planned subjects for today
    const testUser = new User({
      name: 'Chronos Warrior',
      email: `chronos_${Date.now()}@example.com`,
      passwordHash: 'dummyhash',
      dailyResetTime: resetTime,
      coins: 10,
      streaks: {
        currentStreak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
        completedDates: [],
      },
      weeklyTimetable: {
        [todayKey]: [
          { id: 'subj_alpha_1', name: 'Quantum Mechanics', targetMinutes: 30, color: '#3B82F6', completedDates: [] },
          { id: 'subj_beta_2', name: 'Linear Algebra', targetMinutes: 30, color: '#10B981', completedDates: [] },
        ],
      },
    });
    await testUser.save();

    const token = jwt.sign({ userId: testUser._id }, jwtSecret, { expiresIn: '1h' });
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    console.log(`--- Scenario 1: Focus Timer Start with Timetable Subject ID ---`);
    const startRes = await fetch(`${baseUrl}/api/pomodoro/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        subjectId: 'subj_alpha_1',
        subjectName: 'Quantum Mechanics',
        durationMinutes: 30,
        colorTag: '#3B82F6',
      }),
    });
    const startData = await startRes.json();
    assert(startRes.status === 201 && startData.success, 'Focus session starts successfully');
    assert(startData.session && startData.session._id, 'Returns valid session ID');
    assert(mongoose.isValidObjectId(startData.session.taskId), 'session.taskId is a valid Mongoose ObjectId');

    const sessionId1 = startData.session._id;

    console.log(`\n--- Scenario 2: Timer Pause with Penalty & Idempotency ---`);
    const pauseRes1 = await fetch(`${baseUrl}/api/pomodoro/${sessionId1}/pause`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ actionId: `pause_test_1_${sessionId1}`, isEarlyBreakConfirmed: true }),
    });
    const pauseData1 = await pauseRes1.json();
    assert(pauseData1.success && pauseData1.pauseCount === 1, 'Pause count increments to 1');
    assert(pauseData1.userCoins === 9, '1 coin deducted from initial 10 coins balance (now 9)');

    // Duplicate pause with same actionId
    const pauseResDup = await fetch(`${baseUrl}/api/pomodoro/${sessionId1}/pause`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ actionId: `pause_test_1_${sessionId1}`, isEarlyBreakConfirmed: true }),
    });
    const pauseDataDup = await pauseResDup.json();
    assert(pauseDataDup.userCoins === 9, 'Duplicate pause does NOT deduct extra coin');

    // Resume session
    const resumeRes = await fetch(`${baseUrl}/api/pomodoro/${sessionId1}/resume`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const resumeData = await resumeRes.json();
    assert(resumeData.success, 'Focus session resumes successfully');

    console.log(`\n--- Scenario 3: Timer Countdown Completion, Rewards & DB Persistence ---`);
    const completeRes = await fetch(`${baseUrl}/api/pomodoro/${sessionId1}/complete`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const completeData = await completeRes.json();
    assert(completeData.success, 'Focus session completed successfully');
    assert(completeData.baseCoins === 5, 'Session completion awards full 5 base coins');
    assert(completeData.coinsEarned === 5, 'Total coins earned this session = 5 coins');
    assert(completeData.userCoins === 14, 'Updated user balance = 14 coins (9 + 5)');

    // Verify DB Persistence
    const dbSession1 = await PomodoroSession.findById(sessionId1);
    assert(dbSession1.status === 'completed', 'DB PomodoroSession status is "completed"');
    assert(dbSession1.coinsEarned === 5, 'DB PomodoroSession coinsEarned is 5');

    const updatedUser1 = await User.findById(testUser._id);
    const completedSubject1 = updatedUser1.weeklyTimetable[todayKey].find((s) => s.id === 'subj_alpha_1');
    assert(
      completedSubject1 && completedSubject1.completedDates.includes(todayStr),
      'Timetable subject completedDates contains todayStr in MongoDB'
    );

    console.log(`\n--- Scenario 4: Idempotency Protection on Duplicate Complete / Refresh ---`);
    const completeResDup = await fetch(`${baseUrl}/api/pomodoro/${sessionId1}/complete`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const completeDataDup = await completeResDup.json();
    assert(completeDataDup.success && completeDataDup.alreadyCompleted, 'Re-complete returns alreadyCompleted: true');
    assert(completeDataDup.userCoins === 14, 'User coin balance is unmodified on second complete call');

    const totalTxUser1 = await CoinTransaction.countDocuments({
      userId: testUser._id,
      referenceId: `session_complete_${sessionId1}`,
    });
    assert(totalTxUser1 === 1, 'Exactly one CoinTransaction exists for this session completion');

    console.log(`\n--- Scenario 5: Second Task Completion & Streak Update ---`);
    // Start and complete the second subject 'subj_beta_2' (Linear Algebra)
    const startRes2 = await fetch(`${baseUrl}/api/pomodoro/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        subjectId: 'subj_beta_2',
        subjectName: 'Linear Algebra',
        durationMinutes: 30,
        colorTag: '#10B981',
      }),
    });
    const startData2 = await startRes2.json();
    const sessionId2 = startData2.session._id;

    // Complete session 2 (0 pauses -> +5 session coins)
    const completeRes2 = await fetch(`${baseUrl}/api/pomodoro/${sessionId2}/complete`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const completeData2 = await completeRes2.json();
    assert(completeData2.success, 'Session 2 completed');
    assert(completeData2.sessionCoins === 5, 'Session 2 earned 5 session coins (0 pauses)');
    assert(completeData2.userCoins === 19, 'User coins updated to 19 (14 + 5)');

    const updatedUser2 = await User.findById(testUser._id);
    assert(updatedUser2.streaks.currentStreak === 1, 'User global study streak incremented to 1');
    assert(updatedUser2.streaks.completedDates.includes(todayStr), 'User streaks.completedDates contains todayStr');

    console.log(`\n--- Scenario 6: Non-Negative Coin Balance Enforcement ---`);
    // Create zero-coin user to test pause penalty does not allow negative balance
    const zeroUser = new User({
      name: 'Broke Hero',
      email: `zero_${Date.now()}@example.com`,
      passwordHash: 'dummy',
      dailyResetTime: resetTime,
      coins: 0,
      weeklyTimetable: { [todayKey]: [] },
    });
    await zeroUser.save();
    const zeroToken = jwt.sign({ userId: zeroUser._id }, jwtSecret, { expiresIn: '1h' });
    const zeroHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${zeroToken}` };

    const zeroStartRes = await fetch(`${baseUrl}/api/pomodoro/start`, {
      method: 'POST',
      headers: zeroHeaders,
      body: JSON.stringify({ subjectName: 'Free Study', durationMinutes: 25 }),
    });
    const zeroStartData = await zeroStartRes.json();

    const zeroPauseRes = await fetch(`${baseUrl}/api/pomodoro/${zeroStartData.session._id}/pause`, {
      method: 'POST',
      headers: zeroHeaders,
      body: JSON.stringify({}),
    });
    const zeroPauseData = await zeroPauseRes.json();
    assert(zeroPauseData.userCoins === 0, 'Zero-coin balance remains 0, never negative');
    assert(zeroPauseData.coinDeducted === false, 'coinDeducted is false when balance is 0');

    console.log(`\n--- Scenario 7: Analytics Heatmap / Calendar Returns Green Square ---`);
    const analyticsRes = await fetch(`${baseUrl}/api/analytics/dashboard`, {
      method: 'GET',
      headers: authHeaders,
    });
    const analyticsData = await analyticsRes.json();
    assert(analyticsRes.status === 200 && analyticsData.success, 'Analytics dashboard returns 200 OK');
    assert(
      analyticsData.activityMap && analyticsData.activityMap[todayStr],
      'activityMap contains todayStr entry'
    );
    const todayCell = analyticsData.activityMap[todayStr];
    assert(
      todayCell && todayCell.intensity >= 1,
      `Calendar cell intensity >= 1 for completed day (actual: ${todayCell?.intensity})`
    );
    assert(
      todayCell && todayCell.minutes > 0,
      `Calendar cell has recorded focus minutes (actual: ${todayCell?.minutes}m)`
    );

    console.log(`\n--- Scenario 8: Weekday Ribbon Consistency Across Days ---`);
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    DAYS.forEach((d) => {
      const dateStr = getWeekdayDateStr(d);
      assert(
        typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr),
        `getWeekdayDateStr(${d}) returns valid YYYY-MM-DD (${dateStr})`
      );
    });

    console.log(`\n================================================================`);
    console.log(`TEST SUMMARY: ${passes} PASSED, ${failures} FAILED`);
    console.log(`================================================================\n`);

    if (failures > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runComprehensiveVerification().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

