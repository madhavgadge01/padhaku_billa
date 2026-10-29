import express from 'express';
import { User } from '../models/User.js';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { calculateFocusLevel, getTierForPercent } from '../utils/focusLevelEngine.js';
import {
  reconcileAllOrphanedSessions,
  reconcileOrphanedSessions,
  calculateSessionFocusMinutes,
} from '../utils/focusTimeHelper.js';

const router = express.Router();

/**
 * Calculates start & end UTC timestamps for local calendar day and week
 */
const getLeaderboardDateBoundaries = (tzOffsetMinutes = 0) => {
  const now = new Date();
  const safeOffset = !isNaN(tzOffsetMinutes) ? Number(tzOffsetMinutes) : 0;

  // Client local time reference in ms
  const clientLocalMs = now.getTime() - safeOffset * 60 * 1000;
  const clientDate = new Date(clientLocalMs);

  const year = clientDate.getUTCFullYear();
  const month = clientDate.getUTCMonth();
  const day = clientDate.getUTCDate();
  const dayOfWeek = clientDate.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Today (00:00:00 to 24:00:00 client local day mapped to UTC)
  const todayStartUtc = new Date(Date.UTC(year, month, day) + safeOffset * 60 * 1000);
  const todayEndUtc = new Date(Date.UTC(year, month, day + 1) + safeOffset * 60 * 1000);

  // This Week (Monday 00:00:00 to next Monday 00:00:00 / Sunday 23:59:59.999)
  // Distance to Monday: if Sun(0)->6, Mon(1)->0, Tue(2)->1, etc.
  const mondayDist = (dayOfWeek + 6) % 7;
  const weekStartUtc = new Date(Date.UTC(year, month, day - mondayDist) + safeOffset * 60 * 1000);
  const weekEndUtc = new Date(Date.UTC(year, month, day - mondayDist + 7) + safeOffset * 60 * 1000);

  return {
    todayStartUtc,
    todayEndUtc,
    weekStartUtc,
    weekEndUtc,
    safeOffset,
  };
};

/**
 * Assigns competition ranks based on study duration.
 * Users with equal duration share the same rank.
 * If 5 users share rank 1, the next rank is 6.
 */
const assignCompetitionRanks = (list, durationKey) => {
  let currentRank = 1;
  for (let i = 0; i < list.length; i++) {
    const currentDur = list[i][durationKey] || 0;
    if (i > 0) {
      const prevDur = list[i - 1][durationKey] || 0;
      if (currentDur < prevDur) {
        currentRank = i + 1;
      }
    }
    list[i].rank = currentRank;
  }
};

/**
 * GET /api/leaderboard
 * Query params:
 * - mode: 'today' | 'week' (default: 'today')
 * - page: number (optional)
 * - limit: number (optional)
 */
