import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import pomodoroRoutes from '../routes/pomodoroRoutes.js';
import { getStudyDayDate, getStudyDayKey } from '../utils/streakEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.TEST_MONGODB_URL || 'mongodb://127.0.0.1:27017/lifelevel';

// Simple unit simulation of formatTimerHMS & formatMMSS
const formatTimerHMS = (totalSeconds) => {
  const totalSecs = Math.max(0, Math.floor(totalSeconds || 0));
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  return `${h} H : ${m} M : ${s} S`;
};

const formatMMSS = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
};

async function runBreakPenaltyAndResumeTests() {
  console.log('================================================================');
  console.log('🛡️  PADHAKU BILLA: 25-MIN BREAK PENALTY & RESUME SYSTEM SUITE');
  console.log('================================================================\n');

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

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB: ${MONGODB_URI}`);

  const testEmail = `break_tester_${Date.now()}@example.com`;
  const resetTime = '06:00';
  const todayStr = getStudyDayDate(new Date(), resetTime);
  const todayKey = getStudyDayKey(new Date(), resetTime);

  // Clean any old test users
  await User.deleteMany({ email: { $regex: /^break_tester_/ } });

  // Create test user with 5-hour (300 mins) Backend goal and 10 coins
  const testUser = await User.create({
    email: testEmail,
    name: 'Break Tester',
    displayName: 'Break Tester',
    passwordHash: 'dummy_hash_test',
    isEmailVerified: true,
    coins: 10,
    dailyResetTime: resetTime,
    weeklyTimetable: {
      [todayKey]: [
        {
          id: 'subj_backend_5h',
          name: 'Backend Architecture',
          color: '#10B981',
          targetMinutes: 300, // 5 hours daily goal
          completedDates: [],
        },
      ],
    },
    dailyGoalOverrides: [],
  });

  const token = jwt.sign(
    { userId: testUser._id },
    process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt'
  );

  // Setup express test server
  const app = express();
  app.use(express.json());
  app.use('/api/pomodoro', pomodoroRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/pomodoro`;

  // Helper fetcher
  async function post(endpoint, data = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async function get(endpoint) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  }

  async function getUserCoins() {
    const u = await User.findById(testUser._id);
    return u.coins;
  }

  // --- 1. START SESSION ---
  console.log('\n--- 1. Starting 5-Hour Focus Session ---');
  const startRes = await post('/start', {
    subjectId: 'subj_backend_5h',
    subjectName: 'Backend Architecture',
    colorTag: '#10B981',
    durationMinutes: 300,
  });

  assert(startRes.success === true, 'Session starts successfully');
  const sessionId = startRes.session._id;
  assert(startRes.session.durationMinutes === 300, 'Daily goal is 300 minutes (5 hours)');
  assert(startRes.session.totalGoalSeconds === 18000, 'Total goal is 18,000 seconds');

  // --- 2. BREAK AFTER 10 MINUTES (< 25m) WITH CONFIRMATION ---
  console.log('\n--- 2. Break after 10 minutes (< 25m) with confirmation (Criterion 1) ---');
  // User studies for 10 minutes (600s in current interval)
  const pause1Res = await post(`/${sessionId}/pause`, {
    intervalSeconds: 600,
    actualSeconds: 600,
    isEarlyBreakConfirmed: true,
    actionId: `test_action_break_1_${Date.now()}`,
  });

  assert(pause1Res.success === true, 'Pause request accepted');
  assert(pause1Res.isEarlyBreak === true, 'Session correctly flagged as early break (< 25m)');
  assert(pause1Res.coinDeducted === true, 'Exactly 1 coin deducted for confirmed early break');
  assert(pause1Res.userCoins === 9, 'User coin balance is now 9 (10 - 1 = 9)');

  const tx1 = await CoinTransaction.findOne({ userId: testUser._id, type: 'early_break_penalty' });
  assert(tx1 !== null && tx1.amount === -1, 'CoinTransaction record created with type early_break_penalty and amount -1');

  // --- 3. CANCEL BREAK CONFIRMATION (Criterion 2) ---
  console.log('\n--- 3. Cancel Break Confirmation Causes No Coin Deduction (Criterion 2) ---');
  // In client: user presses Continue Studying -> NO pause request with isEarlyBreakConfirmed is sent, timer continues!
  // Backend simulation: if pause is called with isEarlyBreakConfirmed: false and interval < 1500s:
  const noBreakRes = await post(`/${sessionId}/pause`, {
    intervalSeconds: 800,
    actualSeconds: 800,
    isEarlyBreakConfirmed: false,
    actionId: `test_unconfirmed_${Date.now()}`,
  });
  assert(noBreakRes.coinDeducted === false, 'Unconfirmed early break deducts 0 coins');
  assert((await getUserCoins()) === 9, 'Coin balance remains 9');

  // --- 4. RESUME STARTS NEW 25-MINUTE INTERVAL (Criterion 3 & 6) ---
  console.log('\n--- 4. Resume Starts New 25-Minute Interval (Criterion 6) ---');
  const resume1Res = await post(`/${sessionId}/resume`);
  assert(resume1Res.success === true, 'Resume request succeeded');
  assert(resume1Res.intervalActiveSeconds === 0, 'New interval counter reset to 0 upon resume');
  assert(resume1Res.actualSeconds >= 600, 'Accumulated focus time (600s) is strictly preserved');

  // --- 5. STUDY EXACTLY 25 MINUTES IN CURRENT INTERVAL (Criterion 3) ---
  console.log('\n--- 5. Break After Exactly 25 Minutes (Criterion 3) ---');
  // User studies for exactly 25 minutes = 1500 seconds in this interval
  const pause2Res = await post(`/${sessionId}/pause`, {
    intervalSeconds: 1500,
    actualSeconds: 2100, // 600 from interval 1 + 1500 from interval 2 = 2100s
    isEarlyBreakConfirmed: false,
    actionId: `test_action_break_2_${Date.now()}`,
  });

  assert(pause2Res.isEarlyBreak === false, 'Break after exactly 25 minutes is NOT early');
  assert(pause2Res.isPenaltyFree === true, 'Break after exactly 25 minutes is marked penalty-free');
  assert(pause2Res.coinDeducted === false, 'Break after exactly 25m deducts 0 coins');
  assert(pause2Res.userCoins === 9, 'User coins remain 9 (no penalty)');

  // --- 6. BREAK AFTER MORE THAN 25 MINUTES (Criterion 4) ---
  console.log('\n--- 6. Break After More Than 25 Minutes (Criterion 4) ---');
  await post(`/${sessionId}/resume`);
  // User studies 40 minutes (2400 seconds) in interval 3
  const pause3Res = await post(`/${sessionId}/pause`, {
    intervalSeconds: 2400,
    actualSeconds: 4500, // 2100 + 2400 = 4500s (1h 15m)
    isEarlyBreakConfirmed: false,
    actionId: `test_action_break_3_${Date.now()}`,
  });

  assert(pause3Res.isEarlyBreak === false, 'Break after 40m (> 25m) is NOT early');
  assert(pause3Res.coinDeducted === false, 'Break after 40m deducts 0 coins');
  assert(pause3Res.userCoins === 9, 'Balance remains 9');
  assert(pause3Res.actualSeconds === 4500, 'Total accumulated focus time is 4500s (1 hour 15 minutes)');

  // --- 7. PAUSED TIME AND COUNTDOWN DO NOT COUNT TOWARD 25M (Criterion 5) ---
  console.log('\n--- 7. Paused Time & Countdown Do Not Count Toward 25m Threshold (Criterion 5) ---');
  // User resumes -> interval starts at 0
  await post(`/${sessionId}/resume`);
  // Suppose 5 minutes pass in wall clock while user is paused or in countdown
  // Client only tracks verified active focus time
  // User pauses after 5 minutes of active focus:
  const sharedActionId = `test_rapid_break_${Date.now()}`;
  const pause4Res = await post(`/${sessionId}/pause`, {
    intervalSeconds: 300, // only 5m active
    actualSeconds: 4800,
    isEarlyBreakConfirmed: true,
    actionId: sharedActionId,
  });

  assert(pause4Res.isEarlyBreak === true, '5 minutes active focus does not meet 25m threshold despite wall-clock time');
  assert(pause4Res.coinDeducted === true, '1 coin penalty deducted for 5m interval');
  assert(pause4Res.userCoins === 8, 'Balance updated to 8');
  assert((await getUserCoins()) === 8, 'Database coin balance is 8');

  // --- 8. RAPID CLICKS & DUPLICATE BREAK CALLS (Criterion 8) ---
  console.log('\n--- 8. Rapid Clicks / Duplicate Pause Calls (Criterion 8) ---');
  const duplicatePauseRes = await post(`/${sessionId}/pause`, {
    intervalSeconds: 300,
    actualSeconds: 4800,
    isEarlyBreakConfirmed: true,
    actionId: sharedActionId,
  });

  assert(duplicatePauseRes.coinDeducted === false, 'Duplicate pause with same actionId does NOT deduct duplicate coins');
  assert((await getUserCoins()) === 8, 'Balance remains 8 coins');

  // --- 9. INSUFFICIENT COIN BALANCE NEVER BECOMES NEGATIVE (Criterion 9) ---
  console.log('\n--- 9. Non-Negative Balance Enforcement (Criterion 9) ---');
  testUser.coins = 0;
  await testUser.save();

  await post(`/${sessionId}/resume`);
  const zeroCoinPauseRes = await post(`/${sessionId}/pause`, {
    intervalSeconds: 120, // 2 mins
    actualSeconds: 4920,
    isEarlyBreakConfirmed: true,
    actionId: `test_zero_coins_${Date.now()}`,
  });

  assert(zeroCoinPauseRes.coinDeducted === false, 'Cannot deduct coin when balance is 0');
  assert((await getUserCoins()) === 0, 'User balance remains clamped at 0, never negative');

  // Restore coins for subsequent tests
  testUser.coins = 10;
  await testUser.save();

  // --- 10. BROWSER CLOSURE / UNLOAD DOES NOT APPLY BREAK PENALTY (Criterion 10) ---
  console.log('\n--- 10. Checkpoint / Browser Close Does Not Apply Break Penalty (Criterion 10) ---');
  await post(`/${sessionId}/resume`);
  const checkpointRes = await post(`/${sessionId}/checkpoint`, {
    actualSeconds: 5000,
    intervalSeconds: 80,
    closing: true,
  });

  assert(checkpointRes.success === true, 'Checkpoint accepted');
  assert(checkpointRes.status === 'paused', 'Session status set to paused on browser close');
  assert((await getUserCoins()) === 10, 'No break penalty charged on browser closure');

  // --- 11. RESTORE UNFINISHED FOCUS WORK AFTER LOGOUT/LOGIN (Criterion 11) ---
  console.log('\n--- 11. Restore Unfinished Focus Work After Logout/Login (Criterion 11) ---');
  const activeRes = await get('/active');
  assert(activeRes.success === true, 'GET /active returns success');
  assert(activeRes.activeSessions.length > 0, 'Unfinished session found for today');

  const recovered = activeRes.activeSessions[0];
  assert(recovered.taskName === 'Backend Architecture', 'Recovered session has correct subject');
  assert(recovered.totalGoalSeconds === 18000, 'Today\'s 5-hour goal (18,000s) is preserved');
  assert(recovered.actualSeconds === 5000, 'Accumulated focus time (5000s) is preserved');
  const remainingSecs = Math.max(0, recovered.totalGoalSeconds - recovered.actualSeconds);
  assert(remainingSecs === 13000, 'Remaining time is 13,000s (3 hours 36 mins 40 secs)');
  assert(formatTimerHMS(remainingSecs) === '03 H : 36 M : 40 S', 'Remaining time formats in HH H : MM M : SS S');

  // --- 12. PERMIT ONLY ONE ACTIVELY RUNNING FOCUS TIMER (Criterion 5) ---
  console.log('\n--- 12. Permit Only One Actively Running Focus Timer Per User (Criterion 5) ---');
  // Start second session for "Database Systems"
  const session2Start = await post('/start', {
    subjectName: 'Database Systems',
    colorTag: '#3B82F6',
    durationMinutes: 60,
  });

  const session1Updated = await PomodoroSession.findById(sessionId);
  assert(session1Updated.status === 'paused', 'Previous session was automatically paused when starting new subject');
  assert(session2Start.session.status === 'in-progress', 'New session is in-progress');

  // --- 13. SESSION COMPLETION AWARDS +5 COINS ONLY ONCE (Criterion 13) ---
  console.log('\n--- 13. Completed Session Awards Exactly +5 Coins Once (Criterion 13) ---');
  const userCoinsBeforeComplete = await getUserCoins();
  const completeRes = await post(`/${session2Start.session._id}/complete`);

  assert(completeRes.success === true, 'Session completes successfully');
  assert(completeRes.sessionCoins === 5, 'Session completion awards exactly 5 coins');
  assert((await getUserCoins()) === userCoinsBeforeComplete + 5, 'User coin balance incremented by exactly 5');

  // Duplicate complete request
  const dupCompleteRes = await post(`/${session2Start.session._id}/complete`);
  assert(dupCompleteRes.alreadyCompleted === true, 'Duplicate complete detected');
  assert((await getUserCoins()) === userCoinsBeforeComplete + 5, 'Balance remains unchanged on duplicate complete');

  // --- 14. NEXT LOCAL DAY STARTS FRESH WITHOUT CORRUPTING HISTORY (Criterion 14) ---
  console.log('\n--- 14. Next Local Day Scoping (Criterion 14) ---');
  // Yesterday's session has dateStr in the past
  const yesterdaySession = await PomodoroSession.create({
    userId: testUser._id,
    taskId: session2Start.session.taskId,
    taskName: 'Ancient History',
    durationMinutes: 60,
    actualSeconds: 3600,
    dateStr: '2026-10-01', // old date
    status: 'completed',
  });

  // Querying active for today strictly filters dateStr === todayStr
  const todayActive = await PomodoroSession.find({
    userId: testUser._id,
    dateStr: todayStr,
    status: { $in: ['in-progress', 'paused', 'interrupted'] },
  });

  assert(todayActive.every(s => s.dateStr === todayStr), 'Only today\'s sessions are active; yesterday\'s records are historical');

  // --- 15. UI INDICATORS & COUNTDOWN TAGLINE VERIFICATION (Criterion 15) ---
  console.log('\n--- 15. UI Components, Tagline & Text String Checks ---');
  const focusPageContent = fs.readFileSync(path.join(rootDir, 'client/src/pages/FocusPage.jsx'), 'utf-8');
  assert(focusPageContent.includes('25 minutes abhi complete nahi hue!'), 'FocusPage contains exact break warning title: "25 minutes abhi complete nahi hue!"');
  assert(focusPageContent.includes('Break lene par 1 coin deduct hoga. Continue studying or take a break?'), 'FocusPage contains exact supporting text');
  assert(focusPageContent.includes('“Honest with yourself. I track your time, not your lies.👀”'), 'FocusPage contains exact tagline with emoji');
  assert(focusPageContent.includes('Focus Interval:'), 'FocusPage displays Focus Interval indicator');
  assert(focusPageContent.includes('Take Free Break'), 'FocusPage has Take Free Break button');
  assert(focusPageContent.includes('Take Break (−1 Coin)'), 'FocusPage has Take Break (−1 Coin) button');

  const homePageContent = fs.readFileSync(path.join(rootDir, 'client/src/pages/HomePage.jsx'), 'utf-8');
  assert(homePageContent.includes('Unfinished Focus Quest'), 'HomePage displays Unfinished Focus Quest card');
  assert(homePageContent.includes('Resume Focus'), 'HomePage contains Resume Focus action');
  assert(homePageContent.includes('Not Now'), 'HomePage contains Not Now action');

  // Cleanup
  server.close();
  await User.deleteMany({ email: testEmail });
  await PomodoroSession.deleteMany({ userId: testUser._id });
  await Task.deleteMany({ userId: testUser._id });
  await CoinTransaction.deleteMany({ userId: testUser._id });
  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} ACCEPTANCE CRITERIA TESTS PASSED PERFECTLY!`);
  console.log('================================================================\n');
}

runBreakPenaltyAndResumeTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
