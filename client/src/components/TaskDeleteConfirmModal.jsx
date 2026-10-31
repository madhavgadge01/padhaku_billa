import React from 'react';
import { Trash2, Calendar, X, Clock } from 'lucide-react';
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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#EAE5DD] dark:border-[#253D35]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] leading-tight">
                {isRecurring ? 'How would you like to delete this task?' : 'Delete this task?'}
              </h3>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-0.5">
                {isRecurring ? 'Choose how to remove this scheduled subject' : 'Confirm task deletion'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-[#8A9791] hover:text-[#1C2A24] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Preview Badge */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs"
              style={{ backgroundColor: colorInfo.hex }}
            />
            <span className="text-sm font-bold text-[#1C2A24] dark:text-[#F2F7F4] truncate">
              {taskName}
            </span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {isRecurring ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246]">
                Recurring
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] dark:bg-[#1C2E29] text-[#576560] dark:text-[#8BA398] border border-[#EAE5DD] dark:border-[#253D35]">
                Today only
              </span>
            )}
            <span className="text-xs font-mono text-[#576560] dark:text-[#8BA398] flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{task.durationMinutes || task.targetMinutes || 25}m</span>
            </span>
          </div>
        </div>

        {/* Options */}
        {isRecurring ? (
          <div className="space-y-3">
            {/* Option 1: Delete for Today */}
            <div className="p-4 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] bg-[#FAF8F5] dark:bg-[#1C2E29] space-y-2.5 hover:border-[#D97724] dark:hover:border-[#F59E0B] transition">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#D97724] dark:text-[#F59E0B] flex-shrink-0" />
                <h4 className="text-xs sm:text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  Delete for Today
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-[#576560] dark:text-[#8BA398] leading-relaxed font-medium">
                Remove this task from today's schedule only. It will automatically appear again on its next scheduled day.
              </p>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeleteTodayClick}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white dark:bg-[#162420] border border-[#D97724] text-[#D97724] dark:text-[#F59E0B] hover:bg-[#D97724] hover:text-white dark:hover:bg-[#D97724] dark:hover:text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>Delete for Today</span>
                </button>
              </div>
            </div>

            {/* Option 2: Delete Permanently */}
            <div className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5 hover:border-rose-400 dark:hover:border-rose-700 transition">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <h4 className="text-xs sm:text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  Delete Permanently
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-[#576560] dark:text-[#8BA398] leading-relaxed font-medium">
                Remove this task permanently from your schedule and all future recurring days.
              </p>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeletePermanentClick}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Non-recurring task option */
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#576560] dark:text-[#8BA398] leading-relaxed font-medium">
              This task is scheduled only for today. Are you sure you want to delete it from your schedule?
            </p>
          </div>
        )}

        {/* Footer / Cancel */}
        <div className="pt-1 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#EAE5DD] dark:border-[#253D35] text-[#576560] dark:text-[#8BA398] font-bold text-xs hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
          >
            Cancel
          </button>
          {!isRecurring && (
            <button
              type="button"
              onClick={handleDeletePermanentClick}
              disabled={isDeleting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete this task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

