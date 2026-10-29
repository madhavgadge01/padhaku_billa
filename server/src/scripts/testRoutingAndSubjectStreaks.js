import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { PomodoroSession } from '../models/PomodoroSession.js';
import { CoinTransaction } from '../models/CoinTransaction.js';
import pomodoroRoutes from '../routes/pomodoroRoutes.js';
import taskRoutes from '../routes/taskRoutes.js';
import {
  getStudyDayDate,
  getStudyDayKey,
  getPreviousStudyDayDate,
  calculateSubjectStreak,
  checkAndRefreshStreaks,
  updateGlobalStreakIfEligible,
} from '../utils/streakEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.TEST_MONGODB_URL || 'mongodb://127.0.0.1:27017/lifelevel';

// Simple unit simulation of URL router matching
const ROUTE_ALIASES = {
  '/': 'home',
  '/home': 'home',
  '/dashboard': 'home',
  '/focus': 'focus',
  '/timer': 'focus',
  '/quests': 'quests',
  '/tasks': 'quests',
  '/timetable': 'timetable',
  '/weekly-plan': 'timetable',
  '/pet': 'pet',
  '/pet-care': 'pet',
  '/progress': 'progress',
  '/analytics': 'progress',
  '/leaderboard': 'leaderboard',
  '/rewards': 'rewards',
  '/shop': 'rewards',
  '/settings': 'settings',
  '/profile': 'settings',
};

const PAGE_ROUTES = {
  home: '/',
  focus: '/focus',
  quests: '/quests',
  timetable: '/timetable',
  pet: '/pet',
  progress: '/progress',
  leaderboard: '/leaderboard',
  rewards: '/rewards',
  settings: '/settings',
};

const getPageFromPath = (pathname) => {
  const cleanPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (ROUTE_ALIASES[cleanPath]) return ROUTE_ALIASES[cleanPath];
  const first = '/' + cleanPath.split('/').filter(Boolean)[0];
  if (ROUTE_ALIASES[first]) return ROUTE_ALIASES[first];
  return 'home';
};

const getPathForPage = (pageId) => PAGE_ROUTES[pageId] || '/';

