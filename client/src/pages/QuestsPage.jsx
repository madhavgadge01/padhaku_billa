import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus,
  Flame,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  ShieldCheck,
  Play,
  X,
  BookOpen,
  Calendar,
  Sparkles,
  Trophy,
  ArrowRight,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { TaskDeleteConfirmModal } from '../components/TaskDeleteConfirmModal.jsx';
import {
  SUBJECT_COLORS,
  getSubjectColor,
  getSubjectBadgeStyle,
  getSubjectColorAssignments,
  checkColorAvailability,
  getNextAvailableColor,
} from '../utils/subjectColors.js';
import { getStudyDayKey, getStudyDayDate, formatResetTimeDisplay, getWeekdayDateStr } from '../utils/dateUtils.js';

const DAY_NAMES = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const WEEKDAY_ORDER = [
  { key: 'monday', short: 'Mon', num: 1 },
  { key: 'tuesday', short: 'Tue', num: 2 },
  { key: 'wednesday', short: 'Wed', num: 3 },
  { key: 'thursday', short: 'Thu', num: 4 },
  { key: 'friday', short: 'Fri', num: 5 },
  { key: 'saturday', short: 'Sat', num: 6 },
  { key: 'sunday', short: 'Sun', num: 0 },
];

export const QuestsPage = ({
  tasks = [],
  user,
  weeklyTimetable = {},
  onToggleTask,
  onCreateTask,
  onDeleteTask,
  onSelectTaskToFocus,
  onNavigate,
  globalStreak = 0,
  isRestDayToday = false,
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(25);
  const [colorTag, setColorTag] = useState('');
  const [repeatDaily, setRepeatDaily] = useState(true);
  const [colorFeedback, setColorFeedback] = useState('');

  const resetTime = user?.dailyResetTime || '06:00';
  const todayKey = getStudyDayKey(new Date(), resetTime);
  const todayDateStr = getStudyDayDate(new Date(), resetTime);
  const todayName = DAY_NAMES[todayKey] || 'Today';

  const completedCount = tasks.filter((t) => t.completedToday).length;
  const totalTasks = tasks.length;
  const allCompleted = totalTasks > 0 && completedCount === totalTasks;
  const bestStreak = user?.streaks?.bestGlobalStreak || globalStreak;
  const completedDates = user?.streaks?.completedDates || [];

  // Color assignments from entire weekly plan to enforce unique colors
  const effectiveTimetable = user?.weeklyTimetable || weeklyTimetable || {};
  const { subjectToColor, colorToSubject } = getSubjectColorAssignments(effectiveTimetable);

  // Check whether a task has weekly recurrence (daily, multiple days, or weekly recurring)
  const isTaskRecurring = (task) => {
    if (!task) return false;
    if (task.repeatDaily === true) return true;
    const cleanName = (task.name || '').trim().toLowerCase();
    const taskId = task.id || task._id;
    let occurrences = 0;
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    DAYS.forEach((d) => {
      const list = effectiveTimetable[d] || [];
      const found = list.find(
        (s) =>
          (taskId && (s.id === taskId || s._id?.toString() === taskId)) ||
          (cleanName && s.name?.trim().toLowerCase() === cleanName)
      );
      if (found) {
        occurrences++;
        if (found.repeatDaily === true) occurrences += 2;
      }
    });
    return occurrences > 1;
  };

  const handleDeleteToday = async () => {
    if (!deletingTask) return;
    const targetId = deletingTask._id || deletingTask.id;
    try {
      setIsDeleting(true);
      await onDeleteTask(targetId, { scope: 'today', day: todayKey, dateStr: todayDateStr });
      setDeletingTask(null);
    } catch (err) {
      console.error('Failed to delete task for today:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deletingTask) return;
    const targetId = deletingTask._id || deletingTask.id;
    try {
      setIsDeleting(true);
      await onDeleteTask(targetId, { scope: 'permanent' });
      setDeletingTask(null);
    } catch (err) {
      console.error('Failed to delete task permanently:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // When user opens modal, initialize default unused color and enable repeatDaily by default
  const handleOpenAddModal = () => {
    sounds.playClick();
    setName('');
    setDuration(25);
    setRepeatDaily(true);
    const initialColor = getNextAvailableColor(effectiveTimetable, '');
    setColorTag(initialColor);
    setColorFeedback('');
    setShowAddModal(true);
  };

  // If user types a subject name that already exists on other days, auto-preselect its unique color
  const handleNameChange = (val) => {
    setName(val);
    const cleanLower = val.trim().toLowerCase();
    if (cleanLower && subjectToColor[cleanLower]) {
      const assigned = subjectToColor[cleanLower];
      setColorTag(assigned);
      const colorObj = getSubjectColor(assigned);
      setColorFeedback(`Existing subject recognized. Assigned unique color: ${colorObj.name}.`);
    } else {
      setColorFeedback('');
      // If current color is taken by another subject, switch to first available color
      const avail = checkColorAvailability(colorTag, val, effectiveTimetable);
      if (!avail.available) {
        const nextAvail = getNextAvailableColor(effectiveTimetable, val);
        setColorTag(nextAvail);
      }
    }
  };

  const handleSelectColor = (colorHex) => {
    const avail = checkColorAvailability(colorHex, name, effectiveTimetable);
    if (!avail.available) {
      sounds.playPausePenalty();
      setColorFeedback(`"${getSubjectColor(colorHex).name}" is already used by "${avail.assignedTo}". Each subject must have a unique color.`);
      return;
    }
    sounds.playClick();
    setColorTag(colorHex);
    setColorFeedback('');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const avail = checkColorAvailability(colorTag, name, effectiveTimetable);
    if (!avail.available) {
      sounds.playPausePenalty();
      setColorFeedback(`Cannot assign color: already used by "${avail.assignedTo}".`);
      return;
    }

    sounds.playClick();
    onCreateTask({
      name: name.trim(),
      durationMinutes: Number(duration) || 25,
      colorTag,
      color: colorTag,
      repeatDaily,
    });
    setName('');
    setShowAddModal(false);
  };

  // Interactive toggle completion
  const handleToggle = (task) => {
    sounds.playClick();
    const willBeCompleted = !task.completedToday;
    if (willBeCompleted) {
      sounds.playCompleteTask();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    }
    if (onToggleTask) {
      onToggleTask(task._id || task.id, todayKey);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completedToday;
    if (filter === 'completed') return t.completedToday;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              Daily Focus Tasks
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#E8F5EE] dark:bg-[#162420] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246]">
              {todayName}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => {
              sounds.playClick();
              onNavigate('timetable');
            }}
            className="flex-1 sm:flex-none justify-center flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold hover:bg-[#FAF8F5] transition cursor-pointer shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-[#1B3B2F] dark:text-[#A3D9C9]" />
            <span>Weekly Plan</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none justify-center flex items-center space-x-2 bg-[#1B3B2F] hover:bg-[#142C23] text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* --- DAILY STREAK & TODAY'S PROGRESS CARD --- */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-4 sm:p-6 shadow-sm space-y-5">
        {/* Streak Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
          <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FEF3C7] dark:bg-[#2B2312] border border-[#F59E0B]/30 flex items-center justify-center text-xl sm:text-2xl shadow-sm flex-shrink-0">
              🔥
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
                  {globalStreak} Day Study Streak
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] dark:bg-[#1C2E29] text-[#576560] dark:text-[#8BA398] border border-[#EAE5DD] dark:border-[#253D35]">
                  Best: {bestStreak}d
                </span>
              </div>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-0.5">
                {totalTasks === 0
                  ? 'No tasks scheduled for today. Have a flexible study day or add tasks above.'
                  : allCompleted
                  ? '✨ All today\'s tasks completed! Streak secured for today.'
                  : isRestDayToday
                  ? '🛡️ Rest Day Protection Active: Streaks are frozen and shielded from penalties.'
                  : `${completedCount} of ${totalTasks} tasks done. Finish ${totalTasks - completedCount} more to increment streak!`}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE5DD]/60 dark:border-[#253D35]/60 flex sm:block items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#8A9791] block">STUDY DAY RESET</span>
            <span className="text-xs font-mono font-bold text-[#1B3B2F] dark:text-[#A3D9C9]">
              {formatResetTimeDisplay(resetTime)}
            </span>
          </div>
        </div>

        {/* Progress Bar & Status Pill */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-[#1C2A24] dark:text-[#F2F7F4]">
              Today's Completion ({totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}%)
            </span>
            <span className="text-[#576560] dark:text-[#8BA398]">
              {completedCount} / {totalTasks} finished
            </span>
          </div>

          <div className="w-full bg-[#F0ECE6] dark:bg-[#1C2E29] rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allCompleted
                  ? 'bg-gradient-to-r from-[#10b981] to-[#059669]'
                  : 'bg-gradient-to-r from-[#2B5A52] to-[#1B3B2F]'
              }`}
              style={{ width: `${totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* 7-Day Consistency Ribbon */}
        <div className="pt-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#8A9791] block mb-2">
            Weekly Study Plan Rhythm
          </span>

          <div className="overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[340px] sm:min-w-0">
              {WEEKDAY_ORDER.map((day) => {
                const isToday = day.key === todayKey;
                const dayDateStr = getWeekdayDateStr(day.key);
                const dayTasks = effectiveTimetable[day.key] || [];
                const dayTotal = dayTasks.length;
                const todayIdx = WEEKDAY_ORDER.findIndex((w) => w.key === todayKey);
                const dayIdx = WEEKDAY_ORDER.findIndex((w) => w.key === day.key);
                const isPastInWeek = dayIdx < todayIdx;

                const dayCompletedCount = isToday
                  ? completedCount
                  : dayTasks.filter(
                      (t) => Array.isArray(t.completedDates) && t.completedDates.includes(dayDateStr)
                    ).length;

                const isDayDone =
                  (dayTotal > 0 && dayCompletedCount === dayTotal) ||
                  completedDates.includes(dayDateStr);

                return (
                  <div
                    key={day.key}
                    className={`p-2 rounded-2xl border text-center transition flex flex-col items-center justify-between ${
                      isToday
                        ? 'border-[#1B3B2F] dark:border-[#A3D9C9] bg-[#E8F5EE]/70 dark:bg-[#162420] shadow-sm'
                        : isDayDone
                        ? 'border-[#C8E6D5] dark:border-[#2B5246] bg-[#E8F5EE]/40 dark:bg-[#162420]/60'
                        : 'border-[#EAE5DD] dark:border-[#253D35] bg-[#FAF8F5]/50 dark:bg-[#1C2E29]/40'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isToday ? 'text-[#1B3B2F] dark:text-[#A3D9C9]' : isDayDone ? 'text-[#10b981]' : 'text-[#8A9791]'}`}>
                      {day.short}
                    </span>

                    <div className="my-1.5">
                      {dayTotal === 0 ? (
                        <span className="text-xs text-[#8A9791] font-mono">—</span>
                      ) : isDayDone ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10b981] fill-current" />
                      ) : isToday ? (
                        <span className="text-xs font-bold text-[#D97724] font-mono">
                          {completedCount}/{totalTasks}
                        </span>
                      ) : isPastInWeek ? (
                        <span className="text-[11px] text-[#576560] dark:text-[#8BA398] font-mono">
                          {dayCompletedCount}/{dayTotal}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#576560] dark:text-[#8BA398] font-mono">
                          {dayTotal}q
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] text-[#8A9791] truncate max-w-full">
                      {isToday ? 'Today' : isDayDone ? 'Done' : `${dayTotal} planned`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: `All tasks (${totalTasks})` },
          { id: 'active', label: `Pending (${totalTasks - completedCount})` },
          { id: 'completed', label: `Completed (${completedCount})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => {
              sounds.playClick();
              setFilter(f.id);
            }}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              filter === f.id
                ? 'bg-[#1B3B2F] text-white shadow-2xs'
                : 'bg-white dark:bg-[#162420] text-[#576560] dark:text-[#9EB5AB] border border-[#EAE5DD] dark:border-[#253D35] hover:bg-[#FAF8F5]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Quest Cards List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-[#162420] rounded-3xl border border-dashed border-[#EAE5DD] dark:border-[#253D35] text-[#8A9791] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] flex items-center justify-center text-2xl mx-auto">
              📅
            </div>
            <div>
              <p className="text-sm font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                No tasks scheduled for {todayName}
              </p>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1 max-w-md mx-auto">
                Tasks automatically reflect the tasks you scheduled for {todayName} in your Weekly Plan. You can add a task for today or configure your full week.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-1">
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-2xl bg-[#1B3B2F] text-white text-xs font-bold hover:bg-[#142C23] transition cursor-pointer"
              >
                + Add Tasks for Today
              </button>
              <button
                onClick={() => onNavigate('timetable')}
                className="px-4 py-2 rounded-2xl bg-white dark:bg-[#1C2E29] text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                Open Weekly Plan
              </button>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] text-[#8A9791]">
            <p className="text-xs font-bold">No tasks matching "{filter}".</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const colorInfo = getSubjectColor(task.color || task.colorTag);
            const isDone = !!task.completedToday;

            return (
              <div
                key={task._id || task.id}
                className={`p-3.5 sm:p-4 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                  isDone
                    ? 'bg-[#FAF8F5]/80 dark:bg-[#162420]/60 border-[#C8E6D5] dark:border-[#2B5246]'
                    : 'bg-white dark:bg-[#162420] border-[#EAE5DD] dark:border-[#253D35] shadow-sm hover:border-[#1B3B2F]'
                }`}
              >
                {/* Checkbox & Left Task Details (and mobile delete button) */}
                <div className="flex items-start justify-between sm:justify-start space-x-3 min-w-0 flex-1">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggle(task)}
                      className="p-1 mt-0.5 cursor-pointer transition transform hover:scale-110 flex-shrink-0"
                      title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-[#10b981] fill-current" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#8A9791] hover:text-[#1B3B2F]" />
                      )}
                    </button>

                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm mt-1.5"
                      style={{ backgroundColor: colorInfo.hex }}
                    />

                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-sm font-bold break-words ${
                          isDone
                            ? 'line-through text-[#8A9791]'
                            : 'text-[#1C2A24] dark:text-[#F2F7F4]'
                        }`}
                      >
                        {task.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#576560] dark:text-[#8BA398] mt-1 font-medium">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>{task.durationMinutes || task.targetMinutes || 25}m focus block</span>
                        </span>
                        <span className="inline-flex items-center space-x-1 text-[#D97724] dark:text-[#F59E0B] font-bold">
                          <Flame className="w-3.5 h-3.5 fill-current flex-shrink-0" />
                          <span>{task.currentStreak || 0}d streak</span>
                        </span>
                        {Boolean(task.repeatDaily) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#EAE5DD] dark:border-[#253D35]">
                            🔁 Daily
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={getSubjectBadgeStyle(colorInfo.hex)}
                        >
                          {colorInfo.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile delete button: top right */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setDeletingTask(task);
                    }}
                    className="sm:hidden p-1.5 text-[#8A9791] hover:text-rose-500 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer flex-shrink-0"
                    title="Remove from Today's Tasks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center justify-between sm:justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE5DD]/60 dark:border-[#253D35]/60">
                  {!isDone ? (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onSelectTaskToFocus(task);
                        onNavigate('focus');
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-1 px-4 py-2 sm:py-1.5 rounded-xl bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] text-xs font-bold border border-[#C8E6D5] dark:border-[#2B5246] hover:bg-[#D5EBDD] transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Focus</span>
                    </button>
                  ) : (
                    <span className="flex-1 sm:flex-none flex items-center justify-center space-x-1 text-xs font-bold text-[#10b981] bg-[#10b981]/10 px-3 py-1.5 sm:py-1 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </span>
                  )}

                  {/* Desktop delete button */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setDeletingTask(task);
                    }}
                    className="hidden sm:inline-flex p-2 text-[#8A9791] hover:text-rose-500 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
                    title="Remove from Today's Tasks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- CREATE QUEST MODAL WITH UNIQUE COLOR ENFORCEMENT --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DD] dark:border-[#253D35]">
              <div className="flex items-center space-x-2">
                
                <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  New Task for {todayName}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8A9791] hover:text-[#1C2A24] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DSA, Mathematics, English..."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-2xl px-4 py-2.5 text-xs text-[#1C2A24] dark:text-[#F2F7F4] focus:outline-none focus:border-[#1B3B2F]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1">
                  <span>Target Duration</span>
                  <span className="font-mono text-[#1B3B2F] dark:text-[#A3D9C9]">{duration} Minutes</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-[#1B3B2F] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8A9791] font-mono mt-1">
                  <span>5m</span>
                  <span>25m</span>
                  <span>50m</span>
                  <span>120m</span>
                </div>
              </div>

              {/* Repeat Daily Option */}
              <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl border border-[#EAE5DD] dark:border-[#253D35]">
                <label className="flex items-start space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={repeatDaily}
                    onChange={(e) => setRepeatDaily(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#1B3B2F] accent-[#1B3B2F] focus:ring-[#1B3B2F] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="block text-xs font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                      Study this subject every day
                    </span>
                    <span className="block text-[11px] text-[#576560] dark:text-[#8BA398] font-medium leading-relaxed">
                      Schedules this subject across all 7 days (Monday through Sunday).
                    </span>
                  </div>
                </label>
              </div>

              {/* Unique Color Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398]">
                    Subject Color (Must Be Unique)
                  </label>
                  <span className="text-[10px] text-[#8A9791]">
                    Selected: <strong>{getSubjectColor(colorTag).name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 p-2 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] max-h-48 overflow-y-auto">
                  {SUBJECT_COLORS.map((c) => {
                    const avail = checkColorAvailability(c.hex, name, effectiveTimetable);
                    const isSelected = colorTag.toLowerCase() === c.hex.toLowerCase();
                    const isTaken = !avail.available;

                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleSelectColor(c.hex)}
                        title={isTaken ? `Used by ${avail.assignedTo}` : c.name}
                        className={`relative h-9 rounded-xl flex items-center justify-center transition cursor-pointer border ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-[#1B3B2F] dark:ring-white scale-105 border-white'
                            : isTaken
                            ? 'opacity-30 border-transparent cursor-not-allowed'
                            : 'border-black/10 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                        )}
                        {isTaken && !isSelected && (
                          <Lock className="w-3 h-3 text-white/80" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {colorFeedback && (
                  <p className="mt-2 text-[11px] font-medium text-[#D97724] dark:text-[#F59E0B] flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{colorFeedback}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#EAE5DD] dark:border-[#253D35]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#576560] hover:text-[#1C2A24] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B3B2F] hover:bg-[#142C23] text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- SMART TASK DELETION CONFIRMATION MODAL --- */}
      <TaskDeleteConfirmModal
        isOpen={Boolean(deletingTask)}
        task={deletingTask}
        isRecurring={isTaskRecurring(deletingTask)}
        onDeleteToday={handleDeleteToday}
        onDeletePermanent={handleDeletePermanent}
        onClose={() => setDeletingTask(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
