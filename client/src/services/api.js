// const API_BASE = 'http://localhost:5001/api';
 const API_BASE = 'https://tell-profession-reverse-optimum.trycloudflare.com/api';
const getHeaders = () => {
  const token = localStorage.getItem('lifelevel_token');
  return {
    'Content-Type': 'application/json',
    'x-timezone-offset': String(new Date().getTimezoneOffset()),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const api = {
  // Auth
  googleAuth: (credential) =>
    fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    }).then(handleResponse),

  requestOtp: (email, purpose = 'register') =>
    fetch(`${API_BASE}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    }).then(handleResponse),

  verifyOtp: (email, otp, purpose = 'register') =>
    fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose }),
    }).then(handleResponse),

  verifyOtpRegister: (payload) =>
    fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, purpose: 'register' }),
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  verifyOtpLogin: (email, otp) =>
    fetch(`${API_BASE}/auth/verify-otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }).then(handleResponse),

  onboarding: (payload) =>
    fetch(`${API_BASE}/auth/onboarding`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  updateStudyPreferences: (payload) =>
    fetch(`${API_BASE}/auth/study-preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    }).then(handleResponse),

  updateTheme: (theme) =>
    fetch(`${API_BASE}/auth/theme`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ theme }),
    }).then(handleResponse),

  // Tasks & Timetable
  getTasks: () =>
    fetch(`${API_BASE}/tasks`, {
      headers: getHeaders(),
    }).then(handleResponse),

  createTask: (payload) =>
    fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  updateTask: (id, payload) =>
    fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  deleteTask: (id) =>
    fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse),

  toggleTask: (id, weekday) =>
    fetch(`${API_BASE}/tasks/${id}/toggle`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ weekday }),
    }).then(handleResponse),

  getWeeklyTimetable: () =>
    fetch(`${API_BASE}/tasks/timetable/weekly`, {
      headers: getHeaders(),
    }).then(handleResponse),

  updateWeeklyTimetable: (payload) =>
    fetch(`${API_BASE}/tasks/timetable/weekly`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  toggleTimetableSubject: (weekday, subjectId) =>
    fetch(`${API_BASE}/tasks/timetable/toggle-complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ weekday, subjectId }),
    }).then(handleResponse),

  // Pomodoro
  getActiveSessions: () =>
    fetch(`${API_BASE}/pomodoro/active`, {
      headers: getHeaders(),
    }).then(handleResponse),

  startSession: (payload) => {
    const body = typeof payload === 'string' ? { taskId: payload } : payload;
    return fetch(`${API_BASE}/pomodoro/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse);
  },

  pauseSession: (sessionId, payload = {}) =>
    fetch(`${API_BASE}/pomodoro/${sessionId}/pause`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  resumeSession: (sessionId) =>
    fetch(`${API_BASE}/pomodoro/${sessionId}/resume`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  completeSession: (sessionId) =>
    fetch(`${API_BASE}/pomodoro/${sessionId}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  stopSession: (sessionId) =>
    fetch(`${API_BASE}/pomodoro/${sessionId}/stop`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  saveStopwatchSession: (payload) =>
    fetch(`${API_BASE}/pomodoro/stopwatch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  checkpointSession: (sessionId, data = {}) =>
    fetch(`${API_BASE}/pomodoro/${sessionId}/checkpoint`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  reconcileSessions: () =>
    fetch(`${API_BASE}/pomodoro/reconcile`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  setDailyGoalOverride: (payload) =>
    fetch(`${API_BASE}/pomodoro/daily-goal-override`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  resetDailyGoalOverride: (payload) =>
    fetch(`${API_BASE}/pomodoro/daily-goal-override`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  getSessionHistory: () =>
    fetch(`${API_BASE}/pomodoro/history`, {
      headers: getHeaders(),
    }).then(handleResponse),

  // Pet
  getPetStatus: () =>
    fetch(`${API_BASE}/pet/status`, {
      headers: getHeaders(),
    }).then(handleResponse),

  feedPet: () =>
    fetch(`${API_BASE}/pet/feed`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  waterPet: () =>
    fetch(`${API_BASE}/pet/water`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  revivePet: () =>
    fetch(`${API_BASE}/pet/revive`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  playWithPet: () =>
    fetch(`${API_BASE}/pet/play`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  completeIntroCare: () =>
    fetch(`${API_BASE}/pet/intro-complete`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  // Shop
  getCatalog: () =>
    fetch(`${API_BASE}/shop/catalog`, {
      headers: getHeaders(),
    }).then(handleResponse),

  buyItem: (category, itemId) =>
    fetch(`${API_BASE}/shop/buy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, itemId }),
    }).then(handleResponse),

  equipItem: (category, itemId, slot) =>
    fetch(`${API_BASE}/shop/equip`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, itemId, slot }),
    }).then(handleResponse),

  updateShowcaseBadges: (showcaseBadges) =>
    fetch(`${API_BASE}/shop/showcase-badges`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ showcaseBadges }),
    }).then(handleResponse),

  // Analytics
  getAnalyticsDashboard: () =>
    fetch(`${API_BASE}/analytics/dashboard`, {
      headers: getHeaders(),
    }).then(handleResponse),

  getPeerBenchmark: () =>
    fetch(`${API_BASE}/analytics/peer-benchmark`, {
      headers: getHeaders(),
    }).then(handleResponse),

  seedDemoData: () =>
    fetch(`${API_BASE}/analytics/seed-demo-data`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),

  // Community Leaderboard
  getLeaderboard: (mode = 'today') =>
    fetch(`${API_BASE}/leaderboard?mode=${mode}`, {
      headers: getHeaders(),
    }).then(handleResponse),

  getLeaderboardUserProfile: (userId) =>
    fetch(`${API_BASE}/leaderboard/${userId}/profile`, {
      headers: getHeaders(),
    }).then(handleResponse),

  updateSocialLinks: (socialLinks) =>
    fetch(`${API_BASE}/auth/socials`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(socialLinks),
    }).then(handleResponse),

  // Push Notifications & Background Alerts
  getVapidPublicKey: () =>
    fetch(`${API_BASE}/notifications/vapid-public-key`, {
      headers: getHeaders(),
    }).then(handleResponse),

  subscribePush: (subscription) =>
    fetch(`${API_BASE}/notifications/subscribe`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ subscription }),
    }).then(handleResponse),

  unsubscribePush: (endpoint) =>
    fetch(`${API_BASE}/notifications/unsubscribe`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ endpoint }),
    }).then(handleResponse),

  testPushNotification: () =>
    fetch(`${API_BASE}/notifications/test`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),
};