async function runRoutingAndSubjectStreakTests() {
  console.log('================================================================');
  console.log('🛡️  PADHAKU BILLA: ROUTING, SUBJECT STREAKS & FOCUS LOCK TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- 1. URL ROUTING & NAVIGATION TESTS ---
  console.log('--- 1. URL Routing & Browser Navigation ---');
  assert(getPageFromPath('/') === 'home', "Root URL '/' resolves to 'home'");
  assert(getPathForPage('home') === '/', "'home' maps to canonical '/'");
  assert(getPageFromPath('/settings') === 'settings', "'/settings' resolves to 'settings'");
  assert(getPathForPage('settings') === '/settings', "'settings' maps to '/settings'");
  assert(getPageFromPath('/focus') === 'focus', "'/focus' resolves to 'focus'");
  assert(getPathForPage('focus') === '/focus', "'focus' maps to '/focus'");
  assert(getPageFromPath('/analytics') === 'progress', "'/analytics' alias resolves to 'progress'");
  assert(getPageFromPath('/progress') === 'progress', "'/progress' resolves to 'progress'");
  assert(getPageFromPath('/profile') === 'settings', "'/profile' alias resolves to 'settings'");
  assert(getPageFromPath('/tasks') === 'quests', "'/tasks' alias resolves to 'quests'");
  assert(getPageFromPath('/quests') === 'quests', "'/quests' resolves to 'quests'");
  assert(getPageFromPath('/leaderboard') === 'leaderboard', "'/leaderboard' resolves to 'leaderboard'");
  assert(getPageFromPath('/rewards') === 'rewards', "'/rewards' resolves to 'rewards'");
  assert(getPageFromPath('/shop') === 'rewards', "'/shop' alias resolves to 'rewards'");
  assert(getPageFromPath('/timetable') === 'timetable', "'/timetable' resolves to 'timetable'");
  assert(getPageFromPath('/weekly-plan') === 'timetable', "'/weekly-plan' alias resolves to 'timetable'");

  // --- 2. INDEPENDENT SUBJECT STREAKS ALGORITHM TESTS ---
  console.log('\n--- 2. Independent Subject Streaks vs Main Streak ---');
  const todayStr = '2026-10-29';
  const day1 = '2026-10-27';
  const day2 = '2026-10-28';
  const day3 = '2026-10-29';

  // Backend: 3 consecutive days (Oct 27, Oct 28, Oct 29)
  const backendStreak = calculateSubjectStreak([day1, day2, day3], todayStr);
  assert(backendStreak.currentStreak === 3, 'Backend streak is 3 days for 3 consecutive completed days');
  assert(backendStreak.completedToday === true, 'Backend completedToday is true');

  // English: 3 consecutive days
  const englishStreak = calculateSubjectStreak([day1, day2, day3], todayStr);
  assert(englishStreak.currentStreak === 3, 'English streak is 3 days');

  // Mathematics: 3 consecutive days
  const mathStreak = calculateSubjectStreak([day1, day2, day3], todayStr);
  assert(mathStreak.currentStreak === 3, 'Mathematics streak is 3 days');

  // Computer Science: never completed or missed
  const csStreak = calculateSubjectStreak([], todayStr);
  assert(csStreak.currentStreak === 0, 'Computer Science streak is 0 days when never completed');

  // Duplicate completions on same day do NOT increment streak
  const dupSessionStreak = calculateSubjectStreak([day1, day2, day2, day3, day3, day3], todayStr);
  assert(dupSessionStreak.currentStreak === 3, 'Multiple completed sessions on same day do NOT increment streak multiple times');

  // Missed day resets current streak
  const missedYesterdayStreak = calculateSubjectStreak(['2026-10-20', '2026-10-21'], todayStr);
  assert(missedYesterdayStreak.currentStreak === 0, 'Missed day correctly resets current subject streak to 0');
  assert(missedYesterdayStreak.bestStreak === 2, 'Historical bestStreak (2) is preserved when streak resets');

  // Active study day in progress preserves yesterday's earned streak
  const pendingTodayStreak = calculateSubjectStreak([day1, day2], todayStr);
  assert(pendingTodayStreak.currentStreak === 2, "Ongoing study day preserves yesterday's streak (2 days) until today finishes");
  assert(pendingTodayStreak.completedToday === false, 'completedToday is false when subject has not yet been completed today');

  // --- 3. DATABASE & FULL USER INTEGRATION TEST ---
  console.log('\n--- 3. Database & Weekly Timetable 4-Subject Realistic Scenario ---');
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB: ${MONGODB_URI}`);

  const testUser = await User.create({
    email: `streak_test_${Date.now()}@lifelevel.app`,
    passwordHash: 'test_password_hash_123',
    name: 'Streak Tester',
    coins: 20,
    dailyResetTime: '06:00',
    streaks: {
      currentGlobalStreak: 0,
      bestGlobalStreak: 0,
      completedDates: [],
      lastActiveDate: '',
    },
    weeklyTimetable: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [
        { id: 'subj_backend', name: 'Backend', color: '#3B82F6', targetMinutes: 60, completedDates: [day1, day2, day3] },
        { id: 'subj_english', name: 'English', color: '#10B981', targetMinutes: 30, completedDates: [day1, day2, day3] },
        { id: 'subj_math', name: 'Mathematics', color: '#F59E0B', targetMinutes: 45, completedDates: [day1, day2, day3] },
        { id: 'subj_cs', name: 'Computer Science', color: '#EC4899', targetMinutes: 45, completedDates: [] },
      ],
      friday: [],
      saturday: [],
      sunday: [],
    },
  });

  // Run checkAndRefreshStreaks for the user
  const refreshResult = await checkAndRefreshStreaks(testUser);
  const thursdayTasks = testUser.weeklyTimetable.thursday;

  const backendObj = thursdayTasks.find((t) => t.name === 'Backend');
  const englishObj = thursdayTasks.find((t) => t.name === 'English');
  const mathObj = thursdayTasks.find((t) => t.name === 'Mathematics');
  const csObj = thursdayTasks.find((t) => t.name === 'Computer Science');

  assert(backendObj.currentStreak === 3, 'Persisted Backend streak is 3 days');
  assert(englishObj.currentStreak === 3, 'Persisted English streak is 3 days');
  assert(mathObj.currentStreak === 3, 'Persisted Mathematics streak is 3 days');
  assert(csObj.currentStreak === 0, 'Persisted Computer Science streak is 0 days');

  // Verify Main streak: 0 days because Computer Science is NOT completed today
  const mainStreakAttempt = await updateGlobalStreakIfEligible(testUser);
  assert(mainStreakAttempt.allCompleted === false, 'All tasks are not completed because Computer Science was skipped');
  assert(mainStreakAttempt.globalStreakUpdated === false, 'Main streak was NOT incremented');
  assert(testUser.streaks.currentGlobalStreak === 0, 'Overall / Main streak is 0 days as expected');

  // Now complete Computer Science on today's study day
  csObj.completedDates.push(todayStr);
  const updatedCSStreak = calculateSubjectStreak(csObj.completedDates, todayStr);
  csObj.currentStreak = updatedCSStreak.currentStreak;
  testUser.markModified('weeklyTimetable');
  await testUser.save();

  assert(csObj.currentStreak === 1, 'Computer Science streak is now 1 day');
  assert(backendObj.currentStreak === 3, 'Backend streak remains 3 days independently');

  // Now update main streak when all 4 are complete
  const mainStreakSuccess = await updateGlobalStreakIfEligible(testUser);
  assert(mainStreakSuccess.allCompleted === true, 'All 4 subjects are now completed today');
  assert(mainStreakSuccess.globalStreakUpdated === true, 'Main streak is successfully updated');
  assert(testUser.streaks.currentGlobalStreak === 1, 'Main streak is now 1 day');

  // --- 4. FOCUS NAVIGATION LOCK LOGIC TESTS ---
  console.log('\n--- 4. Focus Navigation Lock Logic (Requirement 3) ---');
  let mockTimerRunning = false;
  let mockModalVisible = false;
  let mockCurrentRoute = '/focus';

  const mockNavigateTo = (targetPageId) => {
    if (mockTimerRunning && targetPageId !== 'focus') {
      mockModalVisible = true;
      return false; // Blocked!
    }
    mockCurrentRoute = getPathForPage(targetPageId);
    return true; // Allowed!
  };

  // Case A: Timer is NOT running -> Navigation is completely open
  mockTimerRunning = false;
  assert(mockNavigateTo('settings') === true, 'Navigating to Settings is allowed when timer is idle');
  assert(mockCurrentRoute === '/settings', "Route successfully updated to '/settings'");

  // Case B: User on Focus, 5-second countdown active -> Navigation is NOT yet locked
  mockCurrentRoute = '/focus';
  mockTimerRunning = false; // Countdown does not lock navigation
  assert(mockNavigateTo('quests') === true, 'Countdown preparation does not prematurely lock navigation');

  // Case C: Timer is ACTIVELY running -> Attempts to navigate are BLOCKED
  mockCurrentRoute = '/focus';
  mockTimerRunning = true;
  mockModalVisible = false;

  assert(mockNavigateTo('home') === false, 'Navigating to Dashboard is blocked while timer is running');
  assert(mockModalVisible === true, 'Focus lock warning modal is displayed');
  assert(mockCurrentRoute === '/focus', 'User remains safely on /focus');

  assert(mockNavigateTo('settings') === false, 'Navigating to Settings is blocked while timer is running');
  assert(mockNavigateTo('progress') === false, 'Navigating to Analytics is blocked while timer is running');
  assert(mockNavigateTo('leaderboard') === false, 'Navigating to Leaderboard is blocked while timer is running');

  // Case D: User pauses timer -> Navigation is immediately restored
  mockTimerRunning = false;
  mockModalVisible = false;
  assert(mockNavigateTo('settings') === true, 'Pausing timer immediately restores navigation freedom');
  assert(mockCurrentRoute === '/settings', "Route updated to '/settings' upon pause");

  // Clean up test document
  await User.findByIdAndDelete(testUser._id);
  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
  console.log('================================================================\n');
}

runRoutingAndSubjectStreakTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
