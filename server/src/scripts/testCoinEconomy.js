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
import taskRoutes from '../routes/taskRoutes.js';
import pomodoroRoutes from '../routes/pomodoroRoutes.js';
import { getStudyDayDate, getStudyDayKey } from '../utils/streakEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelevel';
const jwtSecret = process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt';

async function runCoinEconomyTests() {
  console.log('\n======================================================');
  console.log('🪙  RUNNING LIFELEVEL COIN ECONOMY VERIFICATION SUITE');
  console.log('======================================================\n');

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

  // Setup express test app
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', taskRoutes);
  app.use('/api/pomodoro', pomodoroRoutes);

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

    // Create Test User A
    const userA = new User({
      name: 'Hero A',
      email: `hero_a_${Date.now()}@example.com`,
      passwordHash: 'dummyhash',
      dailyResetTime: resetTime,
      coins: 0,
      weeklyTimetable: {
        [todayKey]: [
          { id: 'subj_math_1', name: 'Mathematics', targetMinutes: 30, color: '#3B82F6', completedDates: [] },
          { id: 'subj_phys_2', name: 'Physics', targetMinutes: 30, color: '#10B981', completedDates: [] },
          { id: 'subj_chem_3', name: 'Chemistry', targetMinutes: 30, color: '#F59E0B', completedDates: [] },
        ],
      },
    });
    await userA.save();

    // Create Test User B
    const userB = new User({
      name: 'Hero B',
      email: `hero_b_${Date.now()}@example.com`,
      passwordHash: 'dummyhash',
      dailyResetTime: resetTime,
      coins: 0,
      weeklyTimetable: {
        [todayKey]: [
          { id: 'subj_bio_1', name: 'Biology', targetMinutes: 30, color: '#EC4899', completedDates: [] },
        ],
      },
    });
    await userB.save();

    const tokenA = jwt.sign({ userId: userA._id }, jwtSecret, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userB._id }, jwtSecret, { expiresIn: '1h' });

    const authHeadersA = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    };
    const authHeadersB = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    };

    // -------------------------------------------------------------------------
    // TEST 1: Task completion awards exactly 5 coins
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Task Completion Awards Exactly 5 Coins ---');
    const res1 = await fetch(`${baseUrl}/api/tasks/subj_math_1/toggle`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ weekday: todayKey }),
    });
    const data1 = await res1.json();

    const dbUser1 = await User.findById(userA._id);
    const tx1 = await CoinTransaction.findOne({ userId: userA._id, referenceId: `task_complete_subj_math_1_${todayStr}` });

    if (
      data1.success === true &&
      data1.coinsEarned === 5 &&
      data1.userCoins === 5 &&
      dbUser1.coins === 5 &&
      tx1 &&
      tx1.amount === 5 &&
      tx1.type === 'task_completion'
    ) {
      console.log('✅ PASS: Task 1 completed, exactly 5 coins awarded and logged in CoinTransaction.');
    } else {
      console.error('❌ FAIL: Task 1 reward incorrect:', { data1, dbCoins: dbUser1?.coins, tx1 });
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Completing second task awards another 5 coins (balance = 10)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Completing Second Task Awards Another 5 Coins (Balance = 10) ---');
    const res2 = await fetch(`${baseUrl}/api/tasks/timetable/toggle-complete`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ weekday: todayKey, subjectId: 'subj_phys_2' }),
    });
    const data2 = await res2.json();

    const dbUser2 = await User.findById(userA._id);
    const tx2 = await CoinTransaction.findOne({ userId: userA._id, referenceId: `task_complete_subj_phys_2_${todayStr}` });

    if (
      data2.success === true &&
      data2.coinsEarned === 5 &&
      data2.userCoins === 10 &&
      dbUser2.coins === 10 &&
      tx2 &&
      tx2.amount === 5
    ) {
      console.log('✅ PASS: Task 2 completed, balance increased from 5 to 10 coins.');
    } else {
      console.error('❌ FAIL: Task 2 reward incorrect:', { data2, dbCoins: dbUser2?.coins, tx2 });
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Incomplete tasks do not trigger daily completion bonus
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Incomplete Day Does NOT Trigger All-Tasks Bonus ---');
    const bonusTxEarly = await CoinTransaction.findOne({ userId: userA._id, referenceId: `all_tasks_bonus_${todayStr}` });
    if (!bonusTxEarly && data2.summary?.allCompletedToday === false) {
      console.log('✅ PASS: 2 of 3 tasks completed -> All-Tasks bonus was NOT awarded prematurely.');
    } else {
      console.error('❌ FAIL: Bonus awarded prematurely while tasks still pending.');
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 4: No duplicate rewards on repeated clicks, unchecking, or retrying
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Unchecking & Re-checking Same Task Never Awards Duplicate Coins ---');
    // Uncheck Task 1
    const resUncheck = await fetch(`${baseUrl}/api/tasks/subj_math_1/toggle`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ weekday: todayKey }),
    });
    await resUncheck.json();

    // Re-check Task 1
    const resRecheck = await fetch(`${baseUrl}/api/tasks/subj_math_1/toggle`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ weekday: todayKey }),
    });
    const dataRecheck = await resRecheck.json();

    const dbUserAfterRecheck = await User.findById(userA._id);
    const task1TxCount = await CoinTransaction.countDocuments({
      userId: userA._id,
      referenceId: `task_complete_subj_math_1_${todayStr}`,
    });

    if (
      dataRecheck.coinsEarned === 0 &&
      dbUserAfterRecheck.coins === 10 &&
      task1TxCount === 1
    ) {
      console.log('✅ PASS: Re-checking already-rewarded task awarded 0 duplicate coins. Balance remains 10.');
    } else {
      console.error('❌ FAIL: Duplicate coins awarded on re-checking:', {
        dataRecheck,
        dbCoins: dbUserAfterRecheck?.coins,
        task1TxCount,
      });
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Completing all daily tasks awards +5 daily bonus exactly once
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Completing All Daily Tasks Awards +5 Bonus Exactly Once ---');
    // Complete Task 3 (now all 3 tasks are completed)
    const res3 = await fetch(`${baseUrl}/api/tasks/subj_chem_3/toggle`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ weekday: todayKey }),
    });
    const data3 = await res3.json();

    const dbUser3 = await User.findById(userA._id);
    const bonusTx = await CoinTransaction.findOne({ userId: userA._id, referenceId: `all_tasks_bonus_${todayStr}` });

    // Task 3 completion (+5) + Daily All-Tasks Bonus (+5) = +10 coins -> 10 + 10 = 20
    if (
      data3.success === true &&
      data3.coinsEarned === 10 &&
      data3.userCoins === 20 &&
      dbUser3.coins === 20 &&
      bonusTx &&
      bonusTx.amount === 5 &&
      bonusTx.type === 'all_tasks_bonus'
    ) {
      console.log('✅ PASS: All daily tasks complete: +5 task coins and +5 daily bonus awarded! (Balance: 20)');
    } else {
      console.error('❌ FAIL: All-tasks bonus not awarded properly:', { data3, dbCoins: dbUser3?.coins, bonusTx });
      failures++;
    }

    // Re-trigger Task 3 to verify bonus is NOT awarded a second time
    await fetch(`${baseUrl}/api/tasks/subj_chem_3/toggle`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ weekday: todayKey }),
    }); // uncheck
    const res3Recheck = await fetch(`${baseUrl}/api/tasks/subj_chem_3/toggle`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ weekday: todayKey }),
    }); // re-check
    const data3Recheck = await res3Recheck.json();
    const bonusCount = await CoinTransaction.countDocuments({
      userId: userA._id,
      referenceId: `all_tasks_bonus_${todayStr}`,
    });
    const dbUserBonusCheck = await User.findById(userA._id);

    if (bonusCount === 1 && dbUserBonusCheck.coins === 20 && data3Recheck.coinsEarned === 0) {
      console.log('✅ PASS: Bonus transaction is strictly idempotent (only 1 bonus per day, balance remains 20).');
    } else {
      console.error('❌ FAIL: Daily bonus duplicated upon re-checking:', { bonusCount, dbCoins: dbUserBonusCheck?.coins });
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 6: User Isolation: User A actions never award coins to User B
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: User Isolation: User A Actions Never Affect User B ---');
    const dbUserB = await User.findById(userB._id);
    if (dbUserB.coins === 0) {
      console.log('✅ PASS: User B balance is still 0 coins (User A rewards isolated strictly).');
    } else {
      console.error('❌ FAIL: User B unexpectedly modified:', dbUserB.coins);
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Legacy Task Model awards 5 coins and tracks transactions
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Legacy Task Model Awards 5 Coins Correctly ---');
    const legacyTask = new Task({
      userId: userB._id,
      name: 'Legacy Research Paper',
      durationMinutes: 45,
      completedToday: false,
    });
    await legacyTask.save();

    const resLeg = await fetch(`${baseUrl}/api/tasks/${legacyTask._id}/toggle`, {
      method: 'POST',
      headers: authHeadersB,
      body: JSON.stringify({}),
    });
    const dataLeg = await resLeg.json();
    const dbUserBLeg = await User.findById(userB._id);
    const legTx = await CoinTransaction.findOne({ userId: userB._id, referenceId: `task_complete_${legacyTask._id}_${todayStr}` });

    // Since User B has subj_bio_1 in timetable, only this legacy task is completed -> exactly 5 coins awarded
    if (
      dataLeg.success === true &&
      dataLeg.completed === true &&
      dbUserBLeg.coins === 5 &&
      legTx &&
      legTx.amount === 5
    ) {
      console.log('✅ PASS: Legacy task toggle awarded 5 coins and created auditable CoinTransaction.');
    } else {
      console.error('❌ FAIL: Legacy task toggle failed:', { dataLeg, dbCoins: dbUserBLeg?.coins, legTx });
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Pause Penalty: -1 coin per pause, never negative at 0
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Pause Penalty Deducts 1 Coin & Never Drops Below Zero ---');
    // Set userB coins to 1 to test deduction down to 0, then test that 0 remains 0
    userB.coins = 1;
    await userB.save();

    const testSession = new PomodoroSession({
      userId: userB._id,
      taskId: legacyTask._id,
      taskName: 'Focus Test',
      durationMinutes: 25,
      status: 'in-progress',
      pauseCount: 0,
      startedAt: new Date(),
    });
    await testSession.save();

    // 1st pause: balance 1 -> 0 (-1 coin)
    const pauseRes1 = await fetch(`${baseUrl}/api/pomodoro/${testSession._id}/pause`, {
      method: 'POST',
      headers: authHeadersB,
      body: JSON.stringify({ actionId: `pause_act_${Date.now()}_1` }),
    });
    await pauseRes1.json();
    const dbUserBPause1 = await User.findById(userB._id);

    // 2nd pause: balance 0 -> 0 (cannot drop below 0)
    const pauseRes2 = await fetch(`${baseUrl}/api/pomodoro/${testSession._id}/pause`, {
      method: 'POST',
      headers: authHeadersB,
      body: JSON.stringify({ actionId: `pause_act_${Date.now()}_2` }),
    });
    const pauseData2 = await pauseRes2.json();
    const dbUserBPause2 = await User.findById(userB._id);

    if (
      dbUserBPause1.coins === 0 &&
      dbUserBPause2.coins === 0 &&
      pauseData2.success === true
    ) {
      console.log('✅ PASS: Pause penalty deducted 1 coin when balance was 1. When balance reached 0, balance remained at 0 (never negative).');
    } else {
      console.error('❌ FAIL: Pause penalty behavior incorrect:', {
        dbCoins1: dbUserBPause1?.coins,
        dbCoins2: dbUserBPause2?.coins,
        pauseData2,
      });
      failures++;
    }

    // -------------------------------------------------------------------------
    // TEST 9: Regression Prevention: Invalid or undefined IDs return 400 safely
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Invalid & "undefined" IDs Safely Handled (No 500 CastError) ---');
    const resUndefined = await fetch(`${baseUrl}/api/tasks/undefined/toggle`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({}),
    });
    const dataUndefined = await resUndefined.json();

    if (resUndefined.status === 400 && dataUndefined.success === false) {
      console.log('✅ PASS: POST /api/tasks/undefined/toggle returned clean HTTP 400 without crashing Mongoose.');
    } else {
      console.error('❌ FAIL: Handling of "undefined" ID failed:', { status: resUndefined.status, dataUndefined });
      failures++;
    }

    // Clean up test users
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    await Task.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await CoinTransaction.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await PomodoroSession.deleteMany({ userId: { $in: [userA._id, userB._id] } });

    console.log('\n======================================================');
    if (failures === 0) {
      console.log('🎉 ALL 9 COIN ECONOMY AND INTEGRITY TESTS PASSED!');
    } else {
      console.error(`⚠️  TEST SUITE COMPLETED WITH ${failures} FAILURE(S).`);
    }
    console.log('======================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  process.exit(failures === 0 ? 0 : 1);
}

runCoinEconomyTests().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
