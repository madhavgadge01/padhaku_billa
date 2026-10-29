/**
 * Client Social & Display Utilities for Padhaku Billa
 */

export const normalizeInstagram = (input) => {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  if (!clean) return '';

  if (/^(javascript|data|vbscript):/i.test(clean)) return '';

  if (clean.startsWith('@')) clean = clean.slice(1).trim();

  if (/^https?:\/\//i.test(clean)) {
    clean = clean.replace(/^http:\/\//i, 'https://');
    if (/^https:\/\/(www\.)?instagram\.com\//i.test(clean)) {
      return clean;
    }
  }

  if (/^(www\.)?instagram\.com\//i.test(clean)) {
    return `https://${clean.replace(/^www\./i, '')}`;
  }

  const username = clean.replace(/[^a-zA-Z0-9._]/g, '');
  return username ? `https://instagram.com/${username}` : '';
};

export const normalizeLinkedIn = (input) => {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  if (!clean) return '';

  if (/^(javascript|data|vbscript):/i.test(clean)) return '';

  if (/^https?:\/\//i.test(clean)) {
    clean = clean.replace(/^http:\/\//i, 'https://');
    if (/^https:\/\/(www\.)?linkedin\.com\//i.test(clean)) {
      return clean;
    }
  }

  if (/^(www\.)?linkedin\.com\//i.test(clean)) {
    return `https://${clean.replace(/^www\./i, '')}`;
  }

  if (clean.startsWith('in/')) {
    const slug = clean.slice(3).replace(/[^a-zA-Z0-9-_%]/g, '');
    return slug ? `https://linkedin.com/in/${slug}` : '';
  }

  const username = clean.replace(/[^a-zA-Z0-9-_%]/g, '');
  return username ? `https://linkedin.com/in/${username}` : '';
};

export const isValidInstagram = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/i.test(url.trim());
};

export const isValidLinkedIn = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /^https:\/\/(www\.)?linkedin\.com\/(in\/[a-zA-Z0-9-_%]+\/?|[a-zA-Z0-9-_%]+\/?)$/i.test(url.trim());
};

export const formatStudyDuration = (totalMinutes) => {
  const mins = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (mins === 0) return '0m';

  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

export const AVATAR_EMOJIS = {
  cat: '🐱',
  deer: '🦌',
  bunny: '🐰',
  bear: '🐻',
  fox: '🦊',
  businessman: '💼',
};

export const getAvatarEmoji = (avatarKey) => {
  return AVATAR_EMOJIS[avatarKey] || '🐾';
};

