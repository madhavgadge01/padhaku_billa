import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      default: 'google_oauth_account',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'otp'],
      default: 'local',
    },
    age: {
      type: Number,
      default: 20,
    },
    fieldOfStudy: {
      type: String,
      default: 'Computer Science',
      enum: [
        'Computer Science',
        'Medical',
        'Software Engineer',
        'Competitive Exams',
        'Law',
        'Business & Finance',
        'Design & Arts',
        'Engineering (General)',
        'Other',
      ],
    },
    hasCompletedOnboarding: {
      type: Boolean,
      default: false,
    },
    dailyResetTime: {
      type: String,
      default: '00:00', // Default 12:00 AM (Midnight)
      trim: true,
    },
    hasExplicitResetTime: {
      type: Boolean,
      default: false,
    },
    timezone: {
      type: String,
      default: 'auto',
    },
    hasConfiguredTimetable: {
      type: Boolean,
      default: false,
    },
    weeklyTimetable: {
      monday: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          color: { type: String, default: '#3B82F6' },
          targetMinutes: { type: Number, default: 45 },
          completedDates: { type: [String], default: [] },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          lastCompletedDate: { type: String, default: '' },
          order: { type: Number, default: 0 },
          repeatDaily: { type: Boolean, default: false },
          excludedDates: { type: [String], default: [] },
          isArchived: { type: Boolean, default: false },
        },
      ],
      tuesday: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          color: { type: String, default: '#3B82F6' },
          targetMinutes: { type: Number, default: 45 },
          completedDates: { type: [String], default: [] },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          lastCompletedDate: { type: String, default: '' },
          order: { type: Number, default: 0 },
          repeatDaily: { type: Boolean, default: false },
          excludedDates: { type: [String], default: [] },
          isArchived: { type: Boolean, default: false },
        },
      ],
      wednesday: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          color: { type: String, default: '#3B82F6' },
          targetMinutes: { type: Number, default: 45 },
          completedDates: { type: [String], default: [] },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          lastCompletedDate: { type: String, default: '' },
          order: { type: Number, default: 0 },
          repeatDaily: { type: Boolean, default: false },
          excludedDates: { type: [String], default: [] },
          isArchived: { type: Boolean, default: false },
        },
      ],
      thursday: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          color: { type: String, default: '#3B82F6' },
          targetMinutes: { type: Number, default: 45 },
          completedDates: { type: [String], default: [] },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          lastCompletedDate: { type: String, default: '' },
          order: { type: Number, default: 0 },
          repeatDaily: { type: Boolean, default: false },
          excludedDates: { type: [String], default: [] },
          isArchived: { type: Boolean, default: false },
        },
      ],
      friday: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          color: { type: String, default: '#3B82F6' },
          targetMinutes: { type: Number, default: 45 },
          completedDates: { type: [String], default: [] },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          lastCompletedDate: { type: String, default: '' },
          order: { type: Number, default: 0 },
          repeatDaily: { type: Boolean, default: false },
          excludedDates: { type: [String], default: [] },
          isArchived: { type: Boolean, default: false },
        },
      ],
      saturday: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          color: { type: String, default: '#3B82F6' },
          targetMinutes: { type: Number, default: 45 },
          completedDates: { type: [String], default: [] },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          lastCompletedDate: { type: String, default: '' },
          order: { type: Number, default: 0 },
          repeatDaily: { type: Boolean, default: false },
          excludedDates: { type: [String], default: [] },
          isArchived: { type: Boolean, default: false },
        },
      ],
      sunday: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          color: { type: String, default: '#3B82F6' },
          targetMinutes: { type: Number, default: 45 },
          completedDates: { type: [String], default: [] },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          lastCompletedDate: { type: String, default: '' },
          order: { type: Number, default: 0 },
          repeatDaily: { type: Boolean, default: false },
          excludedDates: { type: [String], default: [] },
          isArchived: { type: Boolean, default: false },
        },
      ],
    },
    archivedTasks: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        color: { type: String, default: '#3B82F6' },
        targetMinutes: { type: Number, default: 25 },
        archivedAt: { type: Date, default: Date.now },
      },
    ],
    dailyGoalOverrides: [
      {
        subjectId: { type: String, required: true },
        subjectName: { type: String, default: '' },
        dateStr: { type: String, required: true }, // 'YYYY-MM-DD' user-local study day
        targetMinutes: { type: Number, required: true },
        originalMinutes: { type: Number, required: true },
      },
    ],
    restDay: {
      enabled: {
        type: Boolean,
        default: true,
      },
      dayOfWeek: {
        type: Number,
        default: 0, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        min: 0,
        max: 6,
      },
    },
    coins: {
      type: Number,
      default: 0, // Starts at 0 in production
      min: 0,
    },
    studyStartDate: {
      type: String, // 'YYYY-MM-DD' study routine kickoff date
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    health: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    selectedAvatar: {
      type: String,
      enum: ['cat', 'deer', 'bunny', 'bear', 'fox', 'businessman'],
      default: 'cat',
    },
    pet: {
      type: {
        type: String,
        enum: ['cyber-pup', 'pixel-fox', 'robo-panda', 'mecha-cat', 'living-cat'],
        default: 'living-cat',
      },
      name: {
        type: String,
        default: 'Sparky',
      },
      health: {
        type: Number,
        default: 35, // Safe starter health for introductory care
        min: 0,
        max: 100,
      },
      vitality: {
        type: Number,
        default: 35,
        min: 0,
        max: 100,
      },
      hunger: {
        type: Number,
        default: 0, // 0 = needs food on first arrival
        min: 0,
        max: 100,
      },
      thirst: {
        type: Number,
        default: 0, // 0 = needs water on first arrival
        min: 0,
        max: 100,
      },
      affection: {
        type: Number,
        default: 20,
        min: 0,
        max: 100,
      },
      hasCompletedIntroCare: {
        type: Boolean,
        default: false,
      },
      isAlive: {
        type: Boolean,
        default: true,
      },
      lastFedAt: {
        type: Date,
        default: Date.now,
      },
      lastWateredAt: {
        type: Date,
        default: Date.now,
      },
      lastDecayCheck: {
        type: Date,
        default: Date.now,
      },
    },
    streaks: {
      currentGlobalStreak: {
        type: Number,
        default: 0,
      },
      bestGlobalStreak: {
        type: Number,
        default: 0,
      },
      currentStreak: {
        type: Number,
        default: 0,
      },
      bestStreak: {
        type: Number,
        default: 0,
      },
      lastActiveDate: {
        type: String, // 'YYYY-MM-DD'
        default: '',
      },
      completedDates: {
        type: [String], // Array of 'YYYY-MM-DD'
        default: [],
      },
      streakHistory: [
        {
          date: String,
          completedTasksCount: Number,
          totalTasksCount: Number,
          allTasksCompleted: Boolean,
          isRestDay: Boolean,
        },
      ],
    },
    inventory: {
      apparel: {
        type: [String],
        default: ['basic_clothes'],
      },
      equippedApparel: {
        type: String,
        default: 'basic_clothes',
      },
      vehicles: {
        type: [String],
        default: ['bicycle'],
      },
      equippedVehicle: {
        type: String,
        default: 'bicycle',
      },
      realEstate: {
        type: [String],
        default: ['cozy_room'],
      },
      equippedRealEstate: {
        type: String,
        default: 'cozy_room',
      },
      unlockedBusinessSuit: {
        type: Boolean,
        default: false, // Strict unlock when bestGlobalStreak >= 365
      },
      badges: {
        type: [String],
        default: [],
      },
      showcaseBadges: {
        type: [String],
        default: [],
      },
      accessories: {
        type: [String],
        default: ['none', 'red_bowtie', 'wire_glasses', 'party_hat', 'cozy_scarf', 'cozy_sweater'],
      },
      equippedAccessory: {
        type: String,
        default: 'none',
      },
      equippedHat: {
        type: String,
        default: 'none',
      },
      equippedGlasses: {
        type: String,
        default: 'none',
      },
      equippedNeckwear: {
        type: String,
        default: 'none',
      },
      equippedOutfit: {
        type: String,
        default: 'none',
      },
      equippedBackpack: {
        type: String,
        default: 'none',
      },
      equippedFoodBowl: {
        type: String,
        default: 'classic_wood',
      },
      equippedWaterBowl: {
        type: String,
        default: 'ceramic_dish',
      },
      equippedToy: {
        type: String,
        default: 'yarn_ball',
      },
      equippedBed: {
        type: String,
        default: 'cloud_bed',
      },
      habitats: {
        type: [String],
        default: ['forest_meadow'],
      },
      equippedHabitat: {
        type: String,
        default: 'forest_meadow',
      },
    },
    socialLinks: {
      instagram: {
        type: String,
        default: '',
        trim: true,
      },
      linkedin: {
        type: String,
        default: '',
        trim: true,
      },
    },
    otp: {
      code: {
        type: String,
      },
      expiresAt: {
        type: Date,
      },
      purpose: {
        type: String,
        enum: ['register', 'login'],
      },
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', UserSchema);
