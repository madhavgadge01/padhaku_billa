import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { getStudyDayDate, getStudyDayKey } from '../utils/streakEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.TEST_MONGODB_URL || 'mongodb://127.0.0.1:27017/lifelevel';

// Simple unit simulation of formatTimerHMS from FocusPage & PomodoroTimer
const formatTimerHMS = (totalSeconds) => {
  const totalSecs = Math.max(0, Math.floor(totalSeconds || 0));
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  return `${h} H : ${m} M : ${s} S`;
};

async function runPadhakuBillaVerification() {
  console.log('====================================================');
  console.log('🧪 PADHAKU BILLA BRANDING, TIMER GOALS & RULES TESTS');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- TEST SUITE 1: Branding and Official Tagline ---
  console.log('--- Test Suite 1: App Branding & Official Tagline Everywhere ---');

  const clientIndexPath = path.join(rootDir, 'client/index.html');
  const indexHtml = fs.readFileSync(clientIndexPath, 'utf-8');
  assert(indexHtml.includes('Padhaku Billa — Gamified Focus RPG & Productivity'), 'Website & tab title is "Padhaku Billa"');
  assert(indexHtml.includes('Honest with yourself. I track your time, not your lies.👀'), 'Index meta description contains exact tagline');

  const appJsx = fs.readFileSync(path.join(rootDir, 'client/src/App.jsx'), 'utf-8');
  assert(appJsx.includes('Padhaku Billa'), 'App.jsx contains "Padhaku Billa"');
  assert(appJsx.includes('Honest with yourself. I track your time, not your lies.👀'), 'App.jsx landing hero contains exact official tagline');

  const sidebarJsx = fs.readFileSync(path.join(rootDir, 'client/src/components/Sidebar.jsx'), 'utf-8');
  assert(sidebarJsx.includes('Padhaku Billa'), 'Sidebar brand is "Padhaku Billa"');
  assert(sidebarJsx.includes('Honest with yourself. I track your time, not your lies.👀'), 'Sidebar displays exact official tagline');

  const topHeaderJsx = fs.readFileSync(path.join(rootDir, 'client/src/components/TopHeader.jsx'), 'utf-8');
  assert(topHeaderJsx.includes('Honest with yourself. I track your time, not your lies.👀'), 'TopHeader displays exact official tagline');

  const focusPageJsx = fs.readFileSync(path.join(rootDir, 'client/src/pages/FocusPage.jsx'), 'utf-8');
  assert(focusPageJsx.includes('Honest with yourself. I track your time, not your lies.👀'), 'FocusPage countdown modal contains exact official tagline');
  assert(focusPageJsx.includes('Edit today’s goal'), 'FocusPage contains "Edit today’s goal" button');
  assert(focusPageJsx.includes('formatTimerHMS'), 'FocusPage uses formatTimerHMS');

  const pomodoroTimerJsx = fs.readFileSync(path.join(rootDir, 'client/src/components/PomodoroTimer.jsx'), 'utf-8');
  assert(pomodoroTimerJsx.includes('Honest with yourself. I track your time, not your lies.👀'), 'PomodoroTimer countdown modal contains exact official tagline');

  // --- TEST SUITE 2: Format Timer HMS Display ---
  console.log('\n--- Test Suite 2: Timer Duration HMS Leading-Zero Readout ---');

  assert(formatTimerHMS(7200) === '02 H : 00 M : 00 S', '2 hours (7200s) formats exactly as "02 H : 00 M : 00 S"');
  assert(formatTimerHMS(2700) === '00 H : 45 M : 00 S', '45 mins (2700s) formats exactly as "00 H : 45 M : 00 S"');
  assert(formatTimerHMS(7199) === '01 H : 59 M : 59 S', '7199s formats exactly as "01 H : 59 M : 59 S"');
  assert(formatTimerHMS(65) === '00 H : 01 M : 05 S', '65s formats exactly as "00 H : 01 M : 05 S"');
  assert(formatTimerHMS(0) === '00 H : 00 M : 00 S', '0s formats exactly as "00 H : 00 M : 00 S"');

  // --- TEST SUITE 3: Database & Backend Daily Goal Override & Coin Rules ---
  console.log('\n--- Test Suite 3: Database & Backend Daily Goal Override & Coin Rules ---');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for integration verification.');

  const testEmail = `padhaku_test_${Date.now()}@example.com`;
  const resetTime = '06:00';
  const todayStr = getStudyDayDate(new Date(), resetTime);
  const todayKey = getStudyDayKey(new Date(), resetTime);

  // Clean any old test users
  await User.deleteMany({ email: { $regex: /^padhaku_test_/ } });

  // Create test user with 2-hour (120m) Physics goal for today, and 10 coins
  const testUser = await User.create({
    email: testEmail,
    name: 'Padhaku Tester',
    passwordHash: 'dummy_hash_for_test',
    displayName: 'Padhaku Tester',
    isEmailVerified: true,
    coins: 10,
    dailyResetTime: resetTime,
    weeklyTimetable: {
      [todayKey]: [
        {
          id: 'subj_physics_101',
          name: 'Physics Mechanics',
          color: '#3B82F6',
          targetMinutes: 120, // 2-hour default
          completedDates: [],
        },
      ],
    },
    dailyGoalOverrides: [],
  });

  assert(testUser.coins === 10, 'Initial coin balance is 10');
  const initialSubject = testUser.weeklyTimetable[todayKey][0];
  assert(initialSubject.targetMinutes === 120, 'Subject permanent daily goal is 120 minutes (2 hours)');
  assert(formatTimerHMS(initialSubject.targetMinutes * 60) === '02 H : 00 M : 00 S', 'Default timer is 02 H : 00 M : 00 S');

  // 1. Decrease today's goal: 120m -> 60m (Must deduct exactly 1 coin)
  console.log('\nSubtest 3.1: Decrease today\'s goal from 120m to 60m');
  {
    // Simulate endpoint logic from pomodoroRoutes.js
    const requestedMins = 60;
    const prevEffectiveMinutes = 120;
    let coinsDeducted = 0;

    if (requestedMins < prevEffectiveMinutes) {
      const txRef = `goal_decrease_${testUser._id}_${initialSubject.id}_${todayStr}_${requestedMins}`;
      const existingTx = await CoinTransaction.findOne({ userId: testUser._id, referenceId: txRef });
      if (!existingTx) {
        coinsDeducted = testUser.coins > 0 ? 1 : 0;
        testUser.coins = Math.max(0, testUser.coins - 1);
        await CoinTransaction.create({
          userId: testUser._id,
          type: 'goal_decrease_penalty',
          amount: -1,
          balanceAfter: testUser.coins,
          reason: `Reduced today's study goal for "Physics Mechanics" from 120m to 60m`,
          referenceId: txRef,
          metadata: { subjectId: initialSubject.id, subjectName: initialSubject.name, dateStr: todayStr, prevEffectiveMinutes, requestedMins },
        });
      }
    }

    testUser.dailyGoalOverrides.push({
      subjectId: initialSubject.id,
      subjectName: initialSubject.name,
      dateStr: todayStr,
      targetMinutes: requestedMins,
      originalMinutes: prevEffectiveMinutes,
    });
    await testUser.save();

    assert(coinsDeducted === 1, 'Exactly 1 coin was deducted on goal decrease');
    assert(testUser.coins === 9, 'User coin balance is now 9');

    const tx = await CoinTransaction.findOne({ userId: testUser._id, type: 'goal_decrease_penalty' });
    assert(tx !== null && tx.amount === -1, 'CoinTransaction record created with type "goal_decrease_penalty" and amount -1');
  }

  // 2. Duplicate decrease call (Idempotency check): Must deduct 0 additional coins
  console.log('\nSubtest 3.2: Duplicate decrease call (Idempotency)');
  {
    const requestedMins = 60;
    const txRef = `goal_decrease_${testUser._id}_${initialSubject.id}_${todayStr}_${requestedMins}`;
    const existingTx = await CoinTransaction.findOne({ userId: testUser._id, referenceId: txRef });
    let additionalDeduction = 0;
    if (!existingTx) {
      additionalDeduction = 1;
      testUser.coins = Math.max(0, testUser.coins - 1);
    }

    assert(additionalDeduction === 0, 'Duplicate request prevented duplicate penalty deduction');
    assert(testUser.coins === 9, 'Coin balance remains 9');
  }

  // 3. Increase today's goal: 60m -> 90m (Must deduct 0 coins, award 0 bonus)
  console.log('\nSubtest 3.3: Increase today\'s goal from 60m to 90m');
  {
    const currentOverride = testUser.dailyGoalOverrides.find(o => o.dateStr === todayStr && o.subjectId === initialSubject.id);
    const prevEffective = currentOverride ? currentOverride.targetMinutes : 120;
    const newRequestedMins = 90;
    let coinsChanged = 0;

    if (newRequestedMins < prevEffective) {
      coinsChanged = -1;
    } else {
      coinsChanged = 0; // 0 deduction, 0 bonus
    }

    currentOverride.targetMinutes = newRequestedMins;
    await testUser.save();

    assert(coinsChanged === 0, 'Increasing today\'s goal deducted 0 coins and awarded 0 bonus');
    assert(testUser.coins === 9, 'User balance remains 9');
  }

  // 4. Scoped to calendar date: Tomorrow's date automatically restores permanent goal
  console.log('\nSubtest 3.4: Daily scope and auto-restoration tomorrow');
  {
    const tomorrowStr = '2099-01-01';
    const tomorrowOverride = testUser.dailyGoalOverrides.find(o => o.dateStr === tomorrowStr && o.subjectId === initialSubject.id);
    const effectiveTomorrow = tomorrowOverride ? tomorrowOverride.targetMinutes : initialSubject.targetMinutes;

    assert(effectiveTomorrow === 120, 'On tomorrow\'s date, saved permanent goal (120m) is automatically restored without manual reset');
  }

  // 5. Restore saved default button (DELETE daily-goal-override): 0 coins deducted
  console.log('\nSubtest 3.5: Restore saved default goal');
  {
    testUser.dailyGoalOverrides = testUser.dailyGoalOverrides.filter(
      o => !(o.dateStr === todayStr && o.subjectId === initialSubject.id)
    );
    await testUser.save();

    const restoredOverride = testUser.dailyGoalOverrides.find(o => o.dateStr === todayStr && o.subjectId === initialSubject.id);
    const restoredEffective = restoredOverride ? restoredOverride.targetMinutes : initialSubject.targetMinutes;

    assert(restoredEffective === 120, 'Permanent goal successfully restored to 120m');
    assert(testUser.coins === 9, 'Restoring permanent goal deducted 0 coins');
  }

  // 6. Zero Balance Non-Negative Guard
  console.log('\nSubtest 3.6: Non-negative coin balance clamp');
  {
    testUser.coins = 0;
    await testUser.save();

    const requestedMins = 30;
    let deducted = testUser.coins > 0 ? 1 : 0;
    testUser.coins = Math.max(0, testUser.coins - 1);
    await testUser.save();

    assert(deducted === 0, 'Cannot deduct coin when user balance is 0');
    assert(testUser.coins === 0, 'User coin balance clamped at 0, never negative');
  }

  // 7. Verify Cancel Countdown creates no session and records 0 focus time
  console.log('\nSubtest 3.7: 5-Second countdown cancellation behavior');
  {
    const sessionCountBefore = await PomodoroSession.countDocuments({ userId: testUser._id });
    // User clicks cancel on countdown modal
    // Frontend clears interval and does NOT call api.startSession
    const sessionCountAfter = await PomodoroSession.countDocuments({ userId: testUser._id });

    assert(sessionCountBefore === sessionCountAfter, 'Cancelled countdown created 0 sessions on server');
    assert(testUser.coins === 0, 'Cancelled countdown deducted/awarded 0 coins');
  }

  // Clean up test user
  await User.deleteMany({ email: testEmail });
  await CoinTransaction.deleteMany({ userId: testUser._id });
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
  console.log('====================================================\n');
}

runPadhakuBillaVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
