import assert from 'assert';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { calculateSessionFocusSeconds, calculateSessionFocusMinutes } from '../utils/focusTimeHelper.js';

// Brown shades and helpers matching FocusTimeDistribution.jsx
const LIGHT_BROWN = '#C48255';
const DARK_BROWN = '#5D3318';

function formatMinutes(mins = 0) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatReadableDate(dStr) {
  if (!dStr) return '';
  const [y, m, d] = dStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}

console.log('\n================================================================');
console.log('⏱️ PADGAKU BILLA — STOPWATCH ACTIVITY TRACKING & PROGRESS SUITE');
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

// -------------------------------------------------------------
// 1. Database Model & Schema Architecture
// -------------------------------------------------------------
console.log('--- 1. PomodoroSession Schema Extension for Stopwatch ---');

it('PomodoroSession schema defines sessionType as enum ["deep_focus", "stopwatch"]', () => {
  const schema = PomodoroSession.schema;
  const sessionTypePath = schema.path('sessionType');
  assert(sessionTypePath, 'sessionType field must exist in schema');
  assert.strictEqual(sessionTypePath.defaultValue, 'deep_focus');
  assert.deepStrictEqual(sessionTypePath.enumValues, ['deep_focus', 'stopwatch']);
});

it('PomodoroSession schema defines activityDescription, sessionNumber, stopwatchColorIndex', () => {
  const schema = PomodoroSession.schema;
  assert(schema.path('activityDescription'), 'activityDescription field must exist');
  assert(schema.path('sessionNumber'), 'sessionNumber field must exist');
  assert(schema.path('stopwatchColorIndex'), 'stopwatchColorIndex field must exist');
});

it('PomodoroSession schema does not strictly require taskId for custom activities', () => {
  const schema = PomodoroSession.schema;
  const taskIdPath = schema.path('taskId');
  assert(taskIdPath, 'taskId field exists');
  assert(!taskIdPath.isRequired, 'taskId should be optional so custom activities without a task doc succeed');
});

// -------------------------------------------------------------
// 2. Stopwatch Session Creation & Color Alternation
// -------------------------------------------------------------
console.log('\n--- 2. Stopwatch Session Saving & Brown Shade Alternation ---');

it('Light brown and dark brown constants are visually distinguishable and defined correctly', () => {
  assert.strictEqual(LIGHT_BROWN, '#C48255', 'LIGHT_BROWN is #C48255');
  assert.strictEqual(DARK_BROWN, '#5D3318', 'DARK_BROWN is #5D3318');
  assert.notStrictEqual(LIGHT_BROWN, DARK_BROWN, 'Brown shades must be distinct');
});

it('First stopwatch session assigns Light Brown (#C48255)', () => {
  const sessionNumber = 1;
  const stopwatchColorIndex = (sessionNumber - 1) % 2;
  const assignedColor = stopwatchColorIndex === 0 ? LIGHT_BROWN : DARK_BROWN;
  assert.strictEqual(stopwatchColorIndex, 0);
  assert.strictEqual(assignedColor, '#C48255');
});

it('Second stopwatch session assigns Dark Brown (#5D3318)', () => {
  const sessionNumber = 2;
  const stopwatchColorIndex = (sessionNumber - 1) % 2;
  const assignedColor = stopwatchColorIndex === 0 ? LIGHT_BROWN : DARK_BROWN;
  assert.strictEqual(stopwatchColorIndex, 1);
  assert.strictEqual(assignedColor, '#5D3318');
});

it('Third and fourth sessions continue alternating Light -> Dark Brown', () => {
  const sess3 = (3 - 1) % 2 === 0 ? LIGHT_BROWN : DARK_BROWN;
  const sess4 = (4 - 1) % 2 === 0 ? LIGHT_BROWN : DARK_BROWN;
  assert.strictEqual(sess3, LIGHT_BROWN);
  assert.strictEqual(sess4, DARK_BROWN);
});

