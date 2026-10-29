import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import { PomodoroSession } from '../models/PomodoroSession.js';

/**
 * Parses "HH:mm" time string into hours and minutes
 * Defaults to 6:00 AM
 */
export const parseResetTime = (resetTimeStr = '06:00') => {
  if (!resetTimeStr || typeof resetTimeStr !== 'string') return { hours: 6, minutes: 0 };
  const parts = resetTimeStr.split(':').map(Number);
  const hours = isNaN(parts[0]) ? 6 : Math.max(0, Math.min(23, parts[0]));
  const minutes = isNaN(parts[1]) ? 0 : Math.max(0, Math.min(59, parts[1]));
  return { hours, minutes };
};

/**
 * Calculates the exact study day date string ('YYYY-MM-DD') based on configured daily reset time
 * E.g. If reset time is 06:00:
 * Monday 10:00 PM -> Monday
 * Tuesday 02:00 AM -> Monday (still part of Monday's study day)
 * Tuesday 05:30 AM -> Monday
 * Tuesday 06:00 AM -> Tuesday (new study day begins)
 */
export const getStudyDayDate = (date = new Date(), resetTime = '06:00', timezoneOffsetMinutes = null) => {
  const d = new Date(date);
  const { hours, minutes } = parseResetTime(resetTime);
  const shiftMs = (hours * 60 + minutes) * 60 * 1000;

  if (timezoneOffsetMinutes !== null && !isNaN(timezoneOffsetMinutes)) {
    // If client timezone offset is supplied (e.g. from client new Date().getTimezoneOffset())
    const localMs = d.getTime() - timezoneOffsetMinutes * 60 * 1000 - shiftMs;
    const shiftedDate = new Date(localMs);
    const year = shiftedDate.getUTCFullYear();
    const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(shiftedDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else {
    const shiftedDate = new Date(d.getTime() - shiftMs);
    const year = shiftedDate.getFullYear();
    const month = String(shiftedDate.getMonth() + 1).padStart(2, '0');
    const day = String(shiftedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Calculates the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * according to the configured daily reset boundary
 */
export const getStudyDayOfWeek = (date = new Date(), resetTime = '06:00', timezoneOffsetMinutes = null) => {
  const d = new Date(date);
  const { hours, minutes } = parseResetTime(resetTime);
  const shiftMs = (hours * 60 + minutes) * 60 * 1000;

  if (timezoneOffsetMinutes !== null && !isNaN(timezoneOffsetMinutes)) {
    const localMs = d.getTime() - timezoneOffsetMinutes * 60 * 1000 - shiftMs;
    const shiftedDate = new Date(localMs);
    return shiftedDate.getUTCDay();
  } else {
    const shiftedDate = new Date(d.getTime() - shiftMs);
    return shiftedDate.getDay();
  }
};

/**
 * Returns weekday key for weekly timetable: 'sunday' | 'monday' | ... | 'saturday'
 */
export const getStudyDayKey = (date = new Date(), resetTime = '06:00', timezoneOffsetMinutes = null) => {
  const dow = getStudyDayOfWeek(date, resetTime, timezoneOffsetMinutes);
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return keys[dow];
};

/**
 * Returns previous calendar date string 'YYYY-MM-DD' given a date string
 */
export const getPreviousStudyDayDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const prevY = dt.getUTCFullYear();
  const prevM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const prevD = String(dt.getUTCDate()).padStart(2, '0');
  return `${prevY}-${prevM}-${prevD}`;
};

/**
 * Calculates the exact 'YYYY-MM-DD' date string for any weekday in the current study week
 */
export const getWeekdayDateStr = (targetDayKey, date = new Date(), resetTime = '06:00', timezoneOffsetMinutes = null) => {
  const todayKey = getStudyDayKey(date, resetTime, timezoneOffsetMinutes);
  const todayDateStr = getStudyDayDate(date, resetTime, timezoneOffsetMinutes);
  const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayIdx = weekdayOrder.indexOf(todayKey);
  const targetIdx = weekdayOrder.indexOf(targetDayKey);
  if (todayIdx === -1 || targetIdx === -1) return todayDateStr;

  const diffDays = targetIdx - todayIdx;
  const parts = todayDateStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + diffDays, 12));
  const year = baseDate.getUTCFullYear();
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns number of days between two 'YYYY-MM-DD' date strings
 */
export const getDayDiff = (dateStr1, dateStr2) => {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = Math.abs(d2 - d1);
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Checks if a given timestamp represents a protected rest day under user's study day boundary
 */
export const isRestDayForUser = (user, date = new Date(), clientTimezoneOffset = null) => {
  if (!user.restDay || !user.restDay.enabled) return false;
  const resetTime = user.dailyResetTime || '06:00';
  const studyDow = getStudyDayOfWeek(date, resetTime, clientTimezoneOffset);
  return studyDow === user.restDay.dayOfWeek;
};

/**
 * Calculates independent streak for any subject/task based on its completion dates
 * Returns { currentStreak, bestStreak, completedToday, lastCompletedDate }
 */
export const calculateSubjectStreak = (completedDates = [], todayStr, user = null, clientTimezoneOffset = null) => {
  if (!Array.isArray(completedDates) || completedDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedToday: false,
      lastCompletedDate: '',
    };
  }

  // Filter valid 'YYYY-MM-DD' dates and deduplicate
  const uniqueDates = Array.from(
    new Set(completedDates.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))
  ).sort();

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedToday: false,
      lastCompletedDate: '',
    };
  }

  const lastCompletedDate = uniqueDates[uniqueDates.length - 1];
  const dateSet = new Set(uniqueDates);
  const completedToday = dateSet.has(todayStr);

  // 1. Calculate currentStreak
  let currentStreak = 0;
  if (completedToday) {
    currentStreak = 1;
    let curr = todayStr;
    while (true) {
      const prev = getPreviousStudyDayDate(curr);
      if (dateSet.has(prev)) {
        currentStreak++;
        curr = prev;
      } else {
        const wasRest = user ? isRestDayForUser(user, new Date(prev + 'T12:00:00Z'), clientTimezoneOffset) : false;
        if (wasRest) {
          curr = prev;
        } else {
          break;
        }
      }
    }
  } else {
    // Has not completed today yet.
    // Check if yesterday was completed -> streak stays intact pending today's session
    const yesterdayStr = getPreviousStudyDayDate(todayStr);
    if (dateSet.has(yesterdayStr)) {
      currentStreak = 1;
      let curr = yesterdayStr;
      while (true) {
        const prev = getPreviousStudyDayDate(curr);
        if (dateSet.has(prev)) {
          currentStreak++;
          curr = prev;
        } else {
          const wasRest = user ? isRestDayForUser(user, new Date(prev + 'T12:00:00Z'), clientTimezoneOffset) : false;
          if (wasRest) {
            curr = prev;
          } else {
            break;
          }
        }
      }
    } else {
      // Missed yesterday and today
      currentStreak = 0;
    }
  }

  // 2. Calculate bestStreak across all recorded completions
  let bestStreak = 0;
  let runningStreak = 0;
  let prevDate = null;
  for (const d of uniqueDates) {
    if (!prevDate) {
      runningStreak = 1;
    } else if (getPreviousStudyDayDate(d) === prevDate) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }
    prevDate = d;
    bestStreak = Math.max(bestStreak, runningStreak);
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  return {
    currentStreak,
    bestStreak,
    completedToday,
    lastCompletedDate,
  };
};

