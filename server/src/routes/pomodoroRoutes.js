import express from 'express';
import mongoose from 'mongoose';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getStudyDayDate,
  getStudyDayOfWeek,
  getStudyDayKey,
  isRestDayForUser,
  updateTaskStreak,
  calculateSubjectStreak,
  updateGlobalStreakIfEligible,
  checkAndAwardDailyBonus,
} from '../utils/streakEngine.js';
import {
  calculateSessionFocusSeconds,
  calculateSessionFocusMinutes,
  reconcileOrphanedSessions,
} from '../utils/focusTimeHelper.js';
import {
  scheduleSessionNotification,
  cancelSessionNotification,
} from '../utils/notificationService.js';
import { DailyTaskProgress } from '../models/DailyTaskProgress.js';
import {
  recordSessionToUnifiedProgress,
  syncAndCleanDailyProgress,
  getOrCreateDailyTaskProgress,
  findMatchingScheduledTask,
} from '../utils/dailyProgressEngine.js';

const router = express.Router();

const getTzOffset = (req) =>
  req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null;

// 1a. Get Active / Unfinished Sessions for authenticated user on today's study day
router.get('/active', requireAuth, async (req, res) => {
  try {
    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '00:00';
    const now = new Date();
    const todayStudyDay = getStudyDayDate(now, resetTime, tzOffset);

    // Sync and clean expired daily progress records and expired task exclusions
    await syncAndCleanDailyProgress(req.user, tzOffset);

    // Find all sessions on today's study day that are in-progress, paused, or interrupted
    const activeSessions = await PomodoroSession.find({
      userId: req.user._id,
      dateStr: todayStudyDay,
      status: { $in: ['in-progress', 'paused', 'interrupted'] },
    }).sort({ updatedAt: -1 });

    // Aggregate today's total focus time per subject (completed + active)
    const allTodaySessions = await PomodoroSession.find({
      userId: req.user._id,
      dateStr: todayStudyDay,
    });

    const subjectProgress = {};
    for (const s of allTodaySessions) {
      const key = (s.subjectId || s.taskName || 'Default').trim().toLowerCase();
      if (!subjectProgress[key]) {
        subjectProgress[key] = {
          subjectName: s.taskName,
          subjectId: s.subjectId,
          colorTag: s.colorTag,
          totalFocusSeconds: 0,
          completedSessions: 0,
          hasUnfinished: false,
          latestSession: null,
        };
      }
      subjectProgress[key].totalFocusSeconds += (s.actualSeconds || 0);
      if (s.status === 'completed') {
        subjectProgress[key].completedSessions += 1;
      } else {
        subjectProgress[key].hasUnfinished = true;
        if (!subjectProgress[key].latestSession) {
          subjectProgress[key].latestSession = s;
        }
      }
    }

    // Load today's DailyTaskProgress records
    const todayProgressDocs = await DailyTaskProgress.find({
      userId: req.user._id,
      dateStr: todayStudyDay,
    });
    const dailyProgress = {};
    todayProgressDocs.forEach((p) => {
      dailyProgress[p.normalizedName] = {
        taskId: p.taskId,
        taskName: p.taskName,
        targetMinutes: p.targetMinutes,
        completedMinutes: p.completedMinutes,
        completedSeconds: p.completedSeconds,
        remainingMinutes: p.remainingMinutes,
        remainingSeconds: p.remainingSeconds,
        isCompleted: p.isCompleted,
        color: p.color,
      };
    });

    return res.json({
      success: true,
      todayStr: todayStudyDay,
      activeSessions,
      currentSession: activeSessions[0] || null,
      subjectProgress,
      dailyProgress,
    });
  } catch (error) {
    console.error('[Pomodoro Error] Get Active:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch active sessions.' });
  }
});