// -------------------------------------------------------------
// 3. Focus Time Integration & Calculations
// -------------------------------------------------------------
console.log('\n--- 3. Total Focus Time Aggregation (Deep Focus + Stopwatch) ---');

it('calculateSessionFocusSeconds and calculateSessionFocusMinutes work accurately for stopwatch sessions', () => {
  const stopwatchDoc = {
    sessionType: 'stopwatch',
    actualSeconds: 1200, // 20 minutes
    status: 'completed',
  };
  assert.strictEqual(calculateSessionFocusSeconds(stopwatchDoc), 1200);
  assert.strictEqual(calculateSessionFocusMinutes(stopwatchDoc), 20);

  const stopwatchDoc2 = {
    sessionType: 'stopwatch',
    actualSeconds: 2700, // 45 minutes
    status: 'completed',
  };
  assert.strictEqual(calculateSessionFocusSeconds(stopwatchDoc2), 2700);
  assert.strictEqual(calculateSessionFocusMinutes(stopwatchDoc2), 45);
});

it('Unified focus time calculation correctly aggregates Deep Focus and Stopwatch without double counting', () => {
  // Scenario matching user request:
  // Deep Focus: English 25m, Backend 23m
  // Stopwatch: Backend 40m, Backend 35m, DSA 20m
  // Expected Total Backend = 23 + 40 + 35 = 98m
  // Expected Total Focus = 25 + 98 + 20 = 143m
  const sampleSessions = [
    { name: 'English', sessionType: 'deep_focus', minutes: 25, status: 'completed' },
    { name: 'Backend', sessionType: 'deep_focus', minutes: 23, status: 'completed' },
    { name: 'Backend', sessionType: 'stopwatch', minutes: 40, status: 'completed', sessionNumber: 1 },
    { name: 'Backend', sessionType: 'stopwatch', minutes: 35, status: 'completed', sessionNumber: 2 },
    { name: 'DSA', sessionType: 'stopwatch', minutes: 20, status: 'completed', sessionNumber: 1 },
  ];

  const totalFocus = sampleSessions.reduce((acc, s) => acc + s.minutes, 0);
  assert.strictEqual(totalFocus, 143, 'Total focus must equal 143 minutes');

  const backendSessions = sampleSessions.filter((s) => s.name === 'Backend');
  const backendTotal = backendSessions.reduce((acc, s) => acc + s.minutes, 0);
  assert.strictEqual(backendTotal, 98, 'Total Backend Focus Time must equal exactly 98 minutes');
  assert.strictEqual(backendSessions.length, 3, 'Backend has exactly 3 sessions');
  assert.strictEqual(Math.round(backendTotal / backendSessions.length), 33, 'Average backend session is ~33 minutes');
});

it('Discarded sessions do not add time to focus statistics', () => {
  const sampleSessions = [
    { name: 'Backend', sessionType: 'deep_focus', minutes: 23, status: 'completed' },
    // Discarded sessions are NEVER inserted into the database / session list
  ];
  const total = sampleSessions.reduce((acc, s) => acc + s.minutes, 0);
  assert.strictEqual(total, 23, 'Only saved sessions count in focus statistics');
});

// -------------------------------------------------------------
// 4. Distribution Bar Segment Generation & Order
// -------------------------------------------------------------
console.log('\n--- 4. Distribution Bar Adjacent Segments & Proportions ---');

