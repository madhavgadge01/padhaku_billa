import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  BellOff,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { PetDisplay2D } from '../components/Sparky3DScene.jsx';
import { StopwatchSaveModal } from '../components/StopwatchSaveModal.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';
import { getStudyDayKey, getStudyDayDate, formatResetTimeDisplay } from '../utils/dateUtils.js';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import {
  getPushNotificationStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSupported,
  isIOS,
  isStandalonePWA,
} from '../utils/pushNotifications.js';

const TIMER_STORAGE_KEY = 'padhaku_billa_active_timer';
const TIMER_CHANNEL_NAME = 'padhaku_billa_timer_channel';
const STOPWATCH_STORAGE_KEY = 'padhaku_billa_stopwatch_state';
const STOPWATCH_PENDING_KEY = 'padhaku_billa_pending_stopwatch_session';

const saveStopwatchState = (running, paused, baseAcc, segStart) => {
  try {
    const data = {
      isRunning: running,
      isPaused: paused,
      baseAccumulated: baseAcc,
      segmentStart: segStart,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save stopwatch state:', e);
  }
};

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

export const formatDigitalHMS = (totalSeconds) => {
  const totalSecs = Math.max(0, Math.floor(totalSeconds || 0));
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
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

  // Timer modes: 'focus' (25/45/60 min), 'shortBreak' (5 min), 'longBreak' (15 min), 'stopwatch'
  const [timerMode, setTimerMode] = useState(() => {
    try {
      const rawSw = localStorage.getItem(STOPWATCH_STORAGE_KEY);
      if (rawSw) {
        const parsed = JSON.parse(rawSw);
        const rawPomo = localStorage.getItem(TIMER_STORAGE_KEY);
        const pomo = rawPomo ? JSON.parse(rawPomo) : null;
        const isPomoRunning = pomo && (pomo.isRunning || (pomo.sessionEndTimestamp && pomo.sessionEndTimestamp > Date.now()));
        if (parsed.isRunning && !isPomoRunning) {
          return 'stopwatch';
        }
      }
    } catch (e) {}
    return 'focus';
  });

  // Dedicated Stopwatch State
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchIsRunning, setStopwatchIsRunning] = useState(false);
  const [stopwatchIsPaused, setStopwatchIsPaused] = useState(false);
  const [showStopwatchModal, setShowStopwatchModal] = useState(false);
  const [pendingStopwatchSession, setPendingStopwatchSession] = useState(() => {
    try {
      const raw = localStorage.getItem(STOPWATCH_PENDING_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  // Timetable integration
  const [timetableToday, setTimetableToday] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  // Duration & Tracking State
  const initialDuration = activeTask ? activeTask.durationMinutes : 25;
  const [customMinutes, setCustomMinutes] = useState(initialDuration);
  const [totalSeconds, setTotalSeconds] = useState(initialDuration * 60);
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pauseCount, setPauseCount] = useState(0);
  const [completedSessionId, setCompletedSessionId] = useState(null);

  // 1. Total Accumulated focus time in current focus session / today
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);

  // 2. Verified focus time in the current resume-to-break interval (Threshold: 25 mins = 1500s)
  const [intervalSeconds, setIntervalSeconds] = useState(0);

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

  // Push Notification state
  const [pushStatus, setPushStatus] = useState({
    supported: false,
    permission: 'default',
    subscribed: false,
    loading: false,
  });
  const [pushNotice, setPushNotice] = useState(null);

  // Active elapsed segment & timestamp tracking refs (All declared safely AFTER state)
  const sessionIdRef = useRef(null);
  const startSessionPromiseRef = useRef(null);
  const accumulatedElapsedRef = useRef(0);
  const intervalElapsedRef = useRef(0);
  const activeSegmentStartRef = useRef(null);
  const sessionEndTimestampRef = useRef(null);
  const baseAccumulatedRef = useRef(0);
  const baseIntervalRef = useRef(0);
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  const customMinutesRef = useRef(customMinutes);
  const totalSecondsRef = useRef(totalSeconds);
  const timerBroadcastChannelRef = useRef(null);
  const timerRef = useRef(null);
  const isCompletingRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const userHasCustomizedDurationRef = useRef(false);

  // Stopwatch & Dropdown interaction refs
  const stopwatchBaseAccumulatedRef = useRef(0);
  const stopwatchSegmentStartRef = useRef(null);
  const stopwatchSessionStartTimeRef = useRef(null);
  const stopwatchIntervalRef = useRef(null);
  const subjectMenuRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    isRunningRef.current = isRunning;
    isPausedRef.current = isPaused;
  }, [isRunning, isPaused]);

  useEffect(() => {
    customMinutesRef.current = customMinutes;
  }, [customMinutes]);

  useEffect(() => {
    totalSecondsRef.current = totalSeconds;
  }, [totalSeconds]);

  // Check push notification support & permissions on mount
  useEffect(() => {
    getPushNotificationStatus().then((status) => {
      setPushStatus(status);
    });
  }, []);

  const handleTogglePushNotifications = async () => {
    sounds.playClick();
    setPushStatus((prev) => ({ ...prev, loading: true }));
    setPushNotice(null);

    try {
      if (pushStatus.subscribed) {
        await unsubscribeFromPushNotifications();
        const updated = await getPushNotificationStatus();
        setPushStatus(updated);
        setPushNotice({ type: 'info', text: 'Push notifications disabled.' });
      } else {
        await subscribeToPushNotifications();
        const updated = await getPushNotificationStatus();
        setPushStatus(updated);
        setPushNotice({
          type: 'success',
          text: '🎉 Background alerts enabled! You will be notified the second your timer ends, even if the screen is off.',
        });
      }
    } catch (err) {
      console.warn('Push subscription notice:', err);
      const updated = await getPushNotificationStatus();
      setPushStatus(updated);
      setPushNotice({
        type: 'error',
        text: err?.message || 'Could not enable notifications. Please check your browser permissions.',
      });
    } finally {
      setTimeout(() => setPushNotice(null), 6000);
    }
  };

  const handleTestPushNotification = async () => {
    sounds.playClick();
    try {
      await api.testPushNotification();
      setPushNotice({ type: 'success', text: '🔔 Test alert sent! Check your notification tray.' });
    } catch (e) {
      setPushNotice({ type: 'error', text: 'Failed to send test alert. Make sure notifications are enabled.' });
    } finally {
      setTimeout(() => setPushNotice(null), 5000);
    }
  };

  // Live browser tab title countdown / stopwatch
  useEffect(() => {
    const defaultTitle = 'Padhaku Billa';
    if (timerMode === 'stopwatch') {
      const hrs = Math.floor(stopwatchSeconds / 3600);
      const mins = Math.floor((stopwatchSeconds % 3600) / 60);
      const secs = stopwatchSeconds % 60;
      const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (stopwatchIsRunning) {
        document.title = `⏱️ ${timeStr} | Padhaku Billa`;
        return;
      } else if (stopwatchIsPaused) {
        document.title = `⏸️ ${timeStr} (Paused) | Padhaku Billa`;
        return;
      } else {
        document.title = defaultTitle;
        return;
      }
    }

    const hDisplay = Math.floor(timeLeft / 3600);
    if (isRunning && !isPaused) {
      const timeStr = hDisplay > 0 ? formatTimerHMS(timeLeft) : formatMMSS(timeLeft);
      document.title = `🍃 ${timeStr} | Padhaku Billa`;
    } else if (isAlarmPlaying || completionData) {
      document.title = `⏰ 00:00 | Session Complete! | Padhaku Billa`;
    } else if (isPaused) {
      const timeStr = hDisplay > 0 ? formatTimerHMS(timeLeft) : formatMMSS(timeLeft);
      document.title = `⏸️ ${timeStr} | Padhaku Billa`;
    } else {
      document.title = defaultTitle;
    }

    return () => {
      document.title = defaultTitle;
    };
  }, [
    timerMode,
    stopwatchSeconds,
    stopwatchIsRunning,
    stopwatchIsPaused,
    isRunning,
    isPaused,
    timeLeft,
    isAlarmPlaying,
    completionData,
  ]);

  // Notify parent of genuine active running state for centralized navigation guard
  const isActivelyRunning = isRunning && !isPaused;
  useEffect(() => {
    if (typeof onTimerRunningChange === 'function') {
      onTimerRunningChange(isActivelyRunning);
    }
  }, [isActivelyRunning, onTimerRunningChange]);

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

      const now = Date.now();
      const segmentElapsed = (isRunningRef.current && !isPausedRef.current && activeSegmentStartRef.current)
        ? Math.max(0, Math.floor((now - activeSegmentStartRef.current) / 1000))
        : 0;
      const totalActual = Math.max(accumulatedElapsedRef.current || 0, (baseAccumulatedRef.current || 0) + segmentElapsed);
      const currentInterval = Math.max(intervalElapsedRef.current || 0, (baseIntervalRef.current || 0) + segmentElapsed);

      if (totalActual <= 0 && currentInterval <= 0) return;

      const payload = JSON.stringify({
        actualSeconds: totalActual,
        intervalSeconds: currentInterval,
        closing: isClosing,
      });

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
      flushActiveFocus(false);
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
    const defaultGoalSecs = effMins * 60;

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

            // Authoritative session goal seconds:
            // Prefer session's totalGoalSeconds or durationMinutes*60, falling back to local totalSecondsRef or default
            const sessionGoalSecs =
              match.totalGoalSeconds ||
              (match.durationMinutes ? match.durationMinutes * 60 : (totalSecondsRef.current || defaultGoalSecs));
            const sessionDurationMins = match.durationMinutes || Math.round(sessionGoalSecs / 60);

            // Remaining seconds toward goal
            const remSecs = Math.max(0, sessionGoalSecs - acc);
            setTimeLeft(remSecs);
            setTotalSeconds(sessionGoalSecs);
            totalSecondsRef.current = sessionGoalSecs;
            setCustomMinutes(sessionDurationMins);
            customMinutesRef.current = sessionDurationMins;
            userHasCustomizedDurationRef.current = true;

            // Recovered sessions are restored safely as paused ready to resume
            setIsRunning(false);
            setIsPaused(true);
            isRunningRef.current = false;
            isPausedRef.current = true;
            setPetFocusState('idle');
            // Every Resume starts a new 25-minute interval counter
            intervalElapsedRef.current = 0;
            setIntervalSeconds(0);

            syncTimerToStorage({
              sessionId: match._id,
              totalSeconds: sessionGoalSecs,
              customMinutes: sessionDurationMins,
              timeLeft: remSecs,
              baseAccumulatedSeconds: acc,
              baseIntervalSeconds: 0,
              isRunning: false,
              isPaused: true,
            });
            return;
          }
        }

        // If no active session found on backend:
        // Do not reset if timer is currently running, paused, has an active session, or user has customized duration
        if (isRunningRef.current || isPausedRef.current || sessionIdRef.current || userHasCustomizedDurationRef.current) {
          return;
        }

        setTotalSeconds(defaultGoalSecs);
        totalSecondsRef.current = defaultGoalSecs;
        setTimeLeft(defaultGoalSecs);
        setCustomMinutes(effMins);
        customMinutesRef.current = effMins;
        accumulatedElapsedRef.current = 0;
        setAccumulatedSeconds(0);
        intervalElapsedRef.current = 0;
        setIntervalSeconds(0);
        setIsRunning(false);
        setIsPaused(false);
        setPetFocusState('idle');
      })
      .catch(() => {
        if (isRunningRef.current || isPausedRef.current || sessionIdRef.current || userHasCustomizedDurationRef.current) {
          return;
        }
        setTotalSeconds(defaultGoalSecs);
        totalSecondsRef.current = defaultGoalSecs;
        setTimeLeft(defaultGoalSecs);
        setCustomMinutes(effMins);
        customMinutesRef.current = effMins;
      });
  };

  // Sync initialSubject prop if passed from parent
  useEffect(() => {
    if (initialSubject && !isRunningRef.current) {
      setSelectedSubject(initialSubject);
      setSelectedColor(initialSubject.color || '#3B82F6');
      if (!isPausedRef.current && !sessionIdRef.current && !userHasCustomizedDurationRef.current) {
        restoreSubjectProgress(initialSubject);
      }
    }
  }, [initialSubject, user?.dailyGoalOverrides, todayDateStr]);

  // Load today's timetable subjects
  useEffect(() => {
    if (user?.weeklyTimetable && user.weeklyTimetable[todayKey]) {
      setTimetableToday(user.weeklyTimetable[todayKey]);
      if (
        !selectedSubject &&
        user.weeklyTimetable[todayKey].length > 0 &&
        !isRunningRef.current &&
        !isPausedRef.current &&
        !sessionIdRef.current &&
        !userHasCustomizedDurationRef.current
      ) {
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
            if (
              !selectedSubject &&
              res.todaySchedule.subjects.length > 0 &&
              !isRunningRef.current &&
              !isPausedRef.current &&
              !sessionIdRef.current &&
              !userHasCustomizedDurationRef.current
            ) {
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
    if (
      !isRunning &&
      !isPaused &&
      !sessionIdRef.current &&
      !userHasCustomizedDurationRef.current &&
      activeTask &&
      timerMode === 'focus' &&
      !selectedSubject
    ) {
      const mins = getEffectiveGoalMinutes(activeTask);
      setCustomMinutes(mins);
      customMinutesRef.current = mins;
      setTimeLeft(mins * 60);
      setTotalSeconds(mins * 60);
      totalSecondsRef.current = mins * 60;
      setSelectedColor(activeTask.colorTag || '#3B82F6');
    }
  }, [activeTask, timerMode, isRunning, isPaused, selectedSubject]);

  // Mode Switcher
  const handleModeChange = (mode) => {
    // If pomodoro is running and switching between focus and breaks, keep it guarded
    if (isRunning && (mode === 'shortBreak' || mode === 'longBreak')) return;
    sounds.playClick();
    setTimerMode(mode);
    if (mode === 'stopwatch') {
      if (stopwatchIsRunning) {
        setPetFocusState('studying');
      } else {
        setPetFocusState('idle');
      }
      return;
    }
    // If switching back to focus while pomodoro is already actively running, preserve pomodoro timeLeft
    if (isRunning && mode === 'focus') {
      setPetFocusState('studying');
      return;
    }
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

  // Load and restore stopwatch from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STOPWATCH_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          const base = typeof saved.baseAccumulated === 'number' ? saved.baseAccumulated : 0;
          if (saved.isRunning && saved.segmentStart) {
            const diff = Math.max(0, Math.floor((Date.now() - saved.segmentStart) / 1000));
            const currentTotal = base + diff;
            stopwatchBaseAccumulatedRef.current = base;
            stopwatchSegmentStartRef.current = saved.segmentStart;
            setStopwatchSeconds(currentTotal);
            setStopwatchIsRunning(true);
            setStopwatchIsPaused(false);
          } else if (saved.isPaused) {
            stopwatchBaseAccumulatedRef.current = base;
            stopwatchSegmentStartRef.current = null;
            setStopwatchSeconds(base);
            setStopwatchIsRunning(false);
            setStopwatchIsPaused(true);
          } else {
            stopwatchBaseAccumulatedRef.current = 0;
            stopwatchSegmentStartRef.current = null;
            setStopwatchSeconds(0);
            setStopwatchIsRunning(false);
            setStopwatchIsPaused(false);
          }
        }
      }
    } catch (e) {
      console.warn('Error restoring stopwatch state:', e);
    }
  }, []);

  const syncStopwatchNow = useCallback(() => {
    if (stopwatchSegmentStartRef.current) {
      const diff = Math.max(0, Math.floor((Date.now() - stopwatchSegmentStartRef.current) / 1000));
      const currentTotal = stopwatchBaseAccumulatedRef.current + diff;
      setStopwatchSeconds(currentTotal);
      saveStopwatchState(true, false, stopwatchBaseAccumulatedRef.current, stopwatchSegmentStartRef.current);
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncStopwatchNow();
      }
    };
    const handlePageShow = () => {
      syncStopwatchNow();
    };
    const handleFocus = () => {
      syncStopwatchNow();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncStopwatchNow]);

  useEffect(() => {
    if (stopwatchIsRunning && stopwatchSegmentStartRef.current) {
      syncStopwatchNow();
      stopwatchIntervalRef.current = setInterval(() => {
        if (stopwatchSegmentStartRef.current) {
          const diff = Math.max(0, Math.floor((Date.now() - stopwatchSegmentStartRef.current) / 1000));
          const currentTotal = stopwatchBaseAccumulatedRef.current + diff;
          setStopwatchSeconds(currentTotal);
        }
      }, 500);

      return () => {
        if (stopwatchIntervalRef.current) {
          clearInterval(stopwatchIntervalRef.current);
          stopwatchIntervalRef.current = null;
        }
      };
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
    }
  }, [stopwatchIsRunning, syncStopwatchNow]);

  const handleStartStopwatch = () => {
    sounds.playClick?.();
    const now = Date.now();
    stopwatchBaseAccumulatedRef.current = 0;
    stopwatchSegmentStartRef.current = now;
    stopwatchSessionStartTimeRef.current = now;
    setStopwatchSeconds(0);
    setStopwatchIsRunning(true);
    setStopwatchIsPaused(false);
    saveStopwatchState(true, false, 0, now);
  };

  const handlePauseStopwatch = () => {
    sounds.playClick?.();
    const now = Date.now();
    const additional = stopwatchSegmentStartRef.current
      ? Math.max(0, Math.floor((now - stopwatchSegmentStartRef.current) / 1000))
      : 0;
    const totalAcc = stopwatchBaseAccumulatedRef.current + additional;
    stopwatchBaseAccumulatedRef.current = totalAcc;
    stopwatchSegmentStartRef.current = null;
    setStopwatchSeconds(totalAcc);
    setStopwatchIsRunning(false);
    setStopwatchIsPaused(true);
    saveStopwatchState(false, true, totalAcc, null);
  };

  const handleResumeStopwatch = () => {
    sounds.playClick?.();
    const now = Date.now();
    if (!stopwatchSessionStartTimeRef.current) {
      stopwatchSessionStartTimeRef.current = now - (stopwatchBaseAccumulatedRef.current * 1000);
    }
    stopwatchSegmentStartRef.current = now;
    setStopwatchIsRunning(true);
    setStopwatchIsPaused(false);
    saveStopwatchState(true, false, stopwatchBaseAccumulatedRef.current, now);
  };

  const handleStopStopwatch = () => {
    sounds.playClick?.();
    const now = Date.now();
    const additional = stopwatchSegmentStartRef.current
      ? Math.max(0, Math.floor((now - stopwatchSegmentStartRef.current) / 1000))
      : 0;
    const totalAcc = stopwatchBaseAccumulatedRef.current + additional;

    // Freeze stopwatch running state
    stopwatchBaseAccumulatedRef.current = totalAcc;
    stopwatchSegmentStartRef.current = null;
    setStopwatchSeconds(totalAcc);
    setStopwatchIsRunning(false);
    setStopwatchIsPaused(true);
    saveStopwatchState(false, true, totalAcc, null);

    if (totalAcc > 0) {
      const startTime = stopwatchSessionStartTimeRef.current
        ? new Date(stopwatchSessionStartTimeRef.current).toISOString()
        : new Date(now - totalAcc * 1000).toISOString();
      const endTime = new Date(now).toISOString();

      const pending = {
        elapsedSeconds: totalAcc,
        startTime,
        endTime,
        subjectId: selectedSubject?.id || selectedSubject?._id || null,
        subjectName: selectedSubject?.name || '',
      };

      setPendingStopwatchSession(pending);
      try {
        localStorage.setItem(STOPWATCH_PENDING_KEY, JSON.stringify(pending));
      } catch (e) {}
      setShowStopwatchModal(true);
    } else {
      handleResetStopwatch();
    }
  };

  const handleSaveStopwatchSession = async (payload) => {
    const res = await api.saveStopwatchSession(payload);
    if (res?.success) {
      try {
        localStorage.removeItem(STOPWATCH_PENDING_KEY);
      } catch (e) {}
      setPendingStopwatchSession(null);
      setShowStopwatchModal(false);

      // Cleanly reset stopwatch after successful save
      stopwatchBaseAccumulatedRef.current = 0;
      stopwatchSegmentStartRef.current = null;
      stopwatchSessionStartTimeRef.current = null;
      setStopwatchSeconds(0);
      setStopwatchIsRunning(false);
      setStopwatchIsPaused(false);
      saveStopwatchState(false, false, 0, null);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}

      onReload?.();
      fetchActiveSessions?.();
    }
  };

  const handleDiscardStopwatch = () => {
    sounds.playClick?.();
    try {
      localStorage.removeItem(STOPWATCH_PENDING_KEY);
    } catch (e) {}
    setPendingStopwatchSession(null);
    setShowStopwatchModal(false);
    handleResetStopwatch();
  };

  const handleResetStopwatch = () => {
    sounds.playClick?.();
    stopwatchBaseAccumulatedRef.current = 0;
    stopwatchSegmentStartRef.current = null;
    stopwatchSessionStartTimeRef.current = null;
    setStopwatchSeconds(0);
    setStopwatchIsRunning(false);
    setStopwatchIsPaused(false);
    saveStopwatchState(false, false, 0, null);
  };

  // Keep pet state in sync with stopwatch
  useEffect(() => {
    if (timerMode === 'stopwatch') {
      if (stopwatchIsRunning) {
        setPetFocusState('studying');
      } else {
        setPetFocusState('idle');
      }
    }
  }, [timerMode, stopwatchIsRunning]);

  // Close subject menu dropdown when clicking outside
  useEffect(() => {
    if (!showSubjectMenu) return;
    const handleClickOutside = (e) => {
      if (subjectMenuRef.current && !subjectMenuRef.current.contains(e.target)) {
        setShowSubjectMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSubjectMenu]);

  // Deduplicated list of today's planned subjects (ensures subjects appear only once)
  const displaySubjects = React.useMemo(() => {
    const list = [...(timetableToday || [])];
    const seenNames = new Set(list.map((s) => (s.name || '').trim().toLowerCase()));
    const seenIds = new Set(list.map((s) => String(s.id || s._id || '')));

    (tasks || []).forEach((t) => {
      const cleanName = (t.name || '').trim().toLowerCase();
      const idStr = String(t._id || t.id || '');
      if (!seenNames.has(cleanName) && !seenIds.has(idStr)) {
        list.push({
          id: t._id || t.id,
          _id: t._id || t.id,
          name: t.name,
          color: t.colorTag || '#3B82F6',
          colorTag: t.colorTag || '#3B82F6',
          targetMinutes: t.durationMinutes || 25,
          completedDates: t.completedDates || [],
        });
        seenNames.add(cleanName);
        seenIds.add(idStr);
      }
    });

    return list;
  }, [timetableToday, tasks]);

  // Mutable reference to handleComplete for circular dependency resolution
  const handleCompleteRef = useRef(null);

  // Synchronize active timer state to localStorage
  const syncTimerToStorage = useCallback((overrides = {}) => {
    try {
      const state = {
        sessionId: sessionIdRef.current,
        subjectId: selectedSubject?.id || selectedSubject?._id,
        subjectName: selectedSubject?.name || activeTask?.name || customSubjectName || 'Focus Task',
        color: selectedColor,
        timerMode,
        customMinutes: customMinutesRef.current,
        totalSeconds: totalSecondsRef.current,
        sessionEndTimestamp: sessionEndTimestampRef.current,
        activeSegmentStartTimestamp: activeSegmentStartRef.current,
        baseAccumulatedSeconds: baseAccumulatedRef.current,
        baseIntervalSeconds: baseIntervalRef.current,
        isRunning: isRunningRef.current,
        isPaused: isPausedRef.current,
        pauseCount,
        timeLeft,
        updatedAt: Date.now(),
        ...overrides,
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
      return state;
    } catch (e) {
      console.warn('Could not save timer to localStorage', e);
      return null;
    }
  }, [selectedSubject, activeTask, customSubjectName, selectedColor, timerMode, pauseCount, timeLeft]);

  // Clear timer state from localStorage
  const clearTimerStorage = useCallback(() => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (e) {}
  }, []);

  // Broadcast timer events across all open tabs
  const broadcastTimerEvent = useCallback((type, payload = {}) => {
    try {
      if (timerBroadcastChannelRef.current) {
        timerBroadcastChannelRef.current.postMessage({
          type,
          payload,
          senderId: Math.random(),
          timestamp: Date.now(),
        });
      }
    } catch (e) {}
  }, []);

  // Authoritative timestamp-based recalculation:
  // Evaluates remaining seconds from sessionEndTimestamp - Date.now()
  // Eliminates timer drift across background tabs, sleep, and phone screen lock
  const recalculateFromTimestamps = useCallback(() => {
    if (!isRunningRef.current || isPausedRef.current) return;
    const now = Date.now();
    const endTs = sessionEndTimestampRef.current;
    if (!endTs) return;

    const remaining = Math.max(0, Math.ceil((endTs - now) / 1000));
    setTimeLeft(remaining);

    const segmentElapsed = activeSegmentStartRef.current
      ? Math.max(0, Math.floor((now - activeSegmentStartRef.current) / 1000))
      : 0;

    const maxGoal = totalSecondsRef.current || (customMinutesRef.current * 60) || 1500;
    const currentTotal = Math.min(maxGoal, (baseAccumulatedRef.current || 0) + segmentElapsed);
    accumulatedElapsedRef.current = currentTotal;
    setAccumulatedSeconds(currentTotal);

    const currentInterval = (baseIntervalRef.current || 0) + segmentElapsed;
    intervalElapsedRef.current = currentInterval;
    setIntervalSeconds(currentInterval);

    if (remaining === 0 && !isCompletingRef.current) {
      if (handleCompleteRef.current) {
        handleCompleteRef.current();
      }
    }
  }, []);

  // Cross-tab message handler
  const handleCrossTabSync = useCallback((msg) => {
    if (!msg || !msg.type) return;
    const { type, payload } = msg;

    if (type === 'TIMER_START') {
      if (payload.sessionId) {
        sessionIdRef.current = payload.sessionId;
        setSessionId(payload.sessionId);
      }
      if (payload.sessionEndTimestamp) {
        sessionEndTimestampRef.current = payload.sessionEndTimestamp;
      }
      if (payload.durationMinutes) {
        setCustomMinutes(payload.durationMinutes);
        customMinutesRef.current = payload.durationMinutes;
        setTotalSeconds(payload.durationMinutes * 60);
        totalSecondsRef.current = payload.durationMinutes * 60;
      }
      isRunningRef.current = true;
      isPausedRef.current = false;
      setIsRunning(true);
      setIsPaused(false);
      recalculateFromTimestamps();
    } else if (type === 'TIMER_RESUME') {
      if (payload.sessionEndTimestamp) {
        sessionEndTimestampRef.current = payload.sessionEndTimestamp;
      }
      isRunningRef.current = true;
      isPausedRef.current = false;
      setIsRunning(true);
      setIsPaused(false);
      recalculateFromTimestamps();
    } else if (type === 'TIMER_PAUSE') {
      isRunningRef.current = false;
      isPausedRef.current = true;
      setIsRunning(false);
      setIsPaused(true);
      sessionEndTimestampRef.current = null;
      activeSegmentStartRef.current = null;
      if (typeof payload.timeLeft === 'number') {
        setTimeLeft(payload.timeLeft);
      }
    } else if (type === 'TIMER_RESET') {
      isRunningRef.current = false;
      isPausedRef.current = false;
      setIsRunning(false);
      setIsPaused(false);
      sessionEndTimestampRef.current = null;
      activeSegmentStartRef.current = null;
      setTimeLeft(totalSecondsRef.current || 1500);
    } else if (type === 'TIMER_COMPLETE') {
      isCompletingRef.current = true;
      isRunningRef.current = false;
      isPausedRef.current = false;
      setIsRunning(false);
      setIsPaused(false);
      sessionEndTimestampRef.current = null;
      activeSegmentStartRef.current = null;
      setTimeLeft(0);
      sounds.startAlarm();
      setIsAlarmPlaying(true);
    }
  }, [recalculateFromTimestamps]);

  // Multi-tab synchronization (BroadcastChannel + storage events)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel(TIMER_CHANNEL_NAME);
        timerBroadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          handleCrossTabSync(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }

    const handleStorageEvent = (e) => {
      if (e.key === TIMER_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const now = Date.now();
          if (parsed.isRunning && !parsed.isPaused && parsed.sessionEndTimestamp) {
            if (now >= parsed.sessionEndTimestamp) {
              if (!isCompletingRef.current && handleCompleteRef.current) {
                handleCompleteRef.current();
              }
            } else {
              sessionEndTimestampRef.current = parsed.sessionEndTimestamp;
              activeSegmentStartRef.current = parsed.activeSegmentStartTimestamp || now;
              baseAccumulatedRef.current = parsed.baseAccumulatedSeconds || 0;
              baseIntervalRef.current = parsed.baseIntervalSeconds || 0;
              isRunningRef.current = true;
              isPausedRef.current = false;
              setIsRunning(true);
              setIsPaused(false);
              recalculateFromTimestamps();
            }
          } else if (parsed.isPaused) {
            isRunningRef.current = false;
            isPausedRef.current = true;
            setIsRunning(false);
            setIsPaused(true);
            sessionEndTimestampRef.current = null;
            activeSegmentStartRef.current = null;
            if (typeof parsed.timeLeft === 'number') {
              setTimeLeft(parsed.timeLeft);
            }
          }
        } catch (err) {}
      } else if (e.key === TIMER_STORAGE_KEY && !e.newValue) {
        isRunningRef.current = false;
        isPausedRef.current = false;
        setIsRunning(false);
        setIsPaused(false);
        sessionEndTimestampRef.current = null;
        activeSegmentStartRef.current = null;
        setTimeLeft(totalSecondsRef.current || 1500);
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (timerBroadcastChannelRef.current) {
        timerBroadcastChannelRef.current.close();
        timerBroadcastChannelRef.current = null;
      }
    };
  }, [handleCrossTabSync, recalculateFromTimestamps]);

  // Recalculate immediately on window focus, visibility change, and pageshow (mobile cache restore / device sleep wakeup)
  useEffect(() => {
    const handleWakeup = () => {
      if (isRunningRef.current && !isPausedRef.current) {
        recalculateFromTimestamps();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleWakeup();
      }
    };

    window.addEventListener('focus', handleWakeup);
    window.addEventListener('pageshow', handleWakeup);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('pageshow', handleWakeup);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [recalculateFromTimestamps]);

  // Restore running timer from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!stored) return;
      const data = JSON.parse(stored);
      if (!data) return;

      const now = Date.now();
      if (data.isRunning && !data.isPaused && data.sessionEndTimestamp) {
        if (now >= data.sessionEndTimestamp) {
          // Finished while away: award coins, play alarm, present dialog
          if (data.sessionId) {
            sessionIdRef.current = data.sessionId;
            setSessionId(data.sessionId);
          }
          if (data.totalSeconds) {
            setTotalSeconds(data.totalSeconds);
            setAccumulatedSeconds(data.totalSeconds);
            accumulatedElapsedRef.current = data.totalSeconds;
          }
          setTimeLeft(0);
          sessionEndTimestampRef.current = null;
          clearTimerStorage();
          if (handleCompleteRef.current) {
            handleCompleteRef.current();
          }
        } else {
          // Still active: restore countdown seamlessly
          const remSecs = Math.max(0, Math.ceil((data.sessionEndTimestamp - now) / 1000));
          if (data.sessionId) {
            sessionIdRef.current = data.sessionId;
            setSessionId(data.sessionId);
          }
          sessionEndTimestampRef.current = data.sessionEndTimestamp;
          activeSegmentStartRef.current = data.activeSegmentStartTimestamp || now;
          baseAccumulatedRef.current = data.baseAccumulatedSeconds || 0;
          baseIntervalRef.current = data.baseIntervalSeconds || 0;
          if (data.customMinutes) {
            setCustomMinutes(data.customMinutes);
            customMinutesRef.current = data.customMinutes;
          }
          if (data.totalSeconds) {
            setTotalSeconds(data.totalSeconds);
            totalSecondsRef.current = data.totalSeconds;
          }
          setTimeLeft(remSecs);

          const elapsedInSegment = Math.max(0, Math.floor((now - (data.activeSegmentStartTimestamp || now)) / 1000));
          const totalAcc = Math.min(data.totalSeconds || 1500, (data.baseAccumulatedSeconds || 0) + elapsedInSegment);
          setAccumulatedSeconds(totalAcc);
          accumulatedElapsedRef.current = totalAcc;

          const totalInt = (data.baseIntervalSeconds || 0) + elapsedInSegment;
          setIntervalSeconds(totalInt);
          intervalElapsedRef.current = totalInt;

          isRunningRef.current = true;
          isPausedRef.current = false;
          setIsRunning(true);
          setIsPaused(false);
          setPetFocusState(data.timerMode === 'focus' ? 'studying' : 'happy');
        }
      } else if (data.isPaused && typeof data.timeLeft === 'number') {
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          setSessionId(data.sessionId);
        }
        if (data.customMinutes) {
          setCustomMinutes(data.customMinutes);
          customMinutesRef.current = data.customMinutes;
        }
        if (data.totalSeconds) {
          setTotalSeconds(data.totalSeconds);
          totalSecondsRef.current = data.totalSeconds;
        }
        setTimeLeft(data.timeLeft);
        if (data.baseAccumulatedSeconds) {
          setAccumulatedSeconds(data.baseAccumulatedSeconds);
          accumulatedElapsedRef.current = data.baseAccumulatedSeconds;
        }
        isRunningRef.current = false;
        isPausedRef.current = true;
        setIsRunning(false);
        setIsPaused(true);
        userHasCustomizedDurationRef.current = true;
      }
    } catch (e) {
      console.warn('Error restoring timer from localStorage:', e);
    }
  }, [clearTimerStorage]);

  // Precise 500ms ticker to keep the UI perfectly synchronized with wall-clock time
  useEffect(() => {
    if (isRunning && !isPaused) {
      setPetFocusState(timerMode === 'focus' ? 'studying' : 'happy');
      recalculateFromTimestamps();

      timerRef.current = setInterval(() => {
        recalculateFromTimestamps();
      }, 500);
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
  }, [isRunning, isPaused, timerMode, recalculateFromTimestamps]);

  // Natural countdown completion trigger
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft === 0 && !isCompletingRef.current) {
      if (handleCompleteRef.current) {
        handleCompleteRef.current();
      }
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

      const targetDurationSecs = (customMinutesRef.current > 0 ? customMinutesRef.current : 25) * 60;
      setTotalSeconds(targetDurationSecs);
      setTimeLeft(targetDurationSecs);

      const now = Date.now();
      sessionEndTimestampRef.current = now + targetDurationSecs * 1000;
      activeSegmentStartRef.current = now;
      baseAccumulatedRef.current = 0;
      baseIntervalRef.current = 0;
      intervalElapsedRef.current = 0;
      setIntervalSeconds(0);
      accumulatedElapsedRef.current = 0;
      setAccumulatedSeconds(0);

      isRunningRef.current = true;
      isPausedRef.current = false;
      setIsRunning(true);
      setIsPaused(false);
      setPetFocusState(timerMode === 'focus' ? 'studying' : 'happy');
      sounds.playTimerStart();

      const subjectTitle = selectedSubject?.name || activeTask?.name || customSubjectName || 'Focus Task';
      const subjectId = selectedSubject?.id || selectedSubject?._id || undefined;

      syncTimerToStorage({
        isRunning: true,
        isPaused: false,
        sessionEndTimestamp: sessionEndTimestampRef.current,
        activeSegmentStartTimestamp: now,
        baseAccumulatedSeconds: 0,
        baseIntervalSeconds: 0,
        timeLeft: targetDurationSecs,
        totalSeconds: targetDurationSecs,
      });

      broadcastTimerEvent('TIMER_START', {
        sessionEndTimestamp: sessionEndTimestampRef.current,
        durationMinutes: customMinutesRef.current,
        totalSeconds: targetDurationSecs,
        subjectName: subjectTitle,
      });

      if (timerMode === 'focus') {
        const payload = {
          taskId: activeTask?._id || undefined,
          subjectId: subjectId,
          subjectName: subjectTitle,
          colorTag: selectedColor,
          durationMinutes: customMinutesRef.current,
        };

        const startPromise = api.startSession(payload)
          .then((res) => {
            if (res && res.success && res.session) {
              setSessionId(res.session._id);
              sessionIdRef.current = res.session._id;
              syncTimerToStorage({ sessionId: res.session._id });
              broadcastTimerEvent('TIMER_START', {
                sessionId: res.session._id,
                sessionEndTimestamp: sessionEndTimestampRef.current,
                durationMinutes: customMinutesRef.current,
              });
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
      isRunningRef.current = true;
      isPausedRef.current = false;
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
      isCompletingRef.current = false;

      const now = Date.now();
      const goalSecs = totalSecondsRef.current || (customMinutesRef.current ? customMinutesRef.current * 60 : 1500);
      const accumulated = accumulatedElapsedRef.current || 0;
      const remainingSecs = timeLeft > 0 ? timeLeft : Math.max(0, goalSecs - accumulated);
      sessionEndTimestampRef.current = now + remainingSecs * 1000;
      activeSegmentStartRef.current = now;
      baseAccumulatedRef.current = accumulated;
      baseIntervalRef.current = 0;
      intervalElapsedRef.current = 0;
      setIntervalSeconds(0);

      isRunningRef.current = true;
      isPausedRef.current = false;
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

      syncTimerToStorage({
        isRunning: true,
        isPaused: false,
        sessionEndTimestamp: sessionEndTimestampRef.current,
        activeSegmentStartTimestamp: now,
        baseAccumulatedSeconds: baseAccumulatedRef.current,
        baseIntervalSeconds: 0,
        timeLeft: remainingSecs,
      });

      broadcastTimerEvent('TIMER_RESUME', {
        sessionId: currId,
        sessionEndTimestamp: sessionEndTimestampRef.current,
        timeLeft: remainingSecs,
      });
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

      const now = Date.now();
      const segmentElapsed = activeSegmentStartRef.current
        ? Math.max(0, Math.floor((now - activeSegmentStartRef.current) / 1000))
        : 0;

      const currentTotal = (baseAccumulatedRef.current || 0) + segmentElapsed;
      const currentInterval = (baseIntervalRef.current || 0) + segmentElapsed;

      baseAccumulatedRef.current = currentTotal;
      baseIntervalRef.current = currentInterval;
      accumulatedElapsedRef.current = currentTotal;
      setAccumulatedSeconds(currentTotal);
      intervalElapsedRef.current = currentInterval;
      setIntervalSeconds(currentInterval);

      const currentRemaining = sessionEndTimestampRef.current
        ? Math.max(0, Math.ceil((sessionEndTimestampRef.current - now) / 1000))
        : timeLeft;
      setTimeLeft(currentRemaining);

      sessionEndTimestampRef.current = null;
      activeSegmentStartRef.current = null;

      isRunningRef.current = false;
      isPausedRef.current = true;
      setIsRunning(false);
      setIsPaused(true);
      setPetFocusState('idle');

      const currId = sessionIdRef.current || sessionId;
      const intervalSecs = currentInterval;
      const totalActual = currentTotal;

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

      syncTimerToStorage({
        isRunning: false,
        isPaused: true,
        sessionEndTimestamp: null,
        activeSegmentStartTimestamp: null,
        baseAccumulatedSeconds: currentTotal,
        baseIntervalSeconds: currentInterval,
        timeLeft: currentRemaining,
      });

      broadcastTimerEvent('TIMER_PAUSE', {
        sessionId: currId,
        timeLeft: currentRemaining,
        intervalSeconds: currentInterval,
      });
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
    sessionEndTimestampRef.current = null;
    activeSegmentStartRef.current = null;
    baseAccumulatedRef.current = 0;
    baseIntervalRef.current = 0;
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setSessionId(null);
    sessionIdRef.current = null;
    accumulatedElapsedRef.current = 0;
    setAccumulatedSeconds(0);
    intervalElapsedRef.current = 0;
    setIntervalSeconds(0);
    userHasCustomizedDurationRef.current = false;
    const resetDuration = totalSeconds > 0 ? totalSeconds : (customMinutesRef.current || 25) * 60;
    setTimeLeft(resetDuration);
    setPauseCount(0);
    setPetFocusState('idle');
    setCompletionData(null);
    setCompletionError(null);
    clearTimerStorage();
    broadcastTimerEvent('TIMER_RESET', {});
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
    sessionEndTimestampRef.current = null;
    activeSegmentStartRef.current = null;
    baseAccumulatedRef.current = 0;
    baseIntervalRef.current = 0;
    accumulatedElapsedRef.current = 0;
    setAccumulatedSeconds(0);
    intervalElapsedRef.current = 0;
    setIntervalSeconds(0);
    const nextDuration = (customMinutesRef.current > 0 ? customMinutesRef.current : 25) * 60;
    setTimeLeft(nextDuration);
    setTotalSeconds(nextDuration);
    setPauseCount(0);
    setPetFocusState('idle');
    clearTimerStorage();
    broadcastTimerEvent('TIMER_RESET', {});
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

    sessionEndTimestampRef.current = null;
    activeSegmentStartRef.current = null;
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(0);
    setPetFocusState('happy');
    clearTimerStorage();

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

    broadcastTimerEvent('TIMER_COMPLETE', { sessionId: currId });

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
          durationMinutes: customMinutesRef.current,
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

  // Keep handleCompleteRef updated
  useEffect(() => {
    handleCompleteRef.current = handleComplete;
  });

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

    const newMins = Math.ceil(finalTotal / 60);
    setTotalSeconds(finalTotal);
    totalSecondsRef.current = finalTotal;
    setTimeLeft(finalTotal);
    setCustomMinutes(newMins);
    customMinutesRef.current = newMins;
    userHasCustomizedDurationRef.current = true;
    syncTimerToStorage({
      totalSeconds: finalTotal,
      customMinutes: newMins,
      timeLeft: finalTotal,
    });
    setActiveEditField(null);
  };

  // Editable Segment Component with Bold Modern Fitness/Tracker Typography
  const EditableSegment = ({ field, label, value, activeField, inputVal, onFocus, onChange, onSubmit, colon }) => {
    const isEditing = activeField === field;
    return (
      <div className="flex items-center">
        <div
          className={`flex items-baseline ${!isRunning && !isPaused ? 'cursor-pointer hover:opacity-80 transition' : ''}`}
          onClick={() => onFocus(field, value)}
        >
          {isEditing ? (
            <input
              type="text"
              autoFocus
              className="w-20 sm:w-28 bg-[#E8F7F0] dark:bg-[#182420] rounded-2xl text-center border-2 border-[#10B981] dark:border-[#34D399] outline-none text-[#0D1F17] dark:text-[#34D399] p-1 font-mono font-black"
              value={inputVal}
              onChange={onChange}
              onBlur={() => onSubmit(field)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit(field)}
            />
          ) : (
            <span className="font-mono font-black tracking-tight text-[#0D1F17] dark:text-white">
              {String(value).padStart(2, '0')}
            </span>
          )}
          <span className="ml-1 sm:ml-1.5 text-xs sm:text-sm font-black text-[#10B981] dark:text-[#34D399] tracking-widest uppercase">
            {label}
          </span>
        </div>
        {colon && <span className="mx-1 sm:mx-2.5 text-3xl sm:text-5xl font-black font-mono text-emerald-950/20 dark:text-emerald-500/30 select-none -mt-2 sm:-mt-3">:</span>}
      </div>
    );
  };

  // Dynamic values for display
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  // Show hours if > 0 OR if duration is >= 1 hour OR if timer is completely idle (allows editing)
  const showHours = h > 0 || totalSeconds >= 3600 || (!isRunning && !isPaused);

  // Radial progress calculation with thick clean circular lines
  const radius = 138;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalSeconds > 0 ? Math.min(1, accumulatedSeconds / totalSeconds) : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Stopwatch 60-second circular progress
  const swSecondsInMinute = stopwatchSeconds % 60;
  const swProgressRatio =
    stopwatchSeconds > 0
      ? (swSecondsInMinute === 0 && stopwatchIsRunning ? 1 : swSecondsInMinute / 60)
      : 0;
  const swStrokeDashoffset = circumference - swProgressRatio * circumference;

  const activeSubjectName =
    selectedSubject?.name || activeTask?.name || (customSubjectName ? customSubjectName : 'Core Study Task');
  const activeColorInfo = getSubjectColor(selectedColor);

  const isIntervalEligibleForFreeBreak = intervalSeconds >= 1500;
  const isAnyTimerRunning = timerMode === 'stopwatch' ? stopwatchIsRunning : isRunning;

  // Formatted stopwatch units
  const swH = String(Math.floor(stopwatchSeconds / 3600)).padStart(2, '0');
  const swM = String(Math.floor((stopwatchSeconds % 3600) / 60)).padStart(2, '0');
  const swS = String(stopwatchSeconds % 60).padStart(2, '0');

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

      {/* Background Notification Status / Permissions Banner */}
      {pushStatus.supported && (
        <div className="space-y-2">
          {pushStatus.subscribed ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 text-xs">
              <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Background alerts active (Lock-screen & background push enabled)</span>
              </div>
              <div className="flex items-center space-x-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleTestPushNotification}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Test Alert
                </button>
                <span className="text-emerald-300 dark:text-emerald-700">•</span>
                <button
                  type="button"
                  onClick={handleTogglePushNotifications}
                  disabled={pushStatus.loading}
                  className="text-[11px] text-[#576560] dark:text-[#8BA398] hover:text-rose-600 cursor-pointer"
                >
                  Disable
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#E8F5EE] dark:bg-[#162420] text-[#1B3B2F] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="font-extrabold text-[#1C2A24] dark:text-[#F2F7F4]">
                    Enable Background Session Alerts
                  </span>
                  <span className="text-[#576560] dark:text-[#8BA398] text-[11px] ml-2 hidden sm:inline">
                    Know the exact second your session ends, even when your phone is locked or browser is closed.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTogglePushNotifications}
                disabled={pushStatus.loading}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-[#1B3B2F] hover:bg-[#142C23] text-white font-black text-[11px] shadow-xs transition cursor-pointer flex-shrink-0 flex items-center justify-center space-x-1.5"
              >
                <Bell className="w-3 h-3" />
                <span>{pushStatus.loading ? 'Enabling...' : 'Enable Alerts'}</span>
              </button>
            </div>
          )}

          {/* iOS Safari Tip */}
          {isIOS() && !isStandalonePWA() && (
            <div className="text-[11px] text-[#576560] dark:text-[#8BA398] bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl px-3 py-1.5 flex items-center space-x-2">
              <span>💡</span>
              <span>
                <strong>iPhone / iPad tip:</strong> Tap <strong>Share</strong> ➔ <strong>'Add to Home Screen'</strong> to allow background push notifications when your phone is locked.
              </span>
            </div>
          )}

          {/* Notification feedback message */}
          {pushNotice && (
            <div
              className={`p-2.5 rounded-xl text-xs font-bold animate-in fade-in duration-200 ${
                pushNotice.type === 'error'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {pushNotice.text}
            </div>
          )}
        </div>
      )}

      {/* Mode Selector Pill Tabs */}
      <div className="flex bg-[#EAF5F0] dark:bg-[#121A16] p-1.5 rounded-full border border-emerald-900/5 dark:border-white/5 max-w-xl mx-auto justify-between shadow-xs relative">
        <button
          onClick={() => handleModeChange('focus')}
          className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-full text-[11px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            timerMode === 'focus'
              ? 'bg-[#0D1F17] text-white dark:bg-[#10B981] dark:text-[#06140D] shadow-md shadow-emerald-950/15 dark:shadow-emerald-500/25'
              : 'text-[#4A5B53] dark:text-[#94A3B8] hover:text-[#0D1F17] dark:hover:text-white'
          }`}
        >
          Deep Focus
        </button>
        <button
          onClick={() => handleModeChange('shortBreak')}
          className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-full text-[11px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            timerMode === 'shortBreak'
              ? 'bg-[#0D1F17] text-white dark:bg-[#10B981] dark:text-[#06140D] shadow-md shadow-emerald-950/15 dark:shadow-emerald-500/25'
              : 'text-[#4A5B53] dark:text-[#94A3B8] hover:text-[#0D1F17] dark:hover:text-white'
          }`}
        >
          <span className="hidden sm:inline">Short Rest (5m)</span>
          <span className="sm:hidden">Short (5m)</span>
        </button>
        <button
          onClick={() => handleModeChange('longBreak')}
          className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-full text-[11px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            timerMode === 'longBreak'
              ? 'bg-[#0D1F17] text-white dark:bg-[#10B981] dark:text-[#06140D] shadow-md shadow-emerald-950/15 dark:shadow-emerald-500/25'
              : 'text-[#4A5B53] dark:text-[#94A3B8] hover:text-[#0D1F17] dark:hover:text-white'
          }`}
        >
          <span className="hidden sm:inline">Long Rest (15m)</span>
          <span className="sm:hidden">Long (15m)</span>
        </button>
        <button
          onClick={() => handleModeChange('stopwatch')}
          className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-full text-[11px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            timerMode === 'stopwatch'
              ? 'bg-[#0D1F17] text-white dark:bg-[#10B981] dark:text-[#06140D] shadow-md shadow-emerald-950/15 dark:shadow-emerald-500/25'
              : 'text-[#4A5B53] dark:text-[#94A3B8] hover:text-[#0D1F17] dark:hover:text-white'
          }`}
        >
          Stopwatch
        </button>
      </div>

      {/* Main Study Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
        {/* LEFT COLUMN: Pomodoro Dial / Stopwatch & Subject Selector (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#121A17] rounded-3xl border border-emerald-900/5 dark:border-white/5 p-6 sm:p-10 shadow-sm flex flex-col justify-center items-center relative overflow-visible z-20">
          
          {/* BIG CLICKABLE SUBJECT SELECTOR */}
          <div ref={subjectMenuRef} className="relative w-full z-40">
            <div
              onClick={() => !isAnyTimerRunning && setShowSubjectMenu(!showSubjectMenu)}
              className={`w-full bg-[#F8FAF9] dark:bg-[#16201C] rounded-2xl p-4 sm:p-4.5 border border-emerald-900/5 dark:border-white/5 flex items-center justify-between transition-all ${
                !isAnyTimerRunning
                  ? 'cursor-pointer hover:border-emerald-500/30 dark:hover:border-emerald-500/30 shadow-xs'
                  : 'opacity-85'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs ring-4 ring-emerald-500/20"
                  style={{ backgroundColor: activeColorInfo.hex }}
                />
                <div className="text-left truncate">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#64748B] dark:text-[#94A3B8] block">
                    What are you focusing on?
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-[#0D1F17] dark:text-white truncate mt-0.5 tracking-tight">
                    {activeSubjectName}
                  </h3>
                </div>
              </div>

              {!isAnyTimerRunning && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1E2C26] text-xs font-black text-[#0D1F17] dark:text-white border border-black/5 dark:border-white/10 shadow-xs hover:bg-[#E8F7F0] dark:hover:bg-[#253931] transition-all flex-shrink-0">
                    <span>Change</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        showSubjectMenu ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Popover Subject Menu */}
            {!isAnyTimerRunning && showSubjectMenu && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-full bg-white dark:bg-[#162420] border-2 border-[#1B3B2F]/20 dark:border-[#34D399]/40 rounded-2xl shadow-2xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                <div className="text-[11px] font-extrabold text-[#576560] dark:text-[#8BA398] uppercase tracking-wider px-1">
                  Today's Planned Subjects ({todayKey}):
                </div>

                {displaySubjects.length === 0 ? (
                  <p className="text-xs text-[#8A9791] px-1 py-2 font-medium">
                    No timetable set for today. Study freely.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {displaySubjects.map((sub) => {
                      const effMins = getEffectiveGoalMinutes(sub);
                      const isSelected =
                        (selectedSubject && (selectedSubject.id === sub.id || selectedSubject._id === sub.id)) ||
                        (activeSubjectName && sub.name && activeSubjectName.trim().toLowerCase() === sub.name.trim().toLowerCase());
                      return (
                        <button
                          key={sub.id || sub._id}
                          onClick={() => handleSelectSubject(sub)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#1B3B2F]/10 dark:bg-[#34D399]/15 text-[#1B3B2F] dark:text-[#34D399] font-black'
                              : 'hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] text-[#1C2A24] dark:text-[#F2F7F4]'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <span
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs"
                              style={{ backgroundColor: sub.color || sub.colorTag || '#3B82F6' }}
                            />
                            <span className="truncate">{sub.name}</span>
                          </div>
                          <span className="text-[10px] text-[#8A9791] flex-shrink-0 font-mono ml-2">
                            {effMins}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {timerMode === 'stopwatch' ? (
            <>
              {/* Stopwatch Status Pill */}
              <div className="mt-6 sm:mt-8 w-full max-w-md mx-auto flex items-center justify-between px-5 py-3 rounded-2xl bg-[#F8FAF9] dark:bg-[#16201C] border border-emerald-900/5 dark:border-white/5 text-xs shadow-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] dark:text-[#94A3B8]">Mode:</span>
                  <span className="font-black text-sm text-[#0D1F17] dark:text-[#34D399]">Continuous Stopwatch</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      stopwatchIsRunning
                        ? 'bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]'
                        : stopwatchIsPaused
                        ? 'bg-amber-500 shadow-[0_0_8px_#F59E0B]'
                        : 'bg-stone-400'
                    }`}
                  />
                  <span
                    className={`font-black text-[11px] uppercase tracking-wider ${
                      stopwatchIsRunning
                        ? 'text-emerald-600 dark:text-[#34D399]'
                        : stopwatchIsPaused
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[#82948C]'
                    }`}
                  >
                    {stopwatchIsRunning ? 'Counting Up' : stopwatchIsPaused ? 'Paused' : 'Ready'}
                  </span>
                </div>
              </div>

              {/* Dedicated Stopwatch Circular Dial with Large Digits */}
              <div className="relative z-0 my-8 flex items-center justify-center w-full min-h-[350px] sm:min-h-[380px]">
                <div className="relative flex items-center justify-center">
                  <svg className="w-72 h-72 sm:w-84 sm:h-84 md:w-92 md:h-92 transform -rotate-90" viewBox="0 0 320 320">
                    <defs>
                      <linearGradient id="stopwatchProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="160"
                      cy="160"
                      r={radius}
                      className="text-[#E6F4ED] dark:text-[#182420]"
                      strokeWidth="18"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="160"
                      cy="160"
                      r={radius}
                      stroke="url(#stopwatchProgressGradient)"
                      strokeWidth="20"
                      strokeDasharray={circumference}
                      strokeDashoffset={swStrokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-linear"
                      style={{ filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.35))' }}
                    />
                  </svg>

                  {/* Inner Clock Face readout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <div className="flex items-center justify-center font-mono font-black text-4xl sm:text-5xl md:text-6xl tracking-tight text-[#0D1F17] dark:text-white">
                      <div className="flex flex-col items-center">
                        <span>{swH}</span>
                        <span className="text-[9px] sm:text-[10px] font-black text-[#10B981] dark:text-[#34D399] tracking-widest mt-1">HRS</span>
                      </div>
                      <span className={`text-emerald-950/20 dark:text-emerald-500/30 px-1.5 sm:px-2 -mt-3 select-none ${stopwatchIsRunning ? 'animate-pulse' : ''}`}>:</span>
                      <div className="flex flex-col items-center">
                        <span>{swM}</span>
                        <span className="text-[9px] sm:text-[10px] font-black text-[#10B981] dark:text-[#34D399] tracking-widest mt-1">MIN</span>
                      </div>
                      <span className={`text-emerald-950/20 dark:text-emerald-500/30 px-1.5 sm:px-2 -mt-3 select-none ${stopwatchIsRunning ? 'animate-pulse' : ''}`}>:</span>
                      <div className="flex flex-col items-center">
                        <span>{swS}</span>
                        <span className="text-[9px] sm:text-[10px] font-black text-[#10B981] dark:text-[#34D399] tracking-widest mt-1">SEC</span>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-5 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#E8F7F0] dark:bg-[#182420] border border-[#A7F3D0]/60 dark:border-[#34D399]/25 shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-[#10B981] dark:text-[#34D399]" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#0D1F17] dark:text-[#E2ECE6]">
                        {stopwatchIsRunning
                          ? 'Continuous Study Flow'
                          : stopwatchIsPaused
                          ? 'Stopwatch Paused'
                          : 'Ready to Track Focus'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stopwatch Controls (Start, Pause, Resume, Reset, Stop) */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full justify-center mt-2 sm:mt-4">
                {!stopwatchIsRunning && !stopwatchIsPaused ? (
                  <button
                    onClick={handleStartStopwatch}
                    className="flex items-center space-x-2.5 bg-[#0D1F17] hover:bg-[#06100B] text-white dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#06140D] px-10 sm:px-12 py-4 rounded-full font-black text-sm tracking-wider uppercase shadow-lg shadow-emerald-950/15 dark:shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>START STOPWATCH</span>
                  </button>
                ) : stopwatchIsRunning ? (
                  <>
                    <button
                      onClick={handlePauseStopwatch}
                      className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white px-8 sm:px-9 py-3.5 rounded-full font-black text-sm tracking-wide shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                    <button
                      onClick={handleStopStopwatch}
                      className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-7 sm:px-8 py-3.5 rounded-full font-black text-sm tracking-wide shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      title="Stop and record session"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>STOP</span>
                    </button>
                    <button
                      onClick={handleResetStopwatch}
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-[#182420] dark:hover:bg-[#20302A] text-stone-500 dark:text-stone-400 border border-stone-200/60 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                      title="Reset Stopwatch"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleResumeStopwatch}
                      className="flex items-center space-x-2.5 bg-[#0D1F17] hover:bg-[#06100B] text-white dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#06140D] px-8 sm:px-9 py-3.5 rounded-full font-black text-sm tracking-wider uppercase shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume</span>
                    </button>
                    <button
                      onClick={handleStopStopwatch}
                      className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-7 sm:px-8 py-3.5 rounded-full font-black text-sm tracking-wide shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      title="Stop and record session"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>STOP</span>
                    </button>
                    <button
                      onClick={handleResetStopwatch}
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-[#182420] dark:hover:bg-[#20302A] text-stone-500 dark:text-stone-400 border border-stone-200/60 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                      title="Reset Stopwatch"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Accidental Close Recovery Banner for Unsaved Stopwatch Session */}
              {pendingStopwatchSession && (
                <div className="mt-4 sm:mt-5 w-full max-w-md mx-auto bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div className="text-xs truncate">
                      <div className="font-black text-amber-950 dark:text-amber-200 truncate">
                        Unsaved Session ({formatTimerHMS(pendingStopwatchSession.elapsedSeconds)})
                      </div>
                      <div className="text-amber-700 dark:text-amber-400 text-[11px] truncate">
                        Ready to save to your focus history
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        sounds.playClick?.();
                        setShowStopwatchModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleDiscardStopwatch}
                      className="px-2.5 py-1.5 rounded-full text-stone-500 hover:text-stone-700 dark:text-stone-400 font-bold text-xs cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Focus Interval Info / Status */}
              <div className="mt-6 sm:mt-8 w-full max-w-md mx-auto flex items-center justify-between px-5 py-3 rounded-2xl bg-[#F8FAF9] dark:bg-[#16201C] border border-emerald-900/5 dark:border-white/5 text-xs shadow-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] dark:text-[#94A3B8]">
                    Focus Interval:
                  </span>
                  <span className="font-mono font-black text-sm sm:text-base text-[#0D1F17] dark:text-[#34D399]">
                    {formatMMSS(intervalSeconds)} / 25:00
                  </span>
                </div>

                <div>
                  {isIntervalEligibleForFreeBreak ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D1FAE5] dark:bg-[#10B981]/20 text-[#065F46] dark:text-[#34D399] font-black text-[11px]">
                      <span>Free Break Ready</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black text-[11px] border border-amber-200 dark:border-amber-800/40">
                      <span>−1 Coin penalty</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Session Metrics Bar (Total Duration, Elapsed Time, Remaining Time, Status) */}
              {(isRunning || isPaused || accumulatedSeconds > 0) && (
                <div className="mt-3 w-full max-w-md mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 py-2.5 rounded-2xl bg-[#F8FAF9] dark:bg-[#16201C] border border-emerald-900/5 dark:border-white/5 text-[11px] shadow-xs">
                  <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#111A16] border border-emerald-900/5 dark:border-white/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Total Duration</span>
                    <span className="font-mono font-black text-[#0D1F17] dark:text-white mt-0.5">{formatDigitalHMS(totalSeconds)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#111A16] border border-emerald-900/5 dark:border-white/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Elapsed Time</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-[#34D399] mt-0.5">{formatDigitalHMS(accumulatedSeconds)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#111A16] border border-emerald-900/5 dark:border-white/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Remaining</span>
                    <span className="font-mono font-black text-[#0D1F17] dark:text-white mt-0.5">{formatDigitalHMS(timeLeft)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#111A16] border border-emerald-900/5 dark:border-white/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Status</span>
                    <span className={`font-black uppercase tracking-wider mt-0.5 ${
                      isPaused
                        ? 'text-amber-500'
                        : isRunning
                        ? 'text-emerald-500 animate-pulse'
                        : 'text-stone-400'
                    }`}>
                      {isPaused ? 'PAUSED' : isRunning ? 'IN FLOW' : 'READY'}
                    </span>
                  </div>
                </div>
              )}

              {/* Radial Timer Dial with HUGE Interactive Numbers */}
              <div className="relative z-0 my-8 flex items-center justify-center w-full min-h-[350px] sm:min-h-[380px]">
                <div className="relative flex items-center justify-center">
                  <svg className="w-72 h-72 sm:w-84 sm:h-84 md:w-92 md:h-92 transform -rotate-90" viewBox="0 0 320 320">
                    <defs>
                      <linearGradient id="focusProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                    {/* Background Track Circle */}
                    <circle
                      cx="160"
                      cy="160"
                      r={radius}
                      className="text-[#E6F4ED] dark:text-[#182420]"
                      strokeWidth="18"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Animated Progress Circle */}
                    <circle
                      cx="160"
                      cy="160"
                      r={radius}
                      stroke={selectedSubject?.color || 'url(#focusProgressGradient)'}
                      strokeWidth="20"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-linear"
                      style={{ filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.35))' }}
                    />
                  </svg>

                  {/* Inner Clock Face readout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <div className="flex items-center justify-center text-5xl sm:text-6xl md:text-7xl font-black font-mono tracking-tight text-[#0D1F17] dark:text-white">
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

                    <div className="mt-4 sm:mt-5 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#E8F7F0] dark:bg-[#182420] border border-[#A7F3D0]/60 dark:border-[#34D399]/25 shadow-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isRunning && !isPaused
                            ? 'bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]'
                            : isPaused
                            ? 'bg-amber-500 shadow-[0_0_8px_#F59E0B]'
                            : 'bg-stone-400'
                        }`}
                      />
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#0D1F17] dark:text-[#E2ECE6]">
                        {isPaused ? 'Session Paused' : isRunning ? 'In Deep Flow' : 'Ready to Focus'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Controls (Start, Break / Pause, Resume, Stop) */}
              <div className="flex items-center space-x-4 w-full justify-center mt-2 sm:mt-4">
                {isAlarmPlaying ? (
                  <button
                    onClick={handleStopAlarm}
                    className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-full font-black text-sm shadow-lg transition transform hover:scale-105 cursor-pointer animate-pulse"
                  >
                    <BellOff className="w-5 h-5" />
                    <span>STOP ALARM</span>
                  </button>
                ) : !isRunning && !isPaused ? (
                  <button
                    onClick={() => handleStartOrResumeClick('start')}
                    className="flex items-center space-x-2.5 bg-[#0D1F17] hover:bg-[#06100B] text-white dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#06140D] px-10 sm:px-12 py-4 rounded-full font-black text-sm tracking-wider uppercase shadow-lg shadow-emerald-950/15 dark:shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>START FOCUS</span>
                  </button>
                ) : isPaused ? (
                  <>
                    <button
                      onClick={() => handleStartOrResumeClick('resume')}
                      className="flex items-center space-x-2.5 bg-[#0D1F17] hover:bg-[#06100B] text-white dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#06140D] px-9 py-4 rounded-full font-black text-sm tracking-wider uppercase shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume Focus</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-[#182420] dark:hover:bg-[#20302A] text-stone-500 dark:text-stone-400 border border-stone-200/60 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                      title="Cancel Focus Session"
                    >
                      <Square className="w-4 h-4 text-rose-500 fill-rose-500" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Active running: user can take break */}
                    <button
                      onClick={handleBreakButtonClick}
                      className={`flex items-center space-x-2 border-2 px-8 py-3.5 rounded-full font-black text-sm tracking-wide shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
                        isIntervalEligibleForFreeBreak
                          ? 'bg-[#E8F7F0] hover:bg-[#D5EFE3] text-[#065F46] border-[#10B981]/40 dark:bg-[#10B981]/20 dark:hover:bg-[#10B981]/30 dark:text-[#34D399] dark:border-[#34D399]/40'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800/60'
                      }`}
                    >
                      <Pause className="w-4 h-4" />
                      <span>{isIntervalEligibleForFreeBreak ? 'Take Free Break' : 'Take Break (−1 Coin)'}</span>
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-[#182420] dark:hover:bg-[#20302A] text-stone-500 dark:text-stone-400 border border-stone-200/60 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                      title="Cancel Focus Session"
                    >
                      <Square className="w-4 h-4 text-rose-500 fill-rose-500" />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive 2D Mascot Companion */}
        <div className="lg:col-span-5 bg-white dark:bg-[#121A17] rounded-3xl border border-emerald-900/5 dark:border-white/5 shadow-sm flex items-center justify-center overflow-hidden h-full min-h-[420px] relative">
          <div className="w-full h-full bg-white dark:bg-[#121A17] flex items-center justify-center relative">
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
                className="w-full sm:flex-1 py-3.5 rounded-full bg-[#0D1F17] hover:bg-[#06100B] text-white dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#06140D] font-black text-xs tracking-wide shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Continue Studying
              </button>
              <button
                type="button"
                onClick={handleConfirmEarlyBreak}
                className="w-full sm:flex-1 py-3.5 rounded-full border-2 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-black text-xs tracking-wide transition-all cursor-pointer"
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

      {/* STOPWATCH SAVE & ACTIVITY LOGGING MODAL */}
      <StopwatchSaveModal
        isOpen={showStopwatchModal}
        pendingSession={pendingStopwatchSession}
        subjects={displaySubjects}
        onSave={handleSaveStopwatchSession}
        onDiscard={handleDiscardStopwatch}
        onClose={() => setShowStopwatchModal(false)}
      />
    </div>
  );
};

export default FocusPage;