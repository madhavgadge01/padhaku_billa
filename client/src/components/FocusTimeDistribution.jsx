import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

// Brown shades for Stopwatch sessions
export const LIGHT_BROWN = '#C48255';
export const DARK_BROWN = '#5D3318';

/**
 * Format minutes into readable text: "2h 35m", "45m", "0m"
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
 * Format "YYYY-MM-DD" to "31 October 2026"
 */
export function formatReadableDate(dStr) {
  if (!dStr) return '';
  try {
    const [y, m, d] = dStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dStr;
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

export const FocusTimeDistribution = ({
  sessions = [],
  tagDistribution = [],
  user,
}) => {
  // Mode: 'day' | 'week'
  const [mode, setMode] = useState('day');

  // Currently selected date for Day mode (default: today)
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const [selectedDayStr, setSelectedDayStr] = useState(todayKey);

  // Currently selected reference date for Week mode (default: today)
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => new Date());

  // Interactive hover & click tooltip for stacked bar segments
  const [hoveredSegmentId, setHoveredSegmentId] = useState(null);
  const [clickedSegment, setClickedSegment] = useState(null);

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

      if (isStopwatch) {
        if (typeof sessionNumber !== 'number' || sessionNumber < 1) {
          stopwatchCountMap[name] = (stopwatchCountMap[name] || 0) + 1;
          sessionNumber = stopwatchCountMap[name];
        } else {
          stopwatchCountMap[name] = Math.max(stopwatchCountMap[name] || 0, sessionNumber);
        }
        // Alternating brown shades: 1st -> Light Brown, 2nd -> Dark Brown, 3rd -> Light Brown, etc.
        sessionColor = sessionNumber % 2 === 1 ? LIGHT_BROWN : DARK_BROWN;
      }

      const mins = Number(s.durationMinutes || s.actualMinutes || s.minutes) ||
        (s.actualSeconds ? Math.max(1, Math.round((s.actualSeconds / 60) * 10) / 10) : 25);

      const dStr = s.dateStr || (s.startTime ? formatDateKey(new Date(s.startTime)) : todayKey);

      return {
        ...s,
        id: s.id || s._id || `sess_${index}_${name}`,
        name,
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
    setClickedSegment(null);
  };

  const handleNextDay = () => {
    if (isDayAtToday) return;
    sounds.playClick();
    const [y, m, d] = selectedDayStr.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    setSelectedDayStr(formatDateKey(next));
    setClickedSegment(null);
  };

  // Navigate Week
  const handlePrevWeek = () => {
    sounds.playClick();
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setClickedSegment(null);
  };

  const handleNextWeek = () => {
    if (isWeekAtCurrent) return;
    sounds.playClick();
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setClickedSegment(null);
  };

  // 1. Filter active sessions for the selected Day / Week
  const {
    activeSessions,
    totalMinutes,
    activeCount,
    distributionSegments,
    activityCards,
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

    // Grouping & Ordering for Distribution Bar:
    // To ensure:
    // 1. Keep existing subject colors for normal Deep Focus sessions.
    // 2. For each activity, its stopwatch time appears as separate adjacent segments:
    //    Light Brown -> Dark Brown -> Light Brown.
    // 3. Each segment's width is proportional to its recorded duration.
    // We group by activity and sequence Deep Focus sessions first, then Stopwatch sessions in order.
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

    // Build ordered segments for distribution bar
    const barSegments = [];
    activityOrder.forEach((actName) => {
      const group = activityGroups[actName];

      // 1. Normal Deep Focus sessions (preserve subject color)
      group.deepFocusSessions.forEach((s, idx) => {
        barSegments.push({
          id: s.id || `seg_df_${actName}_${idx}`,
          session: s,
          activityName: s.name,
          isStopwatch: false,
          color: s.subjectColor || group.subjectColor,
          minutes: s.minutes,
          widthPercent: totalM > 0 ? (s.minutes / totalM) * 100 : 0,
          sessionNumber: idx + 1,
          dateStr: s.dateStr,
          activityDescription: s.activityDescription || 'Deep Focus Study Session',
        });
      });

      // 2. Stopwatch sessions (separate adjacent segments: Light Brown -> Dark Brown -> Light Brown)
      group.stopwatchSessions.forEach((s) => {
        const swColor = s.sessionNumber % 2 === 1 ? LIGHT_BROWN : DARK_BROWN;
        barSegments.push({
          id: s.id || `seg_sw_${actName}_${s.sessionNumber}`,
          session: s,
          activityName: s.name,
          isStopwatch: true,
          color: swColor,
          minutes: s.minutes,
          widthPercent: totalM > 0 ? (s.minutes / totalM) * 100 : 0,
          sessionNumber: s.sessionNumber,
          dateStr: s.dateStr,
          activityDescription: s.activityDescription || s.name,
        });
      });
    });

    // Build Activity Cards (Section 6: Activity Statistics)
    const cards = Object.values(activityGroups).map((group) => {
      const pct = totalM > 0 ? Math.round((group.totalMinutes / totalM) * 100) : 0;
      const count = group.allSessions.length;
      const avgMinutes = count > 0 ? Math.round(group.totalMinutes / count) : 0;

      const dfMins = group.deepFocusSessions.reduce((acc, s) => acc + s.minutes, 0);
      const swMins = group.stopwatchSessions.reduce((acc, s) => acc + s.minutes, 0);
      const swCount = group.stopwatchSessions.length;
      const dfCount = group.deepFocusSessions.length;

      // Historical statistics for this activity across ALL sessions in database
      const allHistoryForAct = normalizedSessions.filter((s) => s.name === group.name);
      const historyTotalMins = allHistoryForAct.reduce((acc, s) => acc + s.minutes, 0);
      const historyCount = allHistoryForAct.length;
      const historyAvg = historyCount > 0 ? Math.round(historyTotalMins / historyCount) : 0;
      const latestSession = allHistoryForAct[allHistoryForAct.length - 1];

      return {
        name: group.name,
        subjectColor: group.subjectColor,
        totalMinutes: group.totalMinutes,
        percentage: pct,
        totalSessions: count,
        averageDurationMinutes: avgMinutes,
        deepFocusMinutes: dfMins,
        deepFocusSessionsCount: dfCount,
        stopwatchMinutes: swMins,
        stopwatchSessionsCount: swCount,
        deepFocusSessions: group.deepFocusSessions,
        stopwatchSessions: group.stopwatchSessions,
        // All-time stats
        historyTotalMinutes: historyTotalMins,
        historyTotalSessions: historyCount,
        historyAverageMinutes: historyAvg,
        lastActivityDateStr: latestSession?.dateStr || null,
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);

    return {
      activeSessions: filtered,
      totalMinutes: totalM,
      activeCount: filtered.length,
      distributionSegments: barSegments,
      activityCards: cards,
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

  return (
    <div className="bg-white dark:bg-[#121A17] rounded-3xl border border-emerald-950/10 dark:border-white/10 p-6 sm:p-7 shadow-xs space-y-6 text-[#0D1F17] dark:text-white transition">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-950/5 dark:border-white/5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F7F0] dark:bg-[#182420] flex items-center justify-center text-[#10B981] dark:text-[#34D399]">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black tracking-tight text-[#0D1F17] dark:text-white">
              Focus Time by tasks Tag
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
            Distribution across Deep Focus and Stopwatch activities.
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
                setClickedSegment(null);
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
                setClickedSegment(null);
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

      {/* Total for Selected Period with Legend Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-[11px]">
            {mode === 'day' ? `Focus Total (${formattedDayLabel})` : 'Weekly Focus Total'}
          </span>
          <div className="flex items-center space-x-1.5 font-mono text-base font-black text-[#0D1F17] dark:text-white">
            <Clock className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{formatMinutes(totalMinutes)}</span>
          </div>
          {activeCount > 0 && (
            <span className="text-[11px] text-stone-400 font-medium">
              ({activeCount} session{activeCount === 1 ? '' : 's'})
            </span>
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

      {/* Main Content: Stacked Distribution Bar or Empty State */}
      {distributionSegments.length === 0 ? (
        <div className="py-12 text-center rounded-3xl bg-stone-50 dark:bg-[#182420]/50 border border-emerald-950/5 dark:border-white/5 p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#121A17] text-2xl flex items-center justify-center mx-auto shadow-xs">
            ☕
          </div>
          <div className="text-sm font-black text-[#0D1F17] dark:text-white">
            No focus sessions recorded for this {mode}.
          </div>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Both Deep Focus sessions and saved Stopwatch sessions will automatically distribute into this timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Rounded Stacked Progress Bar (Each session is an individual segment) */}
          <div className="space-y-2">
            <div className="relative w-full h-8 sm:h-9 rounded-2xl overflow-hidden flex bg-stone-100 dark:bg-[#182420] shadow-inner p-1 gap-0.5">
              {distributionSegments.map((seg) => {
                const isHovered = hoveredSegmentId === seg.id;
                const isSelected = clickedSegment?.id === seg.id;
                return (
                  <div
                    key={seg.id}
                    onMouseEnter={() => setHoveredSegmentId(seg.id)}
                    onMouseLeave={() => setHoveredSegmentId(null)}
                    onClick={() => {
                      sounds.playClick();
                      setClickedSegment((prev) => (prev?.id === seg.id ? null : seg));
                    }}
                    style={{
                      width: `${Math.max(1.8, seg.widthPercent)}%`,
                      backgroundColor: seg.color,
                    }}
                    className={`h-full rounded-md transition-all duration-200 relative group cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-white dark:ring-emerald-400 z-20 scale-y-110 shadow-lg'
                        : isHovered
                        ? 'brightness-110 z-10 scale-y-105 shadow-md'
                        : 'hover:brightness-105'
                    }`}
                    title={`${seg.activityName}${seg.isStopwatch ? ` (Session ${seg.sessionNumber})` : ''}: ${formatMinutes(seg.minutes)}`}
                  >
                    {/* Inner highlight line */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                );
              })}
            </div>

            {/* Clicked / Hovered Segment Popover (Interactive Distribution Bar) */}
            {(clickedSegment || hoveredSegmentId) && (
              <div className="animate-fadeIn">
                {(() => {
                  const target = clickedSegment || distributionSegments.find((s) => s.id === hoveredSegmentId);
                  if (!target) return null;

                  return (
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#182420] border border-emerald-950/10 dark:border-white/10 shadow-md flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-md flex-shrink-0"
                            style={{ backgroundColor: target.color }}
                          ></span>
                          <span className="text-sm font-black text-[#0D1F17] dark:text-white truncate">
                            {target.activityName}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              target.isStopwatch
                                ? 'bg-[#C48255]/15 dark:bg-[#C48255]/25 text-[#8A4820] dark:text-[#E2A67D] border border-[#C48255]/30'
                                : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {target.isStopwatch ? `Session ${target.sessionNumber}` : 'Deep Focus'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pt-1 text-xs">
                          <div className="flex items-center space-x-1.5 text-stone-600 dark:text-stone-300">
                            <Clock className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                            <span>
                              <strong>Duration:</strong> {formatMinutes(target.minutes)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 text-stone-600 dark:text-stone-300">
                            <Calendar className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                            <span>
                              <strong>Date:</strong> {formatReadableDate(target.dateStr)}
                            </span>
                          </div>

                          <div className="col-span-1 sm:col-span-2 flex items-start space-x-1.5 text-stone-600 dark:text-stone-300 pt-0.5">
                            <Tag className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span className="truncate">
                              <strong>Activity:</strong> {target.activityDescription || target.activityName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {clickedSegment && (
                        <button
                          onClick={() => setClickedSegment(null)}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 2. Individual Task Cards with Dedicated Stopwatch Indicators & Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {activityCards.map((card) => {
              const isHovered =
                hoveredSegmentId &&
                distributionSegments.find((s) => s.id === hoveredSegmentId)?.activityName === card.name;

              return (
                <div
                  key={card.name}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isHovered
                      ? 'bg-[#E8F7F0]/60 dark:bg-[#182420] border-[#10B981] shadow-sm'
                      : 'bg-stone-50/70 dark:bg-[#182420]/50 border-emerald-950/5 dark:border-white/5 hover:bg-white dark:hover:bg-[#182420]'
                  }`}
                >
                  {/* Top: Name, Subject Color, Total Time & Percentage */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-md flex-shrink-0 shadow-xs"
                        style={{ backgroundColor: card.subjectColor }}
                      ></span>
                      <span className="text-xs font-black text-[#0D1F17] dark:text-white truncate">
                        {card.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono font-black flex-shrink-0">
                      <span className="text-[#0D1F17] dark:text-white">
                        {formatMinutes(card.totalMinutes)}
                      </span>
                      <span className="text-[11px] text-stone-400 min-w-[32px] text-right font-bold">
                        {card.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Mini Segmented Distribution Bar (Deep Focus in subject color, Stopwatch in alternating browns) */}
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-stone-200/80 dark:bg-stone-800 gap-0.5 p-0.5">
                    {/* Deep Focus portion */}
                    {card.deepFocusMinutes > 0 && (
                      <div
                        style={{
                          width: `${(card.deepFocusMinutes / card.totalMinutes) * 100}%`,
                          backgroundColor: card.subjectColor,
                        }}
                        className="h-full rounded-sm"
                        title={`Deep Focus: ${formatMinutes(card.deepFocusMinutes)}`}
                      ></div>
                    )}
                    {/* Individual Stopwatch sessions portion */}
                    {card.stopwatchSessions.map((swSess, idx) => {
                      const color = swSess.sessionNumber % 2 === 1 ? LIGHT_BROWN : DARK_BROWN;
                      return (
                        <div
                          key={swSess.id || idx}
                          style={{
                            width: `${(swSess.minutes / card.totalMinutes) * 100}%`,
                            backgroundColor: color,
                          }}
                          className="h-full rounded-sm"
                          title={`Stopwatch Session ${swSess.sessionNumber}: ${formatMinutes(swSess.minutes)}`}
                        ></div>
                      );
                    })}
                  </div>

                  {/* Statistics Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                    <div>
                      <span className="font-semibold">Sessions: </span>
                      <strong className="text-[#0D1F17] dark:text-white font-mono">
                        {card.totalSessions}
                      </strong>
                    </div>
                    <div>
                      <span className="font-semibold">Avg Session: </span>
                      <strong className="text-[#0D1F17] dark:text-white font-mono">
                        {formatMinutes(card.averageDurationMinutes)}
                      </strong>
                    </div>
                  </div>

                  {/* Dedicated Stopwatch & Deep Focus Badge Breakdown */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-emerald-950/5 dark:border-white/5">
                    {card.deepFocusMinutes > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-[10px] font-black text-emerald-800 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.subjectColor }}></span>
                        <span>Deep Focus: {formatMinutes(card.deepFocusMinutes)}</span>
                      </span>
                    )}

                    {card.stopwatchMinutes > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#C48255]/15 dark:bg-[#C48255]/25 border border-[#C48255]/30 text-[10px] font-black text-[#8A4820] dark:text-[#E2A67D]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C48255]"></span>
                        <span>
                          Stopwatch: {formatMinutes(card.stopwatchMinutes)} ({card.stopwatchSessionsCount} sess)
                        </span>
                      </span>
                    )}

                    {card.lastActivityDateStr && (
                      <span className="text-[10px] text-stone-400 font-medium ml-auto">
                        Last: {card.lastActivityDateStr === todayKey ? 'Today' : card.lastActivityDateStr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