// 1. Start a new Pomodoro Session
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { taskId, colorTag, durationMinutes, subjectId } = req.body;
    const subjectName = req.body.subjectName || req.body.taskName || req.body.name;
    let targetTaskId = subjectId || taskId;
    let taskName = (subjectName || 'Deep Focus').trim();
    let taskColor = colorTag || '#3B82F6';
    let taskDuration = Number(durationMinutes) > 0 ? Math.max(1, Math.min(720, Number(durationMinutes))) : 25;

    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '00:00';
    const now = new Date();
    const todayWeekday = getStudyDayKey(now, resetTime, tzOffset);

    // 1. Check if matches a subject in weekly timetable
    let timetableSubject = null;
    const daySubjects = req.user.weeklyTimetable?.[todayWeekday] || [];
    timetableSubject = daySubjects.find(
      (s) =>
        (targetTaskId && (s.id === targetTaskId || s._id?.toString() === targetTaskId)) ||
        (taskName && s.name.trim().toLowerCase() === taskName.toLowerCase())
    );

    if (!timetableSubject) {
      const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const d of DAYS) {
        const found = (req.user.weeklyTimetable?.[d] || []).find(
          (s) =>
            (targetTaskId && (s.id === targetTaskId || s._id?.toString() === targetTaskId)) ||
            (taskName && s.name.trim().toLowerCase() === taskName.toLowerCase())
        );
        if (found) {
          timetableSubject = found;
          break;
        }
      }
    }

    if (timetableSubject) {
      taskName = timetableSubject.name;
      taskColor = timetableSubject.color || taskColor;
      taskDuration = Number(durationMinutes) > 0 ? Math.max(1, Math.min(720, Number(durationMinutes))) : (timetableSubject.targetMinutes || taskDuration);
    }

    const dateStr = getStudyDayDate(now, resetTime, tzOffset);

    // If duration was not explicitly customized by user, use unified task remaining time
    if (!req.body.isCustomDuration && (!durationMinutes || Number(durationMinutes) === Number(timetableSubject?.targetMinutes))) {
      const cleanLower = taskName.trim().toLowerCase();
      const existingProg = await DailyTaskProgress.findOne({
        userId: req.user._id,
        dateStr,
        normalizedName: cleanLower,
      });
      if (existingProg && existingProg.remainingMinutes > 0) {
        taskDuration = existingProg.remainingMinutes;
      }
    }

    // 2. Ensure session.taskId has a valid Task ObjectId (schema requirement)
    let matchedTask = null;
    if (targetTaskId && mongoose.isValidObjectId(targetTaskId)) {
      matchedTask = await Task.findOne({ _id: targetTaskId, userId: req.user._id });
    }
    if (!matchedTask) {
      matchedTask = await Task.findOne({ name: taskName, userId: req.user._id });
    }
    if (!matchedTask) {
      matchedTask = new Task({
        userId: req.user._id,
        name: taskName,
        colorTag: taskColor,
        durationMinutes: taskDuration,
        currentStreak: 0,
        bestStreak: 0,
      });
      await matchedTask.save();
    }

    const dayOfWeek = getStudyDayOfWeek(now, resetTime, tzOffset);
    const hourOfDay = now.getHours();
    const isRestDay = isRestDayForUser(req.user, now, tzOffset);

    // Permitting only ONE actively running focus timer per user at a time
    await PomodoroSession.updateMany(
      { userId: req.user._id, status: 'in-progress' },
      { $set: { status: 'paused', activeSegmentStart: null, lastHeartbeatAt: now } }
    );

    const totalGoalSeconds = taskDuration * 60;
    const expectedEndTime = new Date(now.getTime() + totalGoalSeconds * 1000);
    const session = new PomodoroSession({
      userId: req.user._id,
      taskId: matchedTask._id,
      subjectId: targetTaskId ? targetTaskId.toString() : null,
      taskName,
      colorTag: taskColor,
      durationMinutes: taskDuration,
      totalGoalSeconds,
      remainingSeconds: totalGoalSeconds,
      startTime: now,
      expectedEndTime,
      completionNotificationSent: false,
      activeSegmentStart: now,
      currentIntervalStart: now,
      lastHeartbeatAt: now,
      actualSeconds: 0,
      actualMinutes: 0,
      accumulatedSeconds: 0,
      intervalActiveSeconds: 0,
      pauseCount: 0,
      confirmedEarlyBreaks: 0,
      freeBreaks: 0,
      pauseLogs: [],
      status: 'in-progress',
      dateStr,
      dayOfWeek,
      hourOfDay,
      isRestDay,
    });

    await session.save();
    scheduleSessionNotification(session._id, req.user._id, taskName, expectedEndTime);
    console.log(`[Timer Service] [Start] Session: ${session._id} User: ${req.user._id} Task: "${taskName}" (${taskDuration}m)`);

    return res.status(201).json({
      success: true,
      message: `Focus session started for "${taskName}"! Good luck on your study quest.`,
      session,
      studyDay: {
        dateStr,
        dayOfWeek,
        dailyResetTime: resetTime,
      },
    });
  } catch (error) {
    console.error('[Pomodoro Error] Start:', error);
    return res.status(500).json({ success: false, message: 'Failed to start session.' });
  }
});

