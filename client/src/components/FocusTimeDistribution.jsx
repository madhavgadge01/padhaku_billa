import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Info,
  X,
  Tag,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { getStudyDayDate } from '../utils/dateUtils.js';

// Brown shades for Stopwatch sessions
export const LIGHT_BROWN = '#C48255';
export const DARK_BROWN = '#5D3318';

/**
 * Format minutes into compact readable text: "4h 18m", "45m", "0m"
 */
export function formatMinutes(mins = 0) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Format minutes into detailed text: "2 hours 15 minutes", "45 minutes", "1 hour"
 */
export function formatDetailedDuration(mins = 0) {
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

/**
 * Format minutes for inside the donut center: "4 hr 18 min", "45 min", "0 min"
 */
export function formatDonutCenterTime(mins = 0) {
  if (!mins || mins <= 0) return '0 min';
  const totalM = Math.round(mins);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/**
 * Format Date to "YYYY-MM-DD"
 */
export function formatDateKey(d) {
  const target = new Date(d);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format "YYYY-MM-DD" to "1 November 2026"
 */
export function formatReadableDate(dStr) {
  if (!dStr) return '';
  try {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      const day = dateObj.getUTCDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
      const year = dateObj.getUTCFullYear();
      return `${day} ${month} ${year}`;
    }
    const dateObj = new Date(dStr);
    if (isNaN(dateObj.getTime())) return dStr;
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dStr;
  }
}

/**
 * Format timestamp to "10:30 AM"
 */
export function formatSessionTime(isoOrDate) {
  if (!isoOrDate) return '—';
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return '—';
  }
}

/**
 * Get Monday and Sunday for the week containing date `d`
 */
export function getWeekRange(d) {
  const target = new Date(d);
  const dayOfWeek = target.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    monday,
    sunday,
    mondayStr: formatDateKey(monday),
    sundayStr: formatDateKey(sunday),
  };
}

/**
 * Helper to convert polar coordinates to Cartesian for SVG drawing
 */
function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: Math.round((cx + r * Math.cos(angleInRadians)) * 100) / 100,
    y: Math.round((cy + r * Math.sin(angleInRadians)) * 100) / 100,
  };
}

/**
 * Build SVG path data for a circular arc from startAngle to endAngle (in degrees)
 */
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

