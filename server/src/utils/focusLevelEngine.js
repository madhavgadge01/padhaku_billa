/**
 * Focus Level Engine
 * Smooth monotonic calibration based on 14-day rolling average actual focus hours per day.
 * 
 * Target scale:
 * 0 hrs   -> 0%
 * 1 hr    -> 45%
 * 2 hrs   -> 50%
 * 3 hrs   -> 60%
 * 4 hrs   -> 70%
 * 5 hrs   -> 75%
 * 6 hrs   -> 80%
 * 7 hrs   -> 85%
 * 8 hrs   -> 90%
 * 9 hrs   -> 92%
 * 10-12h  -> 94-95%
 * 13-15h  -> 96-97%
 * 16-18h  -> 98%
 * 19+ hrs -> Approaches 100% asymptotically
 */

export const CALIBRATED_SCALE = [
  { hours: 0, level: 0 },
  { hours: 1, level: 45 },
  { hours: 2, level: 50 },
  { hours: 3, level: 60 },
  { hours: 4, level: 70 },
  { hours: 5, level: 75 },
  { hours: 6, level: 80 },
  { hours: 7, level: 85 },
  { hours: 8, level: 90 },
  { hours: 9, level: 92 },
  { hours: 10, level: 94 },
  { hours: 14, level: 96 },
  { hours: 18, level: 98 },
];

export const FOCUS_TIERS = [
  {
    id: 'starter',
    label: 'Getting Started',
    range: [0, 45],
    color: '#EF4444',
    bgLight: 'bg-red-50',
    borderLight: 'border-red-200',
    textLight: 'text-red-700',
    bgDark: 'dark:bg-red-950/40',
    borderDark: 'dark:border-red-800/50',
    textDark: 'dark:text-red-300',
    dotColor: 'bg-red-500',
    description: 'Initial focus habits (< 1 hr/day)',
  },
  {
    id: 'momentum',
    label: 'Building Momentum',
    range: [46, 70],
    color: '#F59E0B',
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    textLight: 'text-amber-800',
    bgDark: 'dark:bg-amber-950/40',
    borderDark: 'dark:border-amber-800/50',
    textDark: 'dark:text-amber-300',
    dotColor: 'bg-amber-500',
    description: 'Steady habit (1–4 hrs/day)',
  },
  {
    id: 'champion',
    label: 'Focus Champion',
    range: [71, 85],
    color: '#10B981',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    textLight: 'text-emerald-800',
    bgDark: 'dark:bg-emerald-950/40',
    borderDark: 'dark:border-emerald-800/50',
    textDark: 'dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    description: 'High daily focus (4–7 hrs/day)',
  },
  {
    id: 'exceptional',
    label: 'Exceptional Focus',
    range: [86, 100],
    color: '#18231F',
    bgLight: 'bg-zinc-100',
    borderLight: 'border-zinc-300',
    textLight: 'text-zinc-900',
    bgDark: 'dark:bg-zinc-900',
    borderDark: 'dark:border-zinc-700',
    textDark: 'dark:text-zinc-100',
    dotColor: 'bg-zinc-900 dark:bg-zinc-100',
    description: 'Elite dedication (8+ hrs/day)',
  },
];

export function getTierForPercent(pct) {
  const score = Math.max(0, Math.min(100, Math.round(pct)));
  if (score >= 86) return FOCUS_TIERS[3];
  if (score >= 71) return FOCUS_TIERS[2];
  if (score >= 46) return FOCUS_TIERS[1];
  return FOCUS_TIERS[0];
}

/**
 * Computes Focus Level (0 to 100%) from 14-day average daily focus hours.
 * Monotonic piecewise interpolation with asymptotic ceiling for extreme dedication.
 */
export function calculateFocusLevel(avgDailyHours) {
  const h = Math.max(0, Number(avgDailyHours) || 0);
  if (h <= 0) return 0;

  for (let i = 0; i < CALIBRATED_SCALE.length - 1; i++) {
    const p1 = CALIBRATED_SCALE[i];
    const p2 = CALIBRATED_SCALE[i + 1];
    if (h >= p1.hours && h <= p2.hours) {
      const t = (h - p1.hours) / (p2.hours - p1.hours);
      const val = p1.level + t * (p2.level - p1.level);
      return Math.min(100, Math.max(0, Math.round(val)));
    }
  }

  // For 18+ hours: approaches 100% asymptotically
  const asymptotic = 98 + 2 * (1 - Math.exp(-(h - 18) / 3));
  return Math.min(99, Math.max(98, Math.round(asymptotic)));
}

/**
 * Inverse calculation: gives approximate daily focus hours needed for a target percentage.
 */
export function calculateHoursForFocusLevel(targetLevel) {
  const level = Math.max(0, Math.min(100, Number(targetLevel) || 0));
  if (level <= 0) return 0;
  if (level >= 99) return 19.5;

  for (let i = 0; i < CALIBRATED_SCALE.length - 1; i++) {
    const p1 = CALIBRATED_SCALE[i];
    const p2 = CALIBRATED_SCALE[i + 1];
    if (level >= p1.level && level <= p2.level) {
      const t = (level - p1.level) / (p2.level - p1.level);
      const h = p1.hours + t * (p2.hours - p1.hours);
      return Math.round(h * 10) / 10;
    }
  }

  const ratio = Math.min(0.95, Math.max(0, (level - 98) / 2));
  const h = 18 - 3 * Math.log(1 - ratio);
  return Math.round(h * 10) / 10;
}

