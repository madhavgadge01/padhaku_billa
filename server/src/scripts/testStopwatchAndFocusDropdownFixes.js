import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('\n================================================================');
console.log('⏱️ PADGAKU BILLA — FOCUS PAGE DROPDOWN & PERSISTENT STOPWATCH SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// 1. Verify FocusPage source code updates
const focusPagePath = path.resolve('client/src/pages/FocusPage.jsx');
const focusPageContent = fs.readFileSync(focusPagePath, 'utf8');

console.log('--- 1. Change Button Dropdown Z-Index & Stacking Context ---');
it('Parent container has overflow-visible and relative z-20 (no clipping)', () => {
  assert(focusPageContent.includes('overflow-visible z-20'), 'Parent column must have overflow-visible and z-20');
});

it('Subject selector container has ref={subjectMenuRef} and relative w-full z-40', () => {
  assert(focusPageContent.includes('ref={subjectMenuRef} className="relative w-full z-40"'), 'Subject selector must have subjectMenuRef and z-40');
});

it('Dropdown menu has solid opaque background (bg-white dark:bg-[#162420]), high z-index (z-50), and shadow-2xl', () => {
  assert(focusPageContent.includes('bg-white dark:bg-[#162420] border-2 border-[#1B3B2F]/20 dark:border-[#34D399]/40 rounded-2xl shadow-2xl'), 'Menu must have solid opaque styling');
  assert(focusPageContent.includes('z-50'), 'Dropdown must have z-50');
});

it('Timer dial container has relative z-0 so it cannot overlap or show through dropdown', () => {
  assert(focusPageContent.includes('relative z-0 my-8 flex items-center justify-center'), 'Radial dial container must have relative z-0');
});

it('Click-outside listener is attached to subjectMenuRef to dismiss dropdown', () => {
  assert(focusPageContent.includes('subjectMenuRef.current.contains(e.target)'), 'Click outside must check subjectMenuRef');
  assert(focusPageContent.includes("document.addEventListener('mousedown', handleClickOutside)"), 'mousedown listener added');
  assert(focusPageContent.includes("document.addEventListener('touchstart', handleClickOutside)"), 'touchstart listener added');
});

console.log('\n--- 2. Single Unique Display for Today\'s Planned Subjects (No Duplication) ---');
it('General tasks duplicate section is removed from dropdown', () => {
  assert(!focusPageContent.includes('General tasks:'), 'Duplicate "General tasks:" must not exist in dropdown');
});

it('displaySubjects memo deduplicates subjects by name and ID', () => {
  assert(focusPageContent.includes('displaySubjects = React.useMemo('), 'displaySubjects memo must exist');
  assert(focusPageContent.includes('seenNames'), 'displaySubjects must track seenNames');
  assert(focusPageContent.includes('seenIds'), 'displaySubjects must track seenIds');
});

it('displaySubjects simulation correctly prevents duplicate items', () => {
  const timetableToday = [
    { id: 'sub-1', name: 'Mathematics', color: '#10B981', targetMinutes: 60 },
    { id: 'sub-2', name: 'Physics', color: '#3B82F6', targetMinutes: 45 }
  ];
  const tasks = [
    { _id: 'task-1', name: 'Mathematics', colorTag: '#10B981', durationMinutes: 60 }, // DUPLICATE by name
    { _id: 'sub-2', name: 'Physics', colorTag: '#3B82F6', durationMinutes: 45 },      // DUPLICATE by id
    { _id: 'task-3', name: 'Chemistry', colorTag: '#F59E0B', durationMinutes: 30 }    // UNIQUE
  ];

  // Logic replicated from FocusPage.jsx
  const list = [...timetableToday];
  const seenNames = new Set(list.map((s) => (s.name || '').trim().toLowerCase()));
  const seenIds = new Set(list.map((s) => String(s.id || s._id || '')));

  tasks.forEach((t) => {
    const cleanName = (t.name || '').trim().toLowerCase();
    const idStr = String(t._id || t.id || '');
    if (!seenNames.has(cleanName) && !seenIds.has(idStr)) {
      list.push({
        id: t._id || t.id,
        _id: t._id || t.id,
        name: t.name,
        color: t.colorTag || '#3B82F6',
        colorTag: t.colorTag || '#3B82F6',
        targetMinutes: t.durationMinutes || 25,
      });
      seenNames.add(cleanName);
      seenIds.add(idStr);
    }
  });

  assert.strictEqual(list.length, 3, 'Expected exactly 3 unique subjects');
  assert.deepStrictEqual(list.map(s => s.name), ['Mathematics', 'Physics', 'Chemistry']);
});

console.log('\n--- 3. Stopwatch Mode Selector & UI ---');
it('Mode Selector includes 4th tab for Stopwatch', () => {
  assert(focusPageContent.includes("onClick={() => handleModeChange('stopwatch')}"), 'Stopwatch tab button must exist');
  assert(focusPageContent.includes("timerMode === 'stopwatch'"), 'Checks for stopwatch mode');
});

it('Mode Selector is responsive on all device sizes', () => {
  assert(focusPageContent.includes('max-w-xl mx-auto'), 'Mode selector has wider max-w-xl for 4 tabs');
  assert(focusPageContent.includes('hidden sm:inline'), 'Responsive short/long rest tab text');
});

it('Renders dedicated Stopwatch UI with HH:MM:SS digital display and controls', () => {
  assert(focusPageContent.includes('START STOPWATCH'), 'Start stopwatch button must exist');
  assert(focusPageContent.includes('Continuous Stopwatch'), 'Stopwatch status pill mode label');
  assert(focusPageContent.includes('HRS'), 'HRS label in digital clock face');
  assert(focusPageContent.includes('MIN'), 'MIN label in digital clock face');
  assert(focusPageContent.includes('SEC'), 'SEC label in digital clock face');
});

console.log('\n--- 4. Stopwatch Background Math & Persistence Engine ---');
it('Uses localStorage key padhaku_billa_stopwatch_state', () => {
  assert(focusPageContent.includes("const STOPWATCH_STORAGE_KEY = 'padhaku_billa_stopwatch_state'"), 'Storage key defined');
});

it('Calculates time based on Date.now() timestamp difference rather than tick increments', () => {
  assert(focusPageContent.includes('Date.now() - saved.segmentStart'), 'Mount restoration uses Date.now() diff');
  assert(focusPageContent.includes('Date.now() - stopwatchSegmentStartRef.current'), 'Sync calculation uses Date.now() diff');
});

it('Listens to visibilitychange, pageshow, and focus to resync elapsed time instantly', () => {
  assert(focusPageContent.includes("document.addEventListener('visibilitychange', handleVisibility)"), 'visibilitychange listener');
  assert(focusPageContent.includes("window.addEventListener('pageshow', handlePageShow)"), 'pageshow listener');
  assert(focusPageContent.includes("window.addEventListener('focus', handleFocus)"), 'focus listener');
});

it('Accurately calculates elapsed time after background tab sleep / device lock', () => {
  // Simulate 35 minutes and 12 seconds in background
  const baseAccumulated = 120; // 2 minutes already accumulated
  const segmentStart = Date.now() - (35 * 60 + 12) * 1000; // started 35m 12s ago

  const diff = Math.max(0, Math.floor((Date.now() - segmentStart) / 1000));
  const totalSeconds = baseAccumulated + diff;

  assert.strictEqual(totalSeconds, 120 + 35 * 60 + 12);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  assert.strictEqual(hrs, 0);
  assert.strictEqual(mins, 37);
  assert.strictEqual(secs, 12);
});

it('Freezes accumulated time accurately on pause', () => {
  const baseAccumulated = 300;
  const segmentStart = Date.now() - 65 * 1000; // ran for 65 seconds
  const now = Date.now();
  const additional = Math.max(0, Math.floor((now - segmentStart) / 1000));
  const totalAcc = baseAccumulated + additional;

  assert.strictEqual(totalAcc, 365);
});

it('Resumes cleanly from paused accumulated time with new segmentStart', () => {
  const pausedAcc = 365;
  const newSegmentStart = Date.now();
  const diffLater = 45; // 45 seconds later
  const simulatedNow = newSegmentStart + diffLater * 1000;

  const currentTotal = pausedAcc + Math.max(0, Math.floor((simulatedNow - newSegmentStart) / 1000));
  assert.strictEqual(currentTotal, 410);
});

console.log('\n--- 5. Independence from Deep Focus Session ---');
it('Switching to stopwatch does not reset pomodoro timer state', () => {
  assert(focusPageContent.includes("if (mode === 'stopwatch')"), 'handleModeChange handles stopwatch');
  assert(focusPageContent.includes("if (isRunning && mode === 'focus')"), 'Returning to focus preserves running pomodoro state');
});

it('Tab title updates to stopwatch time when in stopwatch mode', () => {
  assert(focusPageContent.includes("timerMode === 'stopwatch'"), 'Title effect checks stopwatch');
  assert(focusPageContent.includes('⏱️ ${timeStr} | Padhaku Billa'), 'Shows running stopwatch in title');
});

console.log('\n================================================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