/**
 * Validates and updates user's streaks using the configurable daily reset boundary
 * Night-time friendly: An active study day in progress NEVER breaks an existing streak!
 */
export const checkAndRefreshStreaks = async (user, clientTimezoneOffset = null) => {
  const resetTime = user.dailyResetTime || '06:00';
  const todayStr = getStudyDayDate(new Date(), resetTime, clientTimezoneOffset);
  const todayKey = getStudyDayKey(new Date(), resetTime, clientTimezoneOffset);
  const isRestDayToday = isRestDayForUser(user, new Date(), clientTimezoneOffset);
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // 1. Calculate & Synchronize Independent Subject Streaks across Weekly Timetable
  if (user.weeklyTimetable) {
    // Group all subject completions by normalized subject identity (id or lowerName)
    const subjectDateMaps = new Map();

    DAYS.forEach((d) => {
      (user.weeklyTimetable[d] || []).forEach((sub) => {
        if (!sub || !sub.name) return;
        const key = (sub.id || sub.name).trim().toLowerCase();
        if (!subjectDateMaps.has(key)) {
          subjectDateMaps.set(key, new Set());
        }
        if (Array.isArray(sub.completedDates)) {
          sub.completedDates.forEach((date) => subjectDateMaps.get(key).add(date));
        }
      });
    });

    // Compute independent streak for each subject entity and assign to timetable items
    DAYS.forEach((d) => {
      (user.weeklyTimetable[d] || []).forEach((sub) => {
        if (!sub || !sub.name) return;
        const key = (sub.id || sub.name).trim().toLowerCase();
        const allDates = Array.from(subjectDateMaps.get(key) || []);
        const streakInfo = calculateSubjectStreak(allDates, todayStr, user, clientTimezoneOffset);

        sub.completedDates = allDates;
        sub.currentStreak = streakInfo.currentStreak;
        sub.bestStreak = streakInfo.bestStreak;
        sub.lastCompletedDate = streakInfo.lastCompletedDate;
      });
    });

    user.markModified('weeklyTimetable');
  }

  // 2. Unified Tasks from Weekly Timetable for Today's Study Day
  const timetableToday = user.weeklyTimetable?.[todayKey] || [];
  let tasks = [];

  if (timetableToday.length > 0) {
    tasks = timetableToday.map((t) => {
      const isCompleted = Array.isArray(t.completedDates) && t.completedDates.includes(todayStr);
      return {
        _id: t.id || t._id,
        id: t.id || t._id,
        name: t.name,
        durationMinutes: t.targetMinutes || 25,
        targetMinutes: t.targetMinutes || 25,
        colorTag: t.color || '#3B82F6',
        color: t.color || '#3B82F6',
        completedToday: isCompleted,
        completedDates: t.completedDates || [],
        currentStreak: t.currentStreak || 0,
        bestStreak: t.bestStreak || 0,
        lastCompletedDate: t.lastCompletedDate || '',
        weekday: todayKey,
        repeatDaily: Boolean(t.repeatDaily),
      };
    });
  } else {
    // Fallback to legacy task collection if user has not yet configured weekly timetable
    const dbTasks = await Task.find({ userId: user._id });
    if (dbTasks.length > 0) {
      tasks = dbTasks.map((t) => {
        const historyDates = (t.history || []).filter((h) => h.completed).map((h) => h.date);
        if (t.lastCompletedDate && !historyDates.includes(t.lastCompletedDate)) {
          historyDates.push(t.lastCompletedDate);
        }
        const streakInfo = calculateSubjectStreak(historyDates, todayStr, user, clientTimezoneOffset);
        t.currentStreak = streakInfo.currentStreak;
        t.bestStreak = streakInfo.bestStreak;
        t.completedToday = streakInfo.completedToday;
        t.lastCompletedDate = streakInfo.lastCompletedDate;
        return {
          ...t.toObject(),
          currentStreak: streakInfo.currentStreak,
          bestStreak: streakInfo.bestStreak,
          completedToday: streakInfo.completedToday,
          lastCompletedDate: streakInfo.lastCompletedDate,
        };
      });
    }
  }

  // Fair streak verification for night-time students:
  // An active study day that is currently ongoing does NOT count as a missed day.
  const lastActive = user.streaks?.lastActiveDate;
  if (lastActive && lastActive !== todayStr) {
    const yesterdayStr = getPreviousStudyDayDate(todayStr);

    // If last active was yesterday, today is simply still active and ongoing -> do NOT reset
    if (lastActive !== yesterdayStr) {
      // Days between yesterday and lastActive were skipped
      // Verify whether the skipped day was a protected rest day
      const wasYesterdayRest = isRestDayForUser(user, new Date(Date.now() - 24 * 60 * 60 * 1000), clientTimezoneOffset);
      if (!wasYesterdayRest && !isRestDayToday) {
        // Missed day was not a rest day, reset global streak to 0
        user.streaks.currentGlobalStreak = 0;
        user.streaks.currentStreak = 0;
        await user.save();
      }
    }
  }

  const completedTodayCount = tasks.filter((t) => t.completedToday).length;
  // If a day has no planned tasks, show an appropriate empty state rather than silently treating it as completed
  const allTasksCompletedToday = tasks.length > 0 && completedTodayCount === tasks.length;

  return {
    user,
    tasks,
    todayStudyDay: todayStr,
    todayKey,
    allTasksCompletedToday,
    completedTodayCount,
    totalTasks: tasks.length,
    isRestDayToday,
  };
};

