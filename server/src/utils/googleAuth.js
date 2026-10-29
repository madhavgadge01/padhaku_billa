import { OAuth2Client } from 'google-auth-library';

let oauthClient = null;

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured on the backend environment.');
  }
  if (!oauthClient) {
    oauthClient = new OAuth2Client(clientId);
  }
  return { client: oauthClient, clientId };
};

/**
 * Verify a Google ID token using Google's official OAuth2Client library.
 * Validates the token signature, expiration, issuer, and audience.
 *
 * @param {string} idToken - The Google JWT credential string from frontend
 * @returns {Promise<{ googleId: string, email: string, emailVerified: boolean, name: string, avatarUrl: string }>}
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google authentication credential is required.');
  }

  const { client, clientId } = getOAuthClient();

  const ticket = await client.verifyIdToken({
    idToken: idToken.trim(),
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid Google credential payload.');
  }

  const googleId = payload.sub;
  if (!googleId) {
    throw new Error('Google credential does not contain a valid subject ID.');
  }

  const email = payload.email ? payload.email.toLowerCase().trim() : '';
  if (!email) {
    throw new Error('Google account does not have an associated email address.');
  }

  const name =
    payload.name ||
    [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'Adventurer';

  return {
    googleId,
    email,
    emailVerified: Boolean(payload.email_verified),
    name: name.trim(),
    avatarUrl: payload.picture || '',
  };
}

