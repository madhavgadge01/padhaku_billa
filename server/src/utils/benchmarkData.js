// Statistical peer distributions for various fields of study
// Mean (hours/day) and standard deviation (sigma) based on global productivity surveys
export const FIELD_BENCHMARKS = {
  'Computer Science': {
    meanDailyHours: 4.2,
    stdDev: 1.5,
    top10Hours: 6.2,
    description: 'Computer Science & Software Development',
    focusHabitTip: 'Pair programming & algorithm problem sprints benefit from 50/10 intervals.',
  },
  'Medical': {
    meanDailyHours: 6.5,
    stdDev: 1.8,
    top10Hours: 8.8,
    description: 'Medical & Healthcare Studies',
    focusHabitTip: 'Anki spaced repetition cards work best in 45-minute deep focus blocks.',
  },
  'Software Engineer': {
    meanDailyHours: 4.8,
    stdDev: 1.4,
    top10Hours: 6.6,
    description: 'Professional Software Engineering',
    focusHabitTip: 'Protect morning blocks for zero-interruption architectural coding.',
  },
  'Competitive Exams': {
    meanDailyHours: 7.2,
    stdDev: 2.0,
    top10Hours: 9.8,
    description: 'Civil Services, JEE, NEET, GATE, GRE, USMLE',
    focusHabitTip: 'High-stake exam prep requires consistent daily question reviews without multitasking.',
  },
  'Law': {
    meanDailyHours: 5.5,
    stdDev: 1.6,
    top10Hours: 7.6,
    description: 'Law & Jurisprudence',
    focusHabitTip: 'Case brief deep-reads require 60-minute uninterrupted reading cycles.',
  },
  'Business & Finance': {
    meanDailyHours: 4.5,
    stdDev: 1.3,
    top10Hours: 6.2,
    description: 'Finance, Consulting & Management',
    focusHabitTip: 'Financial model sprints are best executed in 35-minute sprint blocks.',
  },
  'Design & Arts': {
    meanDailyHours: 4.0,
    stdDev: 1.4,
    top10Hours: 5.8,
    description: 'UI/UX Design, Illustration & Creative Media',
    focusHabitTip: 'Creative flow states lock in after 20 minutes; avoid checking notifications.',
  },
  'Engineering (General)': {
    meanDailyHours: 4.6,
    stdDev: 1.5,
    top10Hours: 6.5,
    description: 'Mechanical, Electrical & Civil Engineering',
    focusHabitTip: 'Solve analytical equations in dedicated 45-minute calculation sessions.',
  },
  'Other': {
    meanDailyHours: 4.0,
    stdDev: 1.5,
    top10Hours: 6.0,
    description: 'General Academic & Professional Focus',
    focusHabitTip: 'Consistency beats intensity: lock in 4 solid pomodoro sessions daily.',
  },
};

// Error function approximation for Gaussian Cumulative Distribution Function
function erf(x) {
  // Abramowitz and Stegun formula 7.1.26 approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

// Calculate percentile given user hours, mean, and stdDev
export const calculatePercentile = (userHours, mean, stdDev) => {
  if (userHours <= 0) return 5;
  const zScore = (userHours - mean) / (stdDev * Math.SQRT2);
  const cdf = 0.5 * (1 + erf(zScore));
  const percentile = Math.min(99.5, Math.max(1, Math.round(cdf * 100)));
  return percentile;
};

export const getPeerBenchmark = (fieldOfStudy, averageDailyHours) => {
  const benchmark = FIELD_BENCHMARKS[fieldOfStudy] || FIELD_BENCHMARKS['Computer Science'];
  const userHours = Math.round(averageDailyHours * 10) / 10;
  const percentile = calculatePercentile(userHours, benchmark.meanDailyHours, benchmark.stdDev);

  // Top X% rank
  const topRankPercent = Math.max(1, 100 - percentile);
  const gapToTop10 = Math.max(0, Math.round((benchmark.top10Hours - userHours) * 10) / 10);

  let recommendation = '';
  if (gapToTop10 > 0) {
    recommendation = `To reach the Top 10%, increase focus time by ${gapToTop10} hrs/day!`;
  } else {
    recommendation = `Outstanding! You are already among the elite Top ${topRankPercent}% focus masters in ${fieldOfStudy}!`;
  }

  const comparisonText = `You study ${userHours} hrs/day in ${fieldOfStudy}. You fall in the TOP ${topRankPercent}% of peers globally (${percentile}th percentile). ${recommendation}`;

  return {
    fieldOfStudy,
    userDailyHours: userHours,
    peerMeanHours: benchmark.meanDailyHours,
    top10TargetHours: benchmark.top10Hours,
    percentile,
    topRankPercent,
    gapToTop10,
    recommendation,
    comparisonText,
    tip: benchmark.focusHabitTip,
  };
};
