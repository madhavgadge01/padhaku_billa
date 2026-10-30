import express from 'express';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { Task } from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';
import { getPeerBenchmark } from '../utils/benchmarkData.js';
import { formatDateStr, getStudyDayDate } from '../utils/streakEngine.js';
import { calculateFocusLevel, getTierForPercent } from '../utils/focusLevelEngine.js';
import {
  calculateSessionFocusMinutes,
  calculateSessionFocusSeconds,
  reconcileOrphanedSessions,
} from '../utils/focusTimeHelper.js';

const router = express.Router();
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// 1. Comprehensive Behavioral Analytics
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const tzOffset = req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null;
    const resetTime = req.user.dailyResetTime || '06:00';

    // Reconcile any interrupted or stale sessions first
    await reconcileOrphanedSessions(userId);

    const allSessions = await PomodoroSession.find({ userId }).sort({ startTime: 1 });
    const completedSessions = allSessions.filter((s) => s.status === 'completed');
    const tasks = await Task.find({ userId });

    // Subject color mapping from timetable for cross-system consistency
    const subjectColorMap = {};
    DAYS.forEach((d) => {
      (req.user.weeklyTimetable?.[d] || []).forEach((sub) => {
        if (sub?.name && sub?.color) {
          subjectColorMap[sub.name.trim().toLowerCase()] = sub.color;
        }
      });
    });

    // Clean session history with synchronized subject names, colors, and verified actual elapsed minutes
    const sessionHistory = allSessions
      .filter((s) => calculateSessionFocusMinutes(s) > 0 || s.status === 'completed')
      .map((s) => {
        const cleanName = (s.taskName || 'Focus').trim();
        const isStopwatch = s.sessionType === 'stopwatch';
        const subjectColor = subjectColorMap[cleanName.toLowerCase()] || '#10B981';
        const defaultColor = isStopwatch
          ? (s.stopwatchColorIndex === 1 ? '#5D3318' : '#C48255')
          : subjectColor;
        const color = isStopwatch
          ? (s.colorTag || defaultColor)
          : (subjectColorMap[cleanName.toLowerCase()] || s.colorTag || '#3B82F6');
        const mins = calculateSessionFocusMinutes(s);
        const dStr = s.dateStr || getStudyDayDate(s.startTime, resetTime, tzOffset);
        return {
          id: s._id.toString(),
          _id: s._id.toString(),
          name: cleanName,
          taskName: cleanName,
          subjectColor,
          color,
          colorTag: color,
          minutes: mins,
          durationMinutes: mins,
          actualMinutes: s.actualMinutes || mins,
          actualSeconds: s.actualSeconds || Math.round(mins * 60),
          dateStr: dStr,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
          isInterrupted: Boolean(s.isInterrupted),
          sessionType: s.sessionType || 'deep_focus',
          activityDescription: s.activityDescription || '',
          sessionNumber: s.sessionNumber || 1,
          stopwatchColorIndex: s.stopwatchColorIndex ?? 0,
        };
      });

    // 1. Tag Distribution (Total minutes per subject name & color)
    const tagMap = {};
    sessionHistory.forEach((s) => {
      const name = s.name;
      const color = subjectColorMap[name.toLowerCase()] || s.subjectColor || '#3B82F6';
      const mins = s.minutes;
      if (!tagMap[name]) {
        tagMap[name] = { name, color, minutes: 0 };
      }
      tagMap[name].minutes += mins;
    });

    const tagDistribution = Object.values(tagMap).map((item) => ({
      name: item.name,
      color: item.color,
      minutes: item.minutes,
      hours: Math.round((item.minutes / 60) * 10) / 10,
    }));

    const taskDistribution = tagDistribution;

    // 2. Pause Pattern Detector AI/Logic Engine
    // Analyze pause rate on Mondays (1) & Fridays (5) vs Mid-week (Tue, Wed, Thu: 2, 3, 4)
    let monFriPauses = 0;
    let monFriSessions = 0;
    let midWeekPauses = 0;
    let midWeekSessions = 0;
    let weekendPauses = 0;
    let weekendSessions = 0;

    // Hourly distribution for pause friction
    const hourlyStats = Array.from({ length: 24 }, (_, i) => ({ hour: i, sessions: 0, pauses: 0 }));

    allSessions.forEach((s) => {
      const dow = s.dayOfWeek !== undefined ? s.dayOfWeek : new Date(s.startTime).getDay();
      const pauses = s.pauseCount || 0;
      const hr = s.hourOfDay !== undefined ? s.hourOfDay : new Date(s.startTime).getHours();

      if (dow === 1 || dow === 5) {
        monFriPauses += pauses;
        monFriSessions += 1;
      } else if (dow >= 2 && dow <= 4) {
        midWeekPauses += pauses;
        midWeekSessions += 1;
      } else {
        weekendPauses += pauses;
        weekendSessions += 1;
      }

      if (hr >= 0 && hr < 24) {
        hourlyStats[hr].sessions += 1;
        hourlyStats[hr].pauses += pauses;
      }
    });

    const monFriRate = monFriSessions > 0 ? monFriPauses / monFriSessions : 0;
    const midWeekRate = midWeekSessions > 0 ? midWeekPauses / midWeekSessions : 0;

    let pauseInsight = '';
    let pauseFrictionType = 'low';

    if (monFriSessions >= 2 && midWeekSessions >= 2) {
      if (monFriRate > midWeekRate * 1.2) {
        const percentHigher = Math.round(((monFriRate - midWeekRate) / (midWeekRate || 1)) * 100);
        pauseInsight = `You pause your sessions ${percentHigher}% more frequently on Mondays & Fridays compared to mid-week days. Transition friction is highest at the bookends of the week!`;
        pauseFrictionType = 'transition_fatigue';
      } else if (midWeekRate > monFriRate * 1.2) {
        const percentHigher = Math.round(((midWeekRate - monFriRate) / (monFriRate || 1)) * 100);
        pauseInsight = `Your mid-week sessions experience ${percentHigher}% higher interruption frequency. Mid-week task switching may be causing mental fragmentation.`;
        pauseFrictionType = 'midweek_fatigue';
      } else {
        pauseInsight = `Your focus consistency is remarkably stable throughout the week with an average of ${Math.round(
          ((monFriPauses + midWeekPauses) / (monFriSessions + midWeekSessions || 1)) * 10
        ) / 10} pauses per session.`;
        pauseFrictionType = 'steady';
      }
    } else {
      pauseInsight = `Complete a few more sessions across different days of the week to unlock deeper behavioral friction telemetry!`;
    }

    // 3. Time Series Data (Daily based on study-day boundary)
    const last14Days = [];
    const dateMap = {};

    allSessions.forEach((s) => {
      const mins = calculateSessionFocusMinutes(s);
      const d = s.dateStr || getStudyDayDate(s.startTime, resetTime, tzOffset);
      dateMap[d] = dateMap[d] || { minutes: 0, sessions: 0, pauses: 0, coins: 0 };
      dateMap[d].minutes += mins;
      if (s.status === 'completed') {
        dateMap[d].sessions += 1;
      }
      dateMap[d].pauses += s.pauseCount || 0;
      dateMap[d].coins += s.coinsEarned || 0;
    });

    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const str = getStudyDayDate(d, resetTime, tzOffset);
      const dayName = new Date(str + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const stats = dateMap[str] || { minutes: 0, sessions: 0, pauses: 0, coins: 0 };

      // Prevent duplicate days in series if boundary calculation overlaps
      if (!last14Days.some((entry) => entry.date === str)) {
        last14Days.push({
          date: str,
          label: `${dayName} ${str.split('-')[2]}`,
          minutes: Math.round(stats.minutes),
          hours: Math.round((stats.minutes / 60) * 10) / 10,
          sessions: stats.sessions,
          pauses: stats.pauses,
          coins: stats.coins,
        });
      }
    }

    // 4. Completed Quests & Full Activity Map
    const completedQuestsDateMap = {};
    let totalTimetableQuestsCompleted = 0;
    DAYS.forEach((d) => {
      (req.user.weeklyTimetable?.[d] || []).forEach((sub) => {
        (sub.completedDates || []).forEach((dateStr) => {
          totalTimetableQuestsCompleted += 1;
          completedQuestsDateMap[dateStr] = (completedQuestsDateMap[dateStr] || 0) + 1;
        });
      });
    });

    const totalQuestsCompleted = Math.max(totalTimetableQuestsCompleted, completedSessions.length);

    // Full Activity Map for 365-day calendar
    const streakDates = Array.isArray(req.user.streaks?.completedDates) ? req.user.streaks.completedDates : [];
    const allActiveDates = new Set([
      ...Object.keys(dateMap),
      ...Object.keys(completedQuestsDateMap),
      ...streakDates,
    ]);
    const fullActivityMap = {};
    allActiveDates.forEach((d) => {
      const mins = Math.round(dateMap[d]?.minutes || 0);
      const sess = dateMap[d]?.sessions || 0;
      const quests = completedQuestsDateMap[d] || (sess > 0 ? sess : 0) || (streakDates.includes(d) ? 1 : 0);
      let intensity = 0;
      if (mins >= 120) intensity = 4;
      else if (mins >= 60) intensity = 3;
      else if (mins >= 30) intensity = 2;
      else if (mins > 0 || quests > 0 || streakDates.includes(d)) intensity = 1;

      fullActivityMap[d] = {
        date: d,
        minutes: mins || (quests > 0 ? 25 : 0),
        sessions: sess || (quests > 0 ? 1 : 0),
        completedQuests: quests,
        intensity,
      };
    });

    const heatmap = Object.values(fullActivityMap);

    // 5. Total Metrics: Genuine elapsed focus time across all sessions, completed sessions count strictly completed
    const totalMinutesLogged = Math.round(allSessions.reduce((acc, s) => acc + calculateSessionFocusMinutes(s), 0));
    const totalHoursLogged = Math.round((totalMinutesLogged / 60) * 10) / 10;
    const totalSessionsCount = completedSessions.length;
    const totalCoinsAccumulated = req.user.coins;

    // Average daily hours based on active dates
    const uniqueDays = Object.keys(dateMap).length || 1;
    const averageDailyHours = Math.round((totalHoursLogged / uniqueDays) * 10) / 10;
    const averageDailyMinutes = Math.round(totalMinutesLogged / uniqueDays);

    // 6. Calibrated Focus Level (0 - 100%) based on 14-day rolling actual focus hours/day
    const todayStr = getStudyDayDate(new Date(), resetTime, tzOffset);
    const todayStats = dateMap[todayStr] || { minutes: 0, sessions: 0 };
    const todayMinutes = todayStats.minutes;

    // 14-day rolling window calculation
    const fourteenDaysMinutes = last14Days.reduce((acc, d) => acc + (d.minutes || 0), 0);
    const fourteenDaysHours = fourteenDaysMinutes / 60;

    // Account age in days: handle new accounts gracefully without distorting average
    const userCreatedAt = req.user.createdAt ? new Date(req.user.createdAt) : now;
    const accountAgeDays = Math.max(1, Math.ceil((now.getTime() - userCreatedAt.getTime()) / (24 * 60 * 60 * 1000)));
    const windowDays = Math.max(1, Math.min(14, accountAgeDays));

    // Actual average focus hours per day over 14-day window (including zero-focus days)
    const avgDailyHours14d = Math.round((fourteenDaysHours / windowDays) * 10) / 10;
    const focusScore = calculateFocusLevel(avgDailyHours14d);
    const tier = getTierForPercent(focusScore);
    const isDeveloping = accountAgeDays < 7 || allSessions.length < 3;

    const focusLevel = {
      score: focusScore,
      tier: tier.label,
      tierColor: tier.color,
      tierTagline: tier.description,
      positionPercent: focusScore,
      todayMinutes,
      recentDailyAverageMinutes: Math.round(avgDailyHours14d * 60),
      avgDailyHours14d,
      fourteenDaysMinutes,
      windowDays,
      activeDaysCount: uniqueDays,
      isDeveloping,
    };

    // Backward-compatible studyConsistencyModel
    const studyConsistencyModel = {
      modelName: 'Transparent Focus Engine',
      personalScore: focusScore,
      currentRange: `${Math.max(10, focusScore - 5)}% – ${Math.min(100, focusScore + 5)}%`,
      projectedRange: `${Math.min(96, focusScore + 12)}% – ${Math.min(100, focusScore + 18)}%`,
      plannedWeeklyHours: 12,
      taskCompletionRate: `${Math.round(((tasks.filter((t) => t.completedToday).length) / Math.max(1, tasks.length)) * 100)}%`,
      focusLevel,
    };

    return res.json({
      success: true,
      summary: {
        totalHoursLogged,
        totalMinutesLogged,
        totalSessionsCount,
        totalQuestsCompleted,
        totalCoinsAccumulated,
        averageDailyHours,
        averageDailyMinutes,
        uniqueDaysLogged: uniqueDays,
        currentStreak: req.user.streaks?.currentGlobalStreak || 0,
        bestStreak: req.user.streaks?.bestGlobalStreak || 0,
      },
      focusLevel,
      sessions: sessionHistory,
      activityMap: fullActivityMap,
      tagDistribution,
      taskDistribution,
      timeSeries: {
        daily: last14Days,
      },
      heatmap,
      studyConsistencyModel,
      peerBenchmark: studyConsistencyModel,
    });
  } catch (error) {
    console.error('[Analytics Error] Dashboard:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate behavioral analytics.' });
  }
});

