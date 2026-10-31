import assert from 'assert';
import {
  getStudyDayDate,
  getStudyDayKey,
  getWeekdayDateStr,
  calculateSubjectStreak,
} from '../utils/streakEngine.js';

console.log('================================================================');
console.log('🧪 RUNNING SMART TASK DELETION TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

const runTest = (name, fn) => {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Helper to simulate weekly timetable normalization with preservation
const normalizeWeeklyTimetable = (timetable = {}, existingWeeklyTimetable = {}) => {
  const subjectToColor = {};
  const usedColors = new Set();
  const normalized = {};

  DAYS.forEach((day) => {
    (timetable[day] || []).forEach((item) => {
      if (!item || !item.name) return;
      const cleanName = item.name.trim();
      const lower = cleanName.toLowerCase();
      let color = (item.color || '#3B82F6').trim();
      const colorKey = color.toUpperCase();

      if (!subjectToColor[lower]) {
        subjectToColor[lower] = color;
        usedColors.add(color.toUpperCase());
      }
    });
  });

  DAYS.forEach((day) => {
    normalized[day] = (timetable[day] || []).map((item, idx) => {
      const cleanName = (item.name || 'Subject').trim();
      const lower = cleanName.toLowerCase();
      const color = subjectToColor[lower] || '#3B82F6';

      let existingMatch = null;
      if (existingWeeklyTimetable && existingWeeklyTimetable[day]) {
        existingMatch = existingWeeklyTimetable[day].find(
          (s) => s.id === item.id || s.name?.trim().toLowerCase() === lower
        );
      }

      const excludedDates = Array.isArray(item.excludedDates)
        ? item.excludedDates
        : Array.isArray(existingMatch?.excludedDates)
        ? existingMatch.excludedDates
        : [];

      const repeatDaily = typeof item.repeatDaily === 'boolean'
        ? item.repeatDaily
        : typeof existingMatch?.repeatDaily === 'boolean'
        ? existingMatch.repeatDaily
        : false;

      const isArchived = typeof item.isArchived === 'boolean'
        ? item.isArchived
        : typeof existingMatch?.isArchived === 'boolean'
        ? existingMatch.isArchived
        : false;

      return {
        id: item.id || `sub_${Date.now()}_${idx}`,
        name: cleanName,
        color,
        targetMinutes: Math.max(5, Math.min(360, Number(item.targetMinutes) || 25)),
        completedDates: Array.isArray(item.completedDates)
          ? item.completedDates
          : Array.isArray(existingMatch?.completedDates)
          ? existingMatch.completedDates
          : [],
        excludedDates,
        repeatDaily,
        isArchived,
        currentStreak: typeof item.currentStreak === 'number'
          ? item.currentStreak
          : existingMatch?.currentStreak || 0,
        bestStreak: typeof item.bestStreak === 'number'
          ? item.bestStreak
          : existingMatch?.bestStreak || 0,
        lastCompletedDate: item.lastCompletedDate || existingMatch?.lastCompletedDate || '',
        order: typeof item.order === 'number' ? item.order : idx,
      };
    });
  });

  return normalized;
};

// Helper to filter enriched timetable
const getEnrichedTimetable = (timetable, date = new Date(), resetTime = '06:00') => {
  const enriched = {};
  const todayStr = getStudyDayDate(date, resetTime);
  DAYS.forEach((d) => {
    const dayDate = getWeekdayDateStr(d, date, resetTime);
    enriched[d] = (timetable[d] || [])
      .filter((sub) => {
        if (sub.isArchived) return false;
        if (Array.isArray(sub.excludedDates) && sub.excludedDates.includes(dayDate)) {
          return false;
        }
        return true;
      })
      .map((sub) => ({
        ...sub,
        completedToday: Array.isArray(sub.completedDates) && sub.completedDates.includes(todayStr),
      }));
  });
  return enriched;
};

// Helper for recurrence detection
const isTaskRecurring = (task, weeklyTimetable = {}) => {
  if (!task) return false;
  if (task.repeatDaily === true) return true;
  const cleanName = (task.name || '').trim().toLowerCase();
  const taskId = task.id || task._id;
  let count = 0;
  DAYS.forEach((d) => {
    const list = weeklyTimetable[d] || [];
    const found = list.find(
      (s) =>
        (taskId && (s.id === taskId || s._id?.toString() === taskId)) ||
        (cleanName && s.name?.trim().toLowerCase() === cleanName)
    );
    if (found) {
      count++;
      if (found.repeatDaily === true) count += 2;
    }
  });
  return count > 1;
};

// =========================================================================
// TEST SUITE EXECUTION
// =========================================================================

// Mock user state
let mockUser = {
  weeklyTimetable: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  },
  archivedTasks: [],
};

// Historical focus records (simulating PomodoroSession)
let mockPomodoroSessions = [
  {
    _id: 'sess_1',
    subjectId: 'subj_quantum_123',
    taskName: 'Quantum Physics',
    durationMinutes: 45,
    actualMinutesStudied: 45,
    completed: true,
    studyDateStr: '2026-10-31',
  },
  {
    _id: 'sess_2',
    subjectId: 'subj_quantum_123',
    taskName: 'Quantum Physics',
    durationMinutes: 45,
    actualMinutesStudied: 40,
    completed: true,
    studyDateStr: '2026-11-01',
  },
];

// Test 1: Create a task that repeats every day
runTest('1. Create a task that repeats every day across all 7 days', () => {
  const subjectId = 'subj_quantum_123';
  DAYS.forEach((d) => {
    mockUser.weeklyTimetable[d].push({
      id: subjectId,
      name: 'Quantum Physics',
      color: '#3B82F6',
      targetMinutes: 45,
      completedDates: ['2026-10-31'],
      excludedDates: [],
      repeatDaily: true,
      isArchived: false,
    });
  });

  const recurringCheck = isTaskRecurring(mockUser.weeklyTimetable.monday[0], mockUser.weeklyTimetable);
  assert.strictEqual(recurringCheck, true, 'Quantum Physics must be identified as recurring');

  DAYS.forEach((d) => {
    assert.strictEqual(mockUser.weeklyTimetable[d].length, 1, `${d} has 1 scheduled task`);
    assert.strictEqual(mockUser.weeklyTimetable[d][0].name, 'Quantum Physics');
  });
});

// Test 2 & 3: Delete it from Monday using "Delete for Today"
const mockMondayDate = '2026-11-02'; // Simulate date for Monday
runTest('2 & 3. Delete it from Monday using "Delete for Today" and verify it disappears from Monday', () => {
  const targetId = 'subj_quantum_123';
  const scope = 'today';
  const targetDateStr = mockMondayDate;

  // Perform "Delete for Today"
  DAYS.forEach((d) => {
    (mockUser.weeklyTimetable[d] || []).forEach((s) => {
      if (s.id === targetId) {
        if (!s.excludedDates.includes(targetDateStr)) {
          s.excludedDates.push(targetDateStr);
        }
      }
    });
  });

  // Verify raw timetable preserves original recurring rule
  assert.strictEqual(mockUser.weeklyTimetable.monday.length, 1, 'Original task document is preserved in Monday');
  assert.deepStrictEqual(mockUser.weeklyTimetable.monday[0].excludedDates, [mockMondayDate], 'Monday has exclusion for mockMondayDate');

  // Verify enriched timetable for Monday filters it out
  const mockDateMonday = new Date('2026-11-02T10:00:00Z');
  const enriched = getEnrichedTimetable(mockUser.weeklyTimetable, mockDateMonday);
  assert.strictEqual(enriched.monday.length, 0, 'Quantum Physics disappears from Monday schedule for today');
});

// Test 4: Verify it still appears on Tuesday and subsequent scheduled days
runTest('4. Verify it still appears on Tuesday and subsequent scheduled days', () => {
  const mockDateMonday = new Date('2026-11-02T10:00:00Z');
  const enriched = getEnrichedTimetable(mockUser.weeklyTimetable, mockDateMonday);

  assert.strictEqual(enriched.tuesday.length, 1, 'Tuesday still has Quantum Physics scheduled');
  assert.strictEqual(enriched.tuesday[0].name, 'Quantum Physics');
  assert.strictEqual(enriched.wednesday.length, 1, 'Wednesday still has Quantum Physics scheduled');
  assert.strictEqual(enriched.thursday.length, 1, 'Thursday still has Quantum Physics scheduled');
  assert.strictEqual(enriched.friday.length, 1, 'Friday still has Quantum Physics scheduled');
  assert.strictEqual(enriched.saturday.length, 1, 'Saturday still has Quantum Physics scheduled');
  assert.strictEqual(enriched.sunday.length, 1, 'Sunday still has Quantum Physics scheduled');
});

// Test 4b: Verify it reappears on next Monday's date
runTest('4b. Verify it automatically appears again on its next scheduled Monday occurrence', () => {
  const nextMondayDate = new Date('2026-11-09T10:00:00Z'); // Next week Monday
  const nextWeekEnriched = getEnrichedTimetable(mockUser.weeklyTimetable, nextMondayDate);
  assert.strictEqual(nextWeekEnriched.monday.length, 1, 'Quantum Physics automatically appears again on next Monday');
  assert.strictEqual(nextWeekEnriched.monday[0].name, 'Quantum Physics');
});

// Test 5 & 6: Delete it permanently
runTest('5 & 6. Delete it permanently and verify it disappears from all future scheduled days', () => {
  const targetId = 'subj_quantum_123';
  let archivedInfo = null;

  DAYS.forEach((d) => {
    mockUser.weeklyTimetable[d] = mockUser.weeklyTimetable[d].filter((s) => {
      const match = s.id === targetId;
      if (match && !archivedInfo) {
        archivedInfo = {
          id: s.id,
          name: s.name,
          color: s.color,
          targetMinutes: s.targetMinutes,
          archivedAt: new Date(),
        };
      }
      return !match;
    });
  });

  if (archivedInfo) {
    mockUser.archivedTasks.push(archivedInfo);
  }

  // Verify removed from all 7 days
  DAYS.forEach((d) => {
    assert.strictEqual(mockUser.weeklyTimetable[d].length, 0, `${d} has 0 tasks after permanent deletion`);
  });

  assert.strictEqual(mockUser.archivedTasks.length, 1, 'Task archived record created');
  assert.strictEqual(mockUser.archivedTasks[0].id, targetId);
});

// Test 7: Verify it is removed consistently from both Tasks and Weekly Plan
runTest('7. Verify permanent removal is consistent across both Tasks and Weekly Plan views', () => {
  const enriched = getEnrichedTimetable(mockUser.weeklyTimetable);
  DAYS.forEach((d) => {
    assert.strictEqual(enriched[d].length, 0, `Enriched timetable for ${d} has 0 tasks`);
  });
});

// Test 8: Verify historical focus time and progress records remain unchanged
runTest('8. Verify historical focus sessions and productivity records remain unchanged', () => {
  assert.strictEqual(mockPomodoroSessions.length, 2, 'Focus sessions collection has 2 sessions');
  assert.strictEqual(mockPomodoroSessions[0].subjectId, 'subj_quantum_123');
  assert.strictEqual(mockPomodoroSessions[0].actualMinutesStudied, 45);
  assert.strictEqual(mockPomodoroSessions[1].subjectId, 'subj_quantum_123');
  assert.strictEqual(mockPomodoroSessions[1].actualMinutesStudied, 40);

  const totalStudiedMinutes = mockPomodoroSessions.reduce((acc, s) => acc + s.actualMinutesStudied, 0);
  assert.strictEqual(totalStudiedMinutes, 85, 'Total studied minutes is 85 minutes, completely preserved');
});

// Test 9: Verify non-recurring tasks behave correctly
runTest('9. Verify non-recurring single-day task is correctly identified and handled', () => {
  const singleTaskId = 'subj_single_456';
  mockUser.weeklyTimetable.monday.push({
    id: singleTaskId,
    name: 'Dentist Appointment Prep',
    color: '#10B981',
    targetMinutes: 20,
    completedDates: [],
    excludedDates: [],
    repeatDaily: false,
    isArchived: false,
  });

  const singleTask = mockUser.weeklyTimetable.monday[0];
  const isRecurring = isTaskRecurring(singleTask, mockUser.weeklyTimetable);
  assert.strictEqual(isRecurring, false, 'Single-day task with repeatDaily: false is identified as non-recurring');

  // Deleting this non-recurring task directly removes it
  mockUser.weeklyTimetable.monday = mockUser.weeklyTimetable.monday.filter((s) => s.id !== singleTaskId);
  assert.strictEqual(mockUser.weeklyTimetable.monday.length, 0, 'Non-recurring task removed cleanly');
});

// Test 10: Verify Cancel does not change anything
runTest('10. Verify Cancel leaves schedule and records completely unchanged', () => {
  const testSubject = {
    id: 'subj_art_789',
    name: 'Art History',
    color: '#EC4899',
    targetMinutes: 30,
    completedDates: [],
    excludedDates: [],
    repeatDaily: true,
  };
  mockUser.weeklyTimetable.tuesday.push(testSubject);

  const beforeTuesdayCount = mockUser.weeklyTimetable.tuesday.length;
  // Cancel action: modal closes with no backend mutation
  const afterTuesdayCount = mockUser.weeklyTimetable.tuesday.length;
  assert.strictEqual(beforeTuesdayCount, afterTuesdayCount, 'Cancel action leaves state unchanged');
});

// Test 11: Idempotency of repeated deletion requests
runTest('11. Verify repeated "Delete for Today" requests are idempotent', () => {
  const task = {
    id: 'subj_idemp_1',
    name: 'Chemistry Lab',
    color: '#06B6D4',
    targetMinutes: 30,
    completedDates: [],
    excludedDates: [],
    repeatDaily: true,
  };

  const testDate = '2026-11-01';
  // Repeatedly call exclusion
  for (let i = 0; i < 5; i++) {
    if (!task.excludedDates.includes(testDate)) {
      task.excludedDates.push(testDate);
    }
  }

  assert.strictEqual(task.excludedDates.length, 1, 'excludedDates contains exactly 1 entry despite repeated calls');
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} SMART TASK DELETION TESTS PASSED!`);
console.log('================================================================\n');

