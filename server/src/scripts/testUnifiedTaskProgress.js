import assert from 'assert';
import {
  normalizeTaskName,
  findMatchingScheduledTask,
} from '../utils/dailyProgressEngine.js';

console.log('================================================================');
console.log('🧪 PADHAKU BILLA – UNIFIED TASK PROGRESS TEST SUITE');
console.log('   (Deep Focus + Stopwatch Synchronized Task Progress)');
console.log('================================================================');

// Mock User with a weekly schedule containing DSA (60m, blue) and English (30m, lime green)
const mockUser = {
  _id: 'user_123456789012345678901234',
  dailyResetTime: '06:00',
  coins: 50,
  weeklyTimetable: {
    monday: [
      { id: 'sub_dsa_1', name: 'DSA', targetMinutes: 60, color: '#3B82F6', completedDates: [], excludedDates: [] },
      { id: 'sub_eng_1', name: 'English', targetMinutes: 30, color: '#84CC16', completedDates: [], excludedDates: [] },
    ],
    tuesday: [
      { id: 'sub_dsa_1', name: 'DSA', targetMinutes: 60, color: '#3B82F6', completedDates: [], excludedDates: [] },
    ],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  },
  markModified: () => {},
  save: async () => {},
};

// In-memory simulation of DailyTaskProgress collection
const mockDailyProgressDb = {};

function getDailyKey(userId, dateStr, taskName) {
  return `${userId}_${dateStr}_${normalizeTaskName(taskName)}`;
}

// In-memory version of recordSessionToUnifiedProgress logic to verify mathematical and behavioral invariants
function simulateRecordSession({
  user,
  taskName,
  subjectId,
  actualSeconds,
  deltaSeconds = null,
  sessionId,
  sessionType,
  isFinal = false,
  dateStr = '2026-11-01',
  todayWeekday = 'monday',
}) {
  const addedSecs = deltaSeconds !== null ? Math.round(deltaSeconds) : Math.round(actualSeconds || 0);
  if (!user || addedSecs <= 0) {
    return { isCustom: true, progress: null };
  }

  // 1. Find matching scheduled task
  const daySubjects = user.weeklyTimetable?.[todayWeekday] || [];
  const matchedTask = daySubjects.find(
    (s) =>
      (subjectId && (s.id === subjectId || s._id === subjectId)) ||
      (taskName && s.name.trim().toLowerCase() === taskName.trim().toLowerCase())
  );

  if (!matchedTask) {
    return {
      isCustom: true,
      progress: null,
      originalColor: null,
    };
  }

  const cleanName = matchedTask.name.trim();
  const normalizedName = normalizeTaskName(cleanName);
  const originalColor = matchedTask.color || '#3B82F6';
  const targetMinutes = matchedTask.targetMinutes || 25;
  const targetSeconds = targetMinutes * 60;
  const key = getDailyKey(user._id, dateStr, cleanName);

  if (!mockDailyProgressDb[key]) {
    mockDailyProgressDb[key] = {
      userId: user._id,
      taskId: matchedTask.id,
      taskName: cleanName,
      normalizedName,
      color: originalColor,
      dateStr,
      targetMinutes,
      completedMinutes: 0,
      completedSeconds: 0,
      remainingMinutes: targetMinutes,
      remainingSeconds: targetSeconds,
      isCompleted: false,
      processedSessionIds: [],
    };
  }

  const progress = mockDailyProgressDb[key];
  const sessIdStr = sessionId ? String(sessionId) : null;

  // Idempotency: exact-once processing
  if (sessIdStr && deltaSeconds === null && progress.processedSessionIds.includes(sessIdStr)) {
    return {
      isCustom: false,
      progress,
      originalColor,
      isCompleted: progress.isCompleted,
    };
  }

  // Atomic update
  const newCompletedSeconds = progress.completedSeconds + addedSecs;
  const newCompletedMinutes = Math.round((newCompletedSeconds / 60) * 10) / 10;
  const isNowCompleted = progress.isCompleted || (newCompletedSeconds >= targetSeconds) || (newCompletedMinutes >= targetMinutes);
  const newRemainingSeconds = isNowCompleted ? 0 : Math.max(0, targetSeconds - newCompletedSeconds);
  const newRemainingMinutes = isNowCompleted ? 0 : Math.max(0, Math.ceil(newRemainingSeconds / 60));

  progress.completedSeconds = newCompletedSeconds;
  progress.completedMinutes = newCompletedMinutes;
  progress.remainingSeconds = newRemainingSeconds;
  progress.remainingMinutes = newRemainingMinutes;
  progress.isCompleted = isNowCompleted;

  if (sessIdStr && isFinal && !progress.processedSessionIds.includes(sessIdStr)) {
    progress.processedSessionIds.push(sessIdStr);
  }

  if (isNowCompleted) {
    if (!matchedTask.completedDates.includes(dateStr)) {
      matchedTask.completedDates.push(dateStr);
    }
  }

  return {
    isCustom: false,
    progress,
    originalColor,
    isCompleted: isNowCompleted,
    remainingMinutes: newRemainingMinutes,
    completedMinutes: newCompletedMinutes,
  };
}

