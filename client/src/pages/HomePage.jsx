import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Flame,
  Coins,
  Heart,
  Cookie,
  Droplet,
  Play,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Smile,
  Clock,
  TrendingUp,
  HelpCircle,
  Zap,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { PetDisplay2D } from '../components/Sparky3DScene.jsx';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import { getStudyDayKey, getStudyDayDate, formatResetTimeDisplay } from '../utils/dateUtils.js';
import { getSubjectColor, getSubjectBadgeStyle } from '../utils/subjectColors.js';
import { FocusLevelCard } from '../components/FocusLevelCard.jsx';
import { formatTimerHMS } from './FocusPage.jsx';

export const HomePage = ({
  user,
  pet,
  tasks = [],
  onNavigate,
  onPetUpdate,
  onSelectTaskToFocus,
  onStartFocusSubject,
  onToggleTask,
  isRestDayToday = false,
}) => {
  const [petActionState, setPetActionState] = useState('idle');
  const [petActionProgress, setPetActionProgress] = useState(0);
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [timetable, setTimetable] = useState(user?.weeklyTimetable || null);

  // Analytics for Smart Progress & 30-Day Outlook
  const [analytics, setAnalytics] = useState(null);
  const [unfinishedSession, setUnfinishedSession] = useState(null);
  const [dismissedUnfinishedSession, setDismissedUnfinishedSession] = useState(false);

  useEffect(() => {
    api.getAnalyticsDashboard()
      .then((res) => {
        if (res.success) setAnalytics(res);
      })
      .catch(() => {});

    api.getWeeklyTimetable()
      .then((res) => {
        if (res.success && res.timetable) {
          setTimetable(res.timetable);
        }
      })
      .catch(() => {});

    api.getActiveSessions()
      .then((res) => {
        if (res && res.success && Array.isArray(res.activeSessions) && res.activeSessions.length > 0) {
          setUnfinishedSession(res.activeSessions[0]);
        }
      })
      .catch(() => {});
  }, [user]);

  const globalStreak = user?.streaks?.currentGlobalStreak || 0;
  const userCoins = user?.coins || 0;
  const isPetAlive = pet?.isAlive !== false && (pet?.health ?? 100) > 0;
  const isIntroMode = !pet?.hasCompletedIntroCare && (pet?.hunger === 0 || pet?.thirst === 0);

  // 1-Click Feed Action
  const handleQuickFeed = async () => {
    if (actionLoading || petActionState === 'eating' || petActionState === 'drinking') return;

    if (!isIntroMode && userCoins < 2) {
      sounds.playPausePenalty();
      setActionFeedback('Need 2 coins to feed! Complete a focus task first.');
      return;
    }
    if (!isPetAlive) {
      sounds.playPausePenalty();
      setActionFeedback('Sparky has fainted! Please revive Sparky in Pet Care.');
      return;
    }

    try {
      setActionLoading(true);
      sounds.playFeedPet();
      setPetActionState('eating');
      setPetActionProgress(0.15);

      const interval = setInterval(() => {
        setPetActionProgress((prev) => {
          if (prev >= 1) {
            clearInterval(interval);
            return 1;
          }
          return prev + 0.25;
        });
      }, 450);

      const res = await api.feedPet();
      if (res.success) {
        sounds.playHappyPurr();
        setActionFeedback('Sparky loved the berry snack! (+30 Hunger, +12 Vitality, +6 Affection)');
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
      }
    } catch (err) {
      setActionFeedback(err.message);
      setPetActionState('idle');
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Water Action
  const handleQuickWater = async () => {
    if (actionLoading || petActionState === 'eating' || petActionState === 'drinking') return;

    if (!isIntroMode && userCoins < 1) {
      sounds.playPausePenalty();
      setActionFeedback('Need 1 coin for water! Complete a focus task first.');
      return;
    }
    if (!isPetAlive) {
      sounds.playPausePenalty();
      setActionFeedback('Sparky has fainted! Please revive Sparky in Pet Care.');
      return;
    }

    try {
      setActionLoading(true);
      sounds.playWaterPet();
      setPetActionState('drinking');
      setPetActionProgress(0.15);

      const interval = setInterval(() => {
        setPetActionProgress((prev) => {
          if (prev >= 1) {
            clearInterval(interval);
            return 1;
          }
          return prev + 0.25;
        });
      }, 450);

      const res = await api.waterPet();
      if (res.success) {
        sounds.playHappyPurr();
        setActionFeedback('Refreshing! Sparky drank clean spring water! (+35 Hydration, +10 Vitality, +5 Affection)');
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
      }
    } catch (err) {
      setActionFeedback(err.message);
      setPetActionState('idle');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Introductory Care
  const handleCompleteIntroCare = async () => {
    try {
      sounds.playTimerComplete();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#1B3B2F', '#D97724', '#2B5A52', '#A3D9C9'],
      });
      const res = await api.completeIntroCare();
      if (res.success && onPetUpdate) {
        onPetUpdate(res.pet, res.coins);
      }
    } catch (e) {}
  };

  // Pet Click Reaction
  const handlePetClick = async () => {
    sounds.playHappyPurr();
    setPetActionState('happy');
    try {
      const res = await api.playWithPet();
      if (res.success && onPetUpdate) {
        onPetUpdate(res.pet, res.coins);
      }
    } catch (e) {}

    setTimeout(() => {
      setPetActionState('idle');
    }, 1600);
  };

  const resetTime = user?.dailyResetTime || '00:00';
  const studyDayKey = getStudyDayKey(new Date(), resetTime);
  const todaySubjects = timetable?.[studyDayKey] || [];
  const completedSubjectsCount = todaySubjects.filter((s) => s.completedToday).length;
  const nextSubject = todaySubjects.find((s) => !s.completedToday) || null;

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  const handleToggleSubject = async (subjectId) => {
    if (!subjectId) return;
    sounds.playClick();
    setTimetable((prev) => {
      if (!prev || !prev[studyDayKey]) return prev;
      return {
        ...prev,
        [studyDayKey]: prev[studyDayKey].map((s) =>
          (s._id === subjectId || s.id === subjectId)
            ? { ...s, completedToday: !s.completedToday }
            : s
        ),
      };
    });

    try {
      let res;
      if (onToggleTask) {
        res = await onToggleTask(subjectId, studyDayKey);
      } else {
        res = await api.toggleTimetableSubject(studyDayKey, subjectId);
      }

      if (res?.success) {
        if (res.timetable) {
          setTimetable(res.timetable);
        }
        if (res.completed) {
          confetti({ particleCount: 35, spread: 55, origin: { y: 0.7 } });
          sounds.playCompleteTask();
        }
      }
    } catch (err) {
      console.error('Failed to toggle timetable subject:', err);
    }
  };

  const equippedAccessory = user?.inventory?.equippedAccessory || 'none';
  const equippedHat = user?.inventory?.equippedHat || 'none';
  const equippedGlasses = user?.inventory?.equippedGlasses || 'none';
  const equippedNeckwear = user?.inventory?.equippedNeckwear || 'none';
  const equippedOutfit = user?.inventory?.equippedOutfit || 'none';
  const equippedHabitat = user?.inventory?.equippedHabitat || 'forest_meadow';

  const completedCount = tasks.filter((t) => t.completedToday).length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Rest Day Shield Notice */}
      {isRestDayToday && (
        <div className="bg-[#E8F5EE] dark:bg-[#162420] border border-[#C8E6D5] dark:border-[#2B5246] rounded-3xl p-4 flex items-center space-x-3 text-xs text-[#1B3B2F] dark:text-[#A3D9C9]">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <p>
            <strong>Official Rest Day:</strong> Streaks are frozen, Sparky’s hunger decay is 0%, and tasks are optional with zero penalties.
          </p>
        </div>
      )}

      {/* --- UNFINISHED FOCUS SESSION CARD (SECTION 4 & 8) --- */}
      {unfinishedSession && !dismissedUnfinishedSession && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#132822] dark:to-[#173029] border-2 border-[#1B3B2F] dark:border-[#34D399] rounded-3xl p-6 sm:p-7 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#C8E6D5] dark:border-[#203D34]">
            <div className="flex items-center space-x-3">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: unfinishedSession.colorTag || '#3B82F6' }}
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1B3B2F] text-white">
                    Unfinished Focus Quest
                  </span>
                  <span className="text-xs text-[#576560] dark:text-[#8BA398] font-bold">
                    {unfinishedSession.status === 'paused' ? 'Paused' : 'In Progress'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] mt-0.5">
                  {unfinishedSession.taskName}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setDismissedUnfinishedSession(true)}
                className="px-3.5 py-1.5 rounded-xl border border-[#C8E6D5] dark:border-[#253D34] text-xs font-bold text-[#576560] dark:text-[#8BA398] hover:bg-white/60 dark:hover:bg-[#1C2E29] transition cursor-pointer"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  if (onStartFocusSubject) {
                    onStartFocusSubject({
                      id: unfinishedSession.subjectId,
                      name: unfinishedSession.taskName,
                      color: unfinishedSession.colorTag,
                      targetMinutes: unfinishedSession.durationMinutes,
                      sessionId: unfinishedSession._id,
                    });
                  } else {
                    onNavigate('focus');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-black transition shadow-sm cursor-pointer flex items-center space-x-1.5 transform hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Focus</span>
              </button>
            </div>
          </div>

          {/* 3 Metric Grid: Today's Goal, Focused Time, Remaining Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162420] border border-[#C8E6D5] dark:border-[#253D35]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                Today's Goal
              </span>
              <span className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4] font-mono">
                {formatTimerHMS(unfinishedSession.totalGoalSeconds || unfinishedSession.durationMinutes * 60)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162420] border border-[#C8E6D5] dark:border-[#253D35]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                Today's Focus
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatTimerHMS(unfinishedSession.actualSeconds || unfinishedSession.accumulatedSeconds || 0)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162420] border border-[#C8E6D5] dark:border-[#253D35]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                Remaining Time
              </span>
              <span className="text-base font-black text-[#D97724] dark:text-[#F59E0B] font-mono">
                {formatTimerHMS(Math.max(0, (unfinishedSession.totalGoalSeconds || unfinishedSession.durationMinutes * 60) - (unfinishedSession.actualSeconds || unfinishedSession.accumulatedSeconds || 0)))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- INTRODUCTORY CARE MOMENT (FOR NEW USERS) --- */}
      {isIntroMode && (
        <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] dark:from-[#2B2312] dark:to-[#382B14] border border-[#F59E0B]/40 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D97724] text-white text-[11px] font-bold">
               
                <span>First Arrival Care Moment</span>
              </div>
              <h3 className="text-xl font-black text-[#1C2A24] dark:text-[#FAF8F5] tracking-tight">
                Sparky just arrived and needs your care!
              </h3>
              <p className="text-xs text-[#78350F] dark:text-[#FDE68A] max-w-xl font-medium leading-relaxed">
                Provide food and fresh spring water to nourish your companion. Once Sparky is fed and hydrated, you’ll unlock your daily focus tasks!
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleQuickFeed}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-2xl bg-[#1B3B2F] text-white text-xs font-bold hover:bg-[#142C23] shadow-sm transition cursor-pointer flex items-center space-x-1.5"
              >
                <Cookie className="w-4 h-4 text-[#D97724] fill-current" />
                <span>Feed Berry Meal (Free)</span>
              </button>
              <button
                onClick={handleQuickWater}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#D97724]/40 text-xs font-bold hover:bg-[#FAF8F5] transition cursor-pointer flex items-center space-x-1.5"
              >
                <Droplet className="w-4 h-4 text-[#38bdf8] fill-current" />
                <span>Give Water (Free)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HERO 3D PET SHOWCASE CARD --- */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all">
        {/* Top Pet Status Pill & Mood */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-xl shadow-sm">
              🐾
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
                Sparky the Companion
              </h2>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium">
                {isPetAlive
                  ? petActionState === 'eating'
                    ? 'Eating delicious berries at the food bowl...'
                    : petActionState === 'drinking'
                    ? 'Drinking fresh water from the dish...'
                    : petActionState === 'happy'
                    ? 'Super happy & purring cheerfully!'
                    : (pet?.hunger ?? 100) < 30
                    ? 'Feeling a bit hungry...'
                    : (pet?.thirst ?? 100) < 30
                    ? 'Feeling a bit thirsty...'
                    : 'Calm, curious, and exploring the room.'
                  : 'Fainted from neglect! Revive with Elixir in Pet Care.'}
              </p>
            </div>
          </div>

          {/* Compact Needs Indicators */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] text-[#E06D53]">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>{pet?.health ?? 35}% Vitality</span>
            </div>
            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] text-[#D97724] dark:text-[#F59E0B]">
              <Cookie className="w-3.5 h-3.5 fill-current" />
              <span>{pet?.hunger ?? 0}% Hunger</span>
            </div>
            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] text-[#0284c7]">
              <Droplet className="w-3.5 h-3.5 fill-current" />
              <span>{pet?.thirst ?? 0}% Thirst</span>
            </div>
          </div>
        </div>

        {/* Interactive 2D Mascot Pet Scene - FIXED BACKGROUND & REMOVED THOUGHT BUBBLE */}
        <div className="relative my-4 rounded-2xl bg-white overflow-hidden flex items-center justify-center shadow-sm">
          <PetDisplay2D
            actionState={petActionState}
            actionProgress={petActionProgress}
            accessory={equippedAccessory}
            equippedHat={equippedHat}
            equippedGlasses={equippedGlasses}
            equippedNeckwear={equippedNeckwear}
            equippedOutfit={equippedOutfit}
            habitat={equippedHabitat}
            health={pet?.health ?? 100}
            hunger={pet?.hunger ?? 100}
            thirst={pet?.thirst ?? 100}
            onPetClick={handlePetClick}
            onActionComplete={() => setPetActionState('idle')}
            className="w-full h-80 sm:h-96 object-cover"
          />
        </div>

        {/* 1-Tap Pet Actions Bar right below 2D Pet */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[#EAE5DD] dark:border-[#253D35]">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleQuickFeed}
              disabled={actionLoading || !isPetAlive}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246] hover:bg-[#D5EBDD] transition cursor-pointer disabled:opacity-50"
            >
              <Cookie className="w-4 h-4 text-[#D97724] fill-current" />
              <span>Feed Sparky ({isIntroMode ? 'Free' : '2 Coins'})</span>
            </button>

            <button
              onClick={handleQuickWater}
              disabled={actionLoading || !isPetAlive}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246] hover:bg-[#D5EBDD] transition cursor-pointer disabled:opacity-50"
            >
              <Droplet className="w-4 h-4 text-[#38bdf8] fill-current" />
              <span>Give Water ({isIntroMode ? 'Free' : '1 Coin'})</span>
            </button>
          </div>

      
        </div>

        {actionFeedback && (
          <div className="mt-3 text-xs bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246] px-3.5 py-2 rounded-2xl text-center">
            {actionFeedback}
          </div>
        )}
      </div>

      {/* --- PROMINENT "START FOCUS" PRIMARY ACTION --- */}
      <div className="bg-[#1B3B2F] text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-xs font-bold text-[#A3D9C9] uppercase tracking-wider">
            Deep Focus Block
          </span>
          <h3 className="text-2xl font-black tracking-tight text-[#FAF8F5]">
            Start Focus Session
          </h3>
          <p className="text-xs text-[#DCEFE3]/80 leading-relaxed max-w-md">
            Earn +5 coins for completed blocks. Pausing costs 1 coin. Complete all daily tasks for +5 extra bonus coins.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onNavigate('focus');
          }}
          className="flex items-center space-x-2.5 bg-[#DCEFE3] hover:bg-[#C8E6D5] text-[#1B3B2F] px-8 py-4 rounded-2xl text-sm font-black shadow-sm transition-all transform hover:scale-105 cursor-pointer flex-shrink-0"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>START FOCUS NOW</span>
        </button>
      </div>

      {/* --- TODAY'S FOCUS QUESTS (UNIFIED FROM WEEKLY PLAN) --- */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#1B3B2F] dark:text-[#A3D9C9]" />
              <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
                Today's Focus Tasks
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9]">
                {dayNames[studyDayKey]}
              </span>
            </div>
            <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-0.5">
              {todaySubjects.length > 0
                ? `${completedSubjectsCount} of ${todaySubjects.length} completed • Reset boundary: ${formatResetTimeDisplay(resetTime)}`
                : `No specific tasks scheduled for ${dayNames[studyDayKey]}. Flexible study day!`}
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => {
                sounds.playClick();
                onNavigate('quests');
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-[#FAF8F5] transition cursor-pointer"
            >
              <span>Manage Tasks</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onNavigate('timetable');
              }}
              className="flex items-center space-x-1 text-xs font-bold text-[#1B3B2F] dark:text-[#A3D9C9] hover:underline cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Weekly Plan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Up Next Study Task Callout */}
        {nextSubject && (
          <div
            className="mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
            style={{
              backgroundColor: `${getSubjectColor(nextSubject.color).hex}10`,
              borderColor: `${getSubjectColor(nextSubject.color).hex}35`,
            }}
          >
            <div className="flex items-center space-x-3">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: getSubjectColor(nextSubject.color).hex }}
              />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                  Next Study Task
                </span>
                <span className="text-sm font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                  {nextSubject.name}
                </span>
                <span className="text-xs text-[#576560] dark:text-[#8BA398] ml-2">
- 
{nextSubject.targetMinutes || 25} min target
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                if (onStartFocusSubject) {
                  onStartFocusSubject(nextSubject);
                } else {
                  onNavigate('focus');
                }
              }}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: getSubjectColor(nextSubject.color).hex }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Focus This Subject</span>
            </button>
          </div>
        )}

        {/* Today's Subjects List */}
        <div className="mt-4 space-y-2.5">
          {todaySubjects.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29]/40 border border-[#EAE5DD] dark:border-[#253D35] text-xs space-y-2">
              <p className="text-[#576560] dark:text-[#8BA398]">
                You haven't scheduled any subjects for {dayNames[studyDayKey]} yet.
              </p>
              <button
                onClick={() => onNavigate('timetable')}
                className="px-4 py-2 rounded-xl bg-[#1B3B2F] text-white font-bold text-xs hover:bg-[#142C23] transition cursor-pointer"
              >
                + Plan Subjects for {dayNames[studyDayKey]}
              </button>
            </div>
          ) : (
            todaySubjects.map((sub) => {
              const colorInfo = getSubjectColor(sub.color);
              const isCompleted = !!sub.completedToday;
              return (
                <div
                  key={sub._id || sub.id}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                    isCompleted
                      ? 'border-[#C8E6D5] dark:border-[#2B5246] bg-[#E8F5EE]/40 dark:bg-[#162420]/60'
                      : 'border-[#EAE5DD] dark:border-[#253D35] bg-[#FAF8F5]/60 dark:bg-[#1C2E29]/60 hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggleSubject(sub._id || sub.id)}
                      className="cursor-pointer text-[#1B3B2F] dark:text-[#A3D9C9] hover:scale-110 transition p-0.5"
                      title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[#10b981] fill-current" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#8A9791] hover:text-[#1B3B2F]" />
                      )}
                    </button>

                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0"
                      style={{ backgroundColor: colorInfo.hex }}
                    />

                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isCompleted
                            ? 'line-through text-[#8A9791]'
                            : 'text-[#1C2A24] dark:text-[#F2F7F4]'
                        }`}
                      >
                        {sub.name}
                      </h4>
                      <div className="flex items-center space-x-2 text-[11px] text-[#576560] dark:text-[#8BA398]">
                        <span>{sub.targetMinutes || 25}m target • {colorInfo.name}</span>
                        <span className="inline-flex items-center space-x-0.5 text-[#D97724] dark:text-[#F59E0B] font-bold">
                          <Flame className="w-3 h-3 fill-current" />
                          <span>{sub.currentStreak || 0}d streak</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isCompleted ? (
                      <span className="text-xs font-bold text-[#10b981] bg-[#10b981]/10 px-2.5 py-1 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          sounds.playClick();
                          if (onStartFocusSubject) {
                            onStartFocusSubject(sub);
                          } else {
                            onNavigate('focus');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] hover:bg-[#FAF8F5] transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                      >
                        <Play className="w-3 h-3 text-[#1B3B2F] dark:text-[#A3D9C9] fill-current" />
                        <span>Focus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Timetable Subtext */}
       


      </div>

    </div>
  );
};