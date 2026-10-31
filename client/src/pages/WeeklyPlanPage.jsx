import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Plus,
  Flame,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  Play,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Save,
  Check,
  X,
  BookOpen,
  Lock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  SUBJECT_COLORS,
  getSubjectColor,
  getSubjectBadgeStyle,
  getSubjectColorAssignments,
  checkColorAvailability,
  getNextAvailableColor,
  syncSubjectColorsAcrossTimetable,
} from '../utils/subjectColors.js';
import { getStudyDayKey, getStudyDayDate, formatResetTimeDisplay, getWeekdayDateStr } from '../utils/dateUtils.js';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import { TaskDeleteConfirmModal } from '../components/TaskDeleteConfirmModal.jsx';

const WEEKDAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

export const WeeklyPlanPage = ({
  user,
  onNavigate,
  onStartFocusSubject,
  onTimetableUpdated,
  onDeleteTask,
  isRestDayToday = false,
}) => {
  const resetTime = user?.dailyResetTime || '00:00';
  const todayKey = getStudyDayKey(new Date(), resetTime);
  const todayStr = getStudyDayDate(new Date(), resetTime);

  const [activeDay, setActiveDay] = useState(todayKey);
  const [timetable, setTimetable] = useState(() => {
    return (
      user?.weeklyTimetable || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      }
    );
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null); // null if adding
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(SUBJECT_COLORS[0].hex);
  const [formDuration, setFormDuration] = useState(45);
  const [formIsDaily, setFormIsDaily] = useState(false);
  const [colorFeedback, setColorFeedback] = useState('');

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const res = await api.getWeeklyTimetable();
      if (res.success && res.timetable) {
        setTimetable(res.timetable);
        if (onTimetableUpdated) onTimetableUpdated(res.timetable);
      }
    } catch (err) {
      console.warn('Using local timetable:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const currentDaySubjects = timetable[activeDay] || [];
  const { subjectToColor, colorToSubject } = getSubjectColorAssignments(timetable);

  // Open modal for new subject
  const handleOpenAdd = () => {
    sounds.playClick();
    setEditingSubject(null);
    setFormName('');
    const initialColor = getNextAvailableColor(timetable, '');
    setFormColor(initialColor);
    setFormDuration(45);
    setFormIsDaily(true);
    setColorFeedback('');
    setShowModal(true);
  };

  // Open modal to edit existing subject
  const handleOpenEdit = (subject) => {
    sounds.playClick();
    setEditingSubject(subject);
    setFormName(subject.name);
    setFormColor(subject.color || SUBJECT_COLORS[0].hex);
    setFormDuration(subject.targetMinutes || 45);

    // Detect if this subject is already scheduled on all 7 days
    const cleanLower = subject.name.trim().toLowerCase();
    const isScheduledEveryDay = WEEKDAYS.every((d) => {
      const dayList = timetable[d.key] || [];
      return dayList.some((s) => s.id === subject.id || s.name.trim().toLowerCase() === cleanLower);
    });
    setFormIsDaily(isScheduledEveryDay);

    setColorFeedback('');
    setShowModal(true);
  };

  // If user types a subject name that already exists on other days, auto-preselect its unique color
  const handleFormNameChange = (val) => {
    setFormName(val);
    const cleanLower = val.trim().toLowerCase();
    if (cleanLower && subjectToColor[cleanLower]) {
      const assigned = subjectToColor[cleanLower];
      setFormColor(assigned);
      setColorFeedback(`Existing subject recognized. Using assigned unique color: ${getSubjectColor(assigned).name}.`);
    } else {
      setColorFeedback('');
      const avail = checkColorAvailability(formColor, val, timetable);
      if (!avail.available) {
        const nextAvail = getNextAvailableColor(timetable, val);
        setFormColor(nextAvail);
      }
    }
  };

  const handleSelectColor = (colorHex) => {
    const avail = checkColorAvailability(colorHex, formName, timetable);
    if (!avail.available) {
      sounds.playPausePenalty();
      setColorFeedback(`"${getSubjectColor(colorHex).name}" is already used by "${avail.assignedTo}". Each subject must have a unique color.`);
      return;
    }
    sounds.playClick();
    setFormColor(colorHex);
    setColorFeedback('');
  };

  // Save Modal Subject (Add or Edit)
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const avail = checkColorAvailability(formColor, formName, timetable);
    if (!avail.available) {
      sounds.playPausePenalty();
      setColorFeedback(`Cannot assign color: already used by "${avail.assignedTo}".`);
      return;
    }

    sounds.playClick();

    const cleanName = formName.trim();
    const targetMinutes = Math.max(5, Math.min(360, Number(formDuration) || 45));
    // When editing, preserve the existing subject id. When adding, generate one shared id.
    const sharedId = editingSubject?.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let updatedTimetable = { ...timetable };

    if (formIsDaily) {
      // Schedule for Monday through Sunday across all 7 days with the same subject ID and assigned unique color
      WEEKDAYS.forEach(({ key }) => {
        const dayList = [...(updatedTimetable[key] || [])];
        const existingIdx = dayList.findIndex(
          (s) =>
            s.id === sharedId ||
            (editingSubject && s.id === editingSubject.id) ||
            s.name.trim().toLowerCase() === cleanName.toLowerCase()
        );

        if (existingIdx !== -1) {
          const existing = dayList[existingIdx];
          dayList[existingIdx] = {
            ...existing,
            id: sharedId, // ensure same ID across all 7 days
            name: cleanName,
            color: formColor,
            targetMinutes,
            // Preserve existing completion history so streaks are not affected
            completedDates: Array.isArray(existing.completedDates) ? existing.completedDates : [],
          };
          // Remove any duplicate instances of this subject on the same day
          updatedTimetable[key] = dayList.filter(
            (s, idx) =>
              idx === existingIdx ||
              (s.id !== sharedId && s.name.trim().toLowerCase() !== cleanName.toLowerCase())
          );
        } else {
          // Add instance to this day
          const newSubject = {
            id: sharedId,
            name: cleanName,
            color: formColor,
            targetMinutes,
            completedDates: [],
            order: dayList.length,
          };
          dayList.push(newSubject);
          updatedTimetable[key] = dayList;
        }
      });
    } else {
      // Weekday-specific schedule: updates or adds only on activeDay
      const dayList = [...(updatedTimetable[activeDay] || [])];
      if (editingSubject) {
        const idx = dayList.findIndex(
          (s) =>
            s.id === editingSubject.id ||
            s.name.trim().toLowerCase() === cleanName.toLowerCase()
        );
        if (idx !== -1) {
          dayList[idx] = {
            ...dayList[idx],
            name: cleanName,
            color: formColor,
            targetMinutes,
          };
        }
      } else {
        const newSubject = {
          id: sharedId,
          name: cleanName,
          color: formColor,
          targetMinutes,
          completedDates: [],
          order: dayList.length,
        };
        dayList.push(newSubject);
      }
      updatedTimetable[activeDay] = dayList;
    }

    // Synchronize color across any occurrences of this subject on other days
    updatedTimetable = syncSubjectColorsAcrossTimetable(updatedTimetable, cleanName, formColor);

    setTimetable(updatedTimetable);
    setShowModal(false);
    await persistTimetable(updatedTimetable);
  };

  // Detect whether subject has weekly recurrence
  const isSubjectRecurring = (subject) => {
    if (!subject) return false;
    if (subject.repeatDaily === true) return true;
    const cleanName = (subject.name || '').trim().toLowerCase();
    const subjectId = subject.id || subject._id;
    let occurrences = 0;
    WEEKDAYS.forEach((d) => {
      const list = timetable[d.key] || [];
      const found = list.find(
        (s) =>
          (subjectId && (s.id === subjectId || s._id?.toString() === subjectId)) ||
          (cleanName && s.name?.trim().toLowerCase() === cleanName)
      );
      if (found) {
        occurrences++;
        if (found.repeatDaily === true) occurrences += 2;
      }
    });
    return occurrences > 1;
  };

  const activeDayDateStr = getWeekdayDateStr(activeDay, new Date(), resetTime);

  // Delete subject for today only (date-specific exclusion)
  const handleDeleteToday = async () => {
    if (!deletingSubject) return;
    const targetId = deletingSubject.id || deletingSubject._id;
    try {
      setIsDeleting(true);
      const res = onDeleteTask
        ? await onDeleteTask(targetId, { scope: 'today', day: activeDay, dateStr: activeDayDateStr })
        : await api.deleteTask(targetId, { scope: 'today', day: activeDay, dateStr: activeDayDateStr });
      if (res?.timetable) {
        setTimetable(res.timetable);
        if (onTimetableUpdated) onTimetableUpdated(res.timetable);
      }
      setDeletingSubject(null);
    } catch (err) {
      console.error('Failed to delete subject for today:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete subject permanently across all days
  const handleDeletePermanent = async () => {
    if (!deletingSubject) return;
    const targetId = deletingSubject.id || deletingSubject._id;
    try {
      setIsDeleting(true);
      const res = onDeleteTask
        ? await onDeleteTask(targetId, { scope: 'permanent' })
        : await api.deleteTask(targetId, { scope: 'permanent' });
      if (res?.timetable) {
        setTimetable(res.timetable);
        if (onTimetableUpdated) onTimetableUpdated(res.timetable);
      }
      setDeletingSubject(null);
    } catch (err) {
      console.error('Failed to delete subject permanently:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reorder subjects (Move up or down)
  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentDaySubjects.length) return;

    sounds.playClick();
    const reordered = [...currentDaySubjects];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const reorderedWithOrder = reordered.map((item, idx) => ({ ...item, order: idx }));
    const updatedTimetable = {
      ...timetable,
      [activeDay]: reorderedWithOrder,
    };

    setTimetable(updatedTimetable);
    await persistTimetable(updatedTimetable);
  };

  // Toggle completion of a subject for today's study date
  const handleToggleComplete = async (subjectId) => {
    sounds.playClick();

    // Optimistic local update
    const updatedList = currentDaySubjects.map((sub) => {
      if (sub.id === subjectId) {
        const isDone = Array.isArray(sub.completedDates) && sub.completedDates.includes(todayStr);
        const newDates = isDone
          ? sub.completedDates.filter((d) => d !== todayStr)
          : [...(sub.completedDates || []), todayStr];
        return {
          ...sub,
          completedDates: newDates,
          completedToday: !isDone,
        };
      }
      return sub;
    });

    const updatedTimetable = {
      ...timetable,
      [activeDay]: updatedList,
    };

    setTimetable(updatedTimetable);

    try {
      const res = await api.toggleTimetableSubject(activeDay, subjectId);
      if (res.success) {
        if (res.completed && activeDay === todayKey) {
          sounds.playCompleteTask();
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        }
        if (res.timetable) {
          setTimetable(res.timetable);
          if (onTimetableUpdated) onTimetableUpdated(res.timetable, res.userCoins);
        }
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  // Persist timetable to backend
  const persistTimetable = async (newTimetable) => {
    try {
      setSaving(true);
      const res = await api.updateWeeklyTimetable({
        weeklyTimetable: newTimetable,
        hasConfiguredTimetable: true,
      });
      if (res.success) {
        setStatusMsg('Saved!');
        if (res.timetable) setTimetable(res.timetable);
        if (onTimetableUpdated) onTimetableUpdated(res.timetable || newTimetable);
        setTimeout(() => setStatusMsg(''), 2500);
      }
    } catch (err) {
      setStatusMsg('Failed to save');
      setTimeout(() => setStatusMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Calculate day metrics
  const activeDayLabel = WEEKDAYS.find((d) => d.key === activeDay)?.label || 'Day';
  const totalPlannedMinutes = currentDaySubjects.reduce(
    (acc, s) => acc + (Number(s.targetMinutes) || 0),
    0
  );
  const completedTodayCount = currentDaySubjects.filter(
    (s) => Array.isArray(s.completedDates) && s.completedDates.includes(todayStr)
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              Weekly Study Plan
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EE] dark:bg-[#162420] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246]">
              Recurring Schedule
            </span>
          </div>
          <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-1">
            Configure once and reuse every week. Daily Tasks automatically show the tasks scheduled for today.
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
          {statusMsg && (
            <span className="text-xs font-bold text-[#10b981] flex items-center space-x-1 animate-pulse mr-auto sm:mr-0">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMsg}</span>
            </span>
          )}

          <button
            onClick={() => onNavigate('quests')}
            className="flex-1 sm:flex-none justify-center flex items-center space-x-1.5 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold hover:bg-[#FAF8F5] transition cursor-pointer shadow-2xs"
          >
            <span>Today's Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none justify-center flex items-center space-x-2 bg-[#1B3B2F] hover:bg-[#142C23] text-white px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Weekday Tab Switcher */}
      <div className="overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="grid grid-cols-7 gap-1.5 p-1.5 rounded-3xl bg-[#FAF8F5] dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] min-w-[420px] sm:min-w-0">
          {WEEKDAYS.map((day) => {
            const isSelected = activeDay === day.key;
            const isToday = todayKey === day.key;
            const count = (timetable[day.key] || []).length;

            return (
              <button
                key={day.key}
                onClick={() => {
                  sounds.playClick();
                  setActiveDay(day.key);
                }}
                className={`py-3 px-1 sm:px-3 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[64px] ${
                  isSelected
                    ? 'bg-[#1B3B2F] text-white shadow-sm'
                    : 'text-[#576560] dark:text-[#8BA398] hover:bg-[#F0ECE6] dark:hover:bg-[#1C2E29]'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-black">{day.short}</span>
                  {isToday && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-[#A3D9C9]' : 'bg-[#D97724]'
                      }`}
                    />
                  )}
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-[#EAE5DD] dark:bg-[#253D35] text-[#576560] dark:text-[#8BA398]'
                  }`}
                >
                  {count} {count === 1 ? 'task' : 'tasks'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 sm:px-4 sm:py-3 rounded-2xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] text-xs">
        <div className="flex flex-wrap items-center gap-2 font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#1B3B2F] dark:text-[#A3D9C9]" />
            <span>{activeDayLabel}'s Schedule</span>
          </div>
          {activeDay === todayKey && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9]">
              Active Today • Resets at {formatResetTimeDisplay(resetTime)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[#576560] dark:text-[#8BA398] text-[11px] sm:text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE5DD]/60 dark:border-[#253D35]/60">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Total: <strong>{totalPlannedMinutes} mins</strong></span>
          </span>
          {activeDay === todayKey && (
            <span>
              Completed Today: <strong>{completedTodayCount} / {currentDaySubjects.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Subject Cards List */}
      <div className="space-y-3">
        {currentDaySubjects.length === 0 ? (
          <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] flex items-center justify-center text-2xl mx-auto">
              📚
            </div>
            <div>
              <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                No subjects scheduled for {activeDayLabel}
              </h3>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1 max-w-sm mx-auto">
                Add the subjects you focus on every {activeDayLabel}. Each subject gets its own unique color across the timetable.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add First Subject to {activeDayLabel}</span>
            </button>
          </div>
        ) : (
          currentDaySubjects.map((subject, index) => {
            const colorInfo = getSubjectColor(subject.color);
            const isCompletedForToday =
              Array.isArray(subject.completedDates) && subject.completedDates.includes(todayStr);

            return (
              <div
                key={subject.id}
                className={`p-3.5 sm:p-4 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                  activeDay === todayKey && isCompletedForToday
                    ? 'border-[#C8E6D5] dark:border-[#2B5246] bg-[#E8F5EE]/40 dark:bg-[#162420]/60'
                    : 'border-[#EAE5DD] dark:border-[#253D35] bg-white dark:bg-[#162420] shadow-sm hover:border-[#1B3B2F]'
                }`}
              >
                {/* Details: Checkbox, Color, Title, Badges, Target, Streak */}
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  {/* Today's Completion Checkbox */}
                  {activeDay === todayKey && (
                    <button
                      onClick={() => handleToggleComplete(subject.id)}
                      className="cursor-pointer text-[#1B3B2F] dark:text-[#A3D9C9] hover:scale-110 transition p-0.5 mt-0.5 flex-shrink-0"
                      title={isCompletedForToday ? 'Mark as incomplete' : 'Mark as complete today'}
                    >
                      {isCompletedForToday ? (
                        <CheckCircle2 className="w-5 h-5 text-[#10b981] fill-current" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#8A9791] hover:text-[#1B3B2F]" />
                      )}
                    </button>
                  )}

                  {/* Subject Color Swatch Indicator */}
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm mt-1.5"
                    style={{ backgroundColor: colorInfo.hex }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h4
                        className={`text-sm font-bold break-words ${
                          activeDay === todayKey && isCompletedForToday
                            ? 'line-through text-[#8A9791]'
                            : 'text-[#1C2A24] dark:text-[#F2F7F4]'
                        }`}
                      >
                        {subject.name}
                      </h4>
                  
                 
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#576560] dark:text-[#8BA398] mt-1 font-medium">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {activeDay === todayKey && subject.remainingMinutes !== undefined && !isCompletedForToday ? (
                          <span>
                            <strong className="text-[#10b981] font-bold">{subject.remainingMinutes}m remaining</strong> / {subject.targetMinutes || 45}m target
                            {subject.completedMinutes > 0 && (
                              <span className="ml-1 opacity-80">({subject.completedMinutes}m done)</span>
                            )}
                          </span>
                        ) : (
                          <span>{subject.targetMinutes || 45} mins target</span>
                        )}
                      </span>
                      <span className="inline-flex items-center space-x-1 text-[#D97724] dark:text-[#F59E0B] font-bold">
                        <Flame className="w-3.5 h-3.5 fill-current flex-shrink-0" />
                        <span>{subject.currentStreak || 0}d streak</span>
                      </span>
                      {activeDay === todayKey && isCompletedForToday && (
                        <span className="text-[#10b981] font-bold text-[11px]">
                          ✓ Completed today {subject.completedMinutes > 0 ? `(${subject.completedMinutes}m)` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls: Focus button on left, reorder + edit + delete on right */}
                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE5DD]/60 dark:border-[#253D35]/60">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      if (onStartFocusSubject) {
                        onStartFocusSubject(subject);
                      } else {
                        onNavigate('focus');
                      }
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246] hover:bg-[#D5EBDD] transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Focus</span>
                  </button>

                  {/* Reorder Buttons */}
                  <div className="flex items-center bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-xl border border-[#EAE5DD] dark:border-[#253D35] p-0.5">
                    <button
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      className="p-1 hover:text-[#1B3B2F] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 1)}
                      disabled={index === currentDaySubjects.length - 1}
                      className="p-1 hover:text-[#1B3B2F] dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleOpenEdit(subject)}
                    className="p-1.5 rounded-xl text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
                    title="Edit subject"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setDeletingSubject(subject);
                    }}
                    className="p-1.5 rounded-xl text-[#8A9791] hover:text-rose-500 hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
                    title="Delete subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- ADD / EDIT SUBJECT MODAL WITH UNIQUE COLOR PICKER --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DD] dark:border-[#253D35]">
              <div className="flex items-center space-x-2">
               
                <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  {editingSubject
                    ? `Edit ${editingSubject.name}`
                    : formIsDaily
                    ? 'Add Daily Subject (Mon–Sun)'
                    : `Add Subject to ${activeDayLabel}`}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8A9791] hover:text-[#1C2A24] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DSA, Mathematics, Biochemistry, English..."
                  value={formName}
                  onChange={(e) => handleFormNameChange(e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-2xl px-4 py-2.5 text-xs text-[#1C2A24] dark:text-[#F2F7F4] focus:outline-none focus:border-[#1B3B2F]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1">
                  <span>Target Study Duration</span>
                  <span className="font-mono text-[#1B3B2F] dark:text-[#A3D9C9]">{formDuration} mins</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  className="w-full accent-[#1B3B2F] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8A9791] font-mono mt-1">
                  <span>5m</span>
                  <span>25m</span>
                  <span>45m</span>
                  <span>90m</span>
                  <span>180m</span>
                </div>
              </div>

              {/* Optional: Study this subject every day */}
              <div className="p-3 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl border border-[#EAE5DD] dark:border-[#253D35]">
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsDaily}
                    onChange={(e) => setFormIsDaily(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D1D5DB] text-[#1B3B2F] focus:ring-[#1B3B2F] dark:border-[#374151] dark:bg-[#162420] accent-[#1B3B2F] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] block">
                      Study this subject every day
                    </span>
                    <span className="text-[10px] text-[#576560] dark:text-[#8BA398] block">
                      Schedules this subject across all 7 days (Monday through Sunday)
                    </span>
                  </div>
                </label>
              </div>

              {/* Unique Color Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398]">
                    Subject Color (Unique to Each Subject)
                  </label>
                  <span className="text-[10px] text-[#8A9791]">
                    Selected: <strong>{getSubjectColor(formColor).name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 p-2 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] max-h-48 overflow-y-auto">
                  {SUBJECT_COLORS.map((c) => {
                    const avail = checkColorAvailability(c.hex, formName, timetable);
                    const isSelected = formColor.toLowerCase() === c.hex.toLowerCase();
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

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#EAE5DD] dark:border-[#253D35]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#576560] hover:text-[#1C2A24] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1B3B2F] hover:bg-[#142C23] text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- SMART TASK DELETION CONFIRMATION MODAL --- */}
      <TaskDeleteConfirmModal
        isOpen={Boolean(deletingSubject)}
        task={deletingSubject}
        isRecurring={isSubjectRecurring(deletingSubject)}
        onDeleteToday={handleDeleteToday}
        onDeletePermanent={handleDeletePermanent}
        onClose={() => setDeletingSubject(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
