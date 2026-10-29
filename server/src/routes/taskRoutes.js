import express from 'express';
import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getStudyDayDate,
  getStudyDayOfWeek,
  getStudyDayKey,
  isRestDayForUser,
  checkAndRefreshStreaks,
  calculateSubjectStreak,
  updateGlobalStreakIfEligible,
  rollbackStreakIfUncompleted,
} from '../utils/streakEngine.js';

const router = express.Router();

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PALETTE = [
  '#3B82F6', '#0EA5E9', '#06B6D4', '#6366F1',
  '#14B8A6', '#10B981', '#059669', '#84CC16', '#1B3B2F',
  '#EAB308', '#F59E0B', '#D97706',
  '#F97316', '#EA580C', '#FB7185', '#EF4444', '#DC2626',
  '#EC4899', '#F43F5E', '#D946EF',
  '#A855F7', '#8B5CF6', '#7C3AED',
  '#475569'
];

// Helper to extract timezone offset
const getTzOffset = (req) =>
  req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null;

/**
 * Normalizes the weekly timetable and enforces unique subject colors:
 * - Each distinct subject name has 1 unique color across the timetable.
 * - If a subject's color is modified, it synchronizes across all days.
 * - No two different subjects share the same color.
 */
const normalizeWeeklyTimetable = (timetable = {}) => {
  const subjectToColor = {};
  const usedColors = new Set();
  const normalized = {};

  // First pass: collect existing subject -> color mappings
  DAYS.forEach((day) => {
    (timetable[day] || []).forEach((item) => {
      if (!item || !item.name) return;
      const cleanName = item.name.trim();
      const lower = cleanName.toLowerCase();
      let color = (item.color || '#3B82F6').trim();
      const colorKey = color.toUpperCase();

      if (!subjectToColor[lower]) {
        // If color already taken by another subject, pick next available palette color
        if (usedColors.has(colorKey)) {
          const available = PALETTE.find((c) => !usedColors.has(c.toUpperCase())) || color;
          color = available;
        }
        subjectToColor[lower] = color;
        usedColors.add(color.toUpperCase());
      }
    });
  });

  // Second pass: apply colors consistently and normalize structures
  DAYS.forEach((day) => {
    normalized[day] = (timetable[day] || []).map((item, idx) => {
      const cleanName = (item.name || 'Subject').trim();
      const lower = cleanName.toLowerCase();
      const color = subjectToColor[lower] || PALETTE[0];

      return {
        id: item.id || `sub_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        color,
        targetMinutes: Math.max(5, Math.min(360, Number(item.targetMinutes) || 25)),
        completedDates: Array.isArray(item.completedDates) ? item.completedDates : [],
        order: typeof item.order === 'number' ? item.order : idx,
      };
    });
  });

  return normalized;
};

// =========================================================================
// 1. UNIFIED DAILY QUESTS LIST (SCHEDULED FOR TODAY'S STUDY DAY)
// =========================================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '06:00';
    const todayStr = getStudyDayDate(new Date(), resetTime, tzOffset);
    const todayWeekday = getStudyDayKey(new Date(), resetTime, tzOffset);
    const isRestDayToday = isRestDayForUser(req.user, new Date(), tzOffset);

    // Refresh streak integrity
    await checkAndRefreshStreaks(req.user, tzOffset);

    const timetableToday = req.user.weeklyTimetable?.[todayWeekday] || [];
    let tasks = [];

    if (timetableToday.length > 0) {
      tasks = timetableToday.map((t) => ({
        _id: t.id,
        id: t.id,
        name: t.name,
        durationMinutes: t.targetMinutes || 25,
        targetMinutes: t.targetMinutes || 25,
        colorTag: t.color || '#3B82F6',
        color: t.color || '#3B82F6',
        completedToday: Array.isArray(t.completedDates) && t.completedDates.includes(todayStr),
        completedDates: t.completedDates || [],
        weekday: todayWeekday,
        repeatDaily: Boolean(t.repeatDaily),
      }));
    } else {
      // Fallback to legacy task collection if user has never configured weekly plan
      const legacyTasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
      tasks = legacyTasks.map((t) => ({
        _id: t._id,
        id: t._id,
        name: t.name,
        durationMinutes: t.durationMinutes || 25,
        targetMinutes: t.durationMinutes || 25,
        colorTag: t.colorTag || '#3B82F6',
        color: t.colorTag || '#3B82F6',
        completedToday: t.lastCompletedDate === todayStr || t.completedToday,
        completedDates: t.lastCompletedDate ? [t.lastCompletedDate] : [],
        weekday: todayWeekday,
      }));
    }

    const completedCount = tasks.filter((t) => t.completedToday).length;
    const allCompletedToday = tasks.length > 0 && completedCount === tasks.length;

    return res.json({
      success: true,
      tasks,
      studyDay: {
        dateStr: todayStr,
        weekday: todayWeekday,
        dailyResetTime: resetTime,
        isRestDayToday,
      },
      summary: {
        total: tasks.length,
        completedToday: completedCount,
        allCompletedToday,
        isRestDayToday,
        currentGlobalStreak: req.user.streaks?.currentGlobalStreak || 0,
        bestGlobalStreak: req.user.streaks?.bestGlobalStreak || 0,
        completedDates: req.user.streaks?.completedDates || [],
      },
      streaks: req.user.streaks,
    });
  } catch (error) {
    console.error('[Task Error] List:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quests.' });
  }
});

// =========================================================================
// 2. CREATE NEW TASK / QUEST (DEFAULTS TO REPEATING DAILY MONDAY-SUNDAY)
// =========================================================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, durationMinutes = 25, colorTag, color, repeatDaily = true, weekday } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Quest name is required.' });
    }

    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '06:00';
    const todayWeekday = getStudyDayKey(new Date(), resetTime, tzOffset);
    const targetWeekday = weekday || todayWeekday;

    const user = req.user;
    if (!user.weeklyTimetable) {
      user.weeklyTimetable = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
    }

    const cleanName = name.trim();
    const lowerName = cleanName.toLowerCase();
    const targetDuration = Math.max(5, Math.min(360, Number(durationMinutes) || 25));

    // Check if this subject already has a color assigned on another day
    let chosenColor = color || colorTag;
    let existingColorForSubject = null;
    const usedColors = new Set();

    DAYS.forEach((d) => {
      (user.weeklyTimetable[d] || []).forEach((sub) => {
        if (!sub || !sub.name) return;
        const subLower = sub.name.trim().toLowerCase();
        const subColor = (sub.color || '#3B82F6').toUpperCase();
        usedColors.add(subColor);
        if (subLower === lowerName) {
          existingColorForSubject = subColor;
        }
      });
    });

    if (existingColorForSubject) {
      chosenColor = existingColorForSubject;
    } else if (!chosenColor || usedColors.has(chosenColor.toUpperCase())) {
      // Pick next unused color from palette
      const unused = PALETTE.find((c) => !usedColors.has(c.toUpperCase()));
      chosenColor = unused || chosenColor || '#3B82F6';
    }

    // Shared unique ID for this subject entity across all scheduled days
    const subjectId = `subj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const shouldRepeatDaily = repeatDaily !== false;

    if (shouldRepeatDaily) {
      // Schedule across all 7 days (Monday through Sunday) using the identical subject identity
      DAYS.forEach((d) => {
        if (!Array.isArray(user.weeklyTimetable[d])) {
          user.weeklyTimetable[d] = [];
        }
        const existingIdx = user.weeklyTimetable[d].findIndex(
          (s) => s.name.trim().toLowerCase() === lowerName
        );
        if (existingIdx >= 0) {
          user.weeklyTimetable[d][existingIdx].color = chosenColor;
          user.weeklyTimetable[d][existingIdx].targetMinutes = targetDuration;
          user.weeklyTimetable[d][existingIdx].repeatDaily = true;
        } else {
          user.weeklyTimetable[d].push({
            id: subjectId,
            name: cleanName,
            color: chosenColor,
            targetMinutes: targetDuration,
            completedDates: [],
            order: user.weeklyTimetable[d].length,
            repeatDaily: true,
          });
        }
      });
    } else {
      // Only schedule on the target day
      if (!Array.isArray(user.weeklyTimetable[targetWeekday])) {
        user.weeklyTimetable[targetWeekday] = [];
      }
      user.weeklyTimetable[targetWeekday].push({
        id: subjectId,
        name: cleanName,
        color: chosenColor,
        targetMinutes: targetDuration,
        completedDates: [],
        order: user.weeklyTimetable[targetWeekday].length,
        repeatDaily: false,
      });
    }

    user.hasConfiguredTimetable = true;
    user.markModified('weeklyTimetable');
    await user.save();

    return res.status(201).json({
      success: true,
      message: shouldRepeatDaily ? 'Daily quest created for all 7 days!' : 'Quest created and scheduled for today!',
      isDaily: shouldRepeatDaily,
      repeatDaily: shouldRepeatDaily,
      task: {
        _id: subjectId,
        id: subjectId,
        name: cleanName,
        durationMinutes: targetDuration,
        targetMinutes: targetDuration,
        colorTag: chosenColor,
        color: chosenColor,
        completedToday: false,
        weekday: targetWeekday,
        repeatDaily: shouldRepeatDaily,
      },
      timetable: user.weeklyTimetable,
    });
  } catch (error) {
    console.error('[Task Error] Create:', error);
    return res.status(500).json({ success: false, message: 'Failed to create quest.' });
  }
});

// =========================================================================
// 3. UPDATE TASK (NAME, DURATION, COLOR, REPEAT DAILY SETTING)
// =========================================================================
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, durationMinutes, colorTag, color, repeatDaily } = req.body;
    const targetId = req.params.id;
    const user = req.user;

    let targetSubject = null;
    let foundDay = null;

    DAYS.forEach((d) => {
      const list = user.weeklyTimetable?.[d] || [];
      const item = list.find((s) => s.id === targetId || s._id?.toString() === targetId);
      if (item) {
        targetSubject = item;
        foundDay = d;
      }
    });

    if (!targetSubject) {
      // Check legacy collection
      if (mongoose.isValidObjectId(targetId)) {
        const legTask = await Task.findOne({ _id: targetId, userId: user._id });
        if (legTask) {
          if (name) legTask.name = name.trim();
          if (durationMinutes) legTask.durationMinutes = Number(durationMinutes);
          if (colorTag || color) legTask.colorTag = colorTag || color;
          await legTask.save();
          return res.json({ success: true, message: 'Task updated.', task: legTask });
        }
      }
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const oldName = targetSubject.name.trim().toLowerCase();
    const newName = name ? name.trim() : targetSubject.name;
    const newDuration = durationMinutes ? Number(durationMinutes) : targetSubject.targetMinutes;
    const newColor = color || colorTag || targetSubject.color;
    const sharedSubjId = targetSubject.id || targetId;

    // Handle repeatDaily update if specified
    if (repeatDaily !== undefined) {
      if (repeatDaily === true) {
        // Ensure this subject is present on all 7 days with the same identity
        DAYS.forEach((d) => {
          if (!Array.isArray(user.weeklyTimetable[d])) {
            user.weeklyTimetable[d] = [];
          }
          const existing = user.weeklyTimetable[d].find(
            (s) => s.id === sharedSubjId || s.name.trim().toLowerCase() === oldName
          );
          if (existing) {
            existing.id = sharedSubjId;
            existing.name = newName;
            existing.color = newColor;
            existing.targetMinutes = newDuration;
            existing.repeatDaily = true;
          } else {
            user.weeklyTimetable[d].push({
              id: sharedSubjId,
              name: newName,
              color: newColor,
              targetMinutes: newDuration,
              completedDates: [],
              order: user.weeklyTimetable[d].length,
              repeatDaily: true,
            });
          }
        });
      } else {
        // Disabled daily repeat: keep on foundDay only, remove from other days
        DAYS.forEach((d) => {
          if (d !== foundDay && Array.isArray(user.weeklyTimetable[d])) {
            user.weeklyTimetable[d] = user.weeklyTimetable[d].filter(
              (s) => s.id !== sharedSubjId && s.name.trim().toLowerCase() !== oldName
            );
          }
        });
        targetSubject.repeatDaily = false;
      }
    }

    // Synchronize name, color, duration across all instances
    const cleanLowerNew = newName.trim().toLowerCase();
    DAYS.forEach((d) => {
      (user.weeklyTimetable[d] || []).forEach((s) => {
        const sLower = s.name.trim().toLowerCase();
        if (s.id === sharedSubjId || sLower === cleanLowerNew || sLower === oldName) {
          s.name = newName;
          s.color = newColor;
          s.targetMinutes = newDuration;
        }
      });
    });

    user.markModified('weeklyTimetable');
    await user.save();

    return res.json({
      success: true,
      message: 'Quest updated successfully.',
      task: {
        _id: targetSubject.id,
        id: targetSubject.id,
        name: targetSubject.name,
        durationMinutes: targetSubject.targetMinutes,
        targetMinutes: targetSubject.targetMinutes,
        colorTag: targetSubject.color,
        color: targetSubject.color,
        weekday: foundDay,
        repeatDaily: Boolean(targetSubject.repeatDaily),
      },
      timetable: user.weeklyTimetable,
    });
  } catch (error) {
    console.error('[Task Error] Update:', error);
    return res.status(500).json({ success: false, message: 'Failed to update quest.' });
  }
});