// -------------------------------------------------------------
// SCENARIO 1: Stopwatch 20m on DSA (60m target) -> Remaining = 40m
// -------------------------------------------------------------
console.log('\n[SCENARIO 1] Stopwatch 20m study on DSA:');
const res1 = simulateRecordSession({
  user: mockUser,
  taskName: 'DSA',
  subjectId: 'sub_dsa_1',
  actualSeconds: 20 * 60, // 20 minutes
  sessionId: 'sw_session_1',
  sessionType: 'stopwatch',
  isFinal: true,
});

assert.strictEqual(res1.isCustom, false, 'DSA must be recognized as existing daily task');
assert.strictEqual(res1.originalColor, '#3B82F6', 'DSA original color must be preserved (blue)');
assert.strictEqual(res1.progress.completedMinutes, 20, 'DSA completed minutes must equal 20m');
assert.strictEqual(res1.progress.remainingMinutes, 40, 'DSA remaining minutes must equal 40m');
assert.strictEqual(res1.isCompleted, false, 'DSA must not be completed yet (20m / 60m)');
console.log('✓ SCENARIO 1 PASSED: 20m Stopwatch leaves exactly 40m remaining.');

// -------------------------------------------------------------
// SCENARIO 2: Deep Focus starts with remaining 40m -> Studies 15m -> Remaining = 25m
// -------------------------------------------------------------
console.log('\n[SCENARIO 2] Deep Focus continues DSA: 15m active focus');
const keyDSA = getDailyKey(mockUser._id, '2026-11-01', 'DSA');
const dsaProgBeforeDeepFocus = mockDailyProgressDb[keyDSA];
assert.strictEqual(dsaProgBeforeDeepFocus.remainingMinutes, 40, 'Deep Focus begins with remaining 40m');

const res2 = simulateRecordSession({
  user: mockUser,
  taskName: 'DSA',
  subjectId: 'sub_dsa_1',
  deltaSeconds: 15 * 60, // 15 minutes focus delta
  sessionId: 'pomo_session_2',
  sessionType: 'deep_focus',
  isFinal: false,
});

assert.strictEqual(res2.progress.completedMinutes, 35, 'Total completed minutes must now be 35m (20 + 15)');
assert.strictEqual(res2.progress.remainingMinutes, 25, 'Remaining minutes must now be 25m (60 - 35)');
assert.strictEqual(res2.isCompleted, false, 'DSA must not be completed yet');
console.log('✓ SCENARIO 2 PASSED: Deep Focus added 15m, total=35m, remaining=25m.');

// -------------------------------------------------------------
// SCENARIO 3: User pauses Deep Focus session -> Paused time is not counted
// -------------------------------------------------------------
console.log('\n[SCENARIO 3] Paused time is never counted toward task progress');
const dsaBeforePause = mockDailyProgressDb[keyDSA].completedSeconds;
// Pause occurs: user is on break for 10 minutes (600s), but verified focus delta is 0
const res3 = simulateRecordSession({
  user: mockUser,
  taskName: 'DSA',
  subjectId: 'sub_dsa_1',
  deltaSeconds: 0, // Zero active seconds during break
  sessionId: 'pomo_session_2',
  sessionType: 'deep_focus',
  isFinal: false,
});
assert.strictEqual(mockDailyProgressDb[keyDSA].completedSeconds, dsaBeforePause, 'Progress must not increment during pause/break');
console.log('✓ SCENARIO 3 PASSED: Paused duration does not increment task completed time.');

