import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Trash2, X, Sparkles, Tag, BookOpen, AlertCircle } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

export const formatTimerHMS = (totalSeconds) => {
  const totalSecs = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const StopwatchSaveModal = ({
  isOpen,
  pendingSession,
  subjects = [],
  onSave,
  onDiscard,
  onClose,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quick suggestions from user requirements
  const SUGGESTIONS = [
    'Working on Backend',
    'Building authentication API',
    'Studying DSA',
    'Working on Evenjo website',
  ];

  // Initialize form when pendingSession opens
  useEffect(() => {
    if (pendingSession) {
      if (pendingSession.subjectId) {
        setSelectedSubjectId(pendingSession.subjectId);
      } else if (pendingSession.subjectName) {
        const match = subjects.find(
          (s) => s.name?.toLowerCase() === pendingSession.subjectName.toLowerCase()
        );
        if (match) {
          setSelectedSubjectId(match.id || match._id);
        } else {
          setSelectedSubjectId('custom');
          setCustomSubjectName(pendingSession.subjectName);
        }
      } else if (subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id || subjects[0]._id || '');
      } else {
        setSelectedSubjectId('custom');
      }

      setActivityDescription(pendingSession.activityDescription || '');
      setErrorMessage('');
      setIsSaving(false);
    }
  }, [pendingSession, subjects]);

  if (!isOpen || !pendingSession) return null;

  const elapsedSecs = pendingSession.elapsedSeconds || 0;
  const formattedDuration = formatTimerHMS(elapsedSecs);

  // Compute final activity name
  const currentSubject = subjects.find(
    (s) => s.id === selectedSubjectId || s._id?.toString() === selectedSubjectId
  );
  const computedActivityName =
    selectedSubjectId === 'custom'
      ? customSubjectName.trim() || activityDescription.trim() || 'Custom Activity'
      : currentSubject?.name || customSubjectName.trim() || 'Focus';

  const handleSave = async (e) => {
    e?.preventDefault();
    setErrorMessage('');

    const finalActivityName =
      selectedSubjectId === 'custom'
        ? (customSubjectName.trim() || activityDescription.trim() || 'Custom Activity')
        : (currentSubject?.name || 'Focus');

    const finalDescription = activityDescription.trim() || finalActivityName;

    try {
      setIsSaving(true);
      await onSave({
        activityName: finalActivityName,
        taskName: finalActivityName,
        activityDescription: finalDescription,
        subjectId: selectedSubjectId === 'custom' ? null : (selectedSubjectId || null),
        actualSeconds: elapsedSecs,
        durationSeconds: elapsedSecs,
        startTime: pendingSession.startTime || new Date(Date.now() - elapsedSecs * 1000).toISOString(),
        endTime: pendingSession.endTime || new Date().toISOString(),
      });
      sounds.playLevelUp?.();
    } catch (err) {
      console.error('Failed to save stopwatch session:', err);
      setErrorMessage(err.message || 'Failed to save session. Please try again.');
      setIsSaving(false);
    }
  };

  const handleDiscardClick = () => {
    sounds.playClick?.();
    if (window.confirm('Are you sure you want to discard this stopwatch session? This time will not be recorded in your focus history.')) {
      onDiscard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#121A17] border border-emerald-950/10 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-5 relative text-[#0D1F17] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close / Dismiss Button (Accidental Close Preserved) */}
        <button
          onClick={() => {
            sounds.playClick?.();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 transition cursor-pointer"
          title="Close (Session will be preserved)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-[#E8F7F0] dark:bg-[#182420] text-[#10B981] dark:text-[#34D399] flex items-center justify-center shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-[#0D1F17] dark:text-white">
              Session Completed!
            </h3>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              What did you work on during this session?
            </p>
          </div>
        </div>

        {/* Duration Callout Card */}
        <div className="p-4 rounded-2xl bg-[#F6FAF7] dark:bg-[#16201C] border border-emerald-900/5 dark:border-white/5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
              Recorded Duration
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#0D1F17] dark:text-white">
              {formattedDuration}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#C48255]/15 dark:bg-[#C48255]/25 border border-[#C48255]/30 text-[11px] font-black text-[#8A4820] dark:text-[#E2A67D]">
              <span className="w-2 h-2 rounded-full bg-[#C48255]"></span>
              <span>Stopwatch</span>
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. Associate with Task/Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Associate Task</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setErrorMessage('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#182420] border border-stone-200 dark:border-white/10 text-xs sm:text-sm font-bold text-[#0D1F17] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#10B981] transition cursor-pointer"
            >
              {subjects.map((sub) => (
                <option key={sub.id || sub._id} value={sub.id || sub._id}>
                  {sub.name} {sub.targetMinutes ? `(${sub.targetMinutes}m goal)` : ''}
                </option>
              ))}
              <option value="custom">+ Custom name</option>
            </select>
          </div>

          {/* Custom Subject Name if selected */}
          {selectedSubjectId === 'custom' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300">
                Custom Name
              </label>
              <input
                type="text"
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                placeholder="e.g. Research,English reading"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#182420] border border-stone-200 dark:border-white/10 text-xs sm:text-sm font-bold text-[#0D1F17] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#10B981] transition"
              />
            </div>
          )}


     

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons: Save Session & Discard */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={handleDiscardClick}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-full font-black text-xs tracking-wider uppercase border border-stone-200 dark:border-white/10 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/30 dark:hover:border-rose-800 text-stone-600 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-2 py-3 px-6 rounded-full font-black text-xs tracking-wider uppercase bg-[#0D1F17] hover:bg-[#06100B] text-white dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#06140D] shadow-lg shadow-emerald-950/15 dark:shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Session'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