router.get('/', async (req, res) => {
  try {
    const mode = req.query.mode === 'week' ? 'week' : 'today';
    const tzOffset = req.headers['x-timezone-offset'] !== undefined
      ? Number(req.headers['x-timezone-offset'])
      : (req.query.tzOffset !== undefined ? Number(req.query.tzOffset) : 0);

    const { todayStartUtc, todayEndUtc, weekStartUtc, weekEndUtc } =
      getLeaderboardDateBoundaries(tzOffset);
    const fourteenDaysAgoUtc = new Date(todayEndUtc.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Reconcile stale in-progress sessions across all users before ranking
    await reconcileAllOrphanedSessions();

    const focusMinutesExpr = {
      $cond: [
        { $gt: ['$actualSeconds', 0] },
        { $divide: ['$actualSeconds', 60] },
        {
          $cond: [
            { $gt: ['$actualMinutes', 0] },
            '$actualMinutes',
            {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$durationMinutes', 25] },
                0,
              ],
            },
          ],
        },
      ],
    };

    // 1. Aggregate focus minutes and completed sessions for all users
    const sessionStats = await PomodoroSession.aggregate([
      {
        $match: {
          $or: [
            { status: 'completed' },
            { actualSeconds: { $gt: 0 } },
            { actualMinutes: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: '$userId',
          todayMinutes: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$startTime', todayStartUtc] },
                    { $lt: ['$startTime', todayEndUtc] },
                  ],
                },
                focusMinutesExpr,
                0,
              ],
            },
          },
          weekMinutes: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$startTime', weekStartUtc] },
                    { $lt: ['$startTime', weekEndUtc] },
                  ],
                },
                focusMinutesExpr,
                0,
              ],
            },
          },
          fourteenDaysMinutes: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$startTime', fourteenDaysAgoUtc] },
                    { $lt: ['$startTime', todayEndUtc] },
                  ],
                },
                focusMinutesExpr,
                0,
              ],
            },
          },
          lifetimeMinutes: {
            $sum: focusMinutesExpr,
          },
          distinctDates: {
            $addToSet: {
              $ifNull: [
                '$dateStr',
                { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
              ],
            },
          },
          totalCompletedSessions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsMap = new Map();
    sessionStats.forEach((s) => {
      statsMap.set(s._id.toString(), s);
    });

    // 2. Fetch all registered, eligible users (privacy preserved: no passwords, emails, or OTPs)
    const users = await User.find({
      passwordHash: { $ne: 'pending_registration' },
    })
      .select('name selectedAvatar streaks inventory socialLinks fieldOfStudy createdAt')
      .lean();

    // 3. Construct unified candidate entries
    const candidates = users.map((u) => {
      const stats = statsMap.get(u._id.toString()) || {
        todayMinutes: 0,
        weekMinutes: 0,
        fourteenDaysMinutes: 0,
        lifetimeMinutes: 0,
        distinctDates: [],
        totalCompletedSessions: 0,
      };

      const activeDays = stats.distinctDates?.length || 0;
      const avgDailyMinutes = activeDays > 0 ? Math.round(stats.lifetimeMinutes / activeDays) : 0;

      // 14-day rolling average focus calculation
      const userCreated = u.createdAt ? new Date(u.createdAt) : new Date();
      const accountAgeDays = Math.max(1, Math.ceil((Date.now() - userCreated.getTime()) / (24 * 60 * 60 * 1000)));
      const windowDays = Math.max(1, Math.min(14, accountAgeDays));
      const fourteenDaysMinutes = Math.round(stats.fourteenDaysMinutes || 0);
      const avgDailyHours14d = Math.round((fourteenDaysMinutes / 60 / windowDays) * 10) / 10;
      const focusScore = calculateFocusLevel(avgDailyHours14d);
      const tier = getTierForPercent(focusScore);
      const isDeveloping = accountAgeDays < 7 || stats.totalCompletedSessions < 3;

      const userFocusLevel = {
        score: focusScore,
        tier: tier.label,
        tierColor: tier.color,
        avgDailyHours14d,
        fourteenDaysMinutes,
        windowDays,
        isDeveloping,
      };

      return {
        id: u._id.toString(),
        name: u.name || 'Adventurer',
        avatar: u.selectedAvatar || 'cat',
        streak: u.streaks?.currentGlobalStreak || 0,
        todayMinutes: Math.round(stats.todayMinutes || 0),
        weekMinutes: Math.round(stats.weekMinutes || 0),
        lifetimeMinutes: Math.round(stats.lifetimeMinutes || 0),
        avgDailyMinutes,
        activeDays,
        totalSessions: stats.totalCompletedSessions,
        fieldOfStudy: u.fieldOfStudy || 'General',
        badges: u.inventory?.badges || [],
        showcaseBadges: u.inventory?.showcaseBadges || [],
        socialLinks: {
          instagram: u.socialLinks?.instagram || '',
          linkedin: u.socialLinks?.linkedin || '',
        },
        createdAt: u.createdAt,
        focusLevel: userFocusLevel,
      };
    });

    // 4. Stable sort helper
    const sortCandidates = (list, durationKey) => {
      list.sort((a, b) => {
        const durA = a[durationKey] || 0;
        const durB = b[durationKey] || 0;

        // Primary: Focus duration for selected period (highest first)
        if (durB !== durA) {
          return durB - durA;
        }

        // Secondary tie-breaker: Study streak (highest first)
        const streakA = a.streak || 0;
        const streakB = b.streak || 0;
        if (streakB !== streakA) {
          return streakB - streakA;
        }

        // Tertiary tie-breaker: Display name (alphabetical)
        const nameComp = (a.name || '').localeCompare(b.name || '');
        if (nameComp !== 0) return nameComp;

        // Quaternary tie-breaker: Account creation date
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    };

    // Calculate today ranks
    sortCandidates(candidates, 'todayMinutes');
    assignCompetitionRanks(candidates, 'todayMinutes');
    candidates.forEach((c) => {
      c.todayRank = c.rank;
    });

    // Calculate week ranks
    sortCandidates(candidates, 'weekMinutes');
    assignCompetitionRanks(candidates, 'weekMinutes');
    candidates.forEach((c) => {
      c.weekRank = c.rank;
    });

    // Final sort according to requested mode
    if (mode === 'today') {
      sortCandidates(candidates, 'todayMinutes');
      candidates.forEach((c) => {
        c.rank = c.todayRank;
      });
    } else {
      sortCandidates(candidates, 'weekMinutes');
      candidates.forEach((c) => {
        c.rank = c.weekRank;
      });
    }

    return res.json({
      success: true,
      mode,
      totalUsers: candidates.length,
      rankings: candidates,
      boundaries: {
        todayStart: todayStartUtc,
        todayEnd: todayEndUtc,
        weekStart: weekStartUtc,
        weekEnd: weekEndUtc,
      },
    });
  } catch (error) {
    console.error('[Leaderboard Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve community leaderboard rankings.',
    });
  }
});

