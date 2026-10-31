import React from 'react';
import { Trash2, Calendar, X, Clock, AlertTriangle } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { getSubjectColor } from '../utils/subjectColors.js';

export const TaskDeleteConfirmModal = ({
  isOpen,
  task,
  isRecurring = true,
  onDeleteToday,
  onDeletePermanent,
  onClose,
  isDeleting = false,
}) => {
  if (!isOpen || !task) return null;

  const taskName = task.name || 'Task';
  const colorHex = task.color || task.colorTag || '#3B82F6';
  const colorInfo = getSubjectColor(colorHex);

  const handleClose = () => {
    sounds.playClick?.();
    onClose();
  };

  const handleDeleteTodayClick = () => {
    sounds.playClick?.();
    onDeleteToday();
  };

  const handleDeletePermanentClick = () => {
    sounds.playClick?.();
    onDeletePermanent();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight leading-snug">
                {isRecurring ? 'Delete Scheduled Task' : 'Delete Task'}
              </h3>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-0.5">
                {isRecurring ? 'Choose how to remove this recurring item' : 'Confirm removal from schedule'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-2 rounded-xl text-[#8A9791] hover:text-[#1C2A24] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Preview Card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]">
          <div className="flex items-center space-x-3 min-w-0">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs ring-2 ring-white dark:ring-stone-900"
              style={{ backgroundColor: colorInfo.hex }}
            />
            <span className="text-sm font-bold text-[#1C2A24] dark:text-[#F2F7F4] truncate">
              {taskName}
            </span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {isRecurring ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246]">
                Recurring
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FAF8F5] dark:bg-[#1C2E29] text-[#576560] dark:text-[#8BA398] border border-[#EAE5DD] dark:border-[#253D35]">
                One-time
              </span>
            )}
            <span className="text-xs font-mono font-bold text-[#576560] dark:text-[#8BA398] flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{task.durationMinutes || task.targetMinutes || 25}m</span>
            </span>
          </div>
        </div>

        {/* Options / Action Cards */}
        {isRecurring ? (
          <div className="space-y-3">
            {/* Option 1: Delete for Today */}
            <div 
              onClick={handleDeleteTodayClick}
              className="p-4 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] bg-white dark:bg-[#162420] hover:border-[#D97724] dark:hover:border-[#F59E0B] hover:shadow-sm transition cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#D97724] dark:text-[#F59E0B]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] group-hover:text-[#D97724] transition">
                    Delete for Today Only
                  </h4>
                </div>
                <span className="text-xs font-bold text-[#D97724] dark:text-[#F59E0B] opacity-0 group-hover:opacity-100 transition">
                  Select →
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#576560] dark:text-[#8BA398] leading-relaxed font-medium pl-10.5">
                Remove from today's active schedule. It will automatically reappear on its next scheduled recurrence.
              </p>
            </div>

            {/* Option 2: Delete Permanently */}
            <div 
              onClick={handleDeletePermanentClick}
              className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-[#162420] hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-sm transition cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] group-hover:text-rose-600 transition">
                    Delete Permanently
                  </h4>
                </div>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 opacity-0 group-hover:opacity-100 transition">
                  Select →
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#576560] dark:text-[#8BA398] leading-relaxed font-medium pl-10.5">
                Permanently delete this task and all future scheduled occurrences from your weekly plan.
              </p>
            </div>
          </div>
        ) : (
          /* Non-recurring task message */
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] text-xs text-[#576560] dark:text-[#8BA398] font-medium leading-relaxed">
            This task is scheduled only for today. Are you sure you want to remove it?
          </div>
        )}

        {/* Footer Buttons */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] text-[#576560] dark:text-[#8BA398] font-bold text-xs hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
          >
            Cancel
          </button>
          {!isRecurring && (
            <button
              type="button"
              onClick={handleDeletePermanentClick}
              disabled={isDeleting}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm transition transform hover:scale-[1.02] cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDeleteConfirmModal;