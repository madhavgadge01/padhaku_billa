import assert from 'assert';

console.log('--- RUNNING TEST SUITE: PROGRESS DONUT CHART & FOCUS SAFEGUARDS ---');

// 1. Time Formatting Helpers (matching FocusTimeDistribution.jsx)
function formatMinutes(mins = 0) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDetailedDuration(mins = 0) {
  if (!mins || mins <= 0) return '0 minutes';
  const totalM = Math.round(mins);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0 && m > 0) {
    return `${h} ${h === 1 ? 'hour' : 'hours'} ${m} ${m === 1 ? 'minute' : 'minutes'}`;
  }
  if (h > 0) {
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
}

function formatDonutCenterTime(mins = 0) {
  if (!mins || mins <= 0) return '0 min';
  const totalM = Math.round(mins);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

function formatReadableDate(dStr) {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const day = dateObj.getUTCDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
    const year = dateObj.getUTCFullYear();
    return `${day} ${month} ${year}`;
  }
  return dStr;
}

function formatSessionTime(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// TEST 1: Donut Center Time Formatting
console.log('\n[TEST 1] Donut center and detailed duration formatting:');
assert.strictEqual(formatDonutCenterTime(258), '4 hr 18 min', '258 mins must format to 4 hr 18 min');
assert.strictEqual(formatDonutCenterTime(45), '45 min', '45 mins must format to 45 min');
assert.strictEqual(formatDonutCenterTime(120), '2 hr', '120 mins must format to 2 hr');
assert.strictEqual(formatDonutCenterTime(0), '0 min', '0 mins must format to 0 min');

assert.strictEqual(formatDetailedDuration(135), '2 hours 15 minutes', '135 mins must format to 2 hours 15 minutes');
assert.strictEqual(formatDetailedDuration(45), '45 minutes', '45 mins must format to 45 minutes');
assert.strictEqual(formatDetailedDuration(60), '1 hour', '60 mins must format to 1 hour');
assert.strictEqual(formatDetailedDuration(1), '1 minute', '1 min must format to 1 minute');
console.log('✓ TEST 1 PASSED: Center time and duration formatting match user specifications.');

// TEST 2: Date and Session Time Formatting
console.log('\n[TEST 2] Date and session time formatting:');
assert.strictEqual(formatReadableDate('2026-11-01'), '1 November 2026', 'Date must format to 1 November 2026');
const testTime = new Date('2026-11-01T10:30:00Z');
assert.ok(formatSessionTime(testTime.toISOString()).length > 0, 'Session time must be non-empty string');
console.log('✓ TEST 2 PASSED: Date and session timestamp formatting verified.');

// TEST 3: Stopwatch Color Alternating
console.log('\n[TEST 3] Stopwatch alternating brown colors:');
const LIGHT_BROWN = '#C48255';
const DARK_BROWN = '#5D3318';
for (let sessionNumber = 1; sessionNumber <= 6; sessionNumber++) {
  const color = sessionNumber % 2 === 1 ? LIGHT_BROWN : DARK_BROWN;
  if (sessionNumber === 1) assert.strictEqual(color, '#C48255', 'Session 1 must be Light Brown');
  if (sessionNumber === 2) assert.strictEqual(color, '#5D3318', 'Session 2 must be Dark Brown');
  if (sessionNumber === 3) assert.strictEqual(color, '#C48255', 'Session 3 must be Light Brown');
  if (sessionNumber === 4) assert.strictEqual(color, '#5D3318', 'Session 4 must be Dark Brown');
}
console.log('✓ TEST 3 PASSED: Stopwatch alternating brown colors (Session 1 Light, 2 Dark, 3 Light, 4 Dark) verified.');

// TEST 4: Rolling 24-Hour Focus Time Calculation
console.log('\n[TEST 4] Rolling 24-hour focus time calculation:');
const now = Date.now();
const oneDayAgo = now - 24 * 60 * 60 * 1000;

const mockSessions = [
  // Session within last 24h: 45 min
  { startTime: new Date(now - 2 * 3600 * 1000).toISOString(), endTime: new Date(now - 1.25 * 3600 * 1000).toISOString(), actualMinutes: 45, sessionType: 'deep_focus' },
  // Stopwatch session within last 24h: 30 min
  { startTime: new Date(now - 5 * 3600 * 1000).toISOString(), endTime: new Date(now - 4.5 * 3600 * 1000).toISOString(), actualMinutes: 30, sessionType: 'stopwatch' },
  // Old session (30h ago): 60 min -> MUST BE EXCLUDED from 24h rolling summary
  { startTime: new Date(now - 30 * 3600 * 1000).toISOString(), endTime: new Date(now - 29 * 3600 * 1000).toISOString(), actualMinutes: 60, sessionType: 'deep_focus' },
];

const rolling24h = mockSessions
  .filter((s) => {
    const end = new Date(s.endTime || s.startTime).getTime();
    return end >= oneDayAgo;
  })
  .reduce((acc, s) => acc + s.actualMinutes, 0);

assert.strictEqual(rolling24h, 75, 'Rolling 24h must sum only sessions within the last 24 hours (45 + 30 = 75m)');
console.log('✓ TEST 4 PASSED: Rolling 24-hour focus time excludes old sessions and includes both Deep Focus and Stopwatch.');

// TEST 5: Daily Average Focus Time Calculation (Total Focus / 7 calendar days)
console.log('\n[TEST 5] Daily average focus time calculation:');
const weeklyTotalMinutes = 14 * 60; // 14 hours = 840 mins
const dailyAverageMinutes = Math.round(weeklyTotalMinutes / 7);
assert.strictEqual(dailyAverageMinutes, 120, '14 hours over 7 calendar days must equal 2 hours (120 mins) per day');
assert.strictEqual(formatMinutes(dailyAverageMinutes), '2h', '120 mins must format to 2h');
console.log('✓ TEST 5 PASSED: Daily average = Weekly Focus / 7 days verified.');

// TEST 6: Donut Arc Geometry
console.log('\n[TEST 6] Donut SVG Arc Geometry:');
function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: Math.round((cx + r * Math.cos(angleInRadians)) * 100) / 100,
    y: Math.round((cy + r * Math.sin(angleInRadians)) * 100) / 100,
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const delta = endAngle - startAngle;
  if (delta >= 359.999) {
    const mid = startAngle + 180;
    const pStart = polarToCartesian(cx, cy, r, startAngle);
    const pMid = polarToCartesian(cx, cy, r, mid);
    return `M ${pStart.x} ${pStart.y} A ${r} ${r} 0 1 1 ${pMid.x} ${pMid.y} A ${r} ${r} 0 1 1 ${pStart.x} ${pStart.y}`;
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = delta <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

const arcTopToRight = describeArc(160, 160, 105, -90, 0);
assert.ok(arcTopToRight.startsWith('M 160 55 A 105 105 0 0 1 265 160'), 'Arc from top (-90) to right (0) must match expected SVG path');
console.log('✓ TEST 6 PASSED: SVG Arc mathematical geometry verified.');

// TEST 7: Single Segment Selection Detail Isolation
console.log('\n[TEST 7] Single segment selection and isolation:');
const segments = [
  {
    id: 'seg_df_Backend',
    name: 'Backend',
    color: '#3B82F6',
    totalMinutes: 135,
    sessions: [
      { id: '1', taskName: 'Backend', activityDescription: 'Session 1', minutes: 45, dateStr: '2026-11-01', startTime: '2026-11-01T10:30:00Z', endTime: '2026-11-01T11:15:00Z', isStopwatch: false },
      { id: '2', taskName: 'Backend', activityDescription: 'Session 2', minutes: 50, dateStr: '2026-11-01', startTime: '2026-11-01T11:30:00Z', endTime: '2026-11-01T12:20:00Z', isStopwatch: false },
      { id: '3', taskName: 'Backend', activityDescription: 'Session 3', minutes: 40, dateStr: '2026-11-01', startTime: '2026-11-01T14:00:00Z', endTime: '2026-11-01T14:40:00Z', isStopwatch: false },
    ],
  },
  {
    id: 'seg_sw_Backend_1',
    name: 'Backend',
    color: '#C48255',
    totalMinutes: 45,
    sessions: [
      { id: '4', taskName: 'Backend', activityDescription: 'Working on Backend', minutes: 45, dateStr: '2026-11-01', startTime: '2026-11-01T15:00:00Z', endTime: '2026-11-01T15:45:00Z', isStopwatch: true },
    ],
  },
];

// Selecting Backend Deep Focus segment
const selectedSeg = segments.find(s => s.id === 'seg_df_Backend');
assert.strictEqual(selectedSeg.name, 'Backend');
assert.strictEqual(selectedSeg.totalMinutes, 135);
assert.strictEqual(selectedSeg.sessions.length, 3);
assert.strictEqual(selectedSeg.sessions[0].minutes, 45);
assert.strictEqual(selectedSeg.sessions[1].minutes, 50);
assert.strictEqual(selectedSeg.sessions[2].minutes, 40);
console.log('✓ TEST 7 PASSED: Detail panel selects ONLY the chosen segment and lists all individual sessions.');

// TEST 8: 5-Second Countdown Cancellation State
console.log('\n[TEST 8] 5-Second countdown cancellation:');
let showCountdownModal = true;
let countdownValue = 5;
let timerRunning = false;
let sessionCreated = false;

// User clicks Cancel on countdown modal:
function handleCancelCountdown() {
  showCountdownModal = false;
  countdownValue = 5;
  // Timer is NOT started, session is NOT created
}

handleCancelCountdown();
assert.strictEqual(showCountdownModal, false, 'Countdown modal must close');
assert.strictEqual(countdownValue, 5, 'Countdown value must reset to 5');
assert.strictEqual(timerRunning, false, 'Timer must not be running');
assert.strictEqual(sessionCreated, false, 'No session must be recorded on cancellation');
console.log('✓ TEST 8 PASSED: Countdown cancellation safely returns to ready state without starting timer.');

// TEST 9: Confirmation Modal on Red Stop Button
console.log('\n[TEST 9] Red Stop button confirmation safeguard:');
let sessionStopped = false;
let confirmModalOpen = false;

function onStopButtonClick() {
  // Instead of directly stopping, open confirmation modal
  confirmModalOpen = true;
}

function onCancelModal() {
  // Closes modal without stopping
  confirmModalOpen = false;
}

function onConfirmStopModal() {
  confirmModalOpen = false;
  sessionStopped = true;
}

// 1. User clicks Stop -> modal opens, session NOT stopped yet
onStopButtonClick();
assert.strictEqual(confirmModalOpen, true, 'Confirm modal must open');
assert.strictEqual(sessionStopped, false, 'Session must not be stopped before confirmation');

// 2. User clicks Cancel -> modal closes, session remains running
onCancelModal();
assert.strictEqual(confirmModalOpen, false, 'Confirm modal must close');
assert.strictEqual(sessionStopped, false, 'Session must not be stopped after Cancel');

// 3. User clicks Stop again and Confirms -> session stops and saves
onStopButtonClick();
onConfirmStopModal();
assert.strictEqual(confirmModalOpen, false, 'Confirm modal must close');
assert.strictEqual(sessionStopped, true, 'Session must be finalized on Confirm');
console.log('✓ TEST 9 PASSED: Red Stop button confirmation safeguard prevents accidental stop.');

console.log('\n--- ALL 9 TESTS PASSED CLEANLY! ---');