// 2. Pause Session / Take a Break
// - Core Rule: 25 minutes of active focus required in the current interval for a penalty-free break.
// - If user takes break before 25m (1500s) and explicitly confirms: deducts exactly 1 coin (idempotent, min 0).
// - If user has completed >= 25m in current interval: free break (0 coins deducted).
// - Paused time, breaks, countdown do not count toward the 25m threshold.
router.post('/:sessionId/pause', requireAuth, async (req, res) => {
  try {
    const session = await PomodoroSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Active session not found.' });
    }

    const now = new Date();
    // 1. Accumulate verified active segment before pausing
    if (session.activeSegmentStart && session.status === 'in-progress') {
      const elapsedSinceSegment = Math.max(
        0,
        Math.round((now.getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
      );
      const totalGoalSecs = session.totalGoalSeconds || session.durationMinutes * 60;
      const remainingAllowed = Math.max(0, totalGoalSecs - (session.accumulatedSeconds || 0));
      const verifiedSegment = Math.min(elapsedSinceSegment, remainingAllowed);

      session.accumulatedSeconds = (session.accumulatedSeconds || 0) + verifiedSegment;
      session.intervalActiveSeconds = (session.intervalActiveSeconds || 0) + verifiedSegment;
      session.actualSeconds = Math.min(session.accumulatedSeconds, totalGoalSecs);
      session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
      session.remainingSeconds = Math.max(0, totalGoalSecs - session.actualSeconds);
      session.activeSegmentStart = null;
    }

    // 2. Client verified active times
    const clientInterval = Number(req.body.intervalSeconds);
    if (!isNaN(clientInterval) && clientInterval >= 0) {
      session.intervalActiveSeconds = Math.max(session.intervalActiveSeconds || 0, Math.min(clientInterval, 86400));
    }
    const clientElapsed = Number(
      req.body.actualSeconds !== undefined ? req.body.actualSeconds : req.body.elapsedSeconds
    );
    if (!isNaN(clientElapsed) && clientElapsed >= 0) {
      session.accumulatedSeconds = Math.max(session.accumulatedSeconds || 0, clientElapsed);
      session.actualSeconds = session.accumulatedSeconds;
      session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
    }

    session.lastHeartbeatAt = now;
    session.status = 'paused';
    session.expectedEndTime = null;
    cancelSessionNotification(session._id);

    const user = req.user;
    const intervalSecs = Math.max(0, session.intervalActiveSeconds || 0);
    const isEarlyBreak = intervalSecs < 1500; // < 25 minutes
    const isConfirmed = Boolean(req.body.isEarlyBreakConfirmed);

    const pauseIndex = (session.pauseCount || 0) + 1;
    const pauseRef =
      req.body.actionId ||
      `session_break_${session._id}_${pauseIndex}_${Math.floor(intervalSecs)}`;

    let coinDeducted = false;
    let penaltyApplied = false;
    let message = '';

    if (isEarlyBreak) {
      // Early break (< 25m): 1 coin penalty applies if confirmed
      if (isConfirmed) {
        const existingTx = await CoinTransaction.findOne({
          userId: user._id,
          referenceId: pauseRef,
        });

        if (!existingTx) {
          if (user.coins >= 1) {
            user.coins -= 1;
            coinDeducted = true;
            penaltyApplied = true;
            try {
              await CoinTransaction.create({
                userId: user._id,
                type: 'early_break_penalty',
                amount: -1,
                balanceAfter: user.coins,
                reason: `Early break penalty for "${session.taskName}" (${Math.floor(intervalSecs / 60)}m ${intervalSecs % 60}s of 25m interval)`,
                referenceId: pauseRef,
                metadata: { sessionId: session._id, intervalSeconds: intervalSecs, pauseIndex },
              });
            } catch (e) {
              // Idempotency safety on unique index collision
            }
            message = `Early break confirmed (${Math.floor(intervalSecs / 60)}m ${intervalSecs % 60}s). 1 coin deducted. Balance: ${user.coins} coins.`;
          } else {
            penaltyApplied = true;
            message = `Early break confirmed. No coin deducted because balance is 0 (balance cannot be negative).`;
          }
          user.markModified('coins');
        } else {
          message = `Break action already processed. Balance remains ${user.coins} coins.`;
        }
        session.confirmedEarlyBreaks = (session.confirmedEarlyBreaks || 0) + 1;
      } else {
        message = `Break taken before 25m without penalty confirmation.`;
      }
    } else {
      // Free break (>= 25m threshold completed)
      session.freeBreaks = (session.freeBreaks || 0) + 1;
      message = `Free break taken! You completed 25+ minutes of focus in this interval. 0 coins deducted.`;
    }

    session.pauseCount = pauseIndex;
    session.pauseLogs.push({
      pausedAt: now,
      durationSeconds: 0,
      intervalSeconds: intervalSecs,
      isEarly: isEarlyBreak,
      penaltyCharged: coinDeducted,
    });

    // Record delta progress to unified DailyTaskProgress
    const tzOffset = getTzOffset(req);
    const lastRecorded = session.lastRecordedProgressSeconds || 0;
    const deltaSeconds = Math.max(0, (session.actualSeconds || 0) - lastRecorded);
    if (deltaSeconds > 0) {
      try {
        await recordSessionToUnifiedProgress({
          user,
          taskName: session.taskName,
          subjectId: session.subjectId,
          taskId: session.taskId,
          deltaSeconds,
          sessionId: session._id,
          sessionType: 'deep_focus',
          isFinal: false,
          tzOffset,
        });
        session.lastRecordedProgressSeconds = session.actualSeconds;
      } catch (err) {
        console.warn('[Pomodoro Pause] DailyTaskProgress notice:', err.message);
      }
    }

    await Promise.all([user.save(), session.save()]);

    return res.json({
      success: true,
      message,
      pauseCount: session.pauseCount,
      isEarlyBreak,
      isPenaltyFree: !isEarlyBreak,
      coinDeducted,
      penaltyApplied,
      userCoins: user.coins,
      intervalSeconds: intervalSecs,
      actualSeconds: session.actualSeconds,
      actualMinutes: session.actualMinutes,
      session,
    });
  } catch (error) {
    console.error('[Pomodoro Error] Pause:', error);
    return res.status(500).json({ success: false, message: 'Failed to pause session.' });
  }
});

// 3. Resume Session
// - Every Resume starts a fresh 25-minute break-eligibility interval (intervalActiveSeconds = 0)
// - Preserves accumulated daily and session focus time
// - Permitted only one actively running focus timer per user
router.post('/:sessionId/resume', requireAuth, async (req, res) => {
  try {
    const session = await PomodoroSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Active session not found.' });
    }

    const now = new Date();

    // Pause any other in-progress session so only one runs at a time
    await PomodoroSession.updateMany(
      { userId: req.user._id, _id: { $ne: session._id }, status: 'in-progress' },
      { $set: { status: 'paused', activeSegmentStart: null, lastHeartbeatAt: now } }
    );

    // Starting a new 25-minute break interval
    session.intervalActiveSeconds = 0;
    session.currentIntervalStart = now;
    session.activeSegmentStart = now;
    session.lastHeartbeatAt = now;
    session.status = 'in-progress';

    if (session.pauseLogs.length > 0) {
      const lastPause = session.pauseLogs[session.pauseLogs.length - 1];
      if (!lastPause.resumedAt) {
        lastPause.resumedAt = now;
        lastPause.durationSeconds = Math.max(
          0,
          Math.round((now.getTime() - new Date(lastPause.pausedAt).getTime()) / 1000)
        );
      }
    }

    const totalGoalSecs = session.totalGoalSeconds || session.durationMinutes * 60;
    const remainingSecs = Math.max(0, totalGoalSecs - (session.accumulatedSeconds || 0));
    const expectedEndTime = new Date(now.getTime() + remainingSecs * 1000);
    session.expectedEndTime = expectedEndTime;
    session.completionNotificationSent = false;

    await session.save();
    scheduleSessionNotification(session._id, req.user._id, session.taskName, expectedEndTime);

    return res.json({
      success: true,
      message: 'Focus session resumed! New 25-minute break interval started.',
      actualSeconds: session.actualSeconds,
      actualMinutes: session.actualMinutes,
      intervalActiveSeconds: 0,
      session,
      userCoins: req.user.coins,
    });
  } catch (error) {
    console.error('[Pomodoro Error] Resume:', error);
    return res.status(500).json({ success: false, message: 'Failed to resume session.' });
  }
});

