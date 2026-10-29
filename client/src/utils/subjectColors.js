/**
 * Subject Color Palette & Accessibility Helpers
 * 24 distinct, high-contrast, accessible colors across all hue families
 */
export const SUBJECT_COLORS = [
  // Blues & Cyans
  { id: 'blue', name: 'Blue', hex: '#3B82F6', lightBg: '#EFF6FF', darkBg: '#1E3A8A' },
  { id: 'sky_blue', name: 'Sky Blue', hex: '#0EA5E9', lightBg: '#F0F9FF', darkBg: '#0C4A6E' },
  { id: 'cyan', name: 'Cyan', hex: '#06B6D4', lightBg: '#ECFEFF', darkBg: '#164E63' },
  { id: 'indigo', name: 'Indigo', hex: '#6366F1', lightBg: '#EEF2FF', darkBg: '#312E81' },
  // Greens & Teals
  { id: 'teal', name: 'Teal', hex: '#14B8A6', lightBg: '#F0FDFA', darkBg: '#134E4A' },
  { id: 'mint_green', name: 'Mint Green', hex: '#10B981', lightBg: '#ECFDF5', darkBg: '#064E3B' },
  { id: 'emerald', name: 'Emerald', hex: '#059669', lightBg: '#ECFDF5', darkBg: '#064E3B' },
  { id: 'lime', name: 'Lime Green', hex: '#84CC16', lightBg: '#F7FEE7', darkBg: '#365314' },
  { id: 'forest_green', name: 'Forest Green', hex: '#1B3B2F', lightBg: '#E8F5EE', darkBg: '#112820' },
  // Yellows & Ambers
  { id: 'yellow', name: 'Yellow', hex: '#EAB308', lightBg: '#FEFCE8', darkBg: '#713F12' },
  { id: 'amber', name: 'Amber', hex: '#F59E0B', lightBg: '#FFFBEB', darkBg: '#78350F' },
  { id: 'deep_amber', name: 'Deep Ochre', hex: '#D97706', lightBg: '#FFFBEB', darkBg: '#78350F' },
  // Oranges, Corals & Reds
  { id: 'orange', name: 'Orange', hex: '#F97316', lightBg: '#FFF7ED', darkBg: '#7C2D12' },
  { id: 'terracotta', name: 'Terracotta', hex: '#EA580C', lightBg: '#FFF7ED', darkBg: '#7C2D12' },
  { id: 'coral', name: 'Coral', hex: '#FB7185', lightBg: '#FFF1F2', darkBg: '#881337' },
  { id: 'red', name: 'Red', hex: '#EF4444', lightBg: '#FEF2F2', darkBg: '#7F1D1D' },
  { id: 'crimson', name: 'Crimson', hex: '#DC2626', lightBg: '#FEF2F2', darkBg: '#7F1D1D' },
  // Pinks & Roses
  { id: 'pink', name: 'Pink', hex: '#EC4899', lightBg: '#FDF2F8', darkBg: '#831843' },
  { id: 'rose', name: 'Rose', hex: '#F43F5E', lightBg: '#FFF1F2', darkBg: '#881337' },
  { id: 'magenta', name: 'Fuchsia', hex: '#D946EF', lightBg: '#FDF4FF', darkBg: '#701A75' },
  // Purples & Violets
  { id: 'purple', name: 'Purple', hex: '#A855F7', lightBg: '#FAF5FF', darkBg: '#581C87' },
  { id: 'lavender', name: 'Lavender', hex: '#8B5CF6', lightBg: '#F5F3FF', darkBg: '#4C1D95' },
  { id: 'violet', name: 'Violet', hex: '#7C3AED', lightBg: '#F5F3FF', darkBg: '#4C1D95' },
  // Grays & Slates
  { id: 'slate', name: 'Slate Gray', hex: '#475569', lightBg: '#F8FAFC', darkBg: '#1E293B' },
];

/**
 * Returns color item by hex or id, or falls back to blue
 */