// =========================================================================
// 4. DELETE TASK FROM TODAY'S PLAN
// =========================================================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const user = req.user;
    const tzOffset = getTzOffset(req);
    const resetTime = user.dailyResetTime || '06:00';
    const todayWeekday = getStudyDayKey(new Date(), resetTime, tzOffset);
    const dayOnly = req.query.dayOnly === 'true';

    let deleted = false;

    if (dayOnly && user.weeklyTimetable?.[todayWeekday]) {
      const initialLen = user.weeklyTimetable[todayWeekday].length;
      user.weeklyTimetable[todayWeekday] = user.weeklyTimetable[todayWeekday].filter(
        (s) => s.id !== targetId && s._id?.toString() !== targetId
      );
      if (user.weeklyTimetable[todayWeekday].length < initialLen) deleted = true;
    } else {
      // Remove matching subject by ID across all days
      DAYS.forEach((d) => {
        if (Array.isArray(user.weeklyTimetable?.[d])) {
          const len = user.weeklyTimetable[d].length;
          user.weeklyTimetable[d] = user.weeklyTimetable[d].filter(
            (s) => s.id !== targetId && s._id?.toString() !== targetId
          );
          if (user.weeklyTimetable[d].length < len) deleted = true;
        }
      });
    }

    // Fallback to legacy Task collection
    if (mongoose.isValidObjectId(targetId)) {
      await Task.findOneAndDelete({ _id: targetId, userId: user._id });
    }

    user.markModified('weeklyTimetable');
    await user.save();
    return res.json({ success: true, message: 'Quest removed.', timetable: user.weeklyTimetable });
  } catch (error) {
    console.error('[Task Error] Delete:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete quest.' });
  }
});

