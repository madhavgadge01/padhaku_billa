/**
 * Social Profile Links Normalization & Validation Utility
 */

export const normalizeInstagram = (input) => {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  if (!clean) return '';

  // Prevent script/data schemes
  if (/^(javascript|data|vbscript):/i.test(clean)) return '';

  // Remove leading @
  if (clean.startsWith('@')) clean = clean.slice(1).trim();

  // If already HTTP/HTTPS URL
  if (/^https?:\/\//i.test(clean)) {
    clean = clean.replace(/^http:\/\//i, 'https://');
    // Ensure it targets instagram.com
    if (/^https:\/\/(www\.)?instagram\.com\//i.test(clean)) {
      return clean;
    }
  }

  // If starts with instagram.com
  if (/^(www\.)?instagram\.com\//i.test(clean)) {
    return `https://${clean.replace(/^www\./i, '')}`;
  }

  // Plain username
  const username = clean.replace(/[^a-zA-Z0-9._]/g, '');
  return username ? `https://instagram.com/${username}` : '';
};

export const normalizeLinkedIn = (input) => {
  if (!input || typeof input !== 'string') return '';
  let clean = input.trim();
  if (!clean) return '';

  // Prevent script/data schemes
  if (/^(javascript|data|vbscript):/i.test(clean)) return '';

  // If already HTTP/HTTPS URL
  if (/^https?:\/\//i.test(clean)) {
    clean = clean.replace(/^http:\/\//i, 'https://');
    if (/^https:\/\/(www\.)?linkedin\.com\//i.test(clean)) {
      return clean;
    }
  }

  // If starts with linkedin.com
  if (/^(www\.)?linkedin\.com\//i.test(clean)) {
    return `https://${clean.replace(/^www\./i, '')}`;
  }

  // If starts with in/
  if (clean.startsWith('in/')) {
    const slug = clean.slice(3).replace(/[^a-zA-Z0-9-_%]/g, '');
    return slug ? `https://linkedin.com/in/${slug}` : '';
  }

  // Plain username
  const username = clean.replace(/[^a-zA-Z0-9-_%]/g, '');
  return username ? `https://linkedin.com/in/${username}` : '';
};

export const normalizeSocialLinks = (socialLinks = {}) => {
  const instagram = socialLinks?.instagram || socialLinks?.ig || '';
  const linkedin = socialLinks?.linkedin || socialLinks?.li || '';
  return {
    instagram: normalizeInstagram(instagram),
    linkedin: normalizeLinkedIn(linkedin),
  };
};

