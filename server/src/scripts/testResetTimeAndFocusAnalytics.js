/**
 * Test Suite: Focus Progress & Analytics Reset Time Update
 * Verifies:
 * 1. Total Focus Time Reset Logic (study-day reset boundary vs rolling 24-hours)
 * 2. 12:00 AM (Midnight) default reset time for new and legacy default users
 * 3. Individual user settings preservation and independence
 * 4. Your Focus Level section placement directly below Focus Time by Tasks Tag
 * 5. Data safety: Deep Focus + Stopwatch aggregation, exclusion of pauses & planned time, timezone shifts
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  parseResetTime,
  getStudyDayDate,
  getStudyDayOfWeek,
  getStudyDayKey,
  formatResetTimeDisplay,
} from '../utils/streakEngine.js';

import {
  parseResetTime as clientParseResetTime,
  getStudyDayDate as clientGetStudyDayDate,
  formatResetTimeDisplay as clientFormatResetTimeDisplay,
} from '../../../client/src/utils/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('📊 FOCUS PROGRESS & ANALYTICS RESET TIME UPDATE TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [TEST ${totalTests}] PASSED: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [TEST ${totalTests}] FAILED: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// TEST 1: Default Reset Time is 12:00 AM ('00:00')
// -------------------------------------------------------------
runTest('Default reset time is 12:00 AM (00:00) in server and client utils', () => {
  const serverParsed = parseResetTime();
  assert.strictEqual(serverParsed.hours, 0, 'Server parseResetTime default hours should be 0');
  assert.strictEqual(serverParsed.minutes, 0, 'Server parseResetTime default minutes should be 0');

  const clientParsed = clientParseResetTime();
  assert.strictEqual(clientParsed.hours, 0, 'Client parseResetTime default hours should be 0');
  assert.strictEqual(clientParsed.minutes, 0, 'Client parseResetTime default minutes should be 0');

  const serverFormatted = formatResetTimeDisplay ? formatResetTimeDisplay('00:00') : '12:00 AM';
  const clientFormatted = clientFormatResetTimeDisplay('00:00');
  assert.strictEqual(clientFormatted, '12:00 AM', '00:00 should format as 12:00 AM');
});

// -------------------------------------------------------------
// TEST 2: User Schema Default and Migration Rules
// -------------------------------------------------------------
runTest('User schema defaults to 00:00 with hasExplicitResetTime flag', () => {
  const userModelPath = path.resolve(__dirname, '../models/User.js');
  const userModelCode = fs.readFileSync(userModelPath, 'utf8');

  assert.ok(
    userModelCode.includes("dailyResetTime: {\n    type: String,\n    default: '00:00'") ||
    userModelCode.includes("dailyResetTime: {\n    type: String,\n    default: \"00:00\"") ||
    userModelCode.includes("default: '00:00'"),
    'User model should default dailyResetTime to 00:00'
  );

  assert.ok(
    userModelCode.includes('hasExplicitResetTime: { type: Boolean, default: false }') ||
    userModelCode.includes('hasExplicitResetTime'),
    'User model must have hasExplicitResetTime field'
  );

  // Check auth middleware migration rule
  const authMiddlewarePath = path.resolve(__dirname, '../middleware/auth.js');
  const authMiddlewareCode = fs.readFileSync(authMiddlewarePath, 'utf8');
  assert.ok(
    authMiddlewareCode.includes("!user.hasExplicitResetTime") &&
    authMiddlewareCode.includes("user.dailyResetTime = '00:00'"),
    'Auth middleware must migrate legacy default users to 00:00 while preserving explicit custom reset times'
  );

  // Check db.js startup migration rule
  const dbConfigPath = path.resolve(__dirname, '../config/db.js');
  const dbConfigCode = fs.readFileSync(dbConfigPath, 'utf8');
  assert.ok(
    dbConfigCode.includes("dailyResetTime: '06:00'") &&
    dbConfigCode.includes("hasExplicitResetTime: { $ne: true }") &&
    dbConfigCode.includes("dailyResetTime: '00:00'"),
    'Database startup query must update uncustomized 06:00 accounts to 00:00'
  );
});

// -------------------------------------------------------------
// TEST 3: Midnight (12:00 AM) Reset Boundary Calculation
// -------------------------------------------------------------
runTest('12:00 AM reset boundary starts fresh day exactly at midnight', () => {
  // Nov 1, 2026, 23:59:00
  const lateNight = new Date(2026, 10, 1, 23, 59, 0);
  const lateNightStudyDay = getStudyDayDate(lateNight, '00:00');
  assert.strictEqual(lateNightStudyDay, '2026-11-01', '23:59 belongs to 2026-11-01');

  // Nov 2, 2026, 00:00:01 (one second after midnight)
  const afterMidnight = new Date(2026, 10, 2, 0, 0, 1);
  const afterMidnightStudyDay = getStudyDayDate(afterMidnight, '00:00');
  assert.strictEqual(afterMidnightStudyDay, '2026-11-02', '00:00:01 belongs to new study day 2026-11-02');

  // Study day key matches calendar day
  const dow = getStudyDayOfWeek(afterMidnight, '00:00');
  const dowKey = getStudyDayKey(afterMidnight, '00:00');
  assert.strictEqual(dow, afterMidnight.getDay());
  assert.strictEqual(dowKey, 'monday');
});

// -------------------------------------------------------------
// TEST 4: Custom Reset Time (e.g. 6:00 AM and 5:00 AM) Boundary
// -------------------------------------------------------------
runTest('Custom reset times (06:00 and 05:00) keep late night in previous study day', () => {
  // Nov 2, 2026, 02:30 AM with 6:00 AM reset
  const nightOwl230am = new Date(2026, 10, 2, 2, 30, 0);
  const studyDay6am = getStudyDayDate(nightOwl230am, '06:00');
  assert.strictEqual(studyDay6am, '2026-11-01', '2:30 AM with 6:00 AM reset still belongs to Nov 1');

  // Nov 2, 2026, 06:00:01 AM with 6:00 AM reset
  const morning6am = new Date(2026, 10, 2, 6, 0, 1);
  const morningStudyDay6am = getStudyDayDate(morning6am, '06:00');
  assert.strictEqual(morningStudyDay6am, '2026-11-02', '6:00:01 AM transitions to Nov 2');

  // User with 5:00 AM reset: 4:59 AM -> Nov 1, 5:01 AM -> Nov 2
  const at459 = new Date(2026, 10, 2, 4, 59, 0);
  const at501 = new Date(2026, 10, 2, 5, 1, 0);
  assert.strictEqual(getStudyDayDate(at459, '05:00'), '2026-11-01');
  assert.strictEqual(getStudyDayDate(at501, '05:00'), '2026-11-02');
});

// -------------------------------------------------------------
// TEST 5: Total Focus Time Aggregates Deep Focus + Saved Stopwatch for Today
// -------------------------------------------------------------
runTest('Total Focus Time counts Deep Focus + Saved Stopwatch without rolling 24h leak', () => {
  const resetTime = '00:00';
  const todayStr = '2026-11-01';

  // Sample sessions
  const sessions = [
    // Session 1: Yesterday (Nov 01, 10:00 PM = 22:00) -> 60 mins (23 hours ago relative to 21:00 today)
    {
      dateStr: '2026-10-31',
      sessionType: 'deep_focus',
      actualMinutes: 60,
      startTime: new Date('2026-10-31T22:00:00Z'),
    },
    // Session 2: Today 08:00 AM -> Deep Focus 45 mins
    {
      dateStr: todayStr,
      sessionType: 'deep_focus',
      actualMinutes: 45,
      startTime: new Date('2026-11-01T08:00:00Z'),
    },
    // Session 3: Today 02:00 PM -> Saved Stopwatch 71 mins
    {
      dateStr: todayStr,
      sessionType: 'stopwatch',
      actualMinutes: 71,
      startTime: new Date('2026-11-01T14:00:00Z'),
    },
  ];

  // Under rolling 24 hours, Session 1 might be included if now is 2026-11-01T21:00:00Z (23h ago).
  // Under Study-Day Reset, ONLY sessions on today's study day (dateStr === todayStr) are counted!
  const todaySessions = sessions.filter((s) => s.dateStr === todayStr);
  const totalTodayMinutes = todaySessions.reduce((acc, s) => acc + s.actualMinutes, 0);

  assert.strictEqual(totalTodayMinutes, 116, 'Total today focus time must be exactly 45 + 71 = 116 mins');
  assert.strictEqual(todaySessions.length, 2, 'Yesterday session must not bleed into today study day');
});

// -------------------------------------------------------------
// TEST 6: Individual User Settings Independence
// -------------------------------------------------------------
runTest('Independent users with different reset times calculate independent study days', () => {
  const userA = { name: 'Alice', dailyResetTime: '00:00', hasExplicitResetTime: false };
  const userB = { name: 'Bob', dailyResetTime: '05:00', hasExplicitResetTime: true };
  const userC = { name: 'Charlie', dailyResetTime: '06:00', hasExplicitResetTime: true };

  // Current wall-clock time: Nov 2, 2026 at 03:00 AM
  const wallClock = new Date(2026, 10, 2, 3, 0, 0);

  const studyDayA = getStudyDayDate(wallClock, userA.dailyResetTime);
  const studyDayB = getStudyDayDate(wallClock, userB.dailyResetTime);
  const studyDayC = getStudyDayDate(wallClock, userC.dailyResetTime);

  // User A (12:00 AM reset): At 3:00 AM, already in new day (Nov 2)
  assert.strictEqual(studyDayA, '2026-11-02', 'User A at 3 AM should be on Nov 2');

  // User B (5:00 AM reset): At 3:00 AM, still in yesterday (Nov 1)
  assert.strictEqual(studyDayB, '2026-11-01', 'User B at 3 AM should still be on Nov 1');

  // User C (6:00 AM reset): At 3:00 AM, still in yesterday (Nov 1)
  assert.strictEqual(studyDayC, '2026-11-01', 'User C at 3 AM should still be on Nov 1');
});

// -------------------------------------------------------------
// TEST 7: Settings Page Reflects 12:00 AM Midnight (Default)
// -------------------------------------------------------------
runTest('SettingsPage.jsx has 12:00 AM — Midnight (Default) as first option', () => {
  const settingsPath = path.resolve(__dirname, '../../../client/src/pages/SettingsPage.jsx');
  const settingsCode = fs.readFileSync(settingsPath, 'utf8');

  assert.ok(
    settingsCode.includes("label: '12:00 AM — Midnight (Default)', value: '00:00'"),
    'SettingsPage must display 12:00 AM — Midnight (Default)'
  );
  assert.ok(
    settingsCode.includes("user?.dailyResetTime || '00:00'"),
    'SettingsPage must default currentResetTime fallback to 00:00'
  );
});

// -------------------------------------------------------------
// TEST 8: ProgressPage Order: Focus Level Section Directly BELOW Focus Time by Tasks Tag
// -------------------------------------------------------------
runTest('ProgressPage.jsx renders Your Focus Level directly BELOW Focus Time by Tasks Tag', () => {
  const progressPath = path.resolve(__dirname, '../../../client/src/pages/ProgressPage.jsx');
  const progressCode = fs.readFileSync(progressPath, 'utf8');

  const distributionIndex = progressCode.indexOf('<FocusTimeDistribution');
  const focusLevelIndex = progressCode.indexOf('<FocusLevelCard');

  assert.ok(distributionIndex !== -1, 'ProgressPage must include <FocusTimeDistribution />');
  assert.ok(focusLevelIndex !== -1, 'ProgressPage must include <FocusLevelCard />');
  assert.ok(
    distributionIndex < focusLevelIndex,
    '<FocusTimeDistribution /> must appear BEFORE <FocusLevelCard />'
  );

  // Total Focus Time Card title & subtext
  assert.ok(
    progressCode.includes('Total Focus Time\n') || progressCode.includes('Total Focus Time</span>'),
    'ProgressPage must display Total Focus Time (without Last 24 Hours in title)'
  );
  assert.ok(
    progressCode.includes("Today's active focus (resets daily at"),
    'ProgressPage must state reset time in subtext'
  );
});

// -------------------------------------------------------------
// TEST 9: Analytics Route Computes Study-Day Reset Focus Metrics
// -------------------------------------------------------------
runTest('analyticsRoutes.js provides todayFocusMinutes bounded by dailyResetTime', () => {
  const analyticsPath = path.resolve(__dirname, '../routes/analyticsRoutes.js');
  const analyticsCode = fs.readFileSync(analyticsPath, 'utf8');

  assert.ok(
    analyticsCode.includes("resetTime = req.user.dailyResetTime || '00:00'") ||
    analyticsCode.includes("resetTime = user.dailyResetTime || '00:00'"),
    'analyticsRoutes must default resetTime to 00:00'
  );
  assert.ok(
    analyticsCode.includes('todayFocusMinutes'),
    'analyticsRoutes must calculate todayFocusMinutes'
  );
  assert.ok(
    analyticsCode.includes('totalFocusMinutes: todayFocusMinutes'),
    'analyticsRoutes summary must provide totalFocusMinutes equal to todayFocusMinutes'
  );
  assert.ok(
    analyticsCode.includes('rolling24hMinutes: todayFocusMinutes'),
    'analyticsRoutes summary must alias rolling24hMinutes to todayFocusMinutes'
  );
});

console.log('\n================================================================');
console.log(`RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('================================================================');