// =========================================================================
// 5. TOGGLE TASK COMPLETION (USED BY BOTH QUESTS & WEEKLY PLAN)
// Evaluates Daily Streak and awards coins with idempotency and daily bonus!
// =========================================================================
const handleToggleCompletion = async (req, res) => {
  try {
    const targetId = req.body?.subjectId || req.body?.taskId || req.params?.id;
    if (!targetId || targetId === 'undefined' || targetId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid quest or task ID.' });
    }

    const weekday = req.body?.weekday || req.body?.day;
    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '06:00';
    const todayStr = getStudyDayDate(new Date(), resetTime, tzOffset);
    const todayKey = weekday || getStudyDayKey(new Date(), resetTime, tzOffset);

    const user = req.user;
    const daySubjects = user.weeklyTimetable?.[todayKey] || [];
    let subject = daySubjects.find((s) => s.id === targetId || s._id?.toString() === targetId);

    // If not found in requested weekday, search all days
    if (!subject) {
      DAYS.forEach((d) => {
        const found = (user.weeklyTimetable?.[d] || []).find(
          (s) => s.id === targetId || s._id?.toString() === targetId
        );
        if (found) subject = found;
      });
    }

    if (!subject) {
      // Legacy fallback
      let legTask = null;
      if (mongoose.isValidObjectId(targetId)) {
        legTask = await Task.findOne({ _id: targetId, userId: user._id });
      }

      if (legTask) {
        const wasDone = legTask.completedToday || legTask.lastCompletedDate === todayStr;
        let streakResult = null;
        let coinsEarnedThisAction = 0;

        if (wasDone) {
          legTask.completedToday = false;
          legTask.lastCompletedDate = '';
          streakResult = await rollbackStreakIfUncompleted(user, tzOffset);
        } else {
          legTask.completedToday = true;
          legTask.lastCompletedDate = todayStr;

          // Award 5 coins for task completion (Awarded only once per task per day to prevent duplicate rewards)
          const taskRef = `task_complete_${legTask._id}_${todayStr}`;
          const existingTaskTx = await CoinTransaction.findOne({ userId: user._id, referenceId: taskRef });
          if (!existingTaskTx) {
            user.coins = (user.coins || 0) + 5;
            try {
              await CoinTransaction.create({
                userId: user._id,
                type: 'task_completion',
                amount: 5,
                balanceAfter: user.coins,
                reason: `Completed quest: ${legTask.title || legTask.name || 'Task'}`,
                referenceId: taskRef,
                metadata: { taskId: legTask._id.toString(), taskName: legTask.title || legTask.name, dateStr: todayStr },
              });
              coinsEarnedThisAction = 5;
            } catch (e) {
              // Duplicate key collision guard
              user.coins = Math.max(0, (user.coins || 0) - 5);
              coinsEarnedThisAction = 0;
            }
          }

          streakResult = await updateGlobalStreakIfEligible(user, tzOffset);
          if (streakResult?.bonusCoins) {
            coinsEarnedThisAction += streakResult.bonusCoins;
          }
        }

        await legTask.save();
        await user.save();

        const legacyTasks = await Task.find({ userId: user._id });
        const completedCount = legacyTasks.filter((t) => t.completedToday || t.lastCompletedDate === todayStr).length;
        const allCompletedToday = legacyTasks.length > 0 && completedCount === legacyTasks.length;

        return res.json({
          success: true,
          message: wasDone ? 'Marked as uncompleted.' : 'Quest completed for today!',
          completed: !wasDone,
          completedToday: !wasDone,
          task: legTask,
          todayStr,
          streakResult,
          coinsEarned: coinsEarnedThisAction,
          userCoins: user.coins,
          summary: {
            total: legacyTasks.length,
            completedToday: completedCount,
            allCompletedToday,
            currentGlobalStreak: user.streaks?.currentGlobalStreak || 0,
            bestGlobalStreak: user.streaks?.bestGlobalStreak || 0,
          },
        });
      }

      return res.status(404).json({ success: false, message: 'Quest not found.' });
    }

    const subjId = subject.id || subject._id?.toString() || targetId;
    if (!subject.id) subject.id = subjId;

    if (!Array.isArray(subject.completedDates)) {
      subject.completedDates = [];
    }

    const isDone = subject.completedDates.includes(todayStr);
    let streakResult = null;
    let coinsEarnedThisAction = 0;

    const lowerName = subject.name.trim().toLowerCase();
    const matchCriteria = (s) =>
      (s.id && (s.id === subjId || s.id === targetId)) ||
      s.name.trim().toLowerCase() === lowerName;

    if (isDone) {
      // Uncheck task across all weekday entries for this subject entity
      DAYS.forEach((d) => {
        (user.weeklyTimetable[d] || []).forEach((s) => {
          if (matchCriteria(s)) {
            if (Array.isArray(s.completedDates)) {
              s.completedDates = s.completedDates.filter((date) => date !== todayStr);
            }
            const streakInfo = calculateSubjectStreak(s.completedDates, todayStr, user, tzOffset);
            s.currentStreak = streakInfo.currentStreak;
            s.bestStreak = streakInfo.bestStreak;
            s.lastCompletedDate = streakInfo.lastCompletedDate;
          }
        });
      });
      user.markModified('weeklyTimetable');
      streakResult = await rollbackStreakIfUncompleted(user, tzOffset);
    } else {
      // Check task across all weekday entries for this subject entity
      DAYS.forEach((d) => {
        (user.weeklyTimetable[d] || []).forEach((s) => {
          if (matchCriteria(s)) {
            if (!Array.isArray(s.completedDates)) s.completedDates = [];
            if (!s.completedDates.includes(todayStr)) {
              s.completedDates.push(todayStr);
            }
            const streakInfo = calculateSubjectStreak(s.completedDates, todayStr, user, tzOffset);
            s.currentStreak = streakInfo.currentStreak;
            s.bestStreak = streakInfo.bestStreak;
            s.lastCompletedDate = streakInfo.lastCompletedDate;
          }
        });
      });
      user.markModified('weeklyTimetable');

      // Award 5 coins for task completion (Awarded only once per task per day to prevent duplicate rewards)
      const taskRef = `task_complete_${subjId}_${todayStr}`;
      const existingTaskTx = await CoinTransaction.findOne({ userId: user._id, referenceId: taskRef });
      if (!existingTaskTx) {
        user.coins = (user.coins || 0) + 5;
        try {
          await CoinTransaction.create({
            userId: user._id,
            type: 'task_completion',
            amount: 5,
            balanceAfter: user.coins,
            reason: `Completed quest: ${subject.name}`,
            referenceId: taskRef,
            metadata: { taskId: subjId, taskName: subject.name, dateStr: todayStr },
          });
          coinsEarnedThisAction = 5;
        } catch (e) {
          // Duplicate key collision guard
          user.coins = Math.max(0, (user.coins || 0) - 5);
          coinsEarnedThisAction = 0;
        }
      }

      streakResult = await updateGlobalStreakIfEligible(user, tzOffset);
      if (streakResult?.bonusCoins) {
        coinsEarnedThisAction += streakResult.bonusCoins;
      }
    }

    await user.save();

    // Check today's completion stats
    const todayList = user.weeklyTimetable?.[todayKey] || [];
    const completedCount = todayList.filter(
      (s) => Array.isArray(s.completedDates) && s.completedDates.includes(todayStr)
    ).length;
    const allCompletedToday = todayList.length > 0 && completedCount === todayList.length;

    return res.json({
      success: true,
      message: isDone ? 'Marked as uncompleted.' : 'Quest completed for today!',
      completed: !isDone,
      completedToday: !isDone,
      subject,
      task: {
        _id: subjId,
        id: subjId,
        name: subject.name,
        colorTag: subject.color,
        color: subject.color,
        durationMinutes: subject.targetMinutes,
        completedToday: !isDone,
      },
      todayStr,
      streakResult,
      coinsEarned: coinsEarnedThisAction,
      userCoins: user.coins,
      summary: {
        total: todayList.length,
        completedToday: completedCount,
        allCompletedToday,
        currentGlobalStreak: user.streaks?.currentGlobalStreak || 0,
        bestGlobalStreak: user.streaks?.bestGlobalStreak || 0,
      },
      timetable: user.weeklyTimetable,
    });
  } catch (error) {
    console.error('[Task Toggle Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle quest completion.' });
  }
};

