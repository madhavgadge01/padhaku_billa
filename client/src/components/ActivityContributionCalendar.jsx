import React, { useState, useRef, useEffect, useMemo,mins  } from 'react';
import { Calendar, ShieldCheck, Info} from 'lucide-react';
import { getStudyDayDate } from '../utils/dateUtils.js';

/**
 * Formats minutes into human-readable text (e.g. "2h 35m", "45m", "0m")
 */
function formatMinutes(mins = 0) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * GitHub / LeetCode inspired 365-Day Activity Contribution Grid
 * - Discrete square cells with clean spacing
 * - Subtle extra separation at month boundaries
 * - Aligned month and weekday labels
 */
export const ActivityContributionCalendar = ({
  activityMap = {},
  heatmap = [],
  user,
}) => {
  const containerRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Index all data by date YYYY-MM-DD
  const dataByDate = useMemo(() => {
    const map = { ...activityMap };
    if (Array.isArray(heatmap)) {
      heatmap.forEach((cell) => {
        if (cell && cell.date) {
          const mins = cell.minutes || 0;
          const quests = cell.completedQuests || cell.count || cell.sessions || 0;
          const sessions = cell.count || cell.sessions || 0;
          map[cell.date] = {
            date: cell.date,
            minutes: mins,
            sessions: sessions,
            completedQuests: quests,
            intensity:
              cell.intensity !== undefined
                ? cell.intensity
                : mins >= 120
                ? 4
                : mins >= 60
                ? 3
                : mins >= 30
                ? 2
                : mins > 0 || quests > 0 || sessions > 0
                ? 1
                : 0,
          };
        }
      });
    }

    // Include completed streak dates from user profile so streak days are guaranteed to appear as active
    if (Array.isArray(user?.streaks?.completedDates)) {
      user.streaks.completedDates.forEach((dStr) => {
        if (!map[dStr]) {
          map[dStr] = {
            date: dStr,
            minutes: 25,
            sessions: 1,
            completedQuests: 1,
            intensity: 1,
          };
        } else if (!map[dStr].intensity) {
          map[dStr].intensity = 1;
        }
      });
    }

    return map;
  }, [activityMap, heatmap, user]);

  // Generate 365 rolling days up to today's active study day
  const { weeks, totalYearMinutes, totalYearDays } = useMemo(() => {
    const resetTime = user?.dailyResetTime || '06:00';
    const todayStudyDayStr = getStudyDayDate(new Date(), resetTime);
    const parts = todayStudyDayStr.split('-').map(Number);
    const anchorDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
    const totalDays = 365;
    const days = [];

    let yearMinutes = 0;
    let yearDays = 0;

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setUTCDate(anchorDate.getUTCDate() - i);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

      const record = dataByDate[dateStr] || {
        date: dateStr,
        minutes: 0,
        sessions: 0,
        completedQuests: 0,
      };

      // Intensity based on real focus minutes, completed quests, and streak records:
      // 0: 0m
      // 1: 1 - 29m (or completed quest / streak)
      // 2: 30 - 59m
      // 3: 60 - 119m
      // 4: 120m+
      let intensity = record.intensity !== undefined ? record.intensity : 0;
      if (mins >= 120) intensity = Math.max(intensity, 4);
      else if (mins >= 60) intensity = Math.max(intensity, 3);
      else if (mins >= 30) intensity = Math.max(intensity, 2);
      else if (mins > 0 || (record.completedQuests || 0) > 0 || (record.sessions || 0) > 0) intensity = Math.max(intensity, 1);

      if (mins > 0 || intensity > 0) {
        yearMinutes += mins;
        yearDays += 1;
      }

      // Check if user has rest day enabled for this weekday
      const isRestDay = Boolean(user?.restDay?.enabled && user?.restDay?.dayOfWeek === dayOfWeek);

      days.push({
        date: dateStr,
        dateObj: d,
        dayOfWeek,
        month: d.getMonth(),
        minutes: mins,
        sessions: record.sessions || 0,
        completedQuests: record.completedQuests || 0,
        intensity,
        isRestDay,
      });
    }

    // Group days into 7-row columns (Sunday = 0 to Saturday = 6)
    const rawColumns = [];
    let currentWeek = [];

    // Pad the first week if day 0 isn't Sunday
    const firstDayOfWeek = days[0].dayOfWeek;
    for (let pad = 0; pad < firstDayOfWeek; pad++) {
      currentWeek.push(null);
    }

    days.forEach((dayItem) => {
      currentWeek.push(dayItem);
      if (currentWeek.length === 7) {
        rawColumns.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      rawColumns.push(currentWeek);
    }

    // Determine month boundaries and month labels per column
    let prevMonth = -1;
    const enrichedColumns = rawColumns.map((col, idx) => {
      // Find the first valid day in this column
      const firstValid = col.find((d) => d !== null);
      let isNewMonth = false;
      let monthLabel = null;

      if (firstValid) {
        const curMonth = firstValid.month;
        if (curMonth !== prevMonth) {
          isNewMonth = idx > 0; // Don't add extra separation before the very first column
          monthLabel = firstValid.dateObj.toLocaleDateString('en-US', { month: 'short' });
          prevMonth = curMonth;
        }
      }

      return {
        days: col,
        isNewMonth,
        monthLabel,
        colIndex: idx,
      };
    });

    return {
      weeks: enrichedColumns,
      totalYearMinutes: yearMinutes,
      totalYearDays: yearDays,
    };
  }, [dataByDate, user]);

  // Auto-scroll to latest weeks on initial load
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, []);

  // Intensity color map - clean GitHub style squares with distinct empty state
  const getCellClasses = (day) => {
    if (!day) return 'opacity-0 pointer-events-none';

    switch (day.intensity) {
      case 4:
        return 'bg-[#047857] dark:bg-[#52B499] border-[#035940] dark:border-[#67D4B6] hover:ring-2 hover:ring-[#047857]/70';
      case 3:
        return 'bg-[#10B981] dark:bg-[#349B80] border-[#0E9468] dark:border-[#4BBFA0] hover:ring-2 hover:ring-[#10B981]/70';
      case 2:
        return 'bg-[#6EE7B7] dark:bg-[#256D57] border-[#52D29E] dark:border-[#338A6E] hover:ring-2 hover:ring-[#6EE7B7]/70';
      case 1:
        return 'bg-[#C8E6D5] dark:bg-[#1E4D3E] border-[#B2DAC3] dark:border-[#2C6E59] hover:ring-2 hover:ring-[#C8E6D5]/70';
      case 0:
      default:
        return 'bg-[#EAE5DD] dark:bg-[#253D35] border-[#DED8CE] dark:border-[#2E4A40] hover:ring-2 hover:ring-[#C8C1B3] dark:hover:ring-[#3D6355]';
    }
  };

  const formatFullDate = (dStr) => {
    if (!dStr) return '';
    try {
      const parts = dStr.split('-');
      const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm transition hover:shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE5DD] dark:border-[#253D35]">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-[#1B3B2F] dark:text-[#A3D9C9]">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              Consistency Activity Calendar
            </h3>
          </div>
          <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-0.5">
            Rolling 365-day verified activity contribution grid. Empty squares remain unrecorded.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center space-x-2 self-start sm:self-auto text-xs font-bold text-[#576560] dark:text-[#8BA398]">
          <span className="font-mono text-[#1C2A24] dark:text-white font-black text-sm">
            {formatMinutes(totalYearMinutes)}
          </span>
          <span className="text-[#8A9791]">across {totalYearDays} active days</span>
        </div>
      </div>

      {/* Grid Container (Horizontally Scrollable) */}
      <div className="relative">
        <div
          ref={containerRef}
          className="overflow-x-auto pb-3 pt-2 scrollbar-thin scrollbar-thumb-[#D5CEBF] dark:scrollbar-thumb-[#2C483E]"
        >
          <div className="inline-block min-w-max">
            {/* 1. Month Labels Row (precisely aligned with each month's starting column) */}
            <div className="flex items-center pl-8 mb-2 h-4 text-[10px] font-bold text-[#8A9791] select-none">
              {weeks.map((col) => (
                <div
                  key={col.colIndex}
                  className={`w-[11px] sm:w-[12px] ${col.isNewMonth ? 'ml-2.5' : 'ml-[3px]'} relative flex-shrink-0`}
                >
                  {col.monthLabel && (
                    <span className="absolute top-0 left-0 whitespace-nowrap text-[#1C2A24] dark:text-[#F2F7F4] font-black">
                      {col.monthLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 2. Grid Body: Weekday Labels + Activity Columns */}
            <div className="flex items-start">
              {/* Day of Week Labels (Aligned to Mon, Wed, Fri rows) */}
              <div
                className="flex flex-col justify-between pr-2.5 text-[9px] font-bold text-[#8A9791] select-none"
                style={{ height: `${7 * 12 + 6 * 3}px` }}
              >
                <span className="h-[12px] leading-[12px] opacity-0">Sun</span>
                <span className="h-[12px] leading-[12px]">Mon</span>
                <span className="h-[12px] leading-[12px] opacity-0">Tue</span>
                <span className="h-[12px] leading-[12px]">Wed</span>
                <span className="h-[12px] leading-[12px] opacity-0">Thu</span>
                <span className="h-[12px] leading-[12px]">Fri</span>
                <span className="h-[12px] leading-[12px] opacity-0">Sat</span>
              </div>

              {/* Columns of 7 Square Days with Month Spacing */}
              <div className="flex items-start">
                {weeks.map((col) => (
                  <div
                    key={col.colIndex}
                    className={`flex flex-col gap-[3px] flex-shrink-0 ${
                      col.isNewMonth ? 'ml-2.5' : 'ml-[3px]'
                    }`}
                  >
                    {col.days.map((day, rowIdx) => {
                      if (!day) {
                        return (
                          <div
                            key={rowIdx}
                            className="w-[11px] sm:w-[12px] h-[11px] sm:h-[12px] opacity-0 pointer-events-none"
                          />
                        );
                      }

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredCell({ ...day, rect });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            setHoveredCell((prev) =>
                              prev?.date === day.date ? null : { ...day, rect: null }
                            );
                          }}
                          className={`w-[11px] sm:w-[12px] h-[11px] sm:h-[12px] rounded-[2.5px] border transition-all duration-150 cursor-pointer ${getCellClasses(
                            day
                          )}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredCell && (
          <div
            className="fixed z-50 pointer-events-none transition-all duration-100 ease-out"
            style={{
              top: hoveredCell.rect ? `${Math.max(10, hoveredCell.rect.top - 80)}px` : 'auto',
              left: hoveredCell.rect
                ? `${Math.max(10, Math.min(window.innerWidth - 220, hoveredCell.rect.left - 90))}px`
                : 'auto',
            }}
          >
            <div className="bg-[#1C2A24] dark:bg-[#0B120F] text-white px-3 py-2 rounded-2xl shadow-xl border border-white/10 text-xs space-y-1 min-w-[180px]">
              <div className="font-bold text-white text-[11px] border-b border-white/15 pb-1">
                {formatFullDate(hoveredCell.date)}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A3D9C9] font-medium">Focus Duration:</span>
                <span className="font-mono font-bold text-white">
                  {hoveredCell.minutes > 0 ? formatMinutes(hoveredCell.minutes) : 'No focus'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A3D9C9] font-medium">Completed Quests:</span>
                <span className="font-mono font-bold text-white">
                  {hoveredCell.completedQuests || hoveredCell.sessions || 0}
                </span>
              </div>
              {hoveredCell.isRestDay && (
                <div className="text-[10px] text-amber-300 font-bold flex items-center space-x-1 pt-0.5">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>Weekly Rest Day (Streak shielded)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend & Information */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#EAE5DD] dark:border-[#253D35] text-xs text-[#576560] dark:text-[#8BA398]">
        <div className="flex items-center space-x-1.5 text-[11px]">
          <Info className="w-3.5 h-3.5 text-[#8A9791] flex-shrink-0" />
          <span>Tap or hover over any square to view recorded focus and completed quests.</span>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <span className="text-[10px] font-bold text-[#8A9791]">Less focus</span>
          <div className="flex items-center space-x-1">
            <span
              className="w-3 h-3 rounded-[2px] bg-[#EAE5DD] dark:bg-[#253D35] border border-[#DED8CE] dark:border-[#2E4A40]"
              title="0m (Empty)"
            />
            <span
              className="w-3 h-3 rounded-[2px] bg-[#C8E6D5] dark:bg-[#1E4D3E] border border-[#B2DAC3] dark:border-[#2C6E59]"
              title="1–29m (Light)"
            />
            <span
              className="w-3 h-3 rounded-[2px] bg-[#6EE7B7] dark:bg-[#256D57] border border-[#52D29E] dark:border-[#338A6E]"
              title="30–59m (Medium)"
            />
            <span
              className="w-3 h-3 rounded-[2px] bg-[#10B981] dark:bg-[#349B80] border border-[#0E9468] dark:border-[#4BBFA0]"
              title="60–119m (High)"
            />
            <span
              className="w-3 h-3 rounded-[2px] bg-[#047857] dark:bg-[#52B499] border border-[#035940] dark:border-[#67D4B6]"
              title="120m+ (Intense)"
            />
          </div>
          <span className="text-[10px] font-bold text-[#8A9791]">More focus</span>
        </div>
      </div>
    </div>
  );
};
