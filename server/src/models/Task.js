import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 25,
      min: 1,
      max: 720,
    },
    colorTag: {
      type: String,
      default: '#10b981', // Green for English, Red for DSA, etc.
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    bestStreak: {
      type: Number,
      default: 0,
    },
    lastCompletedDate: {
      type: String, // 'YYYY-MM-DD'
      default: '',
    },
    completedToday: {
      type: Boolean,
      default: false,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    totalMinutes: {
      type: Number,
      default: 0,
    },
    history: [
      {
        date: String,
        completed: Boolean,
        sessionsCount: Number,
        minutesSpent: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Task = mongoose.model('Task', TaskSchema);