router.post('/:id/toggle', requireAuth, handleToggleCompletion);
router.post('/timetable/toggle-complete', requireAuth, handleToggleCompletion);

// =========================================================================
// 6. WEEKLY STUDY PLAN & TIMETABLE ENDPOINTS
// =========================================================================

// Get Weekly Timetable & Today's Schedule
router.get('/timetable/weekly', requireAuth, async (req, res) => {
  try {
    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '06:00';
    const todayStr = getStudyDayDate(new Date(), resetTime, tzOffset);
    const todayKey = getStudyDayKey(new Date(), resetTime, tzOffset);
    const isRestDayToday = isRestDayForUser(req.user, new Date(), tzOffset);

    // Refresh streak status
    await checkAndRefreshStreaks(req.user, tzOffset);

    const timetable = req.user.weeklyTimetable || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    // Enrich each weekday's subjects with completedToday flag
    const enrichedTimetable = {};
    DAYS.forEach((d) => {
      enrichedTimetable[d] = (timetable[d] || []).map((sub) => {
        const itemObj = sub.toObject ? sub.toObject() : { ...sub };
        return {
          ...itemObj,
          completedToday: Array.isArray(itemObj.completedDates) && itemObj.completedDates.includes(todayStr),
        };
      });
    });

    const todayList = enrichedTimetable[todayKey] || [];
    const completedCount = todayList.filter((s) => s.completedToday).length;
    const nextSubject = todayList.find((s) => !s.completedToday) || null;

    return res.json({
      success: true,
      timetable: enrichedTimetable,
      hasConfiguredTimetable: Boolean(req.user.hasConfiguredTimetable),
      studyDay: {
        dateStr: todayStr,
        weekday: todayKey,
        dailyResetTime: resetTime,
        isRestDayToday,
      },
      todaySchedule: {
        weekday: todayKey,
        subjects: todayList,
        totalSubjects: todayList.length,
        completedCount,
        allCompleted: todayList.length > 0 && completedCount === todayList.length,
        nextSubject,
      },
      streaks: req.user.streaks,
    });
  } catch (error) {
    console.error('[Timetable Error] Fetch:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch weekly timetable.' });
  }
});

// Update Full Weekly Timetable
router.put('/timetable/weekly', requireAuth, async (req, res) => {
  try {
    const incomingTimetable = req.body.timetable || req.body.weeklyTimetable;
    const { hasConfiguredTimetable = true } = req.body;

    if (!incomingTimetable || typeof incomingTimetable !== 'object') {
      return res.status(400).json({ success: false, message: 'Valid timetable object is required.' });
    }

    const user = req.user;
    // Normalize and enforce unique subject colors
    const normalized = normalizeWeeklyTimetable(incomingTimetable);
    user.weeklyTimetable = normalized;
    user.hasConfiguredTimetable = Boolean(hasConfiguredTimetable);

    await user.save();

    // Check if updating timetable changes today's completion state
    const tzOffset = getTzOffset(req);
    await updateGlobalStreakIfEligible(user, tzOffset);

    return res.json({
      success: true,
      message: 'Weekly study plan updated successfully!',
      timetable: user.weeklyTimetable,
      hasConfiguredTimetable: user.hasConfiguredTimetable,
      streaks: user.streaks,
    });
  } catch (error) {
    console.error('[Timetable Error] Update:', error);
    return res.status(500).json({ success: false, message: 'Failed to save weekly study plan.' });
  }
});

export default router;
