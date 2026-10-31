import mongoose from 'mongoose';

const PomodoroSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: false,
    },
    subjectId: {
      type: String,
      default: null,
      index: true,
    },
    sessionType: {
      type: String,
      enum: ['deep_focus', 'stopwatch'],
      default: 'deep_focus',
      index: true,
    },
    activityDescription: {
      type: String,
      default: '',
    },
    sessionNumber: {
      type: Number,
      default: 1,
    },
    stopwatchColorIndex: {
      type: Number,
      default: 0,
    },
    taskName: {
      type: String,
      required: true,
    },
    colorTag: {
      type: String,
      default: '#10b981',
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    totalGoalSeconds: {
      type: Number,
      default: 0,
    },
    remainingSeconds: {
      type: Number,
      default: 0,
    },
    actualMinutes: {
      type: Number,
      default: 0,
    },
    actualSeconds: {
      type: Number,
      default: 0,
    },
    lastRecordedProgressSeconds: {
      type: Number,
      default: 0,
    },
    accumulatedSeconds: {
      type: Number,
      default: 0,
    },
    intervalActiveSeconds: {
      type: Number,
      default: 0,
    },
    currentIntervalStart: {
      type: Date,
      default: null,
    },
    activeSegmentStart: {
      type: Date,
      default: null,
    },
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
    isInterrupted: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    expectedEndTime: {
      type: Date,
      default: null,
      index: true,
    },
    completionNotificationSent: {
      type: Boolean,
      default: false,
    },
    pauseCount: {
      type: Number,
      default: 0,
    },
    confirmedEarlyBreaks: {
      type: Number,
      default: 0,
    },
    freeBreaks: {
      type: Number,
      default: 0,
    },
    pauseLogs: [
      {
        pausedAt: { type: Date },
        resumedAt: { type: Date },
        durationSeconds: { type: Number, default: 0 },
        intervalSeconds: { type: Number, default: 0 },
        isEarly: { type: Boolean, default: false },
        penaltyCharged: { type: Boolean, default: false },
      },
    ],
    coinsEarned: {
      type: Number,
      default: 0,
    },
    penaltyDeductions: {
      type: Number,
      default: 0,
    },
    dailyBonusAwarded: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['in-progress', 'paused', 'completed', 'stopped', 'interrupted'],
      default: 'in-progress',
    },
    dateStr: {
      type: String, // 'YYYY-MM-DD'
      index: true,
    },
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, etc.
      index: true,
    },
    hourOfDay: {
      type: Number, // 0-23
      index: true,
    },
    isRestDay: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const PomodoroSession = mongoose.model('PomodoroSession', PomodoroSessionSchema);