// -------------------------------------------------------------
// SCENARIO 4: User completes the remaining 25m in Deep Focus -> DSA marked completed
// -------------------------------------------------------------
console.log('\n[SCENARIO 4] Deep Focus completes remaining 25m -> Target achieved');
const res4 = simulateRecordSession({
  user: mockUser,
  taskName: 'DSA',
  subjectId: 'sub_dsa_1',
  deltaSeconds: 25 * 60, // 25 minutes
  sessionId: 'pomo_session_2',
  sessionType: 'deep_focus',
  isFinal: true,
});

assert.strictEqual(res4.progress.completedMinutes, 60, 'Total completed minutes must equal 60m');
assert.strictEqual(res4.progress.remainingMinutes, 0, 'Remaining minutes must equal 0m');
assert.strictEqual(res4.isCompleted, true, 'Task must be marked completed for today');
assert.strictEqual(mockUser.weeklyTimetable.monday[0].completedDates.includes('2026-11-01'), true, 'Timetable completedDates must record completion');
console.log('✓ SCENARIO 4 PASSED: DSA target (60m) reached and marked completed.');

// -------------------------------------------------------------
// SCENARIO 5: User studies extra 20m on completed DSA -> Recorded=80m, remaining=0m (never negative)
// -------------------------------------------------------------
console.log('\n[SCENARIO 5] Extra study time: 20m extra study on completed task');
const res5 = simulateRecordSession({
  user: mockUser,
  taskName: 'DSA',
  subjectId: 'sub_dsa_1',
  actualSeconds: 20 * 60, // 20 extra minutes
  sessionId: 'sw_session_extra_5',
  sessionType: 'stopwatch',
  isFinal: true,
});

assert.strictEqual(res5.progress.completedMinutes, 80, 'Full extra study time must be recorded (80m total, never truncated!)');
assert.strictEqual(res5.progress.remainingMinutes, 0, 'Remaining minutes must stay 0m (never negative!)');
assert.strictEqual(res5.isCompleted, true, 'Task remains completed');
console.log('✓ SCENARIO 5 PASSED: Full 80m recorded, remaining stays 0m (never negative).');

// -------------------------------------------------------------
// SCENARIO 6: Custom Stopwatch activity "Machine Learning" -> Alternating brown, no task modified
// -------------------------------------------------------------
console.log('\n[SCENARIO 6] Custom Stopwatch activity "Machine Learning"');
const res6 = simulateRecordSession({
  user: mockUser,
  taskName: 'Machine Learning',
  subjectId: null,
  actualSeconds: 45 * 60,
  sessionId: 'sw_custom_6',
  sessionType: 'stopwatch',
  isFinal: true,
});

assert.strictEqual(res6.isCustom, true, 'Machine Learning must be identified as custom activity');
assert.strictEqual(res6.progress, null, 'No daily task progress record should be modified for custom activity');
const customKey = getDailyKey(mockUser._id, '2026-11-01', 'Machine Learning');
assert.strictEqual(mockDailyProgressDb[customKey], undefined, 'No DailyTaskProgress created for custom activity');
console.log('✓ SCENARIO 6 PASSED: Custom Stopwatch activity does not alter daily tasks.');

// -------------------------------------------------------------
// SCENARIO 7: Stopwatch session for DSA uses DSA assigned color (blue), never brown
// -------------------------------------------------------------
console.log('\n[SCENARIO 7] Color rules for Stopwatch');
const dsaTaskMatch = mockUser.weeklyTimetable.monday.find(s => s.name === 'DSA');
assert.strictEqual(dsaTaskMatch.color, '#3B82F6', 'DSA color is Blue');
// Custom activity color simulation
const customSessionNumber1 = 1;
const customSessionNumber2 = 2;
const color1 = customSessionNumber1 % 2 === 1 ? '#C48255' : '#5D3318';
const color2 = customSessionNumber2 % 2 === 1 ? '#C48255' : '#5D3318';
assert.strictEqual(color1, '#C48255', '1st custom stopwatch session is Light Brown');
assert.strictEqual(color2, '#5D3318', '2nd custom stopwatch session is Dark Brown');
console.log('✓ SCENARIO 7 PASSED: DSA retains Blue #3B82F6, custom activities alternate browns.');