/**
 * Updates individual task streak upon completion of a session
 */
export const updateTaskStreak = async (task, user, clientTimezoneOffset = null) => {
  const resetTime = user.dailyResetTime || '06:00';
  const todayStr = getStudyDayDate(new Date(), resetTime, clientTimezoneOffset);
  const yesterdayStr = getPreviousStudyDayDate(todayStr);

  if (task.lastCompletedDate === todayStr) {
    task.completedToday = true;
    if (task.save) await task.save();
    return task;
  }

  // If last completed date was yesterday's study day, increment streak
  if (task.lastCompletedDate === yesterdayStr) {
    task.currentStreak = (task.currentStreak || 0) + 1;
  } else if (!task.lastCompletedDate) {
    task.currentStreak = 1;
  } else {
    const wasYesterdayRest = isRestDayForUser(user, new Date(Date.now() - 24 * 60 * 60 * 1000), clientTimezoneOffset);
    if (wasYesterdayRest) {
      task.currentStreak = (task.currentStreak || 0) + 1;
    } else {
      task.currentStreak = 1;
    }
  }

  task.bestStreak = Math.max(task.bestStreak || 0, task.currentStreak);
  task.lastCompletedDate = todayStr;
  task.completedToday = true;
  if (task.save) await task.save();
  return task;
};