/**
 * GET /api/leaderboard/:userId/profile
 * Returns detailed public mini-profile stats for a specific user
 */
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const tzOffset = req.headers['x-timezone-offset'] !== undefined
      ? Number(req.headers['x-timezone-offset'])
      : 0;

    const user = await User.findById(userId)
      .select('name selectedAvatar streaks inventory socialLinks fieldOfStudy createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { todayStartUtc, todayEndUtc, weekStartUtc, weekEndUtc } =
      getLeaderboardDateBoundaries(tzOffset);
    const fourteenDaysAgoUtc = new Date(todayEndUtc.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Reconcile stale sessions for this user before computing mini-profile stats
    await reconcileOrphanedSessions(userId);

    // Compute user sessions
    const sessions = await PomodoroSession.find({
      userId,
      $or: [
        { status: 'completed' },
        { actualSeconds: { $gt: 0 } },
        { actualMinutes: { $gt: 0 } },
      ],
    }).select('actualSeconds actualMinutes durationMinutes startTime dateStr status');

    let todayMinutes = 0;
    let weekMinutes = 0;
    let fourteenDaysMinutes = 0;
    let lifetimeMinutes = 0;
    let totalCompletedSessions = 0;
    const dateSet = new Set();

    sessions.forEach((s) => {
      const mins = calculateSessionFocusMinutes(s);
      lifetimeMinutes += mins;
      if (s.status === 'completed') {
        totalCompletedSessions++;
      }
      const d = new Date(s.startTime);
      if (d >= todayStartUtc && d < todayEndUtc) {
        todayMinutes += mins;
      }
      if (d >= weekStartUtc && d < weekEndUtc) {
        weekMinutes += mins;
      }
      if (d >= fourteenDaysAgoUtc && d < todayEndUtc) {
        fourteenDaysMinutes += mins;
      }
      if (mins > 0 || s.status === 'completed') {
        const ds = s.dateStr || d.toISOString().split('T')[0];
        dateSet.add(ds);
      }
    });

    todayMinutes = Math.round(todayMinutes);
    weekMinutes = Math.round(weekMinutes);
    fourteenDaysMinutes = Math.round(fourteenDaysMinutes);
    lifetimeMinutes = Math.round(lifetimeMinutes);

    const activeDays = dateSet.size;
    const avgDailyMinutes = activeDays > 0 ? Math.round(lifetimeMinutes / activeDays) : 0;

    // 14-day rolling average focus calculation for this user
    const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const accountAgeDays = Math.max(1, Math.ceil((Date.now() - userCreatedAt.getTime()) / (24 * 60 * 60 * 1000)));
    const windowDays = Math.max(1, Math.min(14, accountAgeDays));
    const avgDailyHours14d = Math.round((fourteenDaysMinutes / 60 / windowDays) * 10) / 10;
    const focusScore = calculateFocusLevel(avgDailyHours14d);
    const tier = getTierForPercent(focusScore);
    const isDeveloping = accountAgeDays < 7 || totalCompletedSessions < 3;

    const userFocusLevel = {
      score: focusScore,
      tier: tier.label,
      tierColor: tier.color,
      avgDailyHours14d,
      fourteenDaysMinutes,
      windowDays,
      isDeveloping,
    };

    return res.json({
      success: true,
      profile: {
        id: user._id.toString(),
        name: user.name || 'Adventurer',
        avatar: user.selectedAvatar || 'cat',
        streak: user.streaks?.currentGlobalStreak || 0,
        todayMinutes,
        weekMinutes,
        lifetimeMinutes,
        avgDailyMinutes,
        activeDays,
        totalSessions: totalCompletedSessions,
        fieldOfStudy: user.fieldOfStudy || 'General',
        badges: user.inventory?.badges || [],
        showcaseBadges: user.inventory?.showcaseBadges || [],
        socialLinks: {
          instagram: user.socialLinks?.instagram || '',
          linkedin: user.socialLinks?.linkedin || '',
        },
        createdAt: user.createdAt,
        focusLevel: userFocusLevel,
      },
    });
  } catch (error) {
    console.error('[Leaderboard Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load user profile.',
    });
  }
});

export default router;

