import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

export const FocusActionConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  subtitle = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  icon: Icon = AlertCircle,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    sounds.playClick?.();
    onCancel();
  };

  const handleConfirm = () => {
    sounds.playClick?.();
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleCancel}
    >
      <div
        className="bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#EAE5DD] dark:border-[#253D35]">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                isDestructive
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-xl text-[#8A9791] hover:text-[#1C2A24] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-full font-black text-xs tracking-wider uppercase border border-[#EAE5DD] dark:border-[#253D35] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-white transition cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 py-3 px-4 rounded-full font-black text-xs tracking-wider uppercase text-white shadow-md transition cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-[#10B981] hover:bg-[#059669] shadow-emerald-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