/**
 * Updates global main day streak if ALL tasks scheduled for today are completed
 */
export const updateGlobalStreakIfEligible = async (user, clientTimezoneOffset = null) => {
  const resetTime = user.dailyResetTime || '06:00';
  const todayStr = getStudyDayDate(new Date(), resetTime, clientTimezoneOffset);
  const todayKey = getStudyDayKey(new Date(), resetTime, clientTimezoneOffset);

  const timetableToday = user.weeklyTimetable?.[todayKey] || [];
  let isAllDone = false;
  let totalScheduled = 0;

  if (timetableToday.length > 0) {
    totalScheduled = timetableToday.length;
    isAllDone = timetableToday.every(
      (t) => Array.isArray(t.completedDates) && t.completedDates.includes(todayStr)
    );
  } else {
    // Fallback to legacy task collection
    const legacyTasks = await Task.find({ userId: user._id });
    if (legacyTasks.length > 0) {
      totalScheduled = legacyTasks.length;
      isAllDone = legacyTasks.every((t) => t.completedToday || t.lastCompletedDate === todayStr);
    }
  }

  // If a day has no planned tasks, show an appropriate empty state rather than silently treating it as completed
  if (totalScheduled === 0) {
    return { globalStreakUpdated: false, allCompleted: false, noTasksScheduled: true, bonusAwarded: false };
  }

  if (!isAllDone) {
    return { globalStreakUpdated: false, allCompleted: false, bonusAwarded: false };
  }

  // If today's study day is already recorded as completed, do not double-increment
  if (user.streaks.lastActiveDate === todayStr && user.streaks.completedDates.includes(todayStr)) {
    return {
      globalStreakUpdated: false,
      allCompleted: true,
      currentGlobalStreak: user.streaks.currentGlobalStreak,
      bestGlobalStreak: user.streaks.bestGlobalStreak,
      bonusAwarded: false,
    };
  }

  const yesterdayStr = getPreviousStudyDayDate(todayStr);

  if (user.streaks.lastActiveDate === yesterdayStr) {
    user.streaks.currentGlobalStreak = (user.streaks.currentGlobalStreak || 0) + 1;
  } else if (!user.streaks.lastActiveDate) {
    user.streaks.currentGlobalStreak = 1;
  } else {
    const wasYesterdayRest = isRestDayForUser(user, new Date(Date.now() - 24 * 60 * 60 * 1000), clientTimezoneOffset);
    if (wasYesterdayRest) {
      user.streaks.currentGlobalStreak = (user.streaks.currentGlobalStreak || 0) + 1;
    } else {
      user.streaks.currentGlobalStreak = 1;
    }
  }

  user.streaks.bestGlobalStreak = Math.max(user.streaks.bestGlobalStreak || 0, user.streaks.currentGlobalStreak);
  user.streaks.currentStreak = user.streaks.currentGlobalStreak;
  user.streaks.bestStreak = user.streaks.bestGlobalStreak;
  user.streaks.lastActiveDate = todayStr;

  if (!user.streaks.completedDates.includes(todayStr)) {
    user.streaks.completedDates.push(todayStr);
  }

  // 365-Day Consistency Streak unlocks Suit & Boot Businessman
  if (user.streaks.bestGlobalStreak >= 365) {
    user.inventory.unlockedBusinessSuit = true;
  }

  // Check and award the 2-coin daily bonus if user completed > 4 (>= 5) pause-free tasks
  const bonusResult = await checkAndAwardDailyBonus(user, todayStr);
  const bonusAwarded = bonusResult.bonusAwarded;
  const bonusCoins = bonusResult.bonusCoins;

  user.markModified('streaks');
  await user.save();

  return {
    globalStreakUpdated: true,
    currentGlobalStreak: user.streaks.currentGlobalStreak,
    bestGlobalStreak: user.streaks.bestGlobalStreak,
    allCompleted: true,
    bonusAwarded,
    bonusCoins,
    qualifyingCount: bonusResult.qualifyingCount,
    unlockedBusinessSuit: user.inventory.unlockedBusinessSuit,
  };
};

