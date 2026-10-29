import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Play, Pause, Square, Coins, AlertTriangle, Sparkles, CheckCircle2, Bell, BellOff } from 'lucide-react';
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

export const PomodoroTimer = ({
  activeTask,
  onSessionComplete,
  onSessionStop,
  userCoins,
  allDailyTasksCompletedToday = false,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const [pauseCount, setPauseCount] = useState(0);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // Interval & Break tracking
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  const intervalElapsedRef = useRef(0);
  const [showBreakConfirmation, setShowBreakConfirmation] = useState(false);

  // 5-Second Countdown Modal State
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [countdownAction, setCountdownAction] = useState('start');
  const [countdownValue, setCountdownValue] = useState(5);
  const countdownTimerRef = useRef(null);

  // Time remaining in seconds
  const initialDuration = activeTask ? (activeTask.durationMinutes || 25) * 60 : 25 * 60;
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [totalSeconds, setTotalSeconds] = useState(initialDuration);
  const timerRef = useRef(null);
  const isCompletingRef = useRef(false);

  // Stop alarm on unmount
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

  // Update timer duration when activeTask changes and not running
  useEffect(() => {
    if (!isRunning) {
      const secs = activeTask ? (activeTask.durationMinutes || 25) * 60 : 25 * 60;
      setTimeLeft(secs);
      setTotalSeconds(secs);
      setPauseCount(0);
      setIsPaused(false);
    }
  }, [activeTask, isRunning]);

  // Timer countdown loop - reliable interval
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        intervalElapsedRef.current = (intervalElapsedRef.current || 0) + 1;
        setIntervalSeconds((prev) => prev + 1);

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
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused]);

  // Handle natural countdown completion
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft === 0 && !isCompletingRef.current) {
      handleComplete();
    }
  }, [timeLeft, isRunning, isPaused]);

  // 1. Open 5-second countdown modal before starting or resuming
  const handleStartOrResumeClick = (action = 'start') => {
    sounds.playClick();
    sounds.stopAlarm();
    setIsAlarmPlaying(false);
    isCompletingRef.current = false;

    setCountdownAction(action);
    setCountdownValue(5);
    setShowCountdownModal(true);
  };

  // 2. Countdown loop
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

  // 3. User cancels during countdown
  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setShowCountdownModal(false);
    setCountdownValue(5);
  };

  // 4. Start Session after countdown completes
  const executeStartSession = () => {
    try {
      sounds.stopAlarm();
      setIsAlarmPlaying(false);
      isCompletingRef.current = false;

      const durationSecs = totalSeconds > 0 ? totalSeconds : (activeTask?.durationMinutes || 25) * 60;
      if (!timeLeft || timeLeft <= 0) {
        setTimeLeft(durationSecs);
      }
      if (!totalSeconds || totalSeconds <= 0) {
        setTotalSeconds(durationSecs);
      }

      intervalElapsedRef.current = 0;
      setIntervalSeconds(0);

      setIsRunning(true);
      setIsPaused(false);
      setPauseCount(0);
      sounds.playTimerStart();

      const payload = {
        taskId: activeTask?._id || undefined,
        subjectName: activeTask?.name || 'Focus Session',
        durationMinutes: Math.round(durationSecs / 60),
      };

      api.startSession(payload)
        .then((res) => {
          if (res && res.success && res.session) {
            setSessionId(res.session._id);
            sessionIdRef.current = res.session._id;
          }
        })
        .catch((err) => {
          console.warn('Backend startSession notice (timer continuing locally):', err?.message || err);
        });
    } catch (err) {
      console.error('Failed to start session:', err);
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  // 5. Resume Session: Starts new 25-minute interval
  const executeResumeSession = () => {
    try {
      sounds.playClick();
      sounds.stopAlarm();
      setIsAlarmPlaying(false);

      intervalElapsedRef.current = 0;
      setIntervalSeconds(0);

      setIsRunning(true);
      setIsPaused(false);

      const currId = sessionIdRef.current || sessionId;
      if (currId) {
        api.resumeSession(currId).catch((err) => console.warn('Resume API sync notice:', err));
      }
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  // 6. User clicks Break
  const handleBreakButtonClick = () => {
    if (!isRunning || isPaused) return;

    if (intervalElapsedRef.current < 1500) {
      setShowBreakConfirmation(true);
    } else {
      executePauseSession(false);
    }
  };

  const handleConfirmEarlyBreak = () => {
    setShowBreakConfirmation(false);
    executePauseSession(true);
  };

  const executePauseSession = (isEarlyConfirmed = false) => {
    try {
      if (isEarlyConfirmed) {
        sounds.playPausePenalty();
      } else {
        sounds.playClick();
      }

      setIsRunning(false);
      setIsPaused(true);
      setPauseCount((prev) => prev + 1);

      const currId = sessionIdRef.current || sessionId;
      const intervalSecs = intervalElapsedRef.current || 0;

      if (currId) {
        api.pauseSession(currId, {
          actionId: `break_${currId}_${Date.now()}`,
          intervalSeconds: intervalSecs,
          isEarlyBreakConfirmed: isEarlyConfirmed,
        })
          .then((res) => {
            if (res && res.success && typeof res.pauseCount === 'number') {
              setPauseCount(res.pauseCount);
            }
          })
          .catch((err) => console.warn('Pause API sync notice:', err));
      }
    } catch (err) {
      console.error('Failed to pause session:', err);
    }
  };

  // Stop / Cancel Session
  const handleStop = () => {
    try {
      sounds.playClick();
      sounds.stopAlarm();
      setIsAlarmPlaying(false);

      const currId = sessionIdRef.current || sessionId;
      if (currId) {
        api.stopSession(currId).catch((err) => console.warn('Stop API sync notice:', err));
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRunning(false);
      setIsPaused(false);
      setSessionId(null);
      sessionIdRef.current = null;

      const durationSecs = (activeTask?.durationMinutes || 25) * 60;
      setTimeLeft(durationSecs);
      setTotalSeconds(durationSecs);
      setPauseCount(0);
      intervalElapsedRef.current = 0;
      setIntervalSeconds(0);

      if (onSessionStop) onSessionStop();
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  };

  // Explicit Stop Alarm Action
  const handleStopAlarm = () => {
    sounds.stopAlarm();
    setIsAlarmPlaying(false);
  };

  // Complete Session
  const handleComplete = async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    sounds.startAlarm();
    setIsAlarmPlaying(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRunning(false);
    setIsPaused(false);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
      });
    } catch (e) {}

    let currId = sessionIdRef.current || sessionId;
    if (currId) {
      try {
        const res = await api.completeSession(currId);
        if (res && res.success) {
          sounds.playCoinSound();
          if (onSessionComplete) onSessionComplete(res);
        }
      } catch (err) {
        console.error('Failed to record completion rewards:', err);
      }
    }

    const durationSecs = (activeTask?.durationMinutes || 25) * 60;
    setTimeLeft(durationSecs);
    setTotalSeconds(durationSecs);
    setPauseCount(0);
    setSessionId(null);
    sessionIdRef.current = null;
  };

  // SVG Progress Arc calculation
  const radius = 105;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const taskColor = activeTask?.colorTag || '#10b981';
  const isFreeBreakReady = intervalSeconds >= 1500;

  return (
    <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col items-center relative overflow-hidden">
      {/* Background Radial Glow */}
      <div
        className="absolute w-72 h-72 rounded-full filter blur-3xl opacity-20 pointer-events-none -top-10 -left-10"
        style={{ backgroundColor: taskColor }}
      ></div>

      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span
            className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-700 shadow"
            style={{ backgroundColor: taskColor }}
          ></span>
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider truncate max-w-[180px]">
            {activeTask ? activeTask.name : 'Select a Task to Begin'}
          </span>
        </div>

        {/* Live Interval Focus Status */}
        <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300 font-mono text-xs shadow-inner">
          <span>Interval: {formatMMSS(intervalSeconds)} / 25:00</span>
        </div>
      </div>

      {/* Circular SVG Timer Ring */}
      <div className="relative w-64 h-64 flex items-center justify-center my-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="#1e293b"
            strokeWidth="12"
            fill="transparent"
          />
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke={taskColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Central Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight font-mono drop-shadow-md whitespace-nowrap">
            {formatTimerHMS(timeLeft)}
          </span>
          <span className="text-xs font-semibold text-slate-400 mt-2 uppercase tracking-widest">
            {isPaused ? 'Session Paused' : isRunning ? 'Flow State Active' : 'Ready for Focus'}
          </span>

          {/* Break Status Badge */}
          {isRunning && (
            <div className="mt-2 flex items-center space-x-1 text-xs font-semibold">
              {isFreeBreakReady ? (
                <span className="text-emerald-400 flex items-center space-x-1 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
                  
                  <span>Free Break Ready</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center space-x-1 bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-800/40">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Break: −1 Coin</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timer Control Buttons */}
      <div className="flex items-center space-x-4 mt-6">
        {isAlarmPlaying ? (
          <button
            onClick={handleStopAlarm}
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-black px-7 py-3 rounded-xl shadow-lg hover:shadow-rose-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer animate-pulse"
          >
            <BellOff className="w-5 h-5" />
            <span>STOP ALARM</span>
          </button>
        ) : !isRunning && !isPaused ? (
          <button
            onClick={() => handleStartOrResumeClick('start')}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3.5 rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START FOCUS</span>
          </button>
        ) : isPaused ? (
          <>
            <button
              onClick={() => handleStartOrResumeClick('resume')}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Focus</span>
            </button>
            <button
              onClick={handleStop}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold px-5 py-3 rounded-xl transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>Reset</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleBreakButtonClick}
              className={`flex items-center space-x-2 font-bold px-6 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer ${
                isFreeBreakReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20'
              }`}
            >
              <Pause className="w-4 h-4" />
              <span>{isFreeBreakReady ? 'Take Free Break' : 'Take Break (−1 Coin)'}</span>
            </button>

            <button
              onClick={handleStop}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold px-5 py-3 rounded-xl transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>Reset</span>
            </button>
          </>
        )}
      </div>

      {/* Break Penalty Confirmation Dialog */}
      {showBreakConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              25 minutes abhi complete nahi hue!
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Break lene par 1 coin deduct hoga. Continue studying or take a break?
            </p>

            <div className="bg-slate-800 p-3 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-200">
                <span>Current Interval Focus:</span>
                <span className="font-mono">{formatMMSS(intervalSeconds)} / 25:00</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBreakConfirmation(false)}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Continue Studying
              </button>
              <button
                type="button"
                onClick={handleConfirmEarlyBreak}
                className="w-full sm:flex-1 py-3 rounded-xl border border-rose-500 text-rose-400 hover:bg-rose-950/40 font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Take a Break (−1 Coin)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-Second Countdown Modal */}
      {showCountdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-xs font-bold text-emerald-400">
              <span>🌱 Padhaku Billa Focus Session</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl shadow-inner">
              <p className="text-base sm:text-lg font-black text-white leading-snug">
                “Honest with yourself. I track your time, not your lies.👀”
              </p>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              {countdownAction === 'resume' ? 'Resuming session for' : 'Preparing session for'} <strong className="text-slate-200">{activeTask ? activeTask.name : 'Focus Session'}</strong> ({formatTimerHMS(timeLeft)})
            </div>

            <div className="py-2">
              <span
                key={countdownValue}
                className="text-7xl sm:text-8xl font-black font-mono text-emerald-400 tracking-tighter inline-block animate-pulse"
              >
                {countdownValue}
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
                {countdownAction === 'resume' ? 'Resuming in' : 'Starting in'} {countdownValue} seconds...
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCancelCountdown}
                className="w-full py-3 rounded-2xl border border-slate-700 hover:bg-rose-950/30 text-rose-400 font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Cancel (No focus time recorded)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
