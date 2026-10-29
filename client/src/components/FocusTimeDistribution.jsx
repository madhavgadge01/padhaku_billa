import React, { useState, useMemo } from 'react';
import {
  PieChart,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

/**
 * Format minutes into readable text: "2h 35m", "45m", "0m"
 */
function formatMinutes(mins = 0) {
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
function formatDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Monday and Sunday for the week containing date `d`
 */
function getWeekRange(d) {
  const target = new Date(d);
  const dayOfWeek = target.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  // Monday of this week
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Sunday of this week (Monday + 6 days)
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

  // Interactive hover tooltip for stacked bar segments
  const [hoveredSegment, setHoveredSegment] = useState(null);

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

  // Normalized session list with accurate subject colors
  const normalizedSessions = useMemo(() => {
    return sessions.map((s) => {
      const name = (s.taskName || s.name || 'Focus').trim();
      const color = timetableColorMap[name.toLowerCase()] || s.colorTag || s.color || '#3B82F6';
      const mins = Number(s.durationMinutes || s.actualMinutes || s.minutes) || 25;
      const dStr = s.dateStr || (s.startTime ? formatDateKey(new Date(s.startTime)) : todayKey);
      return {
        ...s,
        name,
        color,
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
  };

  const handleNextDay = () => {
    if (isDayAtToday) return;
    sounds.playClick();
    const [y, m, d] = selectedDayStr.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    setSelectedDayStr(formatDateKey(next));
  };

  // Navigate Week
  const handlePrevWeek = () => {
    sounds.playClick();
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    if (isWeekAtCurrent) return;
    sounds.playClick();
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  // Aggregate data for Day or Week
  const { filteredSubjects, totalMinutes, activeCount } = useMemo(() => {
    let activeSessions = [];

    if (mode === 'day') {
      activeSessions = normalizedSessions.filter((s) => s.dateStr === selectedDayStr);
    } else {
      const { mondayStr, sundayStr } = currentWeekRange;
      activeSessions = normalizedSessions.filter(
        (s) => s.dateStr >= mondayStr && s.dateStr <= sundayStr
      );
    }

    // Aggregate by subject name
    const subjectMap = {};
    let totalM = 0;

    activeSessions.forEach((s) => {
      if (!subjectMap[s.name]) {
        subjectMap[s.name] = {
          name: s.name,
          color: s.color,
          minutes: 0,
          sessionsCount: 0,
        };
      }
      subjectMap[s.name].minutes += s.minutes;
      subjectMap[s.name].sessionsCount += 1;
      totalM += s.minutes;
    });

    // If no filtered sessions found, but we have global tagDistribution and viewing today, fallback
    const list = Object.values(subjectMap)
      .map((item) => ({
        ...item,
        percentage: totalM > 0 ? Math.round((item.minutes / totalM) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes); // Sorted highest to lowest for easy comparison

    return {
      filteredSubjects: list,
      totalMinutes: totalM,
      activeCount: activeSessions.length,
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
    <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm transition hover:shadow-md space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-[#1B3B2F] dark:text-[#A3D9C9]">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              Focus Time by tasks Tag
            </h3>
          </div>
          <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-0.5">
            Distribution across your study subjects and priorities.
          </p>
        </div>

        {/* View Controls: [ Day | Week ] Toggle & Navigation */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Day / Week Segmented Switch */}
          <div className="bg-[#FAF8F5] dark:bg-[#1C2E29] p-1 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] flex items-center space-x-1">
            <button
              onClick={() => {
                sounds.playClick();
                setMode('day');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                mode === 'day'
                  ? 'bg-white dark:bg-[#162420] text-[#1B3B2F] dark:text-[#A3D9C9] shadow-xs'
                  : 'text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setMode('week');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                mode === 'week'
                  ? 'bg-white dark:bg-[#162420] text-[#1B3B2F] dark:text-[#A3D9C9] shadow-xs'
                  : 'text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-white'
              }`}
            >
              Week
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center space-x-1 bg-[#FAF8F5] dark:bg-[#1C2E29] px-2 py-1 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35]">
            <button
              onClick={mode === 'day' ? handlePrevDay : handlePrevWeek}
              className="p-1 rounded-lg text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-white hover:bg-white dark:hover:bg-[#162420] transition cursor-pointer"
              title={mode === 'day' ? 'Previous day' : 'Previous week'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-bold font-mono text-[#1C2A24] dark:text-[#F2F7F4] px-1.5 whitespace-nowrap min-w-[90px] text-center">
              {mode === 'day' ? formattedDayLabel : formattedWeekLabel}
            </span>

            <button
              onClick={mode === 'day' ? handleNextDay : handleNextWeek}
              disabled={mode === 'day' ? isDayAtToday : isWeekAtCurrent}
              className={`p-1 rounded-lg transition ${
                (mode === 'day' ? isDayAtToday : isWeekAtCurrent)
                  ? 'text-[#B8C4BE] dark:text-[#375248] cursor-not-allowed opacity-40'
                  : 'text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-white hover:bg-white dark:hover:bg-[#162420] cursor-pointer'
              }`}
              title={mode === 'day' ? 'Next day' : 'Next week'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Total for Selected Period */}
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-[#576560] dark:text-[#8BA398]">
          {mode === 'day' ? `Day Focus (${formattedDayLabel})` : 'Weekly Focus Total'}
        </span>
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="font-mono text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
            {formatMinutes(totalMinutes)}
          </span>
          {activeCount > 0 && (
            <span className="text-[11px] text-[#8A9791] font-normal">
              ({activeCount} session{activeCount === 1 ? '' : 's'})
            </span>
          )}
        </div>
      </div>

      {/* Main Content: Stacked Bar or Empty State */}
      {filteredSubjects.length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] p-6 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#162420] text-xl flex items-center justify-center mx-auto shadow-xs">
            ☕
          </div>
          <div className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
            No focus sessions recorded for this {mode}.
          </div>
          <p className="text-[11px] text-[#8A9791] max-w-sm mx-auto">
            Focus sessions logged in study mode will automatically distribute into this breakdown.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1. Rounded Stacked Progress Bar */}
          <div className="space-y-1.5">
            <div className="relative w-full h-6 sm:h-7 rounded-2xl overflow-hidden flex bg-[#F0ECE6] dark:bg-[#1C2E29] shadow-inner p-0.5">
              {filteredSubjects.map((sub) => {
                const isHovered = hoveredSegment === sub.name;
                return (
                  <div
                    key={sub.name}
                    onMouseEnter={() => setHoveredSegment(sub.name)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => setHoveredSegment((prev) => (prev === sub.name ? null : sub.name))}
                    style={{
                      width: `${Math.max(2, sub.percentage)}%`,
                      backgroundColor: sub.color,
                    }}
                    className={`h-full transition-all duration-300 relative group cursor-pointer ${
                      isHovered ? 'brightness-110 z-10 scale-y-105 shadow-md' : 'hover:brightness-105'
                    }`}
                    title={`${sub.name}: ${formatMinutes(sub.minutes)} (${sub.percentage}%)`}
                  >
                    {/* Inner highlight line */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                );
              })}
            </div>

            {/* Hover Tooltip Details */}
            {hoveredSegment && (
              <div className="text-center text-[11px] font-bold text-[#1B3B2F] dark:text-[#A3D9C9] animate-fadeIn">
                {(() => {
                  const target = filteredSubjects.find((s) => s.name === hoveredSegment);
                  if (!target) return null;
                  return `${target.name}: ${formatMinutes(target.minutes)} (${target.percentage}% of total)`;
                })()}
              </div>
            )}
          </div>

          {/* 2. Subject Breakdown List & Visual Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {filteredSubjects.map((sub, idx) => {
              const isHovered = hoveredSegment === sub.name;
              return (
                <div
                  key={sub.name}
                  onMouseEnter={() => setHoveredSegment(sub.name)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-[#E8F5EE] dark:bg-[#1C2E29] border-[#10B981]'
                      : 'bg-[#FAF8F5] dark:bg-[#1C2E29]/60 border-[#EAE5DD] dark:border-[#253D35] hover:bg-white dark:hover:bg-[#162420]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-md flex-shrink-0 shadow-xs"
                        style={{ backgroundColor: sub.color }}
                      ></span>
                      <span className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] truncate">
                        {sub.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono font-bold flex-shrink-0">
                      <span className="text-[#1C2A24] dark:text-[#F2F7F4]">
                        {formatMinutes(sub.minutes)}
                      </span>
                      <span className="text-[11px] text-[#8A9791] min-w-[32px] text-right">
                        {sub.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Mini Percentage Track */}
                  <div className="w-full bg-[#EAE5DD] dark:bg-[#253D35] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sub.percentage}%`,
                        backgroundColor: sub.color,
                      }}
                    ></div>
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
