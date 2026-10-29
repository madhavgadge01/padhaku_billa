import { PomodoroSession } from '../models/PomodoroSession.js';

/**
 * Calculates genuine elapsed focus seconds for a session document.
 * - Uses persisted `actualSeconds` if recorded.
 * - Otherwise uses `actualMinutes * 60` if recorded.
 * - For older legacy completed sessions without `actualMinutes`/`actualSeconds`, uses `durationMinutes * 60`.
 * - For partial/interrupted sessions without verified time, returns 0 (never assumes planned duration).
 */
export function calculateSessionFocusSeconds(s) {
  if (!s) return 0;
  if (typeof s.actualSeconds === 'number' && s.actualSeconds > 0) {
    return s.actualSeconds;
  }
  if (typeof s.actualMinutes === 'number' && s.actualMinutes > 0) {
    return Math.round(s.actualMinutes * 60);
  }
  if (s.status === 'completed' && typeof s.durationMinutes === 'number' && s.durationMinutes > 0) {
    return s.durationMinutes * 60;
  }
  return 0;
}

/**
 * Calculates genuine elapsed focus minutes for a session document.
 */
export function calculateSessionFocusMinutes(s) {
  const secs = calculateSessionFocusSeconds(s);
  return Math.round((secs / 60) * 10) / 10;
}

/**
 * Reconciles any orphaned or interrupted in-progress sessions for a user.
 * Recovers only the active focus time that was verified through heartbeat or active segment timestamps.
 * Does NOT invent missing time.
 */
export async function reconcileOrphanedSessions(userId) {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const orphaned = await PomodoroSession.find({
      userId,
      status: { $in: ['in-progress', 'paused'] },
      $or: [
        { lastHeartbeatAt: { $lt: twoMinutesAgo } },
        { lastHeartbeatAt: null, updatedAt: { $lt: twoMinutesAgo } },
      ],
    });

    for (const session of orphaned) {
      if (session.status === 'in-progress' && session.activeSegmentStart) {
        // Recover elapsed time up to the last known heartbeat or current safe limit
        const referenceEnd = session.lastHeartbeatAt || session.updatedAt || session.activeSegmentStart;
        const elapsedSinceSegment = Math.max(
          0,
          Math.round((new Date(referenceEnd).getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
        );
        const maxAllowed = Math.max(0, (session.durationMinutes * 60) - (session.accumulatedSeconds || 0));
        const verifiedSegment = Math.min(elapsedSinceSegment, maxAllowed);

        session.accumulatedSeconds = (session.accumulatedSeconds || 0) + verifiedSegment;
        session.actualSeconds = Math.max(session.actualSeconds || 0, session.accumulatedSeconds);
        session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
        session.activeSegmentStart = null;
      }

      session.status = 'interrupted';
      session.isInterrupted = true;
      session.endTime = session.lastHeartbeatAt || session.updatedAt || new Date();
      await session.save();
    }
  } catch (err) {
    console.warn('[FocusTimeHelper] Error reconciling sessions for user:', userId, err.message);
  }
}

/**
 * Reconciles orphaned sessions across all users (for global leaderboard consistency).
 */
export async function reconcileAllOrphanedSessions() {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const orphaned = await PomodoroSession.find({
      status: { $in: ['in-progress', 'paused'] },
      $or: [
        { lastHeartbeatAt: { $lt: twoMinutesAgo } },
        { lastHeartbeatAt: null, updatedAt: { $lt: twoMinutesAgo } },
      ],
    });

    for (const session of orphaned) {
      if (session.status === 'in-progress' && session.activeSegmentStart) {
        const referenceEnd = session.lastHeartbeatAt || session.updatedAt || session.activeSegmentStart;
        const elapsedSinceSegment = Math.max(
          0,
          Math.round((new Date(referenceEnd).getTime() - new Date(session.activeSegmentStart).getTime()) / 1000)
        );
        const maxAllowed = Math.max(0, (session.durationMinutes * 60) - (session.accumulatedSeconds || 0));
        const verifiedSegment = Math.min(elapsedSinceSegment, maxAllowed);

        session.accumulatedSeconds = (session.accumulatedSeconds || 0) + verifiedSegment;
        session.actualSeconds = Math.max(session.actualSeconds || 0, session.accumulatedSeconds);
        session.actualMinutes = Math.round((session.actualSeconds / 60) * 10) / 10;
        session.activeSegmentStart = null;
      }

      session.status = 'interrupted';
      session.isInterrupted = true;
      session.endTime = session.lastHeartbeatAt || session.updatedAt || new Date();
      await session.save();
    }
  } catch (err) {
    console.warn('[FocusTimeHelper] Error reconciling all sessions:', err.message);
  }
}