// 3b. Session Checkpoint & Heartbeat (Fired every 10-15s and on pagehide/visibilitychange)
// - If user closes browser or tab (closing=true), status becomes paused/interrupted without charging break penalty
router.post('/:sessionId/checkpoint', requireAuth, async (req, res) => {
  try {
    const session = await PomodoroSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (session.status === 'completed' || session.status === 'stopped') {
      return res.json({
        success: true,
        actualSeconds: session.actualSeconds,
        actualMinutes: session.actualMinutes,
        status: session.status,
        finalized: true,
      });
    }

    const now = new Date();
    const maxTotalAllowed = (session.totalGoalSeconds || session.durationMinutes * 60 || 25 * 60);
    const clientElapsed = Number(
      req.body.actualSeconds !== undefined ? req.body.actualSeconds : req.body.elapsedSeconds
    );
    const clientInterval = Number(req.body.intervalSeconds);

    let verifiedSecs = session.accumulatedSeconds || 0;
    let verifiedInterval = session.intervalActiveSeconds || 0;

    if (session.status === 'in-progress' && session.activeSegmentStart) {
      const elapsedSinceSegment = Math.max(
        0,
        Math.round((now.getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
      );
      verifiedSecs += elapsedSinceSegment;
      verifiedInterval += elapsedSinceSegment;
    }

    if (!isNaN(clientElapsed) && clientElapsed >= 0) {
      verifiedSecs = Math.max(verifiedSecs, Math.min(clientElapsed, maxTotalAllowed));
    }
    if (!isNaN(clientInterval) && clientInterval >= 0) {
      verifiedInterval = Math.max(verifiedInterval, Math.min(clientInterval, 86400));
    }

    session.actualSeconds = Math.min(verifiedSecs, maxTotalAllowed);
    session.accumulatedSeconds = session.actualSeconds;
    session.intervalActiveSeconds = verifiedInterval;
    session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
    session.remainingSeconds = Math.max(0, maxTotalAllowed - session.actualSeconds);
    session.lastHeartbeatAt = now;

    if (req.body.closing) {
      session.status = 'paused';
      session.isInterrupted = true;
      session.activeSegmentStart = null;
      session.endTime = now;
      // Note: No coin penalty charged on tab close / reload / navigation
    }

    // Record delta progress to unified DailyTaskProgress
    const tzOffset = getTzOffset(req);
    const lastRecorded = session.lastRecordedProgressSeconds || 0;
    const deltaSeconds = Math.max(0, (session.actualSeconds || 0) - lastRecorded);
    if (deltaSeconds > 0) {
      try {
        await recordSessionToUnifiedProgress({
          user: req.user,
          taskName: session.taskName,
          subjectId: session.subjectId,
          taskId: session.taskId,
          deltaSeconds,
          sessionId: session._id,
          sessionType: 'deep_focus',
          isFinal: Boolean(req.body.closing),
          tzOffset,
        });
        session.lastRecordedProgressSeconds = session.actualSeconds;
      } catch (err) {
        console.warn('[Pomodoro Checkpoint] DailyTaskProgress notice:', err.message);
      }
    }

    await session.save();

    return res.json({
      success: true,
      actualSeconds: session.actualSeconds,
      actualMinutes: session.actualMinutes,
      intervalSeconds: session.intervalActiveSeconds,
      remainingSeconds: session.remainingSeconds,
      status: session.status,
      isInterrupted: Boolean(session.isInterrupted),
    });
  } catch (err) {
    console.error('[Pomodoro Error] Checkpoint:', err);
    return res.status(500).json({ success: false, message: 'Failed to record checkpoint.' });
  }
});

// 4. Complete Session (Idempotent: protects against duplicate coin rewards on refresh)
router.post('/:sessionId/complete', requireAuth, async (req, res) => {
  try {
    const session = await PomodoroSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id,
    });

    if (!session) {
      console.warn(`[Timer Service] [Complete 404] Session not found: ${req.params.sessionId}`);
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // IDEMPOTENCY GUARD: If session is already completed, return existing data without double-granting coins
    if (session.status === 'completed') {
      console.log(`[Timer Service] [Idempotent Duplicate] Session already completed: ${session._id}`);
      return res.json({
        success: true,
        alreadyCompleted: true,
        message: 'Session has already been saved and completed.',
        coinsEarned: session.coinsEarned || 0,
        userCoins: req.user.coins,
        actualSeconds: session.actualSeconds,
        actualMinutes: session.actualMinutes,
        session,
        timetable: req.user.weeklyTimetable,
      });
    }

    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '00:00';
    const now = new Date();
    const todayStudyDay = getStudyDayDate(now, resetTime, tzOffset);
    const todayStudyKey = getStudyDayKey(now, resetTime, tzOffset);

    // Finalize active focus duration
    const maxTotalAllowed = session.totalGoalSeconds || (session.durationMinutes * 60);
    if (session.activeSegmentStart) {
      const elapsedSinceSegment = Math.max(
        0,
        Math.round((now.getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
      );
      const remainingAllowed = Math.max(0, maxTotalAllowed - (session.accumulatedSeconds || 0));
      const verifiedSegment = Math.min(elapsedSinceSegment, remainingAllowed);

      session.accumulatedSeconds = (session.accumulatedSeconds || 0) + verifiedSegment;
      session.actualSeconds = Math.max(session.accumulatedSeconds, maxTotalAllowed);
      session.activeSegmentStart = null;
    } else if (!session.actualSeconds || session.actualSeconds < maxTotalAllowed) {
      session.actualSeconds = maxTotalAllowed;
    }

    session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
    session.endTime = now;
    session.status = 'completed';
    session.dateStr = todayStudyDay;
    session.expectedEndTime = null;
    session.completionNotificationSent = true;
    cancelSessionNotification(session._id);

    // 1. Session Coin Reward Math (Section 7):
    // Eligible completed focus session awards exactly +5 coins once.
    // Early breaks are penalized at the moment of the confirmed break (-1 coin), avoiding double penalties on completion.
    const pauseCount = session.pauseCount || 0;
    const penaltyDeductions = session.penaltyDeductions || 0;
    let sessionCoins = 5;

    session.coinsEarned = sessionCoins;
    session.penaltyDeductions = penaltyDeductions;

    // Record final delta progress to unified DailyTaskProgress
    const lastRecorded = session.lastRecordedProgressSeconds || 0;
    const deltaSeconds = Math.max(0, (session.actualSeconds || 0) - lastRecorded);
    if (deltaSeconds > 0) {
      try {
        await recordSessionToUnifiedProgress({
          user: req.user,
          taskName: session.taskName,
          subjectId: session.subjectId,
          taskId: session.taskId,
          deltaSeconds,
          sessionId: session._id,
          sessionType: 'deep_focus',
          isFinal: true,
          tzOffset,
        });
        session.lastRecordedProgressSeconds = session.actualSeconds;
      } catch (err) {
        console.warn('[Pomodoro Complete] DailyTaskProgress notice:', err.message);
      }
    }

    await session.save();

    const user = req.user;
    let totalCoinsEarnedThisSession = sessionCoins;

    // Award session completion coins to user (idempotent via CoinTransaction)
    if (sessionCoins > 0) {
      const sessionRef = `session_complete_${session._id}`;
      const existingSessionTx = await CoinTransaction.findOne({ userId: user._id, referenceId: sessionRef });
      if (!existingSessionTx) {
        user.coins = (user.coins || 0) + sessionCoins;
        try {
          await CoinTransaction.create({
            userId: user._id,
            type: 'session_completion',
            amount: sessionCoins,
            balanceAfter: user.coins,
            reason: `Completed focus session: ${session.taskName}`,
            referenceId: sessionRef,
            metadata: { sessionId: session._id, actualSeconds: session.actualSeconds, pauseCount },
          });
        } catch (e) {
          user.coins = Math.max(0, (user.coins || 0) - sessionCoins);
          sessionCoins = 0;
        }
      }
    }

    // 2. Link with Timetable Subject / Task completion & compute independent subject streak
    let matchingSubject = null;
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (user.weeklyTimetable) {
      const matchCriteria = (s) =>
        (session.taskId && (s.id === session.taskId || s._id?.toString() === session.taskId.toString())) ||
        s.name.trim().toLowerCase() === session.taskName.trim().toLowerCase();

      if (Array.isArray(user.weeklyTimetable[todayStudyKey])) {
        matchingSubject = user.weeklyTimetable[todayStudyKey].find(matchCriteria);
      }

      // Sync completed dates and independent streak across all days for this subject entity
      DAYS.forEach((d) => {
        (user.weeklyTimetable[d] || []).forEach((s) => {
          if (matchCriteria(s)) {
            if (!Array.isArray(s.completedDates)) s.completedDates = [];
            if (!s.completedDates.includes(todayStudyDay)) {
              s.completedDates.push(todayStudyDay);
            }
            const streakInfo = calculateSubjectStreak(s.completedDates, todayStudyDay, user, tzOffset);
            s.currentStreak = streakInfo.currentStreak;
            s.bestStreak = streakInfo.bestStreak;
            s.lastCompletedDate = streakInfo.lastCompletedDate;
          }
        });
      });
      user.markModified('weeklyTimetable');
    }

    // 3. Update legacy Task stats & streak if session.taskId points to a Task
    let task = null;
    if (session.taskId && mongoose.isValidObjectId(session.taskId)) {
      task = await Task.findOne({ _id: session.taskId, userId: user._id });
      if (task) {
        task.totalSessions = (task.totalSessions || 0) + 1;
        task.totalMinutes = (task.totalMinutes || 0) + session.actualMinutes;
        task.completedToday = true;
        task.lastCompletedDate = todayStudyDay;
        await updateTaskStreak(task, user, tzOffset);
      }
    }

    // 4. Update Global Study Streak
    const globalStreakResult = await updateGlobalStreakIfEligible(user, tzOffset);

    // 5. Check and Award 2-Coin Daily Bonus (>= 5 tasks with zero pauses on this local study day)
    const bonusResult = await checkAndAwardDailyBonus(user, todayStudyDay);
    let allDailyBonusAwarded = false;
    let bonusCoinsEarned = 0;

    if (bonusResult && bonusResult.bonusAwarded) {
      allDailyBonusAwarded = true;
      bonusCoinsEarned = 2; // Exactly 2 coins for daily bonus
      totalCoinsEarnedThisSession += 2;
      session.dailyBonusAwarded = true;
      await session.save();
    }

    // 5. Sparky affection & vitality boost
    if (user.pet && user.pet.isAlive) {
      user.pet.affection = Math.min(100, (user.pet.affection || 50) + 5);
      user.pet.vitality = Math.min(100, (user.pet.vitality || 50) + 3);
      user.markModified('pet');
    }

    user.markModified('weeklyTimetable');
    user.markModified('streaks');
    await user.save();

    console.log(
      `[Timer Service] [Complete Success] Session: ${session._id} User: ${user._id} ` +
      `SessionCoins: +${sessionCoins} BonusCoins: +${bonusCoinsEarned} TotalUserCoins: ${user.coins} (Actual: ${session.actualSeconds}s)`
    );

    return res.json({
      success: true,
      message: `Quest completed! You earned ${sessionCoins} focus coins.${
        allDailyBonusAwarded ? ' 🔥 5+ PAUSE-FREE TASKS COMPLETED! +2 BONUS COINS AWARDED!' : ''
      }`,
      coinsEarned: totalCoinsEarnedThisSession,
      coinsAwarded: sessionCoins,
      baseCoins: sessionCoins,
      sessionCoins,
      taskCoins: 0,
      taskCoinsAwarded: 0,
      taskCompleted: Boolean(matchingSubject || task),
      bonusCoins: bonusCoinsEarned,
      streakBonusAwarded: bonusCoinsEarned,
      allDailyBonusAwarded,
      dailyBonusAwarded: allDailyBonusAwarded,
      allTasksCompletedToday: allDailyBonusAwarded,
      pauseCount,
      penaltyDeductions,
      globalStreakResult,
      userCoins: user.coins,
      user,
      session,
      task,
      timetable: user.weeklyTimetable,
      actualSeconds: session.actualSeconds,
      actualMinutes: session.actualMinutes,
      studyDay: {
        dateStr: todayStudyDay,
        weekday: todayStudyKey,
        dailyResetTime: resetTime,
      },
    });
  } catch (error) {
    console.error('[Pomodoro Error] Complete:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete session.' });
  }
});

// 5. Stop / Cancel Session early (Incomplete sessions earn 0 coins, but genuine focus duration is saved to analytics)
router.post('/:sessionId/stop', requireAuth, async (req, res) => {
  try {
    const session = await PomodoroSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const now = new Date();
    if (session.activeSegmentStart) {
      const elapsedSinceSegment = Math.max(
        0,
        Math.round((now.getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
      );
      const maxTotalAllowed = session.totalGoalSeconds || (session.durationMinutes * 60);
      const remainingAllowed = Math.max(0, maxTotalAllowed - (session.accumulatedSeconds || 0));
      const verifiedSegment = Math.min(elapsedSinceSegment, remainingAllowed);

      session.accumulatedSeconds = (session.accumulatedSeconds || 0) + verifiedSegment;
      session.actualSeconds = Math.min(session.accumulatedSeconds, maxTotalAllowed);
      session.activeSegmentStart = null;
    }
    const clientElapsed = Number(req.body.elapsedSeconds);
    if (!isNaN(clientElapsed) && clientElapsed > 0) {
      session.actualSeconds = Math.max(session.actualSeconds || 0, Math.min(clientElapsed, session.totalGoalSeconds || (session.durationMinutes * 60)));
    }
    session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
    session.lastHeartbeatAt = now;
    session.endTime = now;
    session.status = 'stopped';
    session.coinsEarned = 0;
    session.expectedEndTime = null;
    cancelSessionNotification(session._id);

    // Record stopped session delta progress to unified DailyTaskProgress
    const tzOffset = getTzOffset(req);
    const lastRecorded = session.lastRecordedProgressSeconds || 0;
    const deltaSeconds = Math.max(0, (session.actualSeconds || 0) - lastRecorded);
    if (deltaSeconds > 0) {
      try {
        await recordSessionToUnifiedProgress({
          user: req.user,
          taskName: session.taskName,
          subjectId: session.subjectId,
          taskId: session.taskId,
          deltaSeconds,
          sessionId: session._id,
          sessionType: 'deep_focus',
          isFinal: true,
          tzOffset,
        });
        session.lastRecordedProgressSeconds = session.actualSeconds;
      } catch (err) {
        console.warn('[Pomodoro Stop] DailyTaskProgress notice:', err.message);
      }
    }

    await session.save();

    return res.json({
      success: true,
      message: 'Session stopped. Genuine elapsed focus duration has been saved to your analytics.',
      session,
      actualSeconds: session.actualSeconds,
      actualMinutes: session.actualMinutes,
    });
  } catch (error) {
    console.error('[Pomodoro Error] Stop:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel session.' });
  }
});

// 5b. Reconcile Interrupted Sessions for Authenticated User
router.post('/reconcile', requireAuth, async (req, res) => {
  try {
    await reconcileOrphanedSessions(req.user._id);
    return res.json({ success: true, message: 'Sessions reconciled.' });
  } catch (err) {
    console.error('[Pomodoro Error] Reconcile:', err);
    return res.status(500).json({ success: false, message: 'Failed to reconcile sessions.' });
  }
});

// 6. Get Recent Session Logs
router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const sessions = await PomodoroSession.find({ userId: req.user._id })
      .sort({ startTime: -1 })
      .limit(limit);

    return res.json({ success: true, sessions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch session history.' });
  }
});

// 7. Temporary Daily Goal Override (Today Only)
// - If user decreases today's goal: deducts exactly 1 coin (idempotent, never below 0)
// - If user increases today's goal: 0 coins deducted, 0 extra bonus
// - If user makes no change: 0 coins deducted
router.post('/daily-goal-override', requireAuth, async (req, res) => {
  try {
    const { subjectId, subjectName, targetMinutes, actionId } = req.body;
    if (!subjectId && !subjectName) {
      return res.status(400).json({ success: false, message: 'subjectId or subjectName is required.' });
    }

    const requestedMins = Math.max(5, Math.min(720, Number(targetMinutes) || 25));
    const user = req.user;
    const tzOffset = getTzOffset(req);
    const resetTime = user.dailyResetTime || '00:00';
    const todayStr = getStudyDayDate(new Date(), resetTime, tzOffset);
    const todayKey = getStudyDayKey(new Date(), resetTime, tzOffset);

    // Find the permanent saved goal for this subject
    let permanentMinutes = 45;
    let cleanName = (subjectName || '').trim();
    if (user.weeklyTimetable?.[todayKey]) {
      const match = user.weeklyTimetable[todayKey].find(
        (s) =>
          (subjectId && (s.id === subjectId || s._id?.toString() === subjectId)) ||
          (cleanName && s.name.trim().toLowerCase() === cleanName.toLowerCase())
      );
      if (match) {
        permanentMinutes = match.targetMinutes || 45;
        if (!cleanName) cleanName = match.name;
      }
    }
    if (!cleanName && subjectId) {
      const taskMatch = await Task.findOne({ _id: subjectId, userId: user._id });
      if (taskMatch) {
        permanentMinutes = taskMatch.durationMinutes || 25;
        cleanName = taskMatch.name;
      }
    }

    if (!Array.isArray(user.dailyGoalOverrides)) {
      user.dailyGoalOverrides = [];
    }

    // Determine current effective minutes for today
    const existingIdx = user.dailyGoalOverrides.findIndex(
      (o) =>
        o.dateStr === todayStr &&
        ((subjectId && o.subjectId === subjectId) ||
          (cleanName && o.subjectName && o.subjectName.toLowerCase() === cleanName.toLowerCase()))
    );

    const prevEffectiveMinutes =
      existingIdx >= 0 ? user.dailyGoalOverrides[existingIdx].targetMinutes : permanentMinutes;

    let coinsDeducted = 0;
    if (requestedMins < prevEffectiveMinutes) {
      // Decrease: deduct exactly 1 point once
      const txRef =
        actionId || `goal_decrease_${user._id}_${subjectId || cleanName}_${todayStr}_${requestedMins}`;
      const existingTx = await CoinTransaction.findOne({ userId: user._id, referenceId: txRef });

      if (!existingTx) {
        coinsDeducted = user.coins > 0 ? 1 : 0;
        user.coins = Math.max(0, (user.coins || 0) - 1);
        try {
          await CoinTransaction.create({
            userId: user._id,
            type: 'goal_decrease_penalty',
            amount: -1,
            balanceAfter: user.coins,
            reason: `Reduced today's study goal for "${cleanName || 'Subject'}" from ${prevEffectiveMinutes}m to ${requestedMins}m`,
            referenceId: txRef,
            metadata: { subjectId, subjectName: cleanName, dateStr: todayStr, prevEffectiveMinutes, requestedMins },
          });
        } catch (e) {
          console.warn('[Pomodoro Warning] CoinTransaction duplicate:', e.message);
        }
      }
    }

    // Update or insert override
    if (existingIdx >= 0) {
      user.dailyGoalOverrides[existingIdx].targetMinutes = requestedMins;
      user.dailyGoalOverrides[existingIdx].originalMinutes = permanentMinutes;
      if (cleanName) user.dailyGoalOverrides[existingIdx].subjectName = cleanName;
    } else {
      user.dailyGoalOverrides.push({
        subjectId: subjectId || `subj_custom_${Date.now()}`,
        subjectName: cleanName,
        dateStr: todayStr,
        targetMinutes: requestedMins,
        originalMinutes: permanentMinutes,
      });
    }

    user.markModified('dailyGoalOverrides');
    user.markModified('coins');
    await user.save();

    return res.json({
      success: true,
      message:
        coinsDeducted > 0
          ? `Today's goal updated to ${requestedMins} minutes. 1 coin penalty deducted.`
          : `Today's goal updated to ${requestedMins} minutes.`,
      subjectId,
      subjectName: cleanName,
      dateStr: todayStr,
      targetMinutes: requestedMins,
      permanentMinutes,
      coinsDeducted,
      userCoins: user.coins,
      overrides: user.dailyGoalOverrides.filter((o) => o.dateStr === todayStr),
    });
  } catch (error) {
    console.error('[Pomodoro Error] Goal Override:', error);
    return res.status(500).json({ success: false, message: 'Failed to update today’s goal.' });
  }
});

// 8. Cancel / Reset Today's Goal Override to Permanent Default
router.delete('/daily-goal-override', requireAuth, async (req, res) => {
  try {
    const { subjectId, subjectName } = req.body;
    const user = req.user;
    const tzOffset = getTzOffset(req);
    const resetTime = user.dailyResetTime || '00:00';
    const todayStr = getStudyDayDate(new Date(), resetTime, tzOffset);
    const todayKey = getStudyDayKey(new Date(), resetTime, tzOffset);

    let cleanName = (subjectName || '').trim();
    let permanentMinutes = 45;
    if (user.weeklyTimetable?.[todayKey]) {
      const match = user.weeklyTimetable[todayKey].find(
        (s) =>
          (subjectId && (s.id === subjectId || s._id?.toString() === subjectId)) ||
          (cleanName && s.name.trim().toLowerCase() === cleanName.toLowerCase())
      );
      if (match) {
        permanentMinutes = match.targetMinutes || 45;
        if (!cleanName) cleanName = match.name;
      }
    }

    if (Array.isArray(user.dailyGoalOverrides)) {
      user.dailyGoalOverrides = user.dailyGoalOverrides.filter(
        (o) =>
          !(
            o.dateStr === todayStr &&
            ((subjectId && o.subjectId === subjectId) ||
              (cleanName && o.subjectName && o.subjectName.toLowerCase() === cleanName.toLowerCase()))
          )
      );
      user.markModified('dailyGoalOverrides');
      await user.save();
    }

    return res.json({
      success: true,
      message: 'Restored permanent daily goal.',
      targetMinutes: permanentMinutes,
      permanentMinutes,
      userCoins: user.coins,
    });
  } catch (error) {
    console.error('[Pomodoro Error] Reset Goal Override:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset today’s goal.' });
  }
});

// 9. Save Completed Stopwatch Session
router.post('/stopwatch', requireAuth, async (req, res) => {
  try {
    const {
      activityName,
      taskName,
      name,
      activityDescription,
      subjectId,
      taskId,
      actualSeconds,
      durationSeconds,
      startTime,
      endTime,
    } = req.body;

    const rawSeconds = Number(actualSeconds !== undefined ? actualSeconds : durationSeconds);
    if (isNaN(rawSeconds) || rawSeconds <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive elapsed time in seconds is required to save a stopwatch session.',
      });
    }

    const elapsedSeconds = Math.round(rawSeconds);
    const actualMinutes = Math.max(1, Math.round((elapsedSeconds / 60) * 10) / 10);
    const tzOffset = getTzOffset(req);
    const resetTime = req.user.dailyResetTime || '00:00';
    const now = new Date();
    const start = startTime ? new Date(startTime) : new Date(now.getTime() - elapsedSeconds * 1000);
    const end = endTime ? new Date(endTime) : now;

    const dateStr = getStudyDayDate(start, resetTime, tzOffset);
    const dayOfWeek = getStudyDayOfWeek(start, resetTime, tzOffset);
    const hourOfDay = start.getHours();
    const isRestDay = isRestDayForUser(req.user, start, tzOffset);

    let finalName = (activityName || taskName || name || '').trim();
    let targetSubjectId = subjectId || null;

    // Check if matches a subject in weekly timetable or scheduled task
    const todayWeekday = getStudyDayKey(start, resetTime, tzOffset);
    const matchedScheduledTask = await findMatchingScheduledTask(
      req.user,
      { taskId, subjectId: targetSubjectId, taskName: finalName },
      todayWeekday
    );

    let isExistingTask = false;
    let assignedColor = '#C48255';
    let sessionNumber = 1;
    let stopwatchColorIndex = 0;

    if (matchedScheduledTask) {
      isExistingTask = true;
      finalName = matchedScheduledTask.name;
      targetSubjectId = matchedScheduledTask.id || matchedScheduledTask._id?.toString() || targetSubjectId;
      // CRITICAL: NEVER use brown for existing daily tasks! Use task's original assigned color!
      assignedColor = matchedScheduledTask.color || matchedScheduledTask.colorTag || '#3B82F6';
    } else {
      if (!finalName) {
        finalName = 'Stopwatch Focus';
      }
      // Determine sessionNumber for custom activity
      const priorCount = await PomodoroSession.countDocuments({
        userId: req.user._id,
        taskName: finalName,
        sessionType: 'stopwatch',
      });
      sessionNumber = priorCount + 1;
      stopwatchColorIndex = (sessionNumber - 1) % 2; // 0 = Light brown (#C48255), 1 = Dark brown (#5D3318)
      assignedColor = stopwatchColorIndex === 0 ? '#C48255' : '#5D3318';
    }

    // Match or create Task for database reference
    let matchedTask = null;
    if (taskId && mongoose.isValidObjectId(taskId)) {
      matchedTask = await Task.findOne({ _id: taskId, userId: req.user._id });
    }
    if (!matchedTask && targetSubjectId && mongoose.isValidObjectId(targetSubjectId)) {
      matchedTask = await Task.findOne({ _id: targetSubjectId, userId: req.user._id });
    }
    if (!matchedTask) {
      matchedTask = await Task.findOne({ name: finalName, userId: req.user._id });
    }
    if (!matchedTask) {
      matchedTask = new Task({
        userId: req.user._id,
        name: finalName,
        colorTag: assignedColor,
        durationMinutes: Math.round(actualMinutes),
        currentStreak: 0,
        bestStreak: 0,
      });
      await matchedTask.save();
    }

    const session = new PomodoroSession({
      userId: req.user._id,
      taskId: matchedTask?._id || undefined,
      subjectId: targetSubjectId,
      taskName: finalName,
      sessionType: 'stopwatch',
      activityDescription: (activityDescription || '').trim(),
      sessionNumber,
      stopwatchColorIndex,
      colorTag: assignedColor,
      durationMinutes: actualMinutes,
      totalGoalSeconds: elapsedSeconds,
      remainingSeconds: 0,
      actualSeconds: elapsedSeconds,
      actualMinutes,
      accumulatedSeconds: elapsedSeconds,
      lastRecordedProgressSeconds: elapsedSeconds,
      startTime: start,
      endTime: end,
      status: 'completed',
      dateStr,
      dayOfWeek,
      hourOfDay,
      isRestDay,
    });

    await session.save();

    let progressResult = null;
    if (isExistingTask) {
      try {
        progressResult = await recordSessionToUnifiedProgress({
          user: req.user,
          taskName: finalName,
          subjectId: targetSubjectId,
          taskId: matchedTask?._id,
          actualSeconds: elapsedSeconds,
          sessionId: session._id,
          sessionType: 'stopwatch',
          isFinal: true,
          tzOffset,
        });
      } catch (err) {
        console.warn('[Stopwatch Error] DailyTaskProgress update failed:', err.message);
      }
    }

    if (matchedTask) {
      try {
        await updateTaskStreak(req.user, matchedTask, dateStr);
      } catch (err) {
        console.warn('[Stopwatch Warning] Streak update failed:', err.message);
      }
    }

    console.log(
      `[Stopwatch Service] Saved session: ${session._id} for "${finalName}" (${elapsedSeconds}s, ${actualMinutes}m) user: ${req.user._id} isExistingTask: ${isExistingTask} (Color: ${assignedColor})`
    );

    return res.status(201).json({
      success: true,
      message: isExistingTask
        ? `Stopwatch session for "${finalName}" saved to daily task progress!`
        : `Stopwatch session for "${finalName}" saved to focus history!`,
      session,
      isExistingTask,
      progress: progressResult?.progress || null,
      remainingMinutes: progressResult?.remainingMinutes ?? null,
      completedMinutes: progressResult?.completedMinutes ?? null,
      isCompleted: progressResult?.isCompleted ?? false,
      userCoins: req.user.coins,
      timetable: req.user.weeklyTimetable,
    });
  } catch (error) {
    console.error('[Pomodoro Error] Stopwatch save:', error);
    return res.status(500).json({ success: false, message: 'Failed to save stopwatch session.' });
  }
});

export default router;
