import React, { useState, useEffect } from 'react';
import {
  Flame,
  Coins,
  Heart,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { TopHeader } from './components/TopHeader.jsx';

import { HomePage } from './pages/HomePage.jsx';
import { FocusPage } from './pages/FocusPage.jsx';
import { QuestsPage } from './pages/QuestsPage.jsx';
import { PetCarePage } from './pages/PetCarePage.jsx';
import { ProgressPage } from './pages/ProgressPage.jsx';
import { LeaderboardPage } from './pages/LeaderboardPage.jsx';
import { RewardsPage } from './pages/RewardsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { WeeklyPlanPage } from './pages/WeeklyPlanPage.jsx';

import { AuthModal } from './components/AuthModal.jsx';
import { OnboardingModal } from './components/OnboardingModal.jsx';
import { GoogleLogo } from './components/GoogleSignInButton.jsx';
import { sounds } from './audio/soundEffects.js';
import { api } from './services/api.js';
import { getPageFromPath, getPathForPage } from './utils/router.js';

export function App() {
  const [user, setUser] = useState(null);
  const [pet, setPet] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [focusedSubject, setFocusedSubject] = useState(null);
  const [tasksSummary, setTasksSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Multi-Page Navigation with real URL routing
  const [activePage, setActivePage] = useState(() => getPageFromPath(window.location.pathname));

  // Focus Timer active running state for centralized route guard (Requirement 3)
  const [isFocusTimerRunning, setIsFocusTimerRunning] = useState(false);
  const [showFocusNavBlockedModal, setShowFocusNavBlockedModal] = useState(false);

  // Modals & Settings
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('lifelevel_theme') || 'dark');

  // Helper to synchronize theme attribute and classes on DOM
  const applyTheme = (targetTheme) => {
    const t = targetTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lifelevel_theme', t);
  };

  // Check if today is the user's weekly rest day
  const isRestDayToday = () => {
    if (!user?.restDay?.enabled) return false;
    return new Date().getDay() === user.restDay.dayOfWeek;
  };

  // Centralized Navigation System with Focus Timer Guard (Requirements 1 & 3)
  const navigateTo = (targetPageId, options = {}) => {
    // If timer is actively running on Focus page, block any internal navigation away from focus
    if (isFocusTimerRunning && targetPageId !== 'focus') {
      setShowFocusNavBlockedModal(true);
      return false;
    }

    const targetPath = getPathForPage(targetPageId);
    const currentPath = window.location.pathname;

    if (!options.replace && currentPath !== targetPath) {
      window.history.pushState({ page: targetPageId }, '', targetPath);
    } else if (options.replace && currentPath !== targetPath) {
      window.history.replaceState({ page: targetPageId }, '', targetPath);
    }

    setActivePage(targetPageId);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  };

  // Browser Back/Forward navigation listener with Focus Lock Guard
  useEffect(() => {
    const handlePopState = () => {
      // If timer is actively running, intercept and stay on /focus
      if (isFocusTimerRunning) {
        window.history.pushState({ page: 'focus' }, '', '/focus');
        setShowFocusNavBlockedModal(true);
        return;
      }

      const resolvedPage = getPageFromPath(window.location.pathname);
      setActivePage(resolvedPage);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isFocusTimerRunning]);

  // Synchronize initial browser address with canonical route on mount
  useEffect(() => {
    const currentPath = window.location.pathname;
    const initialPage = getPageFromPath(currentPath);
    const canonicalPath = getPathForPage(initialPage);
    if (currentPath !== canonicalPath && !currentPath.includes('.')) {
      window.history.replaceState({ page: initialPage }, '', canonicalPath);
    }
  }, []);

  // Load user data & tasks
  const loadUserData = async () => {
    const token = localStorage.getItem('lifelevel_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.user);
        setPet(res.user.pet);
        const userTheme = res.user.theme || localStorage.getItem('lifelevel_theme') || 'dark';
        setTheme(userTheme);
        applyTheme(userTheme);

        // Load tasks
        const tasksRes = await api.getTasks();
        if (tasksRes.success) {
          setTasks(tasksRes.tasks);
          setTasksSummary(tasksRes.summary);
          if (tasksRes.tasks.length > 0 && !activeTask) {
            setActiveTask(tasksRes.tasks[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      localStorage.removeItem('lifelevel_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyTheme(theme);
    loadUserData();
  }, []);

  // Theme Toggle (Light / Dark)
  const handleToggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    sounds.playClick();
    if (user) {
      try {
        await api.updateTheme(newTheme);
      } catch (e) {}
    }
  };

  // Sound Toggle
  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setSoundMuted(muted);
    if (!muted) sounds.playClick();
  };

  // Auth Success
  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setPet(authenticatedUser.pet);
    setShowAuthModal(false);
    loadUserData();
  };

  // Onboarding Complete
  const handleOnboardingComplete = (updatedUser) => {
    setUser(updatedUser);
    setPet(updatedUser.pet);
    loadUserData();
  };

  // Task Creation
  const handleCreateTask = async (taskData) => {
    try {
      const res = await api.createTask(taskData);
      if (res.success) {
        if (res.timetable) {
          setUser((prev) => (prev ? { ...prev, weeklyTimetable: res.timetable } : prev));
        }
        await loadUserData();
      }
      return res;
    } catch (err) {
      console.error('Failed to create task:', err);
      throw err;
    }
  };

  // Task Deletion
  const handleDeleteTask = async (taskId, options = {}) => {
    try {
      const res = await api.deleteTask(taskId, options);
      if (res.success) {
        if (res.timetable) {
          setUser((prev) => (prev ? { ...prev, weeklyTimetable: res.timetable } : prev));
        }
        await loadUserData();
      }
      return res;
    } catch (err) {
      console.error('Failed to delete task:', err);
      throw err;
    }
  };

  // Task / Subject Toggle Complete
  const handleToggleTask = async (taskId, weekday) => {
    if (!taskId || taskId === 'undefined') return { success: false };
    try {
      const res = await api.toggleTask(taskId, weekday);
      if (res.success) {
        if (typeof res.userCoins === 'number') {
          setUser((prev) => (prev ? { ...prev, coins: res.userCoins } : prev));
        }
        if (res.timetable) {
          setUser((prev) => (prev ? { ...prev, weeklyTimetable: res.timetable } : prev));
        }
        await loadUserData();
      }
      return res;
    } catch (err) {
      console.error('Failed to toggle task:', err);
      throw err;
    }
  };

  // Timetable update from WeeklyPlanPage
  const handleTimetableUpdated = (updatedTimetable, updatedCoins) => {
    if (updatedTimetable) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              weeklyTimetable: updatedTimetable,
              ...(typeof updatedCoins === 'number' ? { coins: updatedCoins } : {}),
            }
          : prev
      );
    }
    loadUserData();
  };

  // Session Complete
  const handleSessionComplete = (res) => {
    if (res) {
      if (typeof res.userCoins === 'number') {
        setUser((prev) => (prev ? { ...prev, coins: res.userCoins } : prev));
      }
      if (res.timetable) {
        setUser((prev) => (prev ? { ...prev, weeklyTimetable: res.timetable } : prev));
      }
      if (res.user) {
        setUser(res.user);
      }
    }
    loadUserData();
  };

  // Pet Update
  const handlePetUpdate = (updatedPet, updatedCoins) => {
    setPet(updatedPet);
    setUser((prev) => ({
      ...prev,
      coins: updatedCoins,
      pet: updatedPet,
    }));
  };

  // User Update (e.g. from shop or settings)
  const handleUserUpdate = (updatedUserOrCoins, updatedInventory) => {
    if (typeof updatedUserOrCoins === 'number') {
      setUser((prev) => ({
        ...prev,
        coins: updatedUserOrCoins,
        inventory: updatedInventory,
      }));
    } else if (updatedUserOrCoins) {
      setUser(updatedUserOrCoins);
    }
    loadUserData();
  };

  // Logout
  const handleLogout = () => {
    sounds.playClick();
    localStorage.removeItem('lifelevel_token');
    setUser(null);
    setPet(null);
    setTasks([]);
    setActiveTask(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6FAF7] dark:bg-[#0A0F0D] flex flex-col items-center justify-center text-[#0D1F17] dark:text-white">
        <div className="w-12 h-12 rounded-2xl bg-[#0D1F17] dark:bg-[#10B981] text-emerald-400 dark:text-[#06140D] flex items-center justify-center font-black text-2xl shadow-sm mb-4 animate-bounce">
          🌱
        </div>
        <h2 className="text-lg font-black tracking-tight">Padhaku Billa</h2>
        <p className="text-xs text-[#4A5B53] dark:text-[#94A3B8] mt-1 font-medium">
          Waking up Sparky and checking streaks...
        </p>
      </div>
    );
  }

  // --- PUBLIC LANDING VIEW IF NOT LOGGED IN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6FAF7] dark:bg-[#0A0F0D] text-[#0D1F17] dark:text-white flex flex-col transition-colors">
        {/* Minimal Navigation */}
        <nav className="p-6 max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B3B2F] text-[#DCEFE3] flex items-center justify-center font-black text-xl shadow-sm">
              🌱
            </div>
            <span className="text-xl font-black tracking-tight">Padhaku Billa</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                sounds.playClick();
                setShowAuthModal(true);
              }}
              className="px-4 py-2 text-xs font-bold text-[#576560] dark:text-[#9EB5AB] hover:text-[#1C2A24] dark:hover:text-white transition cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setShowOnboardingModal(true);
              }}
              className="bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-sm transition cursor-pointer"
            >
              Start Free
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center justify-center">
       

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#1C2A24] dark:text-[#F2F7F4] leading-tight">
            Focus deeply. Build discipline.{' '}
            <span className="text-[#2B5A52] dark:text-[#A3D9C9]">Care for Sparky.</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg font-bold text-[#D97724] dark:text-[#F59E0B] tracking-wide">
            “Honest with yourself. I track your time, not your lies.👀”
          </p>

          <p className="mt-2 text-sm sm:text-base text-[#576560] dark:text-[#8BA398] max-w-2xl font-medium leading-relaxed">
            A calm, minimal productivity web app designed to boost consistency through customizable reset times, an interactive 2D cartoon cat, and honest progress tracking.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                sounds.playClick();
                setShowAuthModal(true);
              }}
              className="flex items-center space-x-2.5 bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] px-7 py-3.5 rounded-2xl font-black text-sm shadow-sm transition-all transform hover:scale-105 cursor-pointer"
            >
              <GoogleLogo className="w-5 h-5" />
              <span>CONTINUE WITH GOOGLE</span>
            </button>

            
          </div>

          {/* 3 Pillars Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full text-left">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm">
              <span className="text-2xl block mb-2">🐾</span>
              <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                Interactive 2D Mascot Pet
              </h3>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1.5 leading-relaxed">
                Feed, hydrate, cuddle Sparky, and equip unlocked hats and glasses. When you focus, Sparky studies alongside you.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm">
              <span className="text-2xl block mb-2">🔥</span>
              <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                Night-Friendly Daily Streaks
              </h3>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1.5 leading-relaxed">
                Configurable study day reset time (e.g. 6 AM). Overnight study sessions never break your streak at midnight.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm">
              <span className="text-2xl block mb-2">📅</span>
              <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                Weekly Subject Timetable
              </h3>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1.5 leading-relaxed">
                Schedule distinct subjects and targets for each day of the week with 18 vibrant accessible colors.
              </p>
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          onSwitchToSignup={() => setShowOnboardingModal(true)}
        />

        {/* Public Onboarding Modal (Starts at Step 1: Email) */}
        {showOnboardingModal && (
          <OnboardingModal
            user={null}
            onComplete={(newUser) => {
              setShowOnboardingModal(false);
              handleAuthSuccess(newUser);
            }}
            onCancel={() => setShowOnboardingModal(false)}
          />
        )}
      </div>
    );
  }

  // --- LOGGED IN MULTI-PAGE APPLICATION ---
  const restDayActive = isRestDayToday();

  return (
    <div className="min-h-screen bg-[#F6FAF7] dark:bg-[#0A0F0D] text-[#0D1F17] dark:text-white flex flex-col md:flex-row transition-colors duration-200">
      {/* 1. Desktop Left Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={navigateTo}
        user={user}
        pet={pet}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
      />

      {/* 2. Main Workspace Body */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <TopHeader
          user={user}
          isRestDayToday={restDayActive}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          soundMuted={soundMuted}
          onToggleSound={handleToggleSound}
          onLogout={handleLogout}
          onOpenShop={() => navigateTo('rewards')}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          {activePage === 'home' && (
            <HomePage
              user={user}
              pet={pet}
              tasks={tasks}
              onNavigate={navigateTo}
              onPetUpdate={handlePetUpdate}
              onSelectTaskToFocus={(task) => setActiveTask(task)}
              onStartFocusSubject={(subject) => {
                setFocusedSubject(subject);
                navigateTo('focus');
              }}
              onToggleTask={handleToggleTask}
              isRestDayToday={restDayActive}
            />
          )}

          {activePage === 'focus' && (
            <FocusPage
              tasks={tasks}
              activeTask={activeTask}
              onSelectTask={(task) => setActiveTask(task)}
              onSessionComplete={handleSessionComplete}
              onNavigate={navigateTo}
              userCoins={user?.coins || 0}
              allDailyTasksCompletedToday={tasksSummary?.allCompletedToday}
              user={user}
              pet={pet}
              initialSubject={focusedSubject}
              onUserUpdate={handleUserUpdate}
              onTimerRunningChange={setIsFocusTimerRunning}
              onReload={loadUserData}
            />
          )}

          {activePage === 'timetable' && (
            <WeeklyPlanPage
              user={user}
              onNavigate={navigateTo}
              onStartFocusSubject={(subject) => {
                setFocusedSubject(subject);
                navigateTo('focus');
              }}
              onTimetableUpdated={handleTimetableUpdated}
              onDeleteTask={handleDeleteTask}
              isRestDayToday={restDayActive}
            />
          )}

          {activePage === 'quests' && (
            <QuestsPage
              tasks={tasks}
              user={user}
              weeklyTimetable={user?.weeklyTimetable}
              onToggleTask={handleToggleTask}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onSelectTaskToFocus={(task) => setActiveTask(task)}
              onNavigate={navigateTo}
              globalStreak={user?.streaks?.currentGlobalStreak || 0}
              isRestDayToday={restDayActive}
            />
          )}

          {activePage === 'pet' && (
            <PetCarePage
              user={user}
              pet={pet}
              onPetUpdate={handlePetUpdate}
              onNavigate={navigateTo}
              isRestDayToday={restDayActive}
            />
          )}

          {activePage === 'progress' && (
            <ProgressPage user={user} onReload={loadUserData} />
          )}

          {activePage === 'leaderboard' && (
            <LeaderboardPage
              user={user}
              onNavigate={navigateTo}
            />
          )}

          {activePage === 'rewards' && (
            <RewardsPage
              user={user}
              pet={pet}
              onUserUpdate={handleUserUpdate}
              onNavigate={navigateTo}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              user={user}
              onUserUpdate={handleUserUpdate}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              soundMuted={soundMuted}
              onToggleSound={handleToggleSound}
              onLogout={handleLogout}
              onNavigate={navigateTo}
            />
          )}
        </main>

        {/* 3. Mobile Bottom Navigation */}
        <BottomNav
          activePage={activePage}
          onNavigate={navigateTo}
        />
      </div>

      {/* Onboarding Wizard Modal if not finished */}
      {user && !user.hasCompletedOnboarding && (
        <OnboardingModal user={user} onComplete={handleOnboardingComplete} />
      )}

      {/* Focus Mode Navigation Lock Modal (Requirement 3) */}
      {showFocusNavBlockedModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowFocusNavBlockedModal(false)}
        >
          <div
            className="bg-[#FAF8F5] dark:bg-[#162420] border-2 border-[#1B3B2F] dark:border-[#34D399] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5EE] dark:bg-[#1C2E29] border border-[#C8E6D5] dark:border-[#2B5246] flex items-center justify-center text-3xl mx-auto shadow-sm">
              👀
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
                Focus mode is active! 👀
              </h3>
              <p className="text-xs sm:text-sm text-[#576560] dark:text-[#9EB5AB] leading-relaxed font-medium">
                Pause your timer before exploring other pages. Your progress will be saved, and you can resume whenever you're ready.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowFocusNavBlockedModal(false)}
                className="w-full sm:w-auto flex-1 px-5 py-3 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white font-black text-xs shadow-sm transition transform hover:scale-105 cursor-pointer"
              >
                Stay in Focus
              </button>
              <button
                type="button"
                onClick={() => setShowFocusNavBlockedModal(false)}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] text-[#576560] dark:text-[#8BA398] font-bold text-xs hover:bg-white dark:hover:bg-[#1C2E29] transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