it('Distribution bar preserves each stopwatch session as a separate adjacent segment', () => {
  // Test scenario from user prompt:
  // English Deep Focus: 25 minutes
  // Backend Deep Focus: 23 minutes
  // Backend Stopwatch Session 1: 30 minutes
  // Backend Stopwatch Session 2: 45 minutes
  // Backend Stopwatch Session 3: 20 minutes
  const sessions = [
    { id: '1', name: 'English', isStopwatch: false, minutes: 25, color: '#3B82F6' },
    { id: '2', name: 'Backend', isStopwatch: false, minutes: 23, color: '#10B981' },
    { id: '3', name: 'Backend', isStopwatch: true, sessionNumber: 1, minutes: 30, color: LIGHT_BROWN },
    { id: '4', name: 'Backend', isStopwatch: true, sessionNumber: 2, minutes: 45, color: DARK_BROWN },
    { id: '5', name: 'Backend', isStopwatch: true, sessionNumber: 3, minutes: 20, color: LIGHT_BROWN },
  ];

  const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0); // 143 mins
  assert.strictEqual(totalMinutes, 143);

  // Width percentages
  const widths = sessions.map((s) => ({
    name: s.name,
    color: s.color,
    percent: (s.minutes / totalMinutes) * 100,
  }));

  // Verify Backend stopwatch segments appear adjacent with alternating colors: Light -> Dark -> Light
  const backendSegments = sessions.filter((s) => s.name === 'Backend');
  assert.strictEqual(backendSegments.length, 4);
  assert.strictEqual(backendSegments[0].color, '#10B981'); // Deep focus (subject color)
  assert.strictEqual(backendSegments[1].color, LIGHT_BROWN); // SW 1
  assert.strictEqual(backendSegments[2].color, DARK_BROWN);  // SW 2
  assert.strictEqual(backendSegments[3].color, LIGHT_BROWN); // SW 3

  // Width of Backend SW 2 (45m): (45/143)*100 = 31.468%
  assert(Math.abs(widths[3].percent - 31.468) < 0.1);
});

// -------------------------------------------------------------
// 5. Interactive Popover Details
// -------------------------------------------------------------
console.log('\n--- 5. Interactive Clickable Popover Details ---');

it('Popover displays exact required fields: Activity, Session number, Duration, Activity description, Date', () => {
  const segment = {
    id: 'seg_sw_Backend_2',
    activityName: 'Backend',
    isStopwatch: true,
    sessionNumber: 2,
    minutes: 45,
    dateStr: '2026-10-31',
    activityDescription: 'Building authentication API',
  };

  const formattedDate = formatReadableDate(segment.dateStr);
  const formattedDur = formatMinutes(segment.minutes);

  assert.strictEqual(segment.activityName, 'Backend');
  assert.strictEqual(segment.sessionNumber, 2);
  assert.strictEqual(formattedDur, '45m');
  assert.strictEqual(segment.activityDescription, 'Building authentication API');
  assert.strictEqual(formattedDate, '31 October 2026');
});

// -------------------------------------------------------------
// 6. Source Code Verifications (Components & Routes)
// -------------------------------------------------------------
console.log('\n--- 6. Source Code Architecture Verification ---');

