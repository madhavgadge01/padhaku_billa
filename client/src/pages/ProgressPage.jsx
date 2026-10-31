import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import { FocusLevelCard } from '../components/FocusLevelCard.jsx';
import { ActivityContributionCalendar } from '../components/ActivityContributionCalendar.jsx';
import { FocusTimeDistribution } from '../components/FocusTimeDistribution.jsx';
import { formatResetTimeDisplay, getStudyDayDate } from '../utils/dateUtils.js';

/**
 * Helper to format duration in minutes to e.g. "2h 35m", "45m", "0m"
 */
function formatDuration(totalMins = 0) {
  if (!totalMins || totalMins <= 0) return '0m';
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Helper to format daily average to e.g. "45m/day", "1h 15m/day"
 */
function formatDailyAverage(mins = 0) {
  if (!mins || mins <= 0) return '0m/day';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m/day`;
  if (h > 0) return `${h}h/day`;
  return `${m}m/day`;
}

export const ProgressPage = ({ user, onReload }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalyticsDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load progress analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const { summary, timeSeries, heatmap = [], activityMap = {} } = data || {};
  const dailySeries = timeSeries?.daily || [];
  const maxMinutes = Math.max(60, ...dailySeries.map((d) => d.minutes || 0));

  if (loading) {
    return (
      <div className="p-16 text-center text-xs font-bold text-[#8A9791]">
        Loading your focus statistics...
      </div>
    );
  }

  // Total Focus Time for today (Deep Focus + Saved Stopwatch, resets at user's configured dailyResetTime)
  const resetTime = user?.dailyResetTime || data?.dailyResetTime || '00:00';
  const todayDateStr = data?.todayDateStr || getStudyDayDate(new Date(), resetTime);

  const computedTodayMinutes = (data?.sessions || [])
    .filter((s) => {
      const sDateStr = s.dateStr || (s.startTime ? getStudyDayDate(new Date(s.startTime), resetTime) : null);
      return sDateStr === todayDateStr;
    })
    .reduce((acc, s) => acc + (Number(s.actualMinutes || s.durationMinutes || s.minutes) || 0), 0);

  const totalFocusMinutes = typeof summary?.todayFocusMinutes === 'number'
    ? summary.todayFocusMinutes
    : (typeof summary?.totalFocusMinutes === 'number'
      ? summary.totalFocusMinutes
      : Math.round(computedTodayMinutes));

  // Daily average focus time calculated over the last 7 calendar days (Total Focus / 7)
  const last7DaysSeries = dailySeries.slice(-7);
  const last7DaysMinutes = last7DaysSeries.reduce((acc, d) => acc + (d.minutes || 0), 0);
  const dailyAvg7DaysMinutes = Math.round(last7DaysMinutes / 7);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
            Focus Progress & Analytics
          </h2>
         
        </div>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      {/* Desktop Layout: Tall Total Focus Card spanning height of 2 stacked cards beside it */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Focus: Today's Active Focus Card */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-[#1B3B2F] dark:text-[#A3D9C9]">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                Total Focus Time
              </span>
            </div>

            <div className="text-4xl sm:text-5xl font-black text-[#1C2A24] dark:text-[#F2F7F4] font-mono tracking-tight">
              {formatDuration(totalFocusMinutes)}
            </div>
            <p className="text-xs text-[#8A9791] mt-1 font-medium">
              Today's active focus (resets daily at {formatResetTimeDisplay(resetTime)})
            </p>
          </div>

          {/* Integrated Daily Average based on 7 calendar days */}
          <div className="mt-6 pt-4 border-t border-[#EAE5DD] dark:border-[#253D35] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#576560] dark:text-[#8BA398]">Daily Average Focus Time</span>
                <span className="text-[10px] text-[#8A9791]">Over last 7 calendar days (Total / 7)</span>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-[#1C2A24] dark:text-[#F2F7F4] bg-[#FAF8F5] dark:bg-[#1C2E29] px-3 py-1 rounded-xl border border-[#EAE5DD] dark:border-[#253D35]">
              {formatDailyAverage(dailyAvg7DaysMinutes)}
            </div>
          </div>
        </div>

        {/* Stacked Compact Cards Beside Total Focus */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Completed Quests */}
          <div className="flex-1 p-5 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-[#1B3B2F] dark:text-[#A3D9C9]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <span>Completed Tasks</span>
            </div>
            <div>
              <div className="text-3xl font-black text-[#1C2A24] dark:text-[#F2F7F4] font-mono tracking-tight">
                {summary?.totalQuestsCompleted ?? summary?.totalSessionsCount ?? 0}
                <span className="text-sm font-normal text-[#8A9791] ml-1">tasks</span>
              </div>
              <p className="text-[11px] text-[#8A9791] mt-0.5 font-medium">Finished study tasks</p>
            </div>
          </div>

          {/* Card 2: Current Streak */}
          <div className="flex-1 p-5 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] dark:bg-[#2C2110] flex items-center justify-center text-[#D97724] dark:text-[#F59E0B]">
                <Flame className="w-3.5 h-3.5 fill-current" />
              </div>
              <span>Current Streak</span>
            </div>
            <div>
              <div className="text-3xl font-black text-[#D97724] dark:text-[#F59E0B] font-mono tracking-tight">
                {user?.streaks?.currentGlobalStreak ?? summary?.currentStreak ?? 0}
                <span className="text-sm font-normal text-[#8A9791] ml-1">days</span>
              </div>
              <p className="text-[11px] text-[#8A9791] mt-0.5 font-medium">
                Best: {user?.streaks?.bestGlobalStreak ?? summary?.bestStreak ?? 0} days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOCUS TIME BY TASKS TAG (DONUT CHART & DETAIL PANEL) */}
      <FocusTimeDistribution
        sessions={data?.sessions}
        tagDistribution={data?.tagDistribution}
        user={user}
      />

      {/* 3. YOUR FOCUS LEVEL CARD (DIRECTLY BELOW FOCUS TIME BY TASKS TAG) */}
      <FocusLevelCard data={data} user={user} compact={false} />

      {/* 4. DAILY FOCUS MINUTES (LAST 14 DAYS) — EXACTLY PRESERVED AS REQUIRED */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
          <div>
            <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
              Daily Focus Minutes (Last 14 Days)
            </h3>
          
          </div>
          <span className="text-xs font-mono font-bold text-[#1B3B2F] dark:text-[#A3D9C9]">
            Peak: {maxMinutes} mins
          </span>
        </div>

        <div className="h-44 flex items-end justify-between space-x-2 pt-6 pb-2">
          {dailySeries.map((day) => {
            const heightPercent = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                {/* Tooltip on hover */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-[#1B3B2F] text-white text-[10px] px-2 py-1 rounded-xl shadow pointer-events-none whitespace-nowrap z-20">
                  {day.minutes}m ({day.sessions} sessions)
                </div>
                <div
                  className="w-full bg-[#1B3B2F] dark:bg-[#38746A] hover:bg-[#D97724] dark:hover:bg-[#F59E0B] rounded-t-xl transition-all duration-300"
                  style={{ height: `${Math.max(4, heightPercent)}%` }}
                ></div>
                <span className="text-[9px] text-[#8A9791] mt-1.5 font-mono truncate w-full text-center">
                  {day.label ? day.label.split(' ')[0] : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 365-DAY ACTIVITY CONTRIBUTION GRID (GITHUB / LEETCODE STYLE) */}
      <ActivityContributionCalendar
        activityMap={activityMap}
        heatmap={heatmap}
        user={user}
      />
    </div>
  );
};