/**
 * Daily Task Completion Bonus:
 * - Exactly 2 coins (replacing previous 5 coins).
 * - Awarded only when user completes more than 4 eligible tasks (meaning at least 5 tasks) during that local calendar day.
 * - Every qualifying task counted toward this threshold was completed without pausing its associated focus session even once (pauseCount === 0).
 * - If a qualifying task's associated session was paused, that task must not count toward the pause-free task threshold.
 * - Calculated strictly from actual persisted PomodoroSession records on the backend.
 * - Awarded at most once per user per local calendar day.
 */
export const checkAndAwardDailyBonus = async (user, dateStr) => {
  const bonusRef = `daily_bonus_${dateStr}`;
  const legacyBonusRef = `all_tasks_bonus_${dateStr}`;

  const existingBonus = await CoinTransaction.findOne({
    userId: user._id,
    referenceId: { $in: [bonusRef, legacyBonusRef] },
  });

  if (existingBonus) {
    return {
      bonusAwarded: false,
      alreadyAwarded: true,
      bonusCoins: 0,
    };
  }

  // Query all completed PomodoroSession records for this user on this local study day
  const sessionsToday = await PomodoroSession.find({
    userId: user._id,
    dateStr,
    status: 'completed',
  });

  // Filter for sessions completed without pausing even once (pauseCount === 0)
  const pauseFreeSessions = sessionsToday.filter((s) => (s.pauseCount || 0) === 0);

  // Identify distinct eligible tasks completed with zero pauses
  const qualifyingTasks = new Set();
  pauseFreeSessions.forEach((s) => {
    const taskKey = s.taskId ? s.taskId.toString() : s.taskName.trim().toLowerCase();
    qualifyingTasks.add(taskKey);
  });

  const qualifyingCount = qualifyingTasks.size;

  // Must be more than 4 tasks (meaning >= 5 tasks)
  if (qualifyingCount < 5) {
    return {
      bonusAwarded: false,
      alreadyAwarded: false,
      bonusCoins: 0,
      qualifyingCount,
      required: 5,
    };
  }

  // Award exactly 2 coins
  user.coins = (user.coins || 0) + 2;
  try {
    await CoinTransaction.create({
      userId: user._id,
      type: 'daily_bonus',
      amount: 2,
      balanceAfter: user.coins,
      reason: `Daily Bonus: Completed ${qualifyingCount} tasks with zero pauses on ${dateStr}`,
      referenceId: bonusRef,
      metadata: { dateStr, qualifyingCount },
    });
    user.markModified('coins');
    await user.save();
    return {
      bonusAwarded: true,
      alreadyAwarded: false,
      bonusCoins: 2,
      qualifyingCount,
    };
  } catch (err) {
    console.error('[checkAndAwardDailyBonus CoinTransaction Error]:', err);
    user.coins = Math.max(0, (user.coins || 0) - 2);
    return {
      bonusAwarded: false,
      alreadyAwarded: true,
      bonusCoins: 0,
    };
  }
};

/**
 * Rolls back global streak if a user unchecks a task on today's study day
 */
export const rollbackStreakIfUncompleted = async (user, clientTimezoneOffset = null) => {
  const resetTime = user.dailyResetTime || '06:00';
  const todayStr = getStudyDayDate(new Date(), resetTime, clientTimezoneOffset);
  const todayKey = getStudyDayKey(new Date(), resetTime, clientTimezoneOffset);

  const timetableToday = user.weeklyTimetable?.[todayKey] || [];
  let allDone = false;
  if (timetableToday.length > 0) {
    allDone = timetableToday.every((t) => Array.isArray(t.completedDates) && t.completedDates.includes(todayStr));
  } else {
    const legacyTasks = await Task.find({ userId: user._id });
    if (legacyTasks.length > 0) {
      allDone = legacyTasks.every((t) => t.completedToday || t.lastCompletedDate === todayStr);
    }
  }

  if (!allDone && user.streaks?.completedDates?.includes(todayStr)) {
    user.streaks.completedDates = user.streaks.completedDates.filter((d) => d !== todayStr);
    if (user.streaks.lastActiveDate === todayStr) {
      const yesterdayStr = getPreviousStudyDayDate(todayStr);
      user.streaks.lastActiveDate = user.streaks.completedDates.includes(yesterdayStr) ? yesterdayStr : '';
      user.streaks.currentGlobalStreak = Math.max(0, (user.streaks.currentGlobalStreak || 1) - 1);
    }
    user.markModified('streaks');
    await user.save();
    return { rolledBack: true, currentGlobalStreak: user.streaks.currentGlobalStreak };
  }
  return { rolledBack: false };
};

// Backwards-compatible alias for legacy calls
export const formatDateStr = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
