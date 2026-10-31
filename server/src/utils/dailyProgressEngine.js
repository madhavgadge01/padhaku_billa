import mongoose from 'mongoose';
import { DailyTaskProgress } from '../models/DailyTaskProgress.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import {
  getStudyDayDate,
  getStudyDayKey,
  getStudyDayOfWeek,
  calculateSubjectStreak,
  updateGlobalStreakIfEligible,
} from './streakEngine.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Normalizes task/subject name for robust matching across days and timer modes
 */
export const normalizeTaskName = (name = '') => name.trim().toLowerCase();

/**
 * Finds matching scheduled subject or task for user on today's study day
 */
export const findMatchingScheduledTask = async (user, { taskId, subjectId, taskName, name }, todayWeekday) => {
  const targetId = subjectId || taskId;
  const targetName = (taskName || name || '').trim().toLowerCase();

  // 1. Check today's timetable subjects
  const daySubjects = user.weeklyTimetable?.[todayWeekday] || [];
  let match = daySubjects.find(
    (s) =>
      !s.isArchived &&
      ((targetId && (s.id === targetId || s._id?.toString() === targetId)) ||
        (targetName && s.name && s.name.trim().toLowerCase() === targetName))
  );

  // 2. Check all days of timetable if not found in today's day
  if (!match) {
    for (const d of DAYS) {
      const found = (user.weeklyTimetable?.[d] || []).find(
        (s) =>
          !s.isArchived &&
          ((targetId && (s.id === targetId || s._id?.toString() === targetId)) ||
            (targetName && s.name && s.name.trim().toLowerCase() === targetName))
      );
      if (found) {
        match = found;
        break;
      }
    }
  }

  // 3. Fallback to Task collection if not found in timetable
  if (!match && user?._id) {
    try {
      let taskDoc = null;
      if (targetId && mongoose.isValidObjectId(targetId)) {
        taskDoc = await Task.findOne({ _id: targetId, userId: user._id, isArchived: { $ne: true } });
      }
      if (!taskDoc && targetName) {
        taskDoc = await Task.findOne({
          userId: user._id,
          isArchived: { $ne: true },
          name: { $regex: new RegExp(`^${targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });
      }
      if (taskDoc) {
        match = {
          id: taskDoc._id.toString(),
          _id: taskDoc._id.toString(),
          name: taskDoc.name,
          targetMinutes: taskDoc.durationMinutes || 25,
          durationMinutes: taskDoc.durationMinutes || 25,
          color: taskDoc.colorTag || '#3B82F6',
          colorTag: taskDoc.colorTag || '#3B82F6',
          completedDates: taskDoc.lastCompletedDate ? [taskDoc.lastCompletedDate] : [],
          repeatDaily: true,
        };
      }
    } catch (e) {
      console.warn('[DailyProgressEngine] Legacy task match notice:', e.message);
    }
  }

  return match || null;
};

/**
 * Idempotently cleans up expired temporary daily task-progress records from prior days
 * and resets/initializes today's daily task progress records.
 */
export const syncAndCleanDailyProgress = async (user, tzOffset = null) => {
  if (!user || !user._id) return;
  const resetTime = user.dailyResetTime || '00:00';
  const todayDateStr = getStudyDayDate(new Date(), resetTime, tzOffset);

  try {
    // 1. Permanently delete expired temporary daily task progress records from previous days
    await DailyTaskProgress.deleteMany({
      userId: user._id,
      dateStr: { $lt: todayDateStr },
    });

    // 2. Clean expired single-day task exclusions from timetable (only valid for that previous day)
    let timetableModified = false;
    DAYS.forEach((d) => {
      (user.weeklyTimetable?.[d] || []).forEach((sub) => {
        if (Array.isArray(sub.excludedDates) && sub.excludedDates.length > 0) {
          const freshExclusions = sub.excludedDates.filter((exDate) => exDate >= todayDateStr);
          if (freshExclusions.length !== sub.excludedDates.length) {
            sub.excludedDates = freshExclusions;
            timetableModified = true;
          }
        }
      });
    });

    if (timetableModified) {
      user.markModified('weeklyTimetable');
      await user.save();
    }

    // 3. Clean legacy tasks expired exclusions
    await Task.updateMany(
      { userId: user._id },
      { $pull: { excludedDates: { $lt: todayDateStr } } }
    );
  } catch (err) {
    console.warn('[DailyProgressEngine] Cleanup notice:', err.message);
  }
};

/**
 * Retrieves or initializes the DailyTaskProgress record for a given task/subject for today's study day
 */
export const getOrCreateDailyTaskProgress = async (user, taskEntity, todayDateStr) => {
  if (!user || !user._id || !taskEntity) return null;

  const cleanName = (taskEntity.name || taskEntity.taskName || 'Focus').trim();
  const normalizedName = normalizeTaskName(cleanName);
  const targetMinutes = Number(taskEntity.targetMinutes || taskEntity.durationMinutes) || 25;
  const color = taskEntity.color || taskEntity.colorTag || '#3B82F6';
  const entityId = taskEntity.id || taskEntity._id?.toString() || `sub_${normalizedName}`;

  let progress = await DailyTaskProgress.findOne({
    userId: user._id,
    dateStr: todayDateStr,
    normalizedName,
  });

  if (!progress) {
    try {
      progress = await DailyTaskProgress.create({
        userId: user._id,
        taskId: entityId,
        taskName: cleanName,
        normalizedName,
        color,
        dateStr: todayDateStr,
        targetMinutes,
        completedMinutes: 0,
        completedSeconds: 0,
        remainingMinutes: targetMinutes,
        remainingSeconds: targetMinutes * 60,
        isCompleted: false,
        processedSessionIds: [],
        lastUpdated: new Date(),
      });
    } catch (createErr) {
      // In case of race condition on unique compound index
      progress = await DailyTaskProgress.findOne({
        userId: user._id,
        dateStr: todayDateStr,
        normalizedName,
      });
    }
  }

  return progress;
};

/**
 * Returns today's scheduled tasks populated with their unified daily progress
 */
export const getDailyTasksWithUnifiedProgress = async (user, tzOffset = null) => {
  if (!user || !user._id) return { tasks: [], todayDateStr: '', todayWeekday: '' };
  const resetTime = user.dailyResetTime || '00:00';
  const todayDateStr = getStudyDayDate(new Date(), resetTime, tzOffset);
  const todayWeekday = getStudyDayKey(new Date(), resetTime, tzOffset);

  // Clean old days & initialize
  await syncAndCleanDailyProgress(user, tzOffset);

  const rawTimetableToday = user.weeklyTimetable?.[todayWeekday] || [];
  const timetableToday = rawTimetableToday.filter(
    (t) => !t.isArchived && (!Array.isArray(t.excludedDates) || !t.excludedDates.includes(todayDateStr))
  );

  let rawList = [];
  if (timetableToday.length > 0) {
    rawList = timetableToday.map((t) => ({
      _id: t.id,
      id: t.id,
      name: t.name,
      targetMinutes: t.targetMinutes || 25,
      durationMinutes: t.targetMinutes || 25,
      colorTag: t.color || '#3B82F6',
      color: t.color || '#3B82F6',
      completedDates: t.completedDates || [],
      weekday: todayWeekday,
      repeatDaily: Boolean(t.repeatDaily),
      currentStreak: t.currentStreak || 0,
    }));
  } else {
    // Fallback to legacy Task collection
    const legacyTasks = (await Task.find({ userId: user._id, isArchived: { $ne: true } }).sort({ createdAt: -1 }))
      .filter((t) => !Array.isArray(t.excludedDates) || !t.excludedDates.includes(todayDateStr));
    rawList = legacyTasks.map((t) => ({
      _id: t._id.toString(),
      id: t._id.toString(),
      name: t.name,
      targetMinutes: t.durationMinutes || 25,
      durationMinutes: t.durationMinutes || 25,
      colorTag: t.colorTag || '#3B82F6',
      color: t.colorTag || '#3B82F6',
      completedDates: t.lastCompletedDate ? [t.lastCompletedDate] : [],
      weekday: todayWeekday,
      repeatDaily: true,
      currentStreak: t.currentStreak || 0,
    }));
  }

  // Fetch or initialize progress for each task
  const populatedTasks = await Promise.all(
    rawList.map(async (task) => {
      const progress = await getOrCreateDailyTaskProgress(user, task, todayDateStr);
      const completedMins = progress ? progress.completedMinutes : 0;
      const completedSecs = progress ? progress.completedSeconds : 0;
      const targetMins = task.targetMinutes;
      const remSecs = Math.max(0, targetMins * 60 - completedSecs);
      const remMins = Math.max(0, Math.ceil(remSecs / 60));
      const isDone = (progress && progress.isCompleted) ||
        (Array.isArray(task.completedDates) && task.completedDates.includes(todayDateStr));

      return {
        ...task,
        targetMinutes: targetMins,
        durationMinutes: targetMins,
        completedMinutes: completedMins,
        completedSeconds: completedSecs,
        remainingMinutes: remMins,
        remainingSeconds: remSecs,
        completedToday: isDone,
        isCompleted: isDone,
      };
    })
  );

  return {
    tasks: populatedTasks,
    todayDateStr,
    todayWeekday,
  };
};

/**
 * Records focus duration from Deep Focus or Stopwatch to the unified DailyTaskProgress.
 * Guarantees exact-once processing via session ID idempotency.
 */
export const recordSessionToUnifiedProgress = async ({
  user,
  taskName,
  subjectId,
  taskId,
  actualSeconds,
  deltaSeconds = null,
  sessionId,
  sessionType = 'deep_focus',
  isFinal = false,
  tzOffset = null,
}) => {
  const addedSecs = deltaSeconds !== null ? Math.round(deltaSeconds) : Math.round(actualSeconds || 0);
  if (!user || !user._id || addedSecs <= 0) {
    return { isCustom: true, progress: null };
  }

  const resetTime = user.dailyResetTime || '00:00';
  const todayDateStr = getStudyDayDate(new Date(), resetTime, tzOffset);
  const todayWeekday = getStudyDayKey(new Date(), resetTime, tzOffset);

  // 1. Find matching scheduled task
  const matchedScheduledTask = await findMatchingScheduledTask(
    user,
    { taskId, subjectId, taskName },
    todayWeekday
  );

  // If no match found and this is a custom stopwatch activity, do not modify daily tasks
  if (!matchedScheduledTask) {
    return {
      isCustom: true,
      progress: null,
      originalColor: null,
    };
  }

  const cleanName = matchedScheduledTask.name.trim();
  const normalizedName = normalizeTaskName(cleanName);
  const originalColor = matchedScheduledTask.color || matchedScheduledTask.colorTag || '#3B82F6';
  const targetMinutes = Number(matchedScheduledTask.targetMinutes || matchedScheduledTask.durationMinutes) || 25;
  const targetSeconds = targetMinutes * 60;

  // 2. Find or create DailyTaskProgress record
  let progress = await getOrCreateDailyTaskProgress(user, matchedScheduledTask, todayDateStr);
  if (!progress) {
    return { isCustom: false, progress: null, originalColor };
  }

  // Idempotency check: if full session already contributed and this is not a delta, do not double-count
  const sessIdStr = sessionId ? String(sessionId) : null;
  if (sessIdStr && deltaSeconds === null && Array.isArray(progress.processedSessionIds) && progress.processedSessionIds.includes(sessIdStr)) {
    return {
      isCustom: false,
      progress,
      originalColor,
      isCompleted: progress.isCompleted,
    };
  }

  // 3. Atomically update completed focus time and remaining time
  const newCompletedSeconds = (progress.completedSeconds || 0) + addedSecs;
  const newCompletedMinutes = Math.round((newCompletedSeconds / 60) * 10) / 10;
  const isNowCompleted = Boolean(progress.isCompleted) || (newCompletedSeconds >= targetSeconds) || (newCompletedMinutes >= targetMinutes);
  const newRemainingSeconds = isNowCompleted ? 0 : Math.max(0, targetSeconds - newCompletedSeconds);
  const newRemainingMinutes = isNowCompleted ? 0 : Math.max(0, Math.ceil(newRemainingSeconds / 60));

  progress.completedSeconds = newCompletedSeconds;
  progress.completedMinutes = newCompletedMinutes;
  progress.remainingSeconds = newRemainingSeconds;
  progress.remainingMinutes = newRemainingMinutes;
  progress.isCompleted = isNowCompleted;
  progress.lastUpdated = new Date();

  if (sessIdStr && isFinal && !progress.processedSessionIds.includes(sessIdStr)) {
    progress.processedSessionIds.push(sessIdStr);
  }

  await progress.save();

  // 4. If target achieved, mark task/subject completed for today across timetable and Task
  if (isNowCompleted) {
    let timetableModified = false;
    DAYS.forEach((d) => {
      (user.weeklyTimetable?.[d] || []).forEach((s) => {
        if (
          s.id === matchedScheduledTask.id ||
          s.name.trim().toLowerCase() === normalizedName
        ) {
          if (!Array.isArray(s.completedDates)) s.completedDates = [];
          if (!s.completedDates.includes(todayDateStr)) {
            s.completedDates.push(todayDateStr);
            timetableModified = true;
          }
          const streakInfo = calculateSubjectStreak(s.completedDates, todayDateStr, user, tzOffset);
          s.currentStreak = streakInfo.currentStreak;
          s.bestStreak = streakInfo.bestStreak;
          s.lastCompletedDate = streakInfo.lastCompletedDate;
        }
      });
    });

    if (timetableModified) {
      user.markModified('weeklyTimetable');
      await user.save();
    }

    // Update legacy Task collection if exists
    await Task.updateMany(
      {
        userId: user._id,
        $or: [
          { _id: mongoose.isValidObjectId(matchedScheduledTask.id) ? matchedScheduledTask.id : null },
          { name: cleanName },
        ],
      },
      {
        $set: {
          completedToday: true,
          lastCompletedDate: todayDateStr,
        },
        $inc: {
          totalMinutes: Math.round(addedSecs / 60),
        },
      }
    );

    // Update Global Study Streak if eligible
    try {
      await updateGlobalStreakIfEligible(user, tzOffset);
    } catch (e) {
      console.warn('[DailyProgressEngine] Streak check notice:', e.message);
    }
  }

  return {
    isCustom: false,
    progress,
    originalColor,
    isCompleted: isNowCompleted,
    remainingMinutes: newRemainingMinutes,
    completedMinutes: newCompletedMinutes,
  };
};