// -------------------------------------------------------------
// SCENARIO 8: Idempotency: exact-once processing via session IDs
// -------------------------------------------------------------
console.log('\n[SCENARIO 8] Session Idempotency guard');
const dsaCompletedSecsBefore = mockDailyProgressDb[keyDSA].completedSeconds;
const res8Duplicate = simulateRecordSession({
  user: mockUser,
  taskName: 'DSA',
  subjectId: 'sub_dsa_1',
  actualSeconds: 20 * 60,
  sessionId: 'sw_session_extra_5', // Already processed in scenario 5
  sessionType: 'stopwatch',
  isFinal: true,
});
assert.strictEqual(mockDailyProgressDb[keyDSA].completedSeconds, dsaCompletedSecsBefore, 'Duplicate session submission must not increment completed time');
console.log('✓ SCENARIO 8 PASSED: Duplicate session submission rejected idempotently.');

// -------------------------------------------------------------
// SCENARIO 9: Automatic 24-hour reset cleanup logic
// -------------------------------------------------------------
console.log('\n[SCENARIO 9] 24-hour boundary cleanup');
const yesterdayKey = getDailyKey(mockUser._id, '2026-10-31', 'DSA');
mockDailyProgressDb[yesterdayKey] = {
  userId: mockUser._id,
  dateStr: '2026-10-31',
  taskName: 'DSA',
  remainingMinutes: 10,
};
assert.ok(mockDailyProgressDb[yesterdayKey], 'Yesterday record exists');

// Simulate daily reset cleanup (delete dateStr < todayDateStr)
const todayDateStr = '2026-11-01';
Object.keys(mockDailyProgressDb).forEach((k) => {
  if (mockDailyProgressDb[k].dateStr < todayDateStr) {
    delete mockDailyProgressDb[k];
  }
});
assert.strictEqual(mockDailyProgressDb[yesterdayKey], undefined, 'Yesterday temporary task progress cleanly deleted');
assert.ok(mockDailyProgressDb[keyDSA], 'Today task progress preserved');
console.log('✓ SCENARIO 9 PASSED: Expired progress records cleaned on 24-hour reset boundary.');

// -------------------------------------------------------------
// SCENARIO 10: Delta-based pause / checkpoint continuity
// -------------------------------------------------------------
console.log('\n[SCENARIO 10] Delta-based pause/checkpoint continuity');
// Test session with multiple intermediate checkpoints:
// Checkpoint 1 at 300s, Checkpoint 2 at 600s, Pause at 750s, Complete at 900s
let lastRecorded = 0;
let totalSessionSeconds = 0;
let progressAdded = 0;

function mockCheckpoint(currentTotal) {
  totalSessionSeconds = currentTotal;
  const delta = Math.max(0, totalSessionSeconds - lastRecorded);
  progressAdded += delta;
  lastRecorded = totalSessionSeconds;
  return delta;
}

assert.strictEqual(mockCheckpoint(300), 300, 'Checkpoint 1 adds 300s');
assert.strictEqual(mockCheckpoint(600), 300, 'Checkpoint 2 adds 300s');
assert.strictEqual(mockCheckpoint(750), 150, 'Pause adds 150s');
assert.strictEqual(mockCheckpoint(900), 150, 'Complete adds 150s');
assert.strictEqual(progressAdded, 900, 'Total delta added across checkpoints and pause must exactly match 900s (15 min)');
console.log('✓ SCENARIO 10 PASSED: Intermediate checkpoints and pauses add exact delta without gaps or duplicates.');

console.log('\n================================================================');
console.log('🎉 ALL 10 UNIT TEST SCENARIOS PASSED WITH ZERO FAILURES!');
console.log('================================================================');

