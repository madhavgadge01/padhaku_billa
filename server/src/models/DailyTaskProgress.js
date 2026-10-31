import mongoose from 'mongoose';

const DailyTaskProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      index: true,
    },
    taskName: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
    dateStr: {
      type: String, // 'YYYY-MM-DD' representing the local study day
      required: true,
      index: true,
    },
    targetMinutes: {
      type: Number,
      required: true,
      default: 25,
      min: 1,
    },
    completedMinutes: {
      type: Number,
      default: 0,
    },
    completedSeconds: {
      type: Number,
      default: 0,
    },
    remainingMinutes: {
      type: Number,
      default: 25,
      min: 0,
    },
    remainingSeconds: {
      type: Number,
      default: 1500,
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    // Array of session IDs that contributed to this daily record to prevent duplicate additions
    processedSessionIds: {
      type: [String],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring exactly one unified progress entry per task/subject per study day
DailyTaskProgressSchema.index({ userId: 1, dateStr: 1, normalizedName: 1 }, { unique: true });
DailyTaskProgressSchema.index({ userId: 1, dateStr: 1 });

export const DailyTaskProgress = mongoose.model('DailyTaskProgress', DailyTaskProgressSchema);

