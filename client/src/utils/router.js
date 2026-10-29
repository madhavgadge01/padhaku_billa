/**
 * Lightweight URL routing utility using native Web History API.
 * Maps application page IDs to clean browser URLs without requiring extra dependencies.
 */

export const PAGE_ROUTES = {
  home: '/',
  focus: '/focus',
  quests: '/quests',
  timetable: '/timetable',
  pet: '/pet',
  progress: '/progress',
  leaderboard: '/leaderboard',
  rewards: '/rewards',
  settings: '/settings',
};

// Aliases for friendly nested navigation and direct address bar typing
export const ROUTE_ALIASES = {
  '/': 'home',
  '/home': 'home',
  '/dashboard': 'home',
  '/focus': 'focus',
  '/timer': 'focus',
  '/quests': 'quests',
  '/tasks': 'quests',
  '/timetable': 'timetable',
  '/weekly-plan': 'timetable',
  '/plan': 'timetable',
  '/pet': 'pet',
  '/pet-care': 'pet',
  '/sparky': 'pet',
  '/progress': 'progress',
  '/analytics': 'progress',
  '/stats': 'progress',
  '/history': 'progress',
  '/leaderboard': 'leaderboard',
  '/ranks': 'leaderboard',
  '/rewards': 'rewards',
  '/shop': 'rewards',
  '/badges': 'rewards',
  '/settings': 'settings',
  '/profile': 'settings',
  '/preferences': 'settings',
};

/**
 * Resolves any browser pathname to the appropriate internal pageId
 */
export const getPageFromPath = (pathname = window.location.pathname) => {
  const cleanPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (ROUTE_ALIASES[cleanPath]) {
    return ROUTE_ALIASES[cleanPath];
  }
  // Try matching root segment: e.g. /settings/profile -> /settings -> 'settings'
  const firstSegment = '/' + cleanPath.split('/').filter(Boolean)[0];
  if (ROUTE_ALIASES[firstSegment]) {
    return ROUTE_ALIASES[firstSegment];
  }
  return 'home';
};

/**
 * Returns canonical URL path for a pageId
 */
export const getPathForPage = (pageId = 'home') => {
  return PAGE_ROUTES[pageId] || '/';
};

