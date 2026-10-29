import mongoose from 'mongoose';

const CoinTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'task_completion',
        'all_tasks_bonus',
        'daily_bonus',
        'session_pause_penalty',
        'early_break_penalty',
        'goal_decrease_penalty',
        'session_completion',
        'pet_care',
        'shop_purchase',
        'manual_adjustment',
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true, // +5, -1, etc.
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring idempotency: a user can never execute the same referenceId twice
CoinTransactionSchema.index({ userId: 1, referenceId: 1 }, { unique: true });

export const CoinTransaction = mongoose.model('CoinTransaction', CoinTransactionSchema);