// 2. Personal Consistency & Forecast Standalone Endpoint
router.get('/peer-benchmark', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    await reconcileOrphanedSessions(userId);
    const allSessions = await PomodoroSession.find({ userId });
    const tasks = await Task.find({ userId });
    const totalMinutes = allSessions.reduce((acc, s) => acc + calculateSessionFocusMinutes(s), 0);

    const activeDays = new Set(
      allSessions
        .filter((s) => calculateSessionFocusMinutes(s) > 0 || s.status === 'completed')
        .map((s) => s.dateStr || formatDateStr(s.startTime))
    ).size || 1;
    const dailyHours = totalMinutes / 60 / activeDays;

    return res.json({
      success: true,
      benchmark: {
        modelName: 'Transparent Study-Consistency Engine',
        averageDailyHours: Math.round(dailyHours * 10) / 10,
        activeTasksCount: tasks.length,
        explanation: 'Evaluates personal focus regularity and planned task follow-through without fabricated external claims.',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch consistency metrics.' });
  }
});

// 3. Demo Seed Helper (Disabled in production mode)
router.post('/seed-demo-data', requireAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Demo dataset seeding is permanently disabled in production mode.',
      });
    }

    const user = req.user;
    const existingTasks = await Task.find({ userId: user._id });

    let createdTasks = existingTasks;
    if (existingTasks.length === 0) {
      createdTasks = await Task.insertMany([
        {
          userId: user._id,
          name: 'Data Structures & Algorithms',
          durationMinutes: 45,
          colorTag: '#ef4444', // Red
          currentStreak: 5,
          bestStreak: 12,
          totalSessions: 18,
          totalMinutes: 810,
          completedToday: true,
          lastCompletedDate: formatDateStr(new Date()),
        },
        {
          userId: user._id,
          name: 'System Architecture & RFCs',
          durationMinutes: 50,
          colorTag: '#3b82f6', // Blue
          currentStreak: 4,
          bestStreak: 9,
          totalSessions: 14,
          totalMinutes: 700,
          completedToday: true,
          lastCompletedDate: formatDateStr(new Date()),
        },
        {
          userId: user._id,
          name: 'Technical Writing & English',
          durationMinutes: 25,
          colorTag: '#10b981', // Green
          currentStreak: 7,
          bestStreak: 14,
          totalSessions: 22,
          totalMinutes: 550,
          completedToday: true,
          lastCompletedDate: formatDateStr(new Date()),
        },
      ]);
    }

    // Generate sessions over the past 14 days
    const sampleSessions = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDateStr(d);
      const dow = d.getDay();

      // On Mondays (1) & Fridays (5), simulate higher pause friction (e.g. 2-3 pauses)
      // Mid-week, simulate 0-1 pauses
      createdTasks.forEach((t, tIdx) => {
        const isMonOrFri = dow === 1 || dow === 5;
        const pauses = isMonOrFri ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
        const coins = Math.max(0, 5 - pauses);

        const sessionDate = new Date(d);
        sessionDate.setHours(9 + tIdx * 2, 15, 0);

        sampleSessions.push({
          userId: user._id,
          taskId: t._id,
          taskName: t.name,
          colorTag: t.colorTag,
          durationMinutes: t.durationMinutes,
          actualMinutes: t.durationMinutes,
          startTime: sessionDate,
          endTime: new Date(sessionDate.getTime() + t.durationMinutes * 60000),
          pauseCount: pauses,
          coinsEarned: coins,
          status: 'completed',
          dateStr,
          dayOfWeek: dow,
          hourOfDay: sessionDate.getHours(),
          isRestDay: false,
        });
      });
    }

    // Clean old demo sessions and insert
    await PomodoroSession.deleteMany({ userId: user._id });
    await PomodoroSession.insertMany(sampleSessions);

    // Update user stats
    user.coins = Math.max(user.coins, 140);
    user.streaks.currentGlobalStreak = 14;
    user.streaks.bestGlobalStreak = 18;
    user.streaks.lastActiveDate = formatDateStr(new Date());
    await user.save();

    return res.json({
      success: true,
      message: 'Demo dataset successfully loaded! Explore full charts, pause patterns, and shop upgrades.',
      tasksCount: createdTasks.length,
      sessionsCount: sampleSessions.length,
    });
  } catch (error) {
    console.error('[Analytics Error] Seed:', error);
    return res.status(500).json({ success: false, message: 'Failed to seed demo data.' });
  }
});

export default router;
