/**
 * Client Date & Study-Day Boundary Utilities
 * Accurately aligns dates, streaks, and timetables with the user's custom daily reset time
 */

export const parseResetTime = (resetTimeStr = '00:00') => {
  if (!resetTimeStr || typeof resetTimeStr !== 'string') return { hours: 0, minutes: 0 };
  const parts = resetTimeStr.split(':').map(Number);
  const hours = isNaN(parts[0]) ? 0 : Math.max(0, Math.min(23, parts[0]));
  const minutes = isNaN(parts[1]) ? 0 : Math.max(0, Math.min(59, parts[1]));
  return { hours, minutes };
};

/**
 * Returns 'YYYY-MM-DD' representing the current study day based on configured reset time
 */
export const getStudyDayDate = (date = new Date(), resetTime = '00:00') => {
  const d = new Date(date);
  const { hours, minutes } = parseResetTime(resetTime);
  const shiftMs = (hours * 60 + minutes) * 60 * 1000;
  const shiftedDate = new Date(d.getTime() - shiftMs);
  const year = shiftedDate.getFullYear();
  const month = String(shiftedDate.getMonth() + 1).padStart(2, '0');
  const day = String(shiftedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns day of week number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export const getStudyDayOfWeek = (date = new Date(), resetTime = '00:00') => {
  const d = new Date(date);
  const { hours, minutes } = parseResetTime(resetTime);
  const shiftMs = (hours * 60 + minutes) * 60 * 1000;
  const shiftedDate = new Date(d.getTime() - shiftMs);
  return shiftedDate.getDay();
};

/**
 * Returns weekday key 'monday' | 'tuesday' | ... | 'sunday'
 */
export const getStudyDayKey = (date = new Date(), resetTime = '00:00') => {
  const dow = getStudyDayOfWeek(date, resetTime);
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return keys[dow];
};

/**
 * Human-friendly format for a reset time (e.g. '00:00' -> '12:00 AM')
 */
export const formatResetTimeDisplay = (timeStr = '00:00') => {
  const { hours, minutes } = parseResetTime(timeStr);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

/**
 * Calculates the exact 'YYYY-MM-DD' date string for any weekday in the current study week
 */
export const getWeekdayDateStr = (targetDayKey, date = new Date(), resetTime = '00:00') => {
  const todayKey = getStudyDayKey(date, resetTime);
  const todayDateStr = getStudyDayDate(date, resetTime);
  const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayIdx = weekdayOrder.indexOf(todayKey);
  const targetIdx = weekdayOrder.indexOf(targetDayKey);
  if (todayIdx === -1 || targetIdx === -1) return todayDateStr;

  const diffDays = targetIdx - todayIdx;
  const parts = todayDateStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + diffDays, 12));
  const year = baseDate.getUTCFullYear();
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
