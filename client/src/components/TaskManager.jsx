import React, { useState } from 'react';
import { Plus, Flame, Clock, CheckCircle, Circle, Trash2, Tag, ShieldAlert } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { TaskDeleteConfirmModal } from './TaskDeleteConfirmModal.jsx';

const COLOR_PRESETS = [
  { name: 'Red (DSA & Algos)', color: '#ef4444' },
  { name: 'Green (English & Comms)', color: '#10b981' },
  { name: 'Blue (Core Engineering)', color: '#3b82f6' },
  { name: 'Amber (Projects & Design)', color: '#f59e0b' },
  { name: 'Purple (Math & Theory)', color: '#a855f7' },
  { name: 'Cyan (Research & RFCs)', color: '#06b6d4' },
];

export const TaskManager = ({
  tasks,
  activeTask,
  onSelectTask,
  onCreateTask,
  onDeleteTask,
  isRestDay = false,
  globalStreak = 0,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);
  const [taskName, setTaskName] = useState('');
  const [duration, setDuration] = useState(25);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].color);

  const completedTodayCount = tasks.filter((t) => t.completedToday).length;
  const totalTasks = tasks.length;
  const allCompleted = totalTasks > 0 && completedTodayCount === totalTasks;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    sounds.playClick();
    onCreateTask({
      name: taskName.trim(),
      durationMinutes: Number(duration) || 25,
      colorTag: selectedColor,
    });
    setTaskName('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      {/* Header & Global Streak Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-slate-100 tracking-tight">Active Tasks</h2>
            <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">
              {tasks.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete all daily tasks to advance your Global Streak and earn +5 Bonus Coins.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>NEW Task</span>
        </button>
      </div>

      {/* Dual Streak Daily Progress Bar */}
      <div className="my-4 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <div className="flex items-center space-x-2">
            <Flame className={`w-4 h-4 ${allCompleted ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-400'}`} />
            <span className="text-slate-200">
              Daily Task Progress: {completedTodayCount} of {totalTasks} Completed
            </span>
          </div>
          {allCompleted ? (
            <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
              ✨ 100% ALL TASKS DONE!
            </span>
          ) : isRestDay ? (
            <span className="text-sky-400 font-bold bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded-full">
              🛡️ REST DAY FREEZE ACTIVE
            </span>
          ) : (
            <span className="text-amber-400 font-medium">
              Finish {totalTasks - completedTodayCount} more to increment Global Streak!
            </span>
          )}
        </div>

        {/* Progress Fill */}
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${totalTasks > 0 ? (completedTodayCount / totalTasks) * 100 : 0}%` }}
          ></div>
        </div>

        {/* Global Streak Warning note */}
        {!isRestDay && totalTasks > 0 && !allCompleted && (
          <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              Dual-Streak Rule: If even 1 daily task is skipped, your <strong className="text-amber-300">Global Main Streak ({globalStreak} Days)</strong> will reset to 0 tomorrow.
            </span>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2.5 mt-2 max-h-96 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-slate-400">
            <p className="text-sm font-semibold">No Tasks created yet.</p>
            <p className="text-xs text-slate-500 mt-1">Click "New Task" to set up your subjects and focus timers!</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isSelected = activeTask && activeTask._id === task._id;
            return (
              <div
                key={task._id}
                onClick={() => {
                  sounds.playClick();
                  onSelectTask(task);
                }}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'bg-slate-800 border-sky-500/80 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60'
                }`}
              >
                {/* Left: Color Tag & Name */}
                <div className="flex items-center space-x-3 truncate">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow"
                    style={{ backgroundColor: task.colorTag || '#10b981' }}
                  ></div>
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-slate-200 truncate group-hover:text-white">
                      {task.name}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{task.durationMinutes}m</span>
                      </span>
                      <span className="flex items-center space-x-1 text-amber-400 font-semibold" title="Individual Task Streak">
                        <Flame className="w-3 h-3 fill-amber-400" />
                        <span>{task.currentStreak || 0}d streak</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Completion status & Delete */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                  {task.completedToday ? (
                    <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Done Today</span>
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                          : 'bg-slate-700 text-slate-300 border-slate-600 group-hover:border-slate-500'
                      }`}
                    >
                      {isSelected ? 'Focusing' : 'Ready'}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sounds.playClick();
                      setDeletingTask(task);
                    }}
                    className="text-slate-500 hover:text-rose-400 transition p-1 hover:bg-slate-700 rounded-lg cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Quest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-100 mb-1">Create New Focus Task</h3>
            <p className="text-xs text-slate-400 mb-4">Set up a customized subject, duration, and color tag.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Task / Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures & Algorithms, English Lit..."
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Custom Duration: {duration} Minutes
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                  <span>5m</span>
                  <span>25m (Standard)</span>
                  <span>50m (Deep)</span>
                  <span>120m</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Color Tag Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setSelectedColor(preset.color)}
                      className={`flex items-center space-x-2 p-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                        selectedColor === preset.color
                          ? 'border-sky-400 bg-slate-800 text-white font-bold ring-1 ring-sky-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: preset.color }}></span>
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Smart Task Deletion Confirmation Modal */}
      <TaskDeleteConfirmModal
        isOpen={Boolean(deletingTask)}
        task={deletingTask}
        isRecurring={Boolean(deletingTask?.repeatDaily)}
        onDeleteToday={() => {
          if (deletingTask) {
            onDeleteTask(deletingTask._id || deletingTask.id, { scope: 'today' });
            setDeletingTask(null);
          }
        }}
        onDeletePermanent={() => {
          if (deletingTask) {
            onDeleteTask(deletingTask._id || deletingTask.id, { scope: 'permanent' });
            setDeletingTask(null);
          }
        }}
        onClose={() => setDeletingTask(null)}
      />
    </div>
  );
};
