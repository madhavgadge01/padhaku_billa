import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  Square,
  Coins,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  ChevronDown,
  Tag,
  Bell,
  BellOff
} from 'lucide-react';
import { PetDisplay2D } from '../components/Sparky3DScene.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';
import { getStudyDayKey, getStudyDayDate, formatResetTimeDisplay } from '../utils/dateUtils.js';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';

export const formatTimerHMS = (totalSeconds) => {
  const totalSecs = Math.max(0, Math.floor(totalSeconds || 0));
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  return `${h} H : ${m} M : ${s} S`;
};

export const formatMMSS = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
};

export const FocusPage = ({
  user,
  pet,
  tasks = [],
  activeTask,
  onSelectTask,
  onSessionComplete,
  onNavigate,
  userCoins = 0,
  initialSubject = null,
  onUserUpdate,
  onTimerRunningChange,
}) => {
  const resetTime = user?.dailyResetTime || '06:00';
  const todayKey = getStudyDayKey(new Date(), resetTime);
  const todayDateStr = getStudyDayDate(new Date(), resetTime);

  // Helper to get permanent vs effective goal for a subject
  const getPermanentGoalMinutes = (subject) => {
    if (!subject) return activeTask?.durationMinutes || 25;
    return subject.targetMinutes || 45;
  };

  const getEffectiveGoalMinutes = (subject) => {
    if (!subject) return activeTask?.durationMinutes || 25;
    const subId = subject.id || subject._id;
    const cleanName = (subject.name || '').trim().toLowerCase();
    const overrides = user?.dailyGoalOverrides || [];
    const match = overrides.find(
      (o) =>
        o.dateStr === todayDateStr &&
        ((subId && (String(o.subjectId) === String(subId) || o.subjectId === subId)) ||
          (cleanName && o.subjectName && o.subjectName.trim().toLowerCase() === cleanName))
    );
    if (match && typeof match.targetMinutes === 'number') {
      return match.targetMinutes;
    }
    return subject.targetMinutes || 45;
  };

  // Timer modes: 'focus' (25/45/60 min), 'shortBreak' (5 min), 'longBreak' (15 min)
  const [timerMode, setTimerMode] = useState('focus');

  // Timetable integration
  const [timetableToday, setTimetableToday] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  // Duration & Tracking
  const [customMinutes, setCustomMinutes] = useState(activeTask ? activeTask.durationMinutes : 25);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pauseCount, setPauseCount] = useState(0);
  const [completedSessionId, setCompletedSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const startSessionPromiseRef = useRef(null);

  // 1. Total Accumulated focus time in current focus session / today
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const accumulatedElapsedRef = useRef(0);

  // 2. Verified focus time in the current resume-to-break interval (Threshold: 25 mins = 1500s)
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  const intervalElapsedRef = useRef(0);

  // Active elapsed segment timestamp tracking
  const activeSegmentStartRef = useRef(null);

  // Remaining time in seconds (counts down toward daily goal)
  const [timeLeft, setTimeLeft] = useState(customMinutes * 60);
  const [totalSeconds, setTotalSeconds] = useState(customMinutes * 60);
  const timerRef = useRef(null);
  const isCompletingRef = useRef(false);

  // Notify parent of genuine active running state for centralized navigation guard
  const isActivelyRunning = isRunning && !isPaused;
  useEffect(() => {
    if (typeof onTimerRunningChange === 'function') {
      onTimerRunningChange(isActivelyRunning);
    }
  }, [isActivelyRunning, onTimerRunningChange]);

  // Inline Timer Editing State
  const [activeEditField, setActiveEditField] = useState(null); // 'h', 'm', 's' or null
  const [inputValue, setInputValue] = useState('');

  // Alarm & authoritative completion state
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [completionError, setCompletionError] = useState(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Pet action state for Focus Screen: 'idle' | 'studying' | 'happy'
  const [petFocusState, setPetFocusState] = useState('idle');

  // Break Confirmation Modal State (Before 25 Minutes)
  const [showBreakConfirmation, setShowBreakConfirmation] = useState(false);

  // 5-Second Countdown Modal State (Start & Resume)
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [countdownAction, setCountdownAction] = useState('start'); // 'start' | 'resume'
  const [countdownValue, setCountdownValue] = useState(5);
  const countdownTimerRef = useRef(null);

  // Check if active subject has an override today
  const isOverriddenToday = Boolean(
    user?.dailyGoalOverrides?.some((o) => {
      if (o.dateStr !== todayDateStr) return false;
      const subId = selectedSubject?.id || selectedSubject?._id || activeTask?._id;
      const cleanName = (selectedSubject?.name || activeTask?.name || '').trim().toLowerCase();
      return (
        (subId && String(o.subjectId) === String(subId)) ||
        (cleanName && o.subjectName && o.subjectName.trim().toLowerCase() === cleanName)
      );
    })
  );

  const permanentMins = selectedSubject
    ? getPermanentGoalMinutes(selectedSubject)
    : activeTask?.durationMinutes || 25;

  // Reconcile and recover any active/unfinished session for this user today
  useEffect(() => {
    api.reconcileSessions().catch(() => {});
  }, []);

  // Periodic heartbeat checkpoint (every 10s) to persist genuine focus progress
  useEffect(() => {
    if (!isRunning || isPaused || timerMode !== 'focus') return;

    const interval = setInterval(() => {
      const currId = sessionIdRef.current;
      if (currId) {
        const totalActual = accumulatedElapsedRef.current || 0;
        const currentInterval = intervalElapsedRef.current || 0;
        api.checkpointSession(currId, {
          actualSeconds: totalActual,
          intervalSeconds: currentInterval,
          closing: false,
        }).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, timerMode]);

  // Flush genuine focus time on page unload / tab switch / visibility change
  useEffect(() => {
    const flushActiveFocus = (isClosing = false) => {
      const currId = sessionIdRef.current;
      const token = localStorage.getItem('lifelevel_token');
      if (!currId || !token) return;

      const totalActual = accumulatedElapsedRef.current || 0;
      const currentInterval = intervalElapsedRef.current || 0;
      if (totalActual <= 0 && currentInterval <= 0) return;

      const payload = JSON.stringify({
        actualSeconds: totalActual,
        intervalSeconds: currentInterval,
        closing: isClosing,
      });
      // const url = `http://localhost:5001/api/pomodoro/${currId}/checkpoint?token=${encodeURIComponent(token)}`;


            const url = `https://tell-profession-reverse-optimum.trycloudflare.com/api/pomodoro/${currId}/checkpoint?token=${encodeURIComponent(token)}`;

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushActiveFocus(false);
      }
    };

    const handlePageHide = () => {
      flushActiveFocus(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, []);

  // Stop alarm and clean up timer on component unmount
  useEffect(() => {
    return () => {
      sounds.stopAlarm();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // Restore unfinished session for selected subject on mount or change
  const restoreSubjectProgress = (subject) => {
    if (!subject) return;
    const subId = subject.id || subject._id;
    const subName = (subject.name || '').trim().toLowerCase();
    const effMins = getEffectiveGoalMinutes(subject);
    const goalSecs = effMins * 60;

    api.getActiveSessions()
      .then((res) => {
        if (res && res.success && Array.isArray(res.activeSessions)) {
          // Look for an unfinished session matching this subject
          const match = res.activeSessions.find((s) => {
            const sid = s.subjectId;
            const sname = (s.taskName || '').trim().toLowerCase();
            return (subId && sid && String(sid) === String(subId)) || (sname && sname === subName);
          });

          if (match) {
            setSessionId(match._id);
            sessionIdRef.current = match._id;
            const acc = match.actualSeconds || match.accumulatedSeconds || 0;
            accumulatedElapsedRef.current = acc;
            setAccumulatedSeconds(acc);

            // Remaining seconds toward goal
            const remSecs = Math.max(0, goalSecs - acc);
            setTimeLeft(remSecs);
            setTotalSeconds(goalSecs);
            setCustomMinutes(effMins);

            // Recovered sessions are restored safely as paused ready to resume
            setIsRunning(false);
            setIsPaused(true);
            setPetFocusState('idle');
            // Every Resume starts a new 25-minute interval counter
            intervalElapsedRef.current = 0;
            setIntervalSeconds(0);
            return;
          }
        }

        // If no active session found, set fresh goal
        setTotalSeconds(goalSecs);
        setTimeLeft(goalSecs);
        setCustomMinutes(effMins);
        accumulatedElapsedRef.current = 0;
        setAccumulatedSeconds(0);
        intervalElapsedRef.current = 0;
        setIntervalSeconds(0);
        setIsRunning(false);
        setIsPaused(false);
        setPetFocusState('idle');
      })
      .catch(() => {
        setTotalSeconds(goalSecs);
        setTimeLeft(goalSecs);
        setCustomMinutes(effMins);
      });
  };

  // Sync initialSubject prop if passed from parent
  useEffect(() => {
    if (initialSubject && !isRunning) {
      setSelectedSubject(initialSubject);
      setSelectedColor(initialSubject.color || '#3B82F6');
      restoreSubjectProgress(initialSubject);
    }
  }, [initialSubject, user?.dailyGoalOverrides, todayDateStr]);

  // Load today's timetable subjects
  useEffect(() => {
    if (user?.weeklyTimetable && user.weeklyTimetable[todayKey]) {
      setTimetableToday(user.weeklyTimetable[todayKey]);
      if (!selectedSubject && user.weeklyTimetable[todayKey].length > 0) {
        const firstUnfinished =
          user.weeklyTimetable[todayKey].find(
            (s) => !s.completedDates?.includes(todayDateStr)
          ) || user.weeklyTimetable[todayKey][0];
        setSelectedSubject(firstUnfinished);
        setSelectedColor(firstUnfinished.color || '#3B82F6');
        restoreSubjectProgress(firstUnfinished);
      }
    } else {
      api.getWeeklyTimetable()
        .then((res) => {
          if (res.success && res.todaySchedule?.subjects) {
            setTimetableToday(res.todaySchedule.subjects);
            if (!selectedSubject && res.todaySchedule.subjects.length > 0) {
              const first = res.todaySchedule.subjects[0];
              setSelectedSubject(first);
              setSelectedColor(first.color || '#3B82F6');
              restoreSubjectProgress(first);
            }
          }
        })
        .catch(() => {});
    }
  }, [user, todayKey, todayDateStr]);

  // Sync with activeTask if selected externally
  useEffect(() => {
    if (!isRunning && activeTask && timerMode === 'focus' && !selectedSubject) {
      const mins = getEffectiveGoalMinutes(activeTask);
      setCustomMinutes(mins);
      setTimeLeft(mins * 60);
      setTotalSeconds(mins * 60);
      setSelectedColor(activeTask.colorTag || '#3B82F6');
    }
  }, [activeTask, timerMode, isRunning, selectedSubject]);

  // Mode Switcher
  const handleModeChange = (mode) => {
    if (isRunning) return;
    sounds.playClick();
    setTimerMode(mode);
    let mins = 25;
    if (mode === 'focus') {
      mins = selectedSubject
        ? getEffectiveGoalMinutes(selectedSubject)
        : activeTask
        ? getEffectiveGoalMinutes(activeTask)
        : 25;
      setPetFocusState('idle');
    }
    if (mode === 'shortBreak') {
      mins = 5;
      setPetFocusState('happy');
    }
    if (mode === 'longBreak') {
      mins = 15;
      setPetFocusState('sleeping');
    }
    setCustomMinutes(mins);
    setTimeLeft(mins * 60);
    setTotalSeconds(mins * 60);
    setPauseCount(0);
    setIsPaused(false);
  };

  // Timer loop - precise 1-second interval incrementing verified focus and interval time
  useEffect(() => {
    if (isRunning && !isPaused) {
      setPetFocusState(timerMode === 'focus' ? 'studying' : 'happy');
      timerRef.current = setInterval(() => {
        // Increment active focus elapsed time
        accumulatedElapsedRef.current = (accumulatedElapsedRef.current || 0) + 1;
        setAccumulatedSeconds((prev) => prev + 1);

        intervalElapsedRef.current = (intervalElapsedRef.current || 0) + 1;
        setIntervalSeconds((prev) => prev + 1);

        // Count down remaining time toward daily goal
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (isPaused) {
        setPetFocusState('idle');
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, timerMode]);

  // Natural countdown completion trigger
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft === 0 && !isCompletingRef.current) {
      handleComplete();
    }
  }, [timeLeft, isRunning, isPaused]);

  // Select Subject from Timetable or Custom
  const handleSelectSubject = (subject) => {
    sounds.playClick();
    setSelectedSubject(subject);
    setSelectedColor(subject.color || '#3B82F6');
    setShowSubjectMenu(false);
    restoreSubjectProgress(subject);
  };

  const handleSelectTaskFallback = (task) => {
    sounds.playClick();
    setSelectedSubject(null);
    if (onSelectTask) onSelectTask(task);
    setSelectedColor(task.colorTag || '#3B82F6');
    setShowSubjectMenu(false);
    restoreSubjectProgress(task);
  };

  // 1. Initiate 5-second countdown before Start OR Resume
  const handleStartOrResumeClick = (action = 'start') => {
    sounds.init();
    sounds.stopAlarm();
    setIsAlarmPlaying(false);
    setCompletionData(null);
    setCompletionError(null);
    isCompletingRef.current = false;

    setCountdownAction(action);
    setCountdownValue(5);
    setShowCountdownModal(true);
  };

  // 2. Countdown loop for the 5-second preparation modal
  useEffect(() => {
    if (!showCountdownModal) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setShowCountdownModal(false);
          if (countdownAction === 'resume') {
            executeResumeSession();
          } else {
            executeStartSession();
          }
          return 0;
        }
        sounds.playClick();
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [showCountdownModal, countdownAction]);

  // 4. Start fresh focus session
  const executeStartSession = () => {
    try {
      sounds.init();
      sounds.stopAlarm();
      setIsAlarmPlaying(false);
      setCompletionData(null);
      setCompletionError(null);
      isCompletingRef.current = false;

      const targetDurationSecs = customMinutes > 0 ? customMinutes * 60 : 25 * 60;
      if (!totalSeconds || totalSeconds <= 0) {
        setTotalSeconds(targetDurationSecs);
      }
      if (!timeLeft || timeLeft <= 0) {
        setTimeLeft(targetDurationSecs);
      }

      // Reset interval to 0 for a fresh 25-minute break eligibility interval
      intervalElapsedRef.current = 0;
      setIntervalSeconds(0);
      activeSegmentStartRef.current = Date.now();

      setIsRunning(true);
      setIsPaused(false);
      setPetFocusState(timerMode === 'focus' ? 'studying' : 'happy');
      sounds.playTimerStart();

      if (timerMode === 'focus') {
        const subjectTitle = selectedSubject?.name || activeTask?.name || customSubjectName || 'Focus Task';
        const subjectId = selectedSubject?.id || selectedSubject?._id || undefined;
        const payload = {
          taskId: activeTask?._id || undefined,
          subjectId: subjectId,
          subjectName: subjectTitle,
          colorTag: selectedColor,
          durationMinutes: customMinutes,
        };

        const startPromise = api.startSession(payload)
          .then((res) => {
            if (res && res.success && res.session) {
              setSessionId(res.session._id);
              sessionIdRef.current = res.session._id;
              return res.session._id;
            }
            return null;
          })
          .catch((err) => {
            console.warn('Backend startSession notice (timer continuing locally):', err?.message || err);
            return null;
          });
        startSessionPromiseRef.current = startPromise;
      }
    } catch (err) {
      console.error('Failed to start timer:', err);
      setIsRunning(true);
      setIsPaused(false);
      setPetFocusState(timerMode === 'focus' ? 'studying' : 'happy');
    }
  };

  // 5. Resume focus session: Every Resume starts a new 25-minute interval
  const executeResumeSession = () => {
    try {
      sounds.init();
      sounds.playClick();
      sounds.stopAlarm();
      setIsAlarmPlaying(false);

      intervalElapsedRef.current = 0;
      setIntervalSeconds(0);
      activeSegmentStartRef.current = Date.now();

      setIsRunning(true);
      setIsPaused(false);
      setPetFocusState(timerMode === 'focus' ? 'studying' : 'happy');
      sounds.playTimerStart();

      const currId = sessionIdRef.current || sessionId;
      if (currId) {
        api.resumeSession(currId).catch((err) => {
          console.warn('Backend resume sync notice:', err?.message || err);
        });
      }
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  // 6. User clicks Break / Pause button
  const handleBreakButtonClick = () => {
    if (!isRunning || isPaused) return;

    // Check if user has completed >= 25 minutes (1500 seconds) in the current interval
    const currentIntervalSecs = intervalElapsedRef.current || 0;
    if (currentIntervalSecs < 1500) {
      // Early break (< 25m): Show confirmation dialog
      setShowBreakConfirmation(true);
    } else {
      // Penalty-free break (>= 25m): Pause immediately without dialog or penalty
      executePauseSession(false);
    }
  };

  // 7. User confirms early break in dialog
  const handleConfirmEarlyBreak = () => {
    setShowBreakConfirmation(false);
    executePauseSession(true);
  };

  // 8. Execute actual pause action on backend & local timer
  const executePauseSession = (isEarlyConfirmed = false) => {
    try {
      if (isEarlyConfirmed) {
        sounds.playPausePenalty();
      } else {
        sounds.playClick();
      }

      setIsRunning(false);
      setIsPaused(true);
      setPetFocusState('idle');
      activeSegmentStartRef.current = null;

      const currId = sessionIdRef.current || sessionId;
      const intervalSecs = intervalElapsedRef.current || 0;
      const totalActual = accumulatedElapsedRef.current || 0;

      if (currId) {
        const actionId = `break_${currId}_${Date.now()}_${intervalSecs}`;
        api.pauseSession(currId, {
          actionId,
          intervalSeconds: intervalSecs,
          actualSeconds: totalActual,
          isEarlyBreakConfirmed: isEarlyConfirmed,
        })
          .then((res) => {
            if (res && res.success) {
              if (typeof res.pauseCount === 'number') {
                setPauseCount(res.pauseCount);
              }
              if (typeof res.userCoins === 'number' && onUserUpdate) {
                onUserUpdate(res.userCoins);
              }
            }
          })
          .catch((err) => {
            console.warn('Backend pause sync notice:', err?.message || err);
          });
      }
    } catch (err) {
      console.error('Failed to pause session:', err);
    }
  };

  // Cancel / Stop Session
  const handleReset = () => {
    sounds.playClick();
    sounds.stopAlarm();
    setIsAlarmPlaying(false);

    const currId = sessionIdRef.current || sessionId;
    if (currId) {
      api.stopSession(currId, { elapsedSeconds: accumulatedElapsedRef.current }).catch(() => {});
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    setSessionId(null);
    sessionIdRef.current = null;
    accumulatedElapsedRef.current = 0;
    setAccumulatedSeconds(0);
    intervalElapsedRef.current = 0;
    setIntervalSeconds(0);
    setTimeLeft(totalSeconds > 0 ? totalSeconds : customMinutes * 60);
    setPauseCount(0);
    setPetFocusState('idle');
    setCompletionData(null);
    setCompletionError(null);
  };

  // Explicit Stop Alarm action
  const handleStopAlarm = () => {
    sounds.stopAlarm();
    setIsAlarmPlaying(false);
  };

  // Dismiss completion card and reset for next session
  const handleDismissCompletion = () => {
    sounds.stopAlarm();
    setIsAlarmPlaying(false);
    setCompletionData(null);
    setCompletionError(null);
    setSessionId(null);
    sessionIdRef.current = null;
    isCompletingRef.current = false;
    accumulatedElapsedRef.current = 0;
    setAccumulatedSeconds(0);
    intervalElapsedRef.current = 0;
    setIntervalSeconds(0);
    const nextDuration = (customMinutes > 0 ? customMinutes : 25) * 60;
    setTimeLeft(nextDuration);
    setTotalSeconds(nextDuration);
    setPauseCount(0);
    setPetFocusState('idle');
  };

  // Complete Session (Protected against double calls and duplicate coin awards)
  const handleComplete = async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    // Immediately trigger repeating continuous alarm
    sounds.startAlarm();
    setIsAlarmPlaying(true);
    setIsAudioBlocked(sounds.isAudioBlocked());

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRunning(false);
    setIsPaused(false);
    setPetFocusState('happy');
    activeSegmentStartRef.current = null;

    // Confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1B3B2F', '#D97724', '#2B5A52', '#3B82F6', '#10B981'],
      });
    } catch (e) {}

    setIsSubmittingCompletion(true);
    setCompletionError(null);

    // Resolve session ID (await pending startSession if still resolving)
    let currId = sessionIdRef.current || sessionId;
    if (!currId && startSessionPromiseRef.current) {
      try {
        currId = await startSessionPromiseRef.current;
      } catch (e) {}
    }

    // Emergency start if no session ID was registered yet
    if (!currId && timerMode === 'focus') {
      try {
        const subjectTitle = selectedSubject?.name || activeTask?.name || customSubjectName || 'Focus Task';
        const subjectId = selectedSubject?.id || selectedSubject?._id || undefined;
        const startRes = await api.startSession({
          taskId: activeTask?._id || undefined,
          subjectId,
          subjectName: subjectTitle,
          colorTag: selectedColor,
          durationMinutes: customMinutes,
        });
        if (startRes?.session?._id) {
          currId = startRes.session._id;
          sessionIdRef.current = currId;
          setSessionId(currId);
        }
      } catch (startErr) {
        console.error('Emergency session registration error:', startErr);
      }
    }

    if (currId && currId !== completedSessionId) {
      try {
        const res = await api.completeSession(currId);
        if (res && res.success) {
          setCompletedSessionId(currId);
          setCompletionData(res);
          sounds.playCoinSound();
          if (onSessionComplete) onSessionComplete(res);
          if (typeof res.userCoins === 'number' && onUserUpdate) {
            onUserUpdate(res.userCoins);
          }
        } else {
          setCompletionError(res?.message || 'Failed to record session rewards on server.');
        }
      } catch (err) {
        console.error('Backend completeSession error:', err);
        setCompletionError(err?.message || 'Network error saving session rewards. Click retry below.');
      } finally {
        setIsSubmittingCompletion(false);
      }
    } else if (!currId) {
      setIsSubmittingCompletion(false);
      setCompletionError('No session ID found to record rewards. Please verify your connection.');
    } else {
      setIsSubmittingCompletion(false);
    }
  };

  // Retry completion if network failed
  const handleRetryCompletion = async () => {
    const currId = sessionIdRef.current || sessionId;
    if (!currId) return;
    setIsSubmittingCompletion(true);
    setCompletionError(null);
    try {
      const res = await api.completeSession(currId);
      if (res && res.success) {
        setCompletedSessionId(currId);
        setCompletionData(res);
        sounds.playCoinSound();
        if (onSessionComplete) onSessionComplete(res);
        if (typeof res.userCoins === 'number' && onUserUpdate) {
          onUserUpdate(res.userCoins);
        }
      } else {
        setCompletionError(res?.message || 'Retry failed to record completion rewards.');
      }
    } catch (err) {
      setCompletionError(err?.message || 'Network retry failed.');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  // Inline Timer Editing Logic
  const handleTimeFocus = (field, currentVal) => {
    if (isRunning || isPaused) return; // Disallow editing when active/paused
    setActiveEditField(field);
    setInputValue(String(currentVal).padStart(2, '0'));
  };

  const handleTimeChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(-2);
    setInputValue(val);
  };

  const handleTimeSubmit = (field) => {
    let val = parseInt(inputValue || '0', 10);
    let h = Math.floor(timeLeft / 3600);
    let m = Math.floor((timeLeft % 3600) / 60);
    let s = timeLeft % 60;

    if (field === 'h') h = val;
    if (field === 'm') m = Math.min(val, 59);
    if (field === 's') s = Math.min(val, 59);

    const newTotal = h * 3600 + m * 60 + s;
    const finalTotal = newTotal > 0 ? newTotal : 60; // Minimum 1 minute logic

    setTotalSeconds(finalTotal);
    setTimeLeft(finalTotal);
    setCustomMinutes(Math.ceil(finalTotal / 60));
    setActiveEditField(null);
  };

  // Editable Segment Component
  const EditableSegment = ({ field, label, value, activeField, inputVal, onFocus, onChange, onSubmit, colon }) => {
    const isEditing = activeField === field;
    return (
      <div className="flex items-center">
        <div
          className={`flex items-baseline ${!isRunning && !isPaused ? 'cursor-pointer hover:opacity-70 transition' : ''}`}
          onClick={() => onFocus(field, value)}
        >
          {isEditing ? (
            <input
              type="text"
              autoFocus
              className="w-16 sm:w-20 bg-transparent text-center border-b-4 border-[#1B3B2F] dark:border-[#34D399] outline-none text-[#1B3B2F] dark:text-[#34D399] p-0 m-0"
              value={inputVal}
              onChange={onChange}
              onBlur={() => onSubmit(field)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit(field)}
            />
          ) : (
            <span>{String(value).padStart(2, '0')}</span>
          )}
          <span className="ml-1 sm:ml-2 text-2xl sm:text-3xl font-bold font-sans text-[#576560] dark:text-[#8BA398]">
            {label}
          </span>
        </div>
        {colon && <span className="mx-2 sm:mx-3 text-4xl sm:text-5xl text-[#EAE5DD] dark:text-[#253D35] pb-1.5">:</span>}
      </div>
    );
  };

  // Dynamic values for display
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  // Show hours if > 0 OR if timer is completely idle (allows editing)
  const showHours = h > 0 || (!isRunning && !isPaused);

  // Radial progress calculation:
  const radius = 146; // Larger circle base
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalSeconds > 0 ? Math.min(1, accumulatedSeconds / totalSeconds) : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const activeSubjectName =
    selectedSubject?.name || activeTask?.name || (customSubjectName ? customSubjectName : 'Core Study Task');
  const activeColorInfo = getSubjectColor(selectedColor);

  const isIntervalEligibleForFreeBreak = intervalSeconds >= 1500;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 select-none">
      {/* Repeating Continuous Alarm Banner */}
      {isAlarmPlaying && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black tracking-tight">
                Daily Goal Complete! Focus Session Finished!
              </h4>
              <p className="text-xs text-white/90 font-medium">
                {isAudioBlocked
                  ? 'Browser autoplay was restricted — alarm is active. Click STOP ALARM to silence.'
                  : 'Alarm is ringing continuously. Press Stop Alarm to silence.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleStopAlarm}
            className="px-6 py-3 rounded-2xl bg-white text-rose-600 hover:bg-stone-100 font-black text-sm tracking-wide shadow-lg transition transform hover:scale-105 flex items-center space-x-2 cursor-pointer flex-shrink-0"
          >
            <BellOff className="w-4 h-4" />
            <span>STOP ALARM</span>
          </button>
        </div>
      )}

      {/* Completion Error Notification */}
      {completionError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-medium">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{completionError}</span>
          </div>
          <button
            onClick={handleRetryCompletion}
            disabled={isSubmittingCompletion}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {isSubmittingCompletion ? 'Saving...' : 'Retry Saving'}
          </button>
        </div>
      )}

      {/* Authoritative Completion Breakdown Card */}
      {completionData && (
        <div className="bg-[#FAF8F5] dark:bg-[#162420] border-2 border-[#1B3B2F] dark:border-[#34D399] p-6 sm:p-7 rounded-3xl shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  Focus Session Successfully Recorded!
                </h3>
                <p className="text-xs text-[#576560] dark:text-[#8BA398]">
                  {completionData.session?.subjectName || activeSubjectName} • {completionData.session?.durationMinutes || customMinutes} minutes goal achieved
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center space-x-1.5">
                <Coins className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>New Balance: {completionData.userCoins ?? userCoins} Coins</span>
              </div>
            </div>
          </div>

          {/* Reward Breakdown Items */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                Focus Session Reward
              </span>
              <div className="text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] flex items-center space-x-1 mt-0.5">
                <span className="text-emerald-600">
                  +{(completionData.sessionCoins ?? completionData.coinsAwarded ?? 5)} Coins
                </span>
                <span className="text-xs text-[#576560] dark:text-[#8BA398] font-normal">
                  (Completed Task)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                Timetable Task Status
              </span>
              <div className="text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] flex items-center space-x-1 mt-0.5">
                <span className="text-emerald-600">Done</span>
                <span className="text-xs text-[#576560] dark:text-[#8BA398] font-normal">
                  (Marked completed for today)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                Daily 5-Task Bonus
              </span>
              <div className="text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] flex items-center space-x-1 mt-0.5">
                <span className={(completionData.bonusCoins || completionData.streakBonusAwarded) ? 'text-amber-500 font-extrabold' : 'text-[#8A9791]'}>
                  +{(completionData.bonusCoins ?? completionData.streakBonusAwarded ?? 0)} Coins
                </span>
                <span className="text-xs text-[#576560] dark:text-[#8BA398] font-normal">
                  {(completionData.allDailyBonusAwarded || completionData.allTasksCompletedToday) ? '5 tasks pause-free! 🎉' : 'In progress'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate('quests')}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                View Task & Calendar
              </button>
            )}
            <button
              onClick={handleDismissCompletion}
              className="px-5 py-2 rounded-xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Start Next Focus Session
            </button>
          </div>
        </div>
      )}

      {/* Mode Selector Pill Tabs */}
      <div className="flex bg-[#FAF8F5] dark:bg-[#162420] p-1.5 rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] max-w-md mx-auto justify-between shadow-sm relative">
        <button
          onClick={() => handleModeChange('focus')}
          className={`flex-1 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
            timerMode === 'focus'
              ? 'bg-[#1B3B2F] text-white shadow-sm'
              : 'text-[#576560] dark:text-[#9EB5AB] hover:text-[#1C2A24]'
          }`}
        >
          Deep Focus
        </button>
        <button
          onClick={() => handleModeChange('shortBreak')}
          className={`flex-1 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
            timerMode === 'shortBreak'
              ? 'bg-[#1B3B2F] text-white shadow-sm'
              : 'text-[#576560] dark:text-[#9EB5AB] hover:text-[#1C2A24]'
          }`}
        >
          Short Rest (5m)
        </button>
        <button
          onClick={() => handleModeChange('longBreak')}
          className={`flex-1 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
            timerMode === 'longBreak'
              ? 'bg-[#1B3B2F] text-white shadow-sm'
              : 'text-[#576560] dark:text-[#9EB5AB] hover:text-[#1C2A24]'
          }`}
        >
          Long Rest (15m)
        </button>
      </div>

      {/* Main Study Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: Pomodoro Dial & Subject Selector (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-8 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
          
          {/* BIG CLICKABLE SUBJECT SELECTOR */}
          <div className="relative w-full z-10">
            <div
              onClick={() => !isRunning && setShowSubjectMenu(!showSubjectMenu)}
              className={`w-full bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl p-4 border border-[#EAE5DD] dark:border-[#253D35] flex items-center justify-between transition-all ${!isRunning ? 'cursor-pointer hover:border-[#1B3B2F] dark:hover:border-[#A3D9C9]' : 'opacity-80'}`}
            >
              <div className="flex items-center space-x-3">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: activeColorInfo.hex }}
                />
                <div className="text-left truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] block">
                    What are you focusing on?
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-[#1C2A24] dark:text-[#F2F7F4] truncate mt-0.5">
                    {activeSubjectName}
                  </h3>
                </div>
              </div>

              {!isRunning && (
                <div className="flex items-center space-x-2">
                 
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#162420] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] shadow-xs flex-shrink-0">
                    <span>Change</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSubjectMenu ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Popover Subject Menu */}
            {!isRunning && showSubjectMenu && (
              <div className="absolute left-0 top-[105%] w-full bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-2xl shadow-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 z-20">
                <div className="text-[11px] font-bold text-[#576560] dark:text-[#8BA398] uppercase tracking-wider px-1">
                  Today's Planned Subjects ({todayKey}):
                </div>

                {timetableToday.length === 0 ? (
                  <p className="text-xs text-[#8A9791] px-1 py-1">
                    No timetable set for today. Pick a task below or study freely.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {timetableToday.map((sub) => {
                      const effMins = getEffectiveGoalMinutes(sub);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubject(sub)}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] text-left transition cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                            <span className="truncate text-[#1C2A24] dark:text-[#F2F7F4]">{sub.name}</span>
                          </div>
                          <span className="text-[10px] text-[#8A9791] flex-shrink-0">{effMins}m</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Standard Quests list */}
                {tasks.length > 0 && (
                  <div className="pt-2 border-t border-[#EAE5DD] dark:border-[#253D35]">
                    <div className="text-[11px] font-bold text-[#576560] dark:text-[#8BA398] uppercase tracking-wider px-1 mb-1">
                      General tasks:
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {tasks.map((t) => (
                        <button
                          key={t._id}
                          onClick={() => handleSelectTaskFallback(t)}
                          className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-bold hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] text-left transition cursor-pointer"
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.colorTag }} />
                          <span className="truncate text-[#1C2A24] dark:text-[#F2F7F4]">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Focus Interval Info / Status */}
          <div className="mt-6 w-full max-w-sm flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                Focus Interval:
              </span>
              <span className="font-mono font-black text-sm text-[#1B3B2F] dark:text-[#34D399]">
                {formatMMSS(intervalSeconds)} / 25:00
              </span>
            </div>

            <div>
              {isIntervalEligibleForFreeBreak ? (
                <span className="inline-flex items-center space-x-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                 
                  <span>Free Break Ready</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                  <span>−1 Coin penalty</span>
                </span>
              )}
            </div>
          </div>

          {/* Radial Timer Dial with HUGE Interactive Numbers */}
          <div className="relative my-8 flex items-center justify-center w-full min-h-[340px]">
            <svg className="w-80 h-80 transform -rotate-90">
              <circle
                cx="160"
                cy="160"
                r={radius}
                className="text-stone-100 dark:text-stone-800"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="160"
                cy="160"
                r={radius}
                stroke={activeColorInfo.hex}
                strokeWidth="16"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-linear drop-shadow-md"
              />
            </svg>

            {/* Inner Clock Face readout */}
            <div className="absolute flex flex-col items-center justify-center text-center w-full h-full z-10">
              <div className="flex items-center justify-center text-5xl sm:text-6xl font-black font-mono tracking-tight text-[#1C2A24] dark:text-[#F2F7F4]">
                {showHours && (
                  <EditableSegment
                    field="h"
                    label="H"
                    value={h}
                    activeField={activeEditField}
                    inputVal={inputValue}
                    onFocus={handleTimeFocus}
                    onChange={handleTimeChange}
                    onSubmit={handleTimeSubmit}
                    colon={true}
                  />
                )}
                <EditableSegment
                  field="m"
                  label="M"
                  value={m}
                  activeField={activeEditField}
                  inputVal={inputValue}
                  onFocus={handleTimeFocus}
                  onChange={handleTimeChange}
                  onSubmit={handleTimeSubmit}
                  colon={true}
                />
                <EditableSegment
                  field="s"
                  label="S"
                  value={s}
                  activeField={activeEditField}
                  inputVal={inputValue}
                  onFocus={handleTimeFocus}
                  onChange={handleTimeChange}
                  onSubmit={handleTimeSubmit}
                  colon={false}
                />
              </div>

              <span className="text-xs font-bold text-[#576560] dark:text-[#8BA398] mt-3 uppercase tracking-wider">
                {isPaused ? 'Session Paused' : isRunning ? 'In Deep Flow' : 'Ready to Focus'}
              </span>

              {/* Progress Summary: Today's verified focus so far */}
             
            </div>
          </div>

          {/* Main Controls (Start, Break / Pause, Resume, Stop) */}
          <div className="flex items-center space-x-4 w-full justify-center mt-4">
            {isAlarmPlaying ? (
              <button
                onClick={handleStopAlarm}
                className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-lg transition transform hover:scale-105 cursor-pointer animate-pulse"
              >
                <BellOff className="w-5 h-5" />
                <span>STOP ALARM</span>
              </button>
            ) : !isRunning && !isPaused ? (
              <button
                onClick={() => handleStartOrResumeClick('start')}
                className="flex items-center space-x-2 bg-[#1B3B2F] hover:bg-[#142C23] text-white px-10 py-4 rounded-2xl font-bold text-sm shadow-sm transition transform hover:scale-105 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START FOCUS</span>
              </button>
            ) : isPaused ? (
              <>
                <button
                  onClick={() => handleStartOrResumeClick('resume')}
                  className="flex items-center space-x-2 bg-[#1B3B2F] hover:bg-[#142C23] text-white px-9 py-4 rounded-2xl font-bold text-sm shadow-sm transition transform hover:scale-105 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Focus</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center p-3.5 rounded-2xl text-stone-500 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition cursor-pointer shadow-sm"
                  title="Cancel Focus Session"
                >
                  <Square className="w-5 h-5 text-rose-500 fill-rose-500" />
                </button>
              </>
            ) : (
              <>
                {/* Active running: user can take break */}
                <button
                  onClick={handleBreakButtonClick}
                  className={`flex items-center space-x-2 border px-6 py-3.5 rounded-2xl font-bold text-sm transition cursor-pointer shadow-sm ${
                    isIntervalEligibleForFreeBreak
                      ? 'bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border-[#C8E6D5] dark:border-[#2B5246] hover:bg-[#D5EBDD]'
                      : 'bg-[#FAF8F5] dark:bg-[#1C2E29] text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <Pause className="w-4 h-4" />
                  <span>{isIntervalEligibleForFreeBreak ? 'Take Free Break' : 'Take Break (−1 Coin)'}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center justify-center p-3.5 rounded-2xl text-stone-500 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition cursor-pointer shadow-sm"
                  title="Cancel Focus Session"
                >
                  <Square className="w-5 h-5 text-rose-500 fill-rose-500" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive 2D Mascot Companion */}
        <div className="lg:col-span-5 bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] shadow-sm flex items-center justify-center overflow-hidden h-full min-h-[400px]">
          <div className="w-full h-full bg-white flex items-center justify-center relative">
            <PetDisplay2D
              actionState={petFocusState}
              accessory={user?.inventory?.equippedAccessory || 'none'}
              equippedHat={user?.inventory?.equippedHat || 'none'}
              equippedGlasses={user?.inventory?.equippedGlasses || 'none'}
              equippedNeckwear={user?.inventory?.equippedNeckwear || 'none'}
              equippedOutfit={user?.inventory?.equippedOutfit || 'none'}
              habitat={user?.inventory?.equippedHabitat || 'forest_meadow'}
              health={pet?.health ?? 100}
              hunger={pet?.hunger ?? 100}
              thirst={pet?.thirst ?? 100}
              className="w-full h-full object-cover scale-110"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: 25-MINUTE BREAK PENALTY CONFIRMATION DIALOG */}
      {showBreakConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#162420] border-2 border-amber-500/60 dark:border-amber-400/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              25 minutes abhi complete nahi hue!
            </h3>

            <p className="text-xs sm:text-sm text-[#576560] dark:text-[#8BA398] leading-relaxed">
              Break lene par 1 coin deduct hoga. Continue studying or take a break?
            </p>

            <div className="bg-[#FAF8F5] dark:bg-[#1C2E29] p-3.5 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] text-xs space-y-1">
              <div className="flex justify-between font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                <span>Current Interval Focus:</span>
                <span className="font-mono font-extrabold">{formatMMSS(intervalSeconds)} / 25:00</span>
              </div>
              <div className="text-[11px] text-[#576560] dark:text-[#8BA398]">
                {1500 - intervalSeconds > 0
                  ? `${Math.ceil((1500 - intervalSeconds) / 60)} minutes left for a free break`
                  : 'Threshold reached'}
              </div>
              {userCoins <= 0 && (
                <div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold pt-1">
                  Note: Balance is 0 Coins. Penalty applies, but balance will not become negative.
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBreakConfirmation(false)}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white font-bold text-xs tracking-wide shadow-sm transition cursor-pointer"
              >
                Continue Studying
              </button>
              <button
                type="button"
                onClick={handleConfirmEarlyBreak}
                className="w-full sm:flex-1 py-3 rounded-2xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Take a Break (−1 Coin)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-SECOND COUNTDOWN MODAL BEFORE TIMER STARTS OR RESUMES */}
      {showCountdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#162420] border-2 border-[#1B3B2F] dark:border-[#34D399] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E8F5EE] dark:bg-[#1C2E29] border border-[#C8E6D5] dark:border-[#2B5246] text-xs font-bold text-[#1B3B2F] dark:text-[#A3D9C9]">
              <span>🌱 Padhaku Billa Focus Session</span>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] p-4 rounded-2xl shadow-inner">
              <p className="text-base sm:text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] leading-snug">
                “Honest with yourself. I track your time, not your lies.👀”
              </p>
            </div>

            <div className="text-xs text-[#576560] dark:text-[#8BA398] font-medium">
              {countdownAction === 'resume' ? 'Resuming session for' : 'Preparing session for'} <strong className="text-[#1C2A24] dark:text-[#F2F7F4]">{activeSubjectName}</strong> ({formatTimerHMS(timeLeft)})
            </div>

            <div className="py-2">
              <span
                key={countdownValue}
                className="text-7xl sm:text-8xl font-black font-mono text-[#1B3B2F] dark:text-[#34D399] tracking-tighter inline-block animate-pulse"
              >
                {countdownValue}
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-[#576560] dark:text-[#8BA398] mt-2">
                {countdownAction === 'resume' ? 'Resuming in' : 'Starting in'} {countdownValue} seconds...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusPage;