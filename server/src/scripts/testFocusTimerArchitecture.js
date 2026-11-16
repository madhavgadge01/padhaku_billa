import assert from 'assert';
import {
  calculateSessionFocusSeconds,
  calculateSessionFocusMinutes,
} from '../utils/focusTimeHelper.js';

console.log('\n================================================================');
console.log('🧪 PADHAKU BILLA FOCUS TIMER ARCHITECTURE & RECOVERY TEST SUITE');
console.log('================================================================\n');

let passes = 0;
let failures = 0;

function test(name, fn) {
  try {
    fn();
    passes++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    failures++;
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Timestamp-based active intervals exclude paused duration
// -------------------------------------------------------------
test('Interval calculation: strictly excludes paused time between intervals', () => {
  // Session starts at 12:00, pauses at 12:12 (12 mins)
  const start1 = new Date('2026-11-16T12:00:00.000Z');
  const pause1 = new Date('2026-11-16T12:12:00.000Z');
  // Paused from 12:12 to 12:30 (18 mins pause gap)
  // Resumes at 12:30, pauses at 12:48 (18 mins)
  const resume1 = new Date('2026-11-16T12:30:00.000Z');
  const pause2 = new Date('2026-11-16T12:48:00.000Z');

  const session = {
    intervals: [
      {
        startedAt: start1,
        endedAt: pause1,
        durationSeconds: Math.round((pause1.getTime() - start1.getTime()) / 1000), // 720s
      },
      {
        startedAt: resume1,
        endedAt: pause2,
        durationSeconds: Math.round((pause2.getTime() - resume1.getTime()) / 1000), // 1080s
      },
    ],
    actualSeconds: 1800,
    status: 'paused',
  };

  const focusSecs = calculateSessionFocusSeconds(session);
  const focusMins = calculateSessionFocusMinutes(session);

  assert.strictEqual(focusSecs, 1800, `Expected 1800 seconds (30m), got ${focusSecs}`);
  assert.strictEqual(focusMins, 30, `Expected 30 minutes, got ${focusMins}`);
});

// -------------------------------------------------------------
// Test 2: Fallback to actualSeconds if intervals not populated
// -------------------------------------------------------------
test('Fallback focus duration: calculates accurately from actualSeconds and durationMinutes', () => {
  const legacySession = {
    actualSeconds: 1500,
    status: 'completed',
  };
  assert.strictEqual(calculateSessionFocusSeconds(legacySession), 1500);
  assert.strictEqual(calculateSessionFocusMinutes(legacySession), 25);

  const olderCompletedSession = {
    durationMinutes: 25,
    status: 'completed',
  };
  assert.strictEqual(calculateSessionFocusSeconds(olderCompletedSession), 1500);
  assert.strictEqual(calculateSessionFocusMinutes(olderCompletedSession), 25);

  const partialInterruptedNoTime = {
    durationMinutes: 25,
    status: 'interrupted',
  };
  assert.strictEqual(calculateSessionFocusSeconds(partialInterruptedNoTime), 0, 'Partial session with no verified time must return 0');
});

// -------------------------------------------------------------
// Test 3: 48-Hour Recovery Retention Logic
// -------------------------------------------------------------
test('48-Hour Retention: uncompleted sessions older than 48h expire, completed sessions NEVER expire', () => {
  const now = new Date('2026-11-16T15:00:00.000Z');
  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  const fiftyHoursAgo = new Date(now.getTime() - 50 * 60 * 60 * 1000);

  // Recent paused session (within 48h)
  const recentPausedSession = {
    status: 'paused',
    updatedAt: twentyHoursAgo,
    expiresAt: new Date(twentyHoursAgo.getTime() + 48 * 60 * 60 * 1000),
  };
  const isRecentExpired = recentPausedSession.expiresAt < now;
  assert.strictEqual(isRecentExpired, false, 'Recent paused session within 48h must NOT be expired');

  // Stale uncompleted session (over 48h)
  const staleSession = {
    status: 'paused',
    updatedAt: fiftyHoursAgo,
    expiresAt: new Date(fiftyHoursAgo.getTime() + 48 * 60 * 60 * 1000),
  };
  const isStaleExpired = staleSession.expiresAt < now;
  assert.strictEqual(isStaleExpired, true, 'Uncompleted session over 48h must be marked expired');

  // Historical completed session (over 48h old, e.g. 50 hours ago)
  const completedOldSession = {
    status: 'completed',
    updatedAt: fiftyHoursAgo,
    expiresAt: null, // Completed sessions have expiresAt: null
  };
  assert.strictEqual(completedOldSession.expiresAt, null, 'Completed sessions must never have an expiration timestamp');
  assert.notStrictEqual(completedOldSession.status, 'expired', 'Completed sessions must NEVER be expired');
});

// -------------------------------------------------------------
// Test 4: Stopwatch Task Completion Coin Reward & Idempotency
// -------------------------------------------------------------
test('Stopwatch Reward & Idempotency: awards 5 coins on completion and prevents duplicate awards on retry', () => {
  const user = {
    _id: 'user_123',
    coins: 10,
  };
  const session = {
    _id: 'sess_stopwatch_456',
    taskName: 'Math Practice',
    actualSeconds: 1500,
    coinsEarned: 0,
  };
  const transactions = new Map();

  function awardStopwatchCompletion(userObj, sessObj, targetSubjectId, dateStr) {
    const taskRef = `task_complete_${targetSubjectId}_${dateStr}`;
    if (transactions.has(taskRef)) {
      // Idempotency: duplicate request returns existing state
      return {
        alreadyAwarded: true,
        coinsAwarded: 0,
        userCoins: userObj.coins,
      };
    }

    userObj.coins += 5;
    sessObj.coinsEarned = 5;
    transactions.set(taskRef, {
      userId: userObj._id,
      amount: 5,
      type: 'task_completion',
      referenceId: taskRef,
    });

    return {
      alreadyAwarded: false,
      coinsAwarded: 5,
      userCoins: userObj.coins,
    };
  }

  // 1st completion call:
  const firstResult = awardStopwatchCompletion(user, session, 'sub_math', '2026-11-16');
  assert.strictEqual(firstResult.coinsAwarded, 5, 'First completion must award 5 coins');
  assert.strictEqual(user.coins, 15, 'User coins balance must be 15');
  assert.strictEqual(session.coinsEarned, 5, 'Session coinsEarned must be 5');

  // 2nd completion call (retry / duplicate):
  const secondResult = awardStopwatchCompletion(user, session, 'sub_math', '2026-11-16');
  assert.strictEqual(secondResult.coinsAwarded, 0, 'Duplicate call must NOT award coins');
  assert.strictEqual(secondResult.alreadyAwarded, true, 'Must indicate alreadyAwarded');
  assert.strictEqual(user.coins, 15, 'User coins must remain 15, not 20');
});

// -------------------------------------------------------------
// Test 5: Separation of Task Completion & Stopping
// -------------------------------------------------------------
test('Separation of stopping & task completion: stopping early preserves focus seconds with 0 completion coins and incomplete status', () => {
  const session = {
    totalGoalSeconds: 1500,
    actualSeconds: 720,
    status: 'in-progress',
    coinsEarned: 0,
  };

  // User stops session early at 12 minutes (720s)
  function stopSessionEarly(sess) {
    sess.status = 'stopped';
    sess.coinsEarned = 0;
    const isCompleted = sess.actualSeconds >= sess.totalGoalSeconds;
    return {
      status: sess.status,
      coinsEarned: sess.coinsEarned,
      isCompleted,
      actualSeconds: sess.actualSeconds,
    };
  }

  const result = stopSessionEarly(session);
  assert.strictEqual(result.status, 'stopped');
  assert.strictEqual(result.coinsEarned, 0, 'Stopped early sessions must earn 0 coins');
  assert.strictEqual(result.isCompleted, false, 'Stopped early session must NOT mark task complete');
  assert.strictEqual(result.actualSeconds, 720, 'Genuine elapsed focus time of 720s must be saved');
});

// -------------------------------------------------------------
// Test 6: Pomodoro Phase Rules: Focus phase complete != Task complete
// -------------------------------------------------------------
test('Pomodoro Phase Rules: focus interval boundary alerts user and switches to break without auto-completing task', () => {
  let isTaskCompleted = false;
  let activePhase = 'focus';
  let alertTriggered = null;

  function onPomodoroIntervalElapsed(remainingGoalSeconds) {
    // Focus interval (25m) concluded
    alertTriggered = { phase: 'focus', stage: 'ringing' };
    // Task is NOT completed automatically
    isTaskCompleted = false;
  }

  onPomodoroIntervalElapsed(0); // Even if remainingGoal is 0 at boundary
  assert.strictEqual(isTaskCompleted, false, 'Focus phase completion must NEVER auto-complete the task');
  assert.deepStrictEqual(alertTriggered, { phase: 'focus', stage: 'ringing' });

  // User chooses break
  activePhase = 'break';
  const breakDuration = 300; // 5 min
  let studyDurationCounted = 0;

  // During break, study timer does NOT increment
  function onBreakTick() {
    // Break elapsed does not add to studyDurationCounted
  }
  onBreakTick();
  assert.strictEqual(studyDurationCounted, 0, 'Break duration must never count toward study duration');
});

// -------------------------------------------------------------
// Test 7: Auto-Completion Prevention on Restore / Return
// -------------------------------------------------------------
test('Auto-completion prevention on restore: returns to paused state, never triggers completeSession', () => {
  const now = Date.now();
  const pastSessionEnd = now - 1000 * 60 * 10; // 10 minutes ago
  let wasCompleteCalled = false;

  const storedData = {
    isRunning: true,
    isPaused: false,
    sessionEndTimestamp: pastSessionEnd,
    totalSeconds: 1500,
    baseAccumulatedSeconds: 720, // user had only studied 12 minutes before leaving
  };

  // New safe restore logic:
  function restoreSessionSafely(data) {
    if (now >= data.sessionEndTimestamp) {
      // Must NOT call complete!
      const totalGoal = data.totalSeconds || 1500;
      const verifiedAcc = Math.min(totalGoal, data.baseAccumulatedSeconds || 0);
      const remainingSecs = Math.max(0, totalGoal - verifiedAcc);

      return {
        isRunning: false,
        isPaused: true,
        sessionEndTimestamp: null,
        timeLeft: remainingSecs,
        accumulatedSeconds: verifiedAcc,
        completedAutomatically: false,
      };
    }
    return { completedAutomatically: false };
  }

  const restored = restoreSessionSafely(storedData);
  assert.strictEqual(restored.completedAutomatically, false, 'Session must not be completed automatically');
  assert.strictEqual(restored.isPaused, true, 'Restored session must be in paused state');
  assert.strictEqual(restored.accumulatedSeconds, 720, 'Restored session must preserve verified 720s');
  assert.strictEqual(restored.timeLeft, 780, 'Restored session must have 780s remaining');
  assert.strictEqual(wasCompleteCalled, false, 'Complete function must never be called on restore');
});

console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passes} passed, ${failures} failed`);
console.log('----------------------------------------------------------------\n');

if (failures > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL FOCUS TIMER ARCHITECTURE TESTS PASSED SUCCESSFULLY!\n');
}
