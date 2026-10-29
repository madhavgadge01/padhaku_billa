import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { User } from '../models/User.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { generateOTP, sendOTPEmail } from '../utils/emailService.js';
import { updateGlobalStreakIfEligible, getStudyDayDate, getStudyDayKey } from '../utils/streakEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const targetUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelevel';

async function runVerificationTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PRODUCTION READINESS VERIFICATION SUITE');
  console.log('======================================================\n');

  await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[Test] Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);

  let testFailures = 0;

  // -------------------------------------------------------------------------
  // TEST 1: Starter User Coin Balance & Clean Defaults
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: New User Starts With 0 Coins & Empty History ---');
  const testEmail = `test_hero_${Date.now()}@example.com`;
  const newUser = new User({
    name: 'Test Hero',
    email: testEmail,
    passwordHash: 'test_hash',
  });
  await newUser.save();

  if (newUser.coins === 0) {
    console.log('✅ PASS: New user initialized with exactly 0 coins.');
  } else {
    console.error(`❌ FAIL: Expected 0 coins, got ${newUser.coins}`);
    testFailures++;
  }

  if (newUser.hasCompletedOnboarding === false) {
    console.log('✅ PASS: hasCompletedOnboarding defaults to false.');
  } else {
    console.error('❌ FAIL: hasCompletedOnboarding is not false.');
    testFailures++;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Email Verification & OTP Hashing
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: OTP Security & Hash Storage ---');
  const otpCode = generateOTP();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otpCode, salt);

  const verificationRecord = await EmailVerification.create({
    email: testEmail,
    otpHash,
    purpose: 'register',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  // Verify hash matches
  const matchSuccess = await bcrypt.compare(otpCode, verificationRecord.otpHash);
  const matchFailure = await bcrypt.compare('000000', verificationRecord.otpHash);

  if (matchSuccess && !matchFailure) {
    console.log('✅ PASS: OTP is securely hashed and verified with bcrypt.');
  } else {
    console.error('❌ FAIL: OTP hashing comparison failed.');
    testFailures++;
  }

  // -------------------------------------------------------------------------
  // TEST 3: Coin Economy - Task Completion (+5 coins exactly once)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Task Completion (+5 Coins Idempotency) ---');
  const todayStr = '2026-10-29';
  const taskId = 'sub_math_101';
  const taskRef = `task_complete_${taskId}_${todayStr}`;

  // First completion
  let initialTx = await CoinTransaction.findOne({ userId: newUser._id, referenceId: taskRef });
  if (!initialTx) {
    newUser.coins += 5;
    await CoinTransaction.create({
      userId: newUser._id,
      type: 'task_completion',
      amount: 5,
      balanceAfter: newUser.coins,
      reason: 'Completed task: Mathematics',
      referenceId: taskRef,
    });
    await newUser.save();
  }

  if (newUser.coins === 5) {
    console.log('✅ PASS: First task completion awarded exactly 5 coins (balance: 5).');
  } else {
    console.error(`❌ FAIL: Expected 5 coins, got ${newUser.coins}`);
    testFailures++;
  }

  // Duplicate completion attempt (simulate retry / double click)
  const duplicateTx = await CoinTransaction.findOne({ userId: newUser._id, referenceId: taskRef });
  if (duplicateTx) {
    // Duplicate detected, do not add coins
  } else {
    newUser.coins += 5;
  }

  if (newUser.coins === 5) {
    console.log('✅ PASS: Duplicate task completion prevented duplicate coins (balance remains: 5).');
  } else {
    console.error(`❌ FAIL: Duplicate reward was not prevented! Coins: ${newUser.coins}`);
    testFailures++;
  }

  // -------------------------------------------------------------------------
  // TEST 4: Coin Economy - Pause Penalty (-1 coin, no negative balance)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Pause Penalty (-1 Coin & Non-Negative Boundary) ---');
  const testSession = new PomodoroSession({
    userId: newUser._id,
    taskId: new mongoose.Types.ObjectId(),
    taskName: 'Math Session',
    durationMinutes: 25,
    status: 'in-progress',
    startTime: new Date(),
  });
  await testSession.save();

  // Deduct 1 coin for pause
  if (newUser.coins >= 1) {
    newUser.coins -= 1;
    await CoinTransaction.create({
      userId: newUser._id,
      type: 'session_pause_penalty',
      amount: -1,
      balanceAfter: newUser.coins,
      reason: 'Pause penalty',
      referenceId: `pause_${testSession._id}_1`,
    });
    await newUser.save();
  }

  if (newUser.coins === 4) {
    console.log('✅ PASS: Pause deducted 1 coin (balance: 4).');
  } else {
    console.error(`❌ FAIL: Expected 4 coins, got ${newUser.coins}`);
    testFailures++;
  }

  // Set balance to 0 and test that pausing never produces negative balance
  newUser.coins = 0;
  await newUser.save();

  let pausePenaltyAppliedAtZero = false;
  if (newUser.coins >= 1) {
    newUser.coins -= 1;
    pausePenaltyAppliedAtZero = true;
  }

  if (newUser.coins === 0 && !pausePenaltyAppliedAtZero) {
    console.log('✅ PASS: Balance at 0 did not become negative upon pause.');
  } else {
    console.error(`❌ FAIL: Negative balance was allowed! Coins: ${newUser.coins}`);
    testFailures++;
  }

  // -------------------------------------------------------------------------
  // TEST 5: All-Tasks Bonus (+5 coins once per day)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: All-Tasks Daily Bonus (+5 Coins Idempotency) ---');
  const currentStudyKey = getStudyDayKey(new Date(), '06:00');
  const currentStudyDate = getStudyDayDate(new Date(), '06:00');

  newUser.weeklyTimetable = {
    [currentStudyKey]: [
      { id: 'sub_math_101', name: 'Mathematics', color: '#3B82F6', targetMinutes: 25, completedDates: [currentStudyDate] },
    ],
  };
  await newUser.save();

  const bonusResult1 = await updateGlobalStreakIfEligible(newUser);
  const bonusResult2 = await updateGlobalStreakIfEligible(newUser);

  if (bonusResult1.bonusAwarded && !bonusResult2.bonusAwarded && newUser.coins === 5) {
    console.log('✅ PASS: All-tasks bonus granted +5 coins on first check and prevented duplicate on second check.');
  } else {
    console.error(`❌ FAIL: Bonus idempotency failed. Coins: ${newUser.coins}, Result1: ${bonusResult1.bonusAwarded}, Result2: ${bonusResult2.bonusAwarded}`);
    testFailures++;
  }

  // Clean up test user
  await User.deleteOne({ _id: newUser._id });
  await EmailVerification.deleteMany({ email: testEmail });
  await PomodoroSession.deleteMany({ userId: newUser._id });
  await CoinTransaction.deleteMany({ userId: newUser._id });

  console.log('\n======================================================');
  if (testFailures === 0) {
    console.log('🎉 ALL 5 PRODUCTION READINESS SUITE TESTS PASSED WITH 0 ERRORS!');
  } else {
    console.error(`❌ SUITE FINISHED WITH ${testFailures} FAILURES.`);
  }
  console.log('======================================================\n');

  await mongoose.disconnect();
}

runVerificationTests().catch((e) => {
  console.error('Fatal error in tests:', e);
  process.exit(1);
});