export const getSubjectColor = (colorValue) => {
  if (!colorValue) return SUBJECT_COLORS[0];
  const str = String(colorValue).toLowerCase();
  const found = SUBJECT_COLORS.find(
    (c) => c.hex.toLowerCase() === str || c.id.toLowerCase() === str
  );
  return found || {
    id: 'custom',
    name: 'Custom',
    hex: colorValue,
    lightBg: '#F3F4F6',
    darkBg: '#1F2937',
  };
};

/**
 * Calculates accessible readable badge styles for a subject color
 */
export const getSubjectBadgeStyle = (hexColor = '#3B82F6') => {
  const color = getSubjectColor(hexColor);
  return {
    backgroundColor: `${color.hex}18`, // 10% opacity tint
    color: color.hex,
    borderColor: `${color.hex}35`,
  };
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Analyzes the entire weekly timetable and builds:
 * 1. subjectToColor: { [cleanSubjectNameLowerCase]: hex }
 * 2. colorToSubject: { [hexLowerCase]: originalSubjectName }
 */
export const getSubjectColorAssignments = (weeklyTimetable = {}) => {
  const subjectToColor = {};
  const colorToSubject = {};

  if (!weeklyTimetable || typeof weeklyTimetable !== 'object') {
    return { subjectToColor, colorToSubject };
  }

  WEEKDAYS.forEach((day) => {
    const list = weeklyTimetable[day];
    if (Array.isArray(list)) {
      list.forEach((sub) => {
        if (!sub || !sub.name) return;
        const cleanName = sub.name.trim();
        const lowerName = cleanName.toLowerCase();
        const hex = (sub.color || '#3B82F6').toLowerCase();

        if (!subjectToColor[lowerName]) {
          subjectToColor[lowerName] = hex;
        }
        if (!colorToSubject[hex]) {
          colorToSubject[hex] = cleanName;
        }
      });
    }
  });

  return { subjectToColor, colorToSubject };
};

/**
 * Checks if a specific color hex is available to be assigned to `targetSubjectName`.
 * Returns { available: boolean, assignedTo: string | null }
 */
export const checkColorAvailability = (hex, targetSubjectName, weeklyTimetable = {}) => {
  if (!hex) return { available: false, assignedTo: null };
  const lowerHex = hex.toLowerCase();
  const { colorToSubject } = getSubjectColorAssignments(weeklyTimetable);
  const assignedTo = colorToSubject[lowerHex] || null;

  if (!assignedTo) {
    return { available: true, assignedTo: null };
  }

  const cleanTarget = (targetSubjectName || '').trim().toLowerCase();
  if (cleanTarget && assignedTo.toLowerCase() === cleanTarget) {
    // Already assigned to the same subject
    return { available: true, assignedTo };
  }

  return { available: false, assignedTo };
};

/**
 * Finds the first unused color from the palette, or falls back to the subject's existing color.
 */
export const getNextAvailableColor = (weeklyTimetable = {}, subjectName = '') => {
  const { subjectToColor, colorToSubject } = getSubjectColorAssignments(weeklyTimetable);
  const cleanName = (subjectName || '').trim().toLowerCase();

  // If this subject already has a color assigned on another day, prioritize that!
  if (cleanName && subjectToColor[cleanName]) {
    return subjectToColor[cleanName];
  }

  // Otherwise, find the first color not used by any subject
  const unused = SUBJECT_COLORS.find((c) => !colorToSubject[c.hex.toLowerCase()]);
  return unused ? unused.hex : SUBJECT_COLORS[0].hex;
};

/**
 * Synchronizes subject colors across the entire weekly timetable.
 * When "DSA" changes color, every occurrence of "DSA" across all days updates,
 * freeing up its previous color.
 */
export const syncSubjectColorsAcrossTimetable = (weeklyTimetable = {}, targetSubjectName, newColor) => {
  if (!weeklyTimetable || !targetSubjectName) return weeklyTimetable;
  const cleanTarget = targetSubjectName.trim().toLowerCase();
  const updated = {};

  WEEKDAYS.forEach((day) => {
    const list = weeklyTimetable[day] || [];
    updated[day] = list.map((item) => {
      if (item && item.name && item.name.trim().toLowerCase() === cleanTarget) {
        return {
          ...item,
          color: newColor,
        };
      }
      return item;
    });
  });

  return updated;
};