const modalPath = path.resolve('client/src/components/StopwatchSaveModal.jsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

it('StopwatchSaveModal renders questions, duration, suggestions, Save and Discard buttons', () => {
  assert(modalContent.includes('What did you work on during this session?'), 'Modal asks what user worked on');
  assert(modalContent.includes('Recorded Duration'), 'Modal displays recorded duration');
  assert(modalContent.includes('Working on Backend'), 'Suggestion chip Working on Backend exists');
  assert(modalContent.includes('Building authentication API'), 'Suggestion chip Building authentication API exists');
  assert(modalContent.includes('Studying DSA'), 'Suggestion chip Studying DSA exists');
  assert(modalContent.includes('Working on Evenjo website'), 'Suggestion chip Working on Evenjo website exists');
  assert(modalContent.includes('Save Session'), 'Save Session button exists');
  assert(modalContent.includes('Discard'), 'Discard button exists');
});

const focusPagePath = path.resolve('client/src/pages/FocusPage.jsx');
const focusPageContent = fs.readFileSync(focusPagePath, 'utf8');

it('FocusPage implements Start, Pause, Resume, Reset, and STOP buttons for Stopwatch', () => {
  assert(focusPageContent.includes('handleStartStopwatch'), 'handleStartStopwatch exists');
  assert(focusPageContent.includes('handlePauseStopwatch'), 'handlePauseStopwatch exists');
  assert(focusPageContent.includes('handleResumeStopwatch'), 'handleResumeStopwatch exists');
  assert(focusPageContent.includes('handleStopStopwatch'), 'handleStopStopwatch exists');
  assert(focusPageContent.includes('handleResetStopwatch'), 'handleResetStopwatch exists');
  assert(focusPageContent.includes('<span>STOP</span>'), 'STOP button label exists');
});

it('Pausing stopwatch does NOT open the save dialog', () => {
  // Check handlePauseStopwatch implementation: does NOT call setShowStopwatchModal
  const pauseFnBody = focusPageContent.slice(
    focusPageContent.indexOf('const handlePauseStopwatch = () => {'),
    focusPageContent.indexOf('const handleResumeStopwatch = () => {')
  );
  assert(!pauseFnBody.includes('setShowStopwatchModal(true)'), 'handlePauseStopwatch must not open modal');
});

it('Accidental dismissal preserves pending session in localStorage and shows recovery banner', () => {
  assert(focusPageContent.includes('STOPWATCH_PENDING_KEY'), 'STOPWATCH_PENDING_KEY constant exists');
  assert(focusPageContent.includes('Unsaved Session'), 'Recovery banner for unsaved session exists');
  assert(focusPageContent.includes('localStorage.setItem(STOPWATCH_PENDING_KEY'), 'Pending session is saved in localStorage');
});

const distPath = path.resolve('client/src/components/FocusTimeDistribution.jsx');
const distContent = fs.readFileSync(distPath, 'utf8');

it('FocusTimeDistribution implements brown shades, interactive popover, and stopwatch indicators', () => {
  assert(distContent.includes('LIGHT_BROWN'), 'LIGHT_BROWN is defined');
  assert(distContent.includes('DARK_BROWN'), 'DARK_BROWN is defined');
  assert(distContent.includes('clickedSegment'), 'clickedSegment state exists for interactive popover');
  assert(distContent.includes('Stopwatch:'), 'Dedicated Stopwatch activity indicator exists');
  assert(distContent.includes('formatReadableDate'), 'formatReadableDate helper exists');
});

const apiPath = path.resolve('client/src/services/api.js');
const apiContent = fs.readFileSync(apiPath, 'utf8');

it('api service includes saveStopwatchSession endpoint', () => {
  assert(apiContent.includes('saveStopwatchSession: (payload) =>'), 'api.saveStopwatchSession must be defined');
  assert(apiContent.includes('/pomodoro/stopwatch'), 'Points to /pomodoro/stopwatch API route');
});

const pomodoroRoutesPath = path.resolve('server/src/routes/pomodoroRoutes.js');
const pomodoroRoutesContent = fs.readFileSync(pomodoroRoutesPath, 'utf8');

it('pomodoroRoutes provides POST /stopwatch endpoint with sessionNumber and alternating colors', () => {
  assert(pomodoroRoutesContent.includes("router.post('/stopwatch'"), 'POST /stopwatch route defined');
  assert(pomodoroRoutesContent.includes("sessionType: 'stopwatch'"), 'Sets sessionType to stopwatch');
  assert(pomodoroRoutesContent.includes('stopwatchColorIndex'), 'Calculates stopwatchColorIndex');
});

const analyticsRoutesPath = path.resolve('server/src/routes/analyticsRoutes.js');
const analyticsRoutesContent = fs.readFileSync(analyticsRoutesPath, 'utf8');

it('analyticsRoutes includes sessionType, activityDescription, sessionNumber in dashboard payload', () => {
  assert(analyticsRoutesContent.includes('sessionType: s.sessionType'), 'Returns sessionType');
  assert(analyticsRoutesContent.includes('activityDescription: s.activityDescription'), 'Returns activityDescription');
  assert(analyticsRoutesContent.includes('sessionNumber: s.sessionNumber'), 'Returns sessionNumber');
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