export const FocusTimeDistribution = ({
  sessions = [],
  tagDistribution = [],
  user,
}) => {
  // Mode: 'day' | 'week'
  const [mode, setMode] = useState('day');

  // Currently selected date for Day mode (default: today based on reset time)
  const todayKey = useMemo(
    () => getStudyDayDate(new Date(), user?.dailyResetTime || '00:00'),
    [user?.dailyResetTime]
  );
  const [selectedDayStr, setSelectedDayStr] = useState(todayKey);

  useEffect(() => {
    setSelectedDayStr(todayKey);
  }, [todayKey]);

  // Currently selected reference date for Week mode (default: today)
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => new Date());

  // Interactive selection and hover for donut chart segments
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState(null);

  const containerRef = useRef(null);

  // Map of subject name -> color from user's timetable for perfect consistency
  const timetableColorMap = useMemo(() => {
    const map = {};
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    DAYS.forEach((d) => {
      (user?.weeklyTimetable?.[d] || []).forEach((sub) => {
        if (sub?.name && sub?.color) {
          map[sub.name.trim().toLowerCase()] = sub.color;
        }
      });
    });
    return map;
  }, [user]);

  // Normalized session list with accurate subject colors and session sequence numbers
  const normalizedSessions = useMemo(() => {
    // Sort chronologically by startTime ascending
    const sorted = [...sessions].sort((a, b) => {
      const timeA = new Date(a.startTime || a.createdAt || 0).getTime();
      const timeB = new Date(b.startTime || b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    // Track stopwatch session sequence number per activity name
    const stopwatchCountMap = {};

    return sorted.map((s, index) => {
      const name = (s.taskName || s.name || 'Focus').trim();
      const isStopwatch = s.sessionType === 'stopwatch';
      const subjectColor = timetableColorMap[name.toLowerCase()] || s.subjectColor || s.colorTag || s.color || '#10B981';

      let sessionNumber = s.sessionNumber;
      let sessionColor = s.color || subjectColor;

      const isExistingTask = Boolean(timetableColorMap[name.toLowerCase()]);

      if (isStopwatch) {
        if (isExistingTask) {
          // CRITICAL: User selected an existing daily task -> ALWAYS use original task color!
          sessionColor = subjectColor;
        } else {
          // Custom activity -> Alternating brown shades: 1st -> Light Brown, 2nd -> Dark Brown, etc.
          if (typeof sessionNumber !== 'number' || sessionNumber < 1) {
            stopwatchCountMap[name] = (stopwatchCountMap[name] || 0) + 1;
            sessionNumber = stopwatchCountMap[name];
          } else {
            stopwatchCountMap[name] = Math.max(stopwatchCountMap[name] || 0, sessionNumber);
          }
          sessionColor = sessionNumber % 2 === 1 ? LIGHT_BROWN : DARK_BROWN;
        }
      }

      const mins = Number(s.durationMinutes || s.actualMinutes || s.minutes) ||
        (s.actualSeconds ? Math.max(1, Math.round((s.actualSeconds / 60) * 10) / 10) : 25);

      const dStr = s.dateStr || (s.startTime ? getStudyDayDate(new Date(s.startTime), user?.dailyResetTime || '00:00') : todayKey);

      return {
        ...s,
        id: s.id || s._id || `sess_${index}_${name}`,
        name,
        taskName: name,
        subjectColor,
        color: sessionColor,
        isStopwatch,
        sessionNumber: sessionNumber || 1,
        activityDescription: s.activityDescription || '',
        minutes: mins,
        dateStr: dStr,
      };
    });
  }, [sessions, timetableColorMap, todayKey]);

  // Current Week Range calculation
  const currentWeekRange = useMemo(() => {
    return getWeekRange(selectedWeekDate);
  }, [selectedWeekDate]);

  // Check if navigation next is at today/current week (prevent navigating to future)
  const isDayAtToday = selectedDayStr >= todayKey;
  const isWeekAtCurrent = useMemo(() => {
    const thisWeek = getWeekRange(new Date());
    return currentWeekRange.mondayStr >= thisWeek.mondayStr;
  }, [currentWeekRange]);

  // Navigate Day
  const handlePrevDay = () => {
    sounds.playClick();
    const [y, m, d] = selectedDayStr.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    setSelectedDayStr(formatDateKey(prev));
    setSelectedSegmentId(null);
  };

  const handleNextDay = () => {
    if (isDayAtToday) return;
    sounds.playClick();
    const [y, m, d] = selectedDayStr.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    setSelectedDayStr(formatDateKey(next));
    setSelectedSegmentId(null);
  };

  // Navigate Week
  const handlePrevWeek = () => {
    sounds.playClick();
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setSelectedSegmentId(null);
  };

  const handleNextWeek = () => {
    if (isWeekAtCurrent) return;
    sounds.playClick();
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setSelectedSegmentId(null);
  };

  // 1. Filter active sessions for the selected Day / Week
  const {
    activeSessions,
    totalMinutes,
    activeCount,
    donutSegments,
    activitySummaries,
    dailyAverageForWeek,
  } = useMemo(() => {
    let filtered = [];

    if (mode === 'day') {
      filtered = normalizedSessions.filter((s) => s.dateStr === selectedDayStr);
    } else {
      const { mondayStr, sundayStr } = currentWeekRange;
      filtered = normalizedSessions.filter(
        (s) => s.dateStr >= mondayStr && s.dateStr <= sundayStr
      );
    }

    const totalM = filtered.reduce((acc, s) => acc + s.minutes, 0);

    // Grouping & Ordering for Segments:
    // 1. Deep Focus sessions grouped by subject (preserve subject colors: English=lime, DSA=amber, Cloud=fuchsia, Backend=blue, etc.)
    // 2. Stopwatch sessions retain alternating brown shades (1st: Light Brown #C48255, 2nd: Dark Brown #5D3318, etc.)
    const activityGroups = {};
    const activityOrder = [];

    filtered.forEach((s) => {
      if (!activityGroups[s.name]) {
        activityGroups[s.name] = {
          name: s.name,
          subjectColor: s.subjectColor,
          deepFocusSessions: [],
          stopwatchSessions: [],
          allSessions: [],
          totalMinutes: 0,
        };
        activityOrder.push(s.name);
      }
      activityGroups[s.name].totalMinutes += s.minutes;
      activityGroups[s.name].allSessions.push(s);
      if (s.isStopwatch) {
        activityGroups[s.name].stopwatchSessions.push(s);
      } else {
        activityGroups[s.name].deepFocusSessions.push(s);
      }
    });

    // Build raw segments list
    const rawSegments = [];

    activityOrder.forEach((actName) => {
      const group = activityGroups[actName];

      // A. Deep Focus segment for this subject (combines its deep focus sessions)
      if (group.deepFocusSessions.length > 0) {
        const dfTotalMins = group.deepFocusSessions.reduce((acc, s) => acc + s.minutes, 0);
        rawSegments.push({
          id: `seg_df_${actName}`,
          name: actName,
          activityName: actName,
          isStopwatch: false,
          color: group.subjectColor,
          totalMinutes: dfTotalMins,
          minutes: dfTotalMins,
          sessions: group.deepFocusSessions,
          sessionCount: group.deepFocusSessions.length,
        });
      }

      // B. Stopwatch sessions: each session has its individual segment with alternating brown color
      group.stopwatchSessions.forEach((s) => {
        const swColor = s.sessionNumber % 2 === 1 ? LIGHT_BROWN : DARK_BROWN;
        rawSegments.push({
          id: `seg_sw_${actName}_${s.sessionNumber}_${s.id}`,
          name: s.name,
          activityName: s.activityDescription || s.name,
          isStopwatch: true,
          color: swColor,
          totalMinutes: s.minutes,
          minutes: s.minutes,
          sessionNumber: s.sessionNumber,
          sessions: [s],
          sessionCount: 1,
        });
      });
    });

    // Compute geometry for SVG arcs (center cx=160, cy=160, radius=105, strokeWidth=24)
    const segmentsWithGeometry = [];
    const count = rawSegments.length;

    if (count === 1 && totalM > 0) {
      const seg = rawSegments[0];
      segmentsWithGeometry.push({
        ...seg,
        percentage: 100,
        isSingle: true,
        startAngle: 0,
        endAngle: 360,
      });
    } else if (count > 1 && totalM > 0) {
      // Gap in degrees between segments for visual separation
      const visualGapDeg = Math.min(3.5, 360 / (count * 3));
      const totalGaps = count * visualGapDeg;
      const availableDeg = 360 - totalGaps;

      // Allocate proportional degree span for each segment with a minimum for visibility
      const rawSpans = rawSegments.map((seg) => (seg.minutes / totalM) * availableDeg);
      const minSpan = Math.max(2.5, 360 / (count * 12));
      const adjustedSpans = rawSpans.map((sp) => Math.max(minSpan, sp));
      const adjustedTotal = adjustedSpans.reduce((a, b) => a + b, 0);
      const normalizedSpans = adjustedSpans.map((sp) => (sp / adjustedTotal) * availableDeg);

      let currentAngle = -90; // Start at 12 o'clock

      rawSegments.forEach((seg, idx) => {
        const span = normalizedSpans[idx];
        const startAngle = currentAngle;
        const endAngle = currentAngle + span;
        currentAngle = endAngle + visualGapDeg;

        segmentsWithGeometry.push({
          ...seg,
          percentage: Math.round((seg.minutes / totalM) * 100),
          isSingle: false,
          startAngle,
          endAngle,
        });
      });
    }

    // Activity summaries for overview chips
    const summaries = Object.values(activityGroups).map((g) => ({
      name: g.name,
      color: g.subjectColor,
      totalMinutes: g.totalMinutes,
      sessionsCount: g.allSessions.length,
      percentage: totalM > 0 ? Math.round((g.totalMinutes / totalM) * 100) : 0,
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Daily average focus time over the selected week (Total / 7 calendar days)
    const dailyAvgWeek = Math.round(totalM / 7);

    return {
      activeSessions: filtered,
      totalMinutes: totalM,
      activeCount: filtered.length,
      donutSegments: segmentsWithGeometry,
      activitySummaries: summaries,
      dailyAverageForWeek: dailyAvgWeek,
    };
  }, [mode, normalizedSessions, selectedDayStr, currentWeekRange]);

  // Formatted date label for Day mode
  const formattedDayLabel = useMemo(() => {
    if (selectedDayStr === todayKey) return 'Today';
    const [y, m, d] = selectedDayStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDateKey(yesterday) === selectedDayStr) return 'Yesterday';
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDayStr, todayKey]);

  // Formatted week label for Week mode (Mon - Sun)
  const formattedWeekLabel = useMemo(() => {
    const thisWeek = getWeekRange(new Date());
    const isThisWeek = currentWeekRange.mondayStr === thisWeek.mondayStr;

    const monLabel = currentWeekRange.monday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const sunLabel = currentWeekRange.sunday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (isThisWeek) {
      return `This Week (${monLabel} – ${sunLabel})`;
    }
    return `${monLabel} – ${sunLabel}`;
  }, [currentWeekRange]);

  // Currently selected segment object
  const selectedSegment = useMemo(() => {
    if (!selectedSegmentId) return null;
    return donutSegments.find((s) => s.id === selectedSegmentId) || null;
  }, [selectedSegmentId, donutSegments]);

  // Close detail panel when clicking outside the component
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSelectedSegmentId(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-white dark:bg-[#121A17] rounded-3xl border border-emerald-950/10 dark:border-white/10 p-6 sm:p-7 shadow-xs space-y-6 text-[#0D1F17] dark:text-white transition"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-950/5 dark:border-white/5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F7F0] dark:bg-[#182420] flex items-center justify-center text-[#10B981] dark:text-[#34D399]">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black tracking-tight text-[#0D1F17] dark:text-white">
              Focus Time by Tasks Tag
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
            Interactive circular distribution across Deep Focus and Stopwatch activities.
          </p>
        </div>

        {/* View Controls: [ Day | Week ] Toggle & Date Navigation */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Day / Week Switch */}
          <div className="bg-stone-100 dark:bg-[#182420] p-1 rounded-2xl border border-stone-200/60 dark:border-white/5 flex items-center space-x-1">
            <button
              onClick={() => {
                sounds.playClick();
                setMode('day');
                setSelectedSegmentId(null);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                mode === 'day'
                  ? 'bg-white dark:bg-[#121A17] text-[#0D1F17] dark:text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setMode('week');
                setSelectedSegmentId(null);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                mode === 'week'
                  ? 'bg-white dark:bg-[#121A17] text-[#0D1F17] dark:text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center space-x-1 bg-stone-100 dark:bg-[#182420] px-2 py-1 rounded-2xl border border-stone-200/60 dark:border-white/5">
            <button
              onClick={mode === 'day' ? handlePrevDay : handlePrevWeek}
              className="p-1 rounded-lg text-stone-600 dark:text-stone-300 hover:text-[#0D1F17] dark:hover:text-white hover:bg-white dark:hover:bg-[#121A17] transition cursor-pointer"
              title={mode === 'day' ? 'Previous day' : 'Previous week'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-black font-mono text-[#0D1F17] dark:text-white px-2 whitespace-nowrap min-w-[100px] text-center">
              {mode === 'day' ? formattedDayLabel : formattedWeekLabel}
            </span>

            <button
              onClick={mode === 'day' ? handleNextDay : handleNextWeek}
              disabled={mode === 'day' ? isDayAtToday : isWeekAtCurrent}
              className={`p-1 rounded-lg transition ${
                (mode === 'day' ? isDayAtToday : isWeekAtCurrent)
                  ? 'text-stone-300 dark:text-stone-600 cursor-not-allowed opacity-40'
                  : 'text-stone-600 dark:text-stone-300 hover:text-[#0D1F17] dark:hover:text-white hover:bg-white dark:hover:bg-[#121A17] cursor-pointer'
              }`}
              title={mode === 'day' ? 'Next day' : 'Next week'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Total Focus & Daily Average Statistics Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-[11px]">
              {mode === 'day' ? `Focus Total (${formattedDayLabel})` : 'Weekly Focus Total'}
            </span>
            <div className="flex items-center space-x-1.5 font-mono text-base font-black text-[#0D1F17] dark:text-white">
              <Clock className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{formatMinutes(totalMinutes)}</span>
            </div>
          </div>

          {mode === 'week' && (
            <div className="flex items-center space-x-2 pl-2 sm:border-l border-emerald-950/10 dark:border-white/10">
              <span className="font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-[11px]">
                Daily Average Focus Time
              </span>
              <div className="flex items-center space-x-1.5 font-mono text-base font-black text-[#10B981] dark:text-[#34D399]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{formatMinutes(dailyAverageForWeek)}/day</span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium">
                (7 days)
              </span>
            </div>
          )}
        </div>

        {/* Legend for Deep Focus & Stopwatch alternating shades */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]"></span>
            <span className="text-stone-600 dark:text-stone-300">Deep Focus</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#C48255]"></span>
            <span className="text-stone-600 dark:text-stone-300">Stopwatch (Light)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#5D3318]"></span>
            <span className="text-stone-600 dark:text-stone-300">Stopwatch (Dark)</span>
          </div>
        </div>
      </div>

      {/* Main Content: Interactive Circular Donut Chart */}
      {donutSegments.length === 0 ? (
        <div className="py-14 text-center rounded-3xl bg-stone-50 dark:bg-[#182420]/50 border border-emerald-950/5 dark:border-white/5 p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#121A17] text-2xl flex items-center justify-center mx-auto shadow-xs">
            ☕
          </div>
          <div className="text-sm font-black text-[#0D1F17] dark:text-white">
            No focus sessions recorded for this {mode}.
          </div>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Both Deep Focus sessions and saved Stopwatch sessions will automatically appear in this circular chart.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Donut Chart Presentation Container */}
          <div className="flex flex-col items-center justify-center pt-2 pb-2">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <svg
                viewBox="0 0 320 320"
                className="w-full h-full transform -rotate-90 select-none overflow-visible"
              >
                <defs>
                  {/* Subtle drop shadow filter for hovered / selected segment */}
                  <filter id="donutSegmentGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Background Ring Track */}
                <circle
                  cx="160"
                  cy="160"
                  r="105"
                  fill="none"
                  stroke="currentColor"
                  className="text-stone-100 dark:text-[#182420]"
                  strokeWidth="24"
                />

                {/* Donut Segments */}
                {donutSegments.map((seg) => {
                  const isSelected = selectedSegmentId === seg.id;
                  const isHovered = hoveredSegmentId === seg.id;
                  const strokeW = isSelected ? 32 : isHovered ? 28 : 24;

                  if (seg.isSingle) {
                    return (
                      <circle
                        key={seg.id}
                        cx="160"
                        cy="160"
                        r="105"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeW}
                        className="cursor-pointer transition-all duration-300 ease-out"
                        style={{
                          filter: isSelected || isHovered ? 'url(#donutSegmentGlow)' : 'none',
                        }}
                        onMouseEnter={() => setHoveredSegmentId(seg.id)}
                        onMouseLeave={() => setHoveredSegmentId(null)}
                        onClick={() => {
                          sounds.playClick();
                          setSelectedSegmentId((prev) => (prev === seg.id ? null : seg.id));
                        }}
                      />
                    );
                  }

                  const pathData = describeArc(160, 160, 105, seg.startAngle, seg.endAngle);

                  return (
                    <path
                      key={seg.id}
                      d={pathData}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      className="cursor-pointer transition-all duration-300 ease-out"
                      style={{
                        filter: isSelected || isHovered ? 'url(#donutSegmentGlow)' : 'none',
                        transformOrigin: '160px 160px',
                      }}
                      onMouseEnter={() => setHoveredSegmentId(seg.id)}
                      onMouseLeave={() => setHoveredSegmentId(null)}
                      onClick={() => {
                        sounds.playClick();
                        setSelectedSegmentId((prev) => (prev === seg.id ? null : seg.id));
                      }}
                    >
                      <title>{`${seg.activityName}: ${formatMinutes(seg.totalMinutes)} (${seg.percentage}%)`}</title>
                    </path>
                  );
                })}
              </svg>

              {/* Inside Donut Center: TODAY / THIS WEEK & Total Focus Time */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#576560] dark:text-[#8BA398]">
                  {mode === 'day' ? 'TODAY' : 'THIS WEEK'}
                </span>
                <span className="text-[11px] font-bold text-[#8A9791] mt-0.5">
                  {mode === 'day' ? 'Total Focus Time' : 'Total Weekly Focus Time'}
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#1C2A24] dark:text-[#F2F7F4] mt-1">
                  {formatDonutCenterTime(totalMinutes)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. CLICKABLE SEGMENT DETAIL PANEL: Information ONLY about the selected segment */}
          {selectedSegment ? (
            <div className="p-5 sm:p-6 rounded-3xl bg-stone-50 dark:bg-[#162420] border-2 border-[#10B981] shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
              {/* Header with Activity, Duration, Sessions count, and Close Button */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-emerald-950/10 dark:border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: selectedSegment.color }}
                    />
                    <h4 className="text-base sm:text-lg font-black text-[#0D1F17] dark:text-white">
                      Activity: {selectedSegment.name}
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        selectedSegment.isStopwatch
                          ? 'bg-[#C48255]/20 text-[#8A4820] dark:text-[#E2A67D] border border-[#C48255]/30'
                          : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {selectedSegment.isStopwatch
                        ? `Stopwatch ${selectedSegment.sessionNumber ? `(Session ${selectedSegment.sessionNumber})` : ''}`
                        : 'Deep Focus'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300 pt-1">
                    <div>
                      <strong>Total Focus Time: </strong>
                      <span className="font-mono font-bold text-[#0D1F17] dark:text-white">
                        {formatDetailedDuration(selectedSegment.totalMinutes)}
                      </span>
                    </div>
                    <div>
                      <strong>Sessions: </strong>
                      <span className="font-mono font-bold text-[#0D1F17] dark:text-white">
                        {selectedSegment.sessions.length}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSegmentId(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Individual Session Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Session Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedSegment.sessions.map((sess, idx) => (
                    <div
                      key={sess.id || idx}
                      className="p-4 rounded-2xl bg-white dark:bg-[#121A17] border border-emerald-950/10 dark:border-white/10 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-950/5 dark:border-white/5">
                        <span className="text-xs font-black text-[#0D1F17] dark:text-white">
                          Session {idx + 1}: {formatDetailedDuration(sess.minutes)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sess.isStopwatch
                              ? 'bg-[#C48255]/15 text-[#8A4820] dark:text-[#E2A67D]'
                              : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {sess.isStopwatch ? 'Stopwatch' : 'Deep Focus'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-stone-600 dark:text-stone-300">
                        <div>
                          <strong>Activity: </strong>
                          <span>{sess.activityDescription || sess.taskName || sess.name}</span>
                        </div>
                        <div>
                          <strong>Date: </strong>
                          <span>{formatReadableDate(sess.dateStr)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div>
                            <strong>Started: </strong>
                            <span>{formatSessionTime(sess.startTime)}</span>
                          </div>
                          <div>
                            <strong>Ended: </strong>
                            <span>{formatSessionTime(sess.endTime)}</span>
                          </div>
                        </div>
                        <div>
                          <strong>Actual duration: </strong>
                          <span className="font-mono font-bold text-[#0D1F17] dark:text-white">
                            {formatDetailedDuration(sess.minutes)}
                          </span>
                        </div>
                        <div>
                          <strong>Session Type: </strong>
                          <span>{sess.isStopwatch ? 'Stopwatch' : 'Deep Focus'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Prompt to click segment and quick activity overview */
            <div className="space-y-3">
              <div className="text-center text-xs text-stone-500 dark:text-stone-400 font-medium py-1">
                👆 Click any segment on the donut chart to view its individual session timestamps and records.
              </div>

              {/* Activity Chips Overview */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {activitySummaries.map((act) => (
                  <button
                    key={act.name}
                    onClick={() => {
                      sounds.playClick();
                      const targetSeg = donutSegments.find((s) => s.name === act.name);
                      if (targetSeg) {
                        setSelectedSegmentId(targetSeg.id);
                      }
                    }}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200/80 dark:bg-[#182420] dark:hover:bg-[#22352f] border border-stone-200/60 dark:border-white/10 transition cursor-pointer text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: act.color }}
                    />
                    <span className="font-bold text-[#0D1F17] dark:text-white truncate max-w-[120px]">
                      {act.name}
                    </span>
                    <span className="font-mono text-stone-500 dark:text-stone-400">
                      {formatMinutes(act.totalMinutes)}
                    </span>
                    <span className="text-[10px] text-stone-400 font-bold">
                      ({act.percentage}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
