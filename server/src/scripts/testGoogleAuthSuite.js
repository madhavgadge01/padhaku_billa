import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import authRoutes from '../routes/authRoutes.js';
import * as googleAuthModule from '../utils/googleAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.TEST_MONGODB_URL || 'mongodb://127.0.0.1:27017/lifelevel';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runGoogleAuthSuite() {
  console.log('================================================================');
  console.log('🛡️  PADHAKU BILLA: GOOGLE AUTHENTICATION TEST SUITE');
  console.log('================================================================\n');

  // Connect to DB
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB: ${MONGODB_URI}\n`);

  // Spin up test server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/auth`;

  try {
    // --- 1. Environment & Configuration Checks ---
    console.log('--- 1. Environment & Client ID Configuration ---');
    const backendClientId = process.env.GOOGLE_CLIENT_ID;
    assert(!!backendClientId, `Backend GOOGLE_CLIENT_ID is defined: ${backendClientId}`);

    const clientEnvPath = path.join(__dirname, '../../../client/.env');
    const clientEnvContent = fs.existsSync(clientEnvPath) ? fs.readFileSync(clientEnvPath, 'utf-8') : '';
    assert(
      clientEnvContent.includes('VITE_GOOGLE_CLIENT_ID='),
      'Client .env contains VITE_GOOGLE_CLIENT_ID'
    );
    assert(
      !clientEnvContent.includes('GOOGLE_CLIENT_SECRET'),
      'Client .env does NOT expose GOOGLE_CLIENT_SECRET'
    );

    // --- 2. Input Validation & Error Handling ---
    console.log('\n--- 2. Input Validation & Invalid Credential Handling ---');

    // Missing credential
    const emptyRes = await fetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const emptyData = await emptyRes.json();
    assert(emptyRes.status === 400, 'Empty credential returns HTTP 400');
    assert(emptyData.success === false, 'Empty credential returns success: false');

    // Invalid / forged JWT credential
    const forgedRes = await fetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'forged.fake.token' }),
    });
    const forgedData = await forgedRes.json();
    assert(forgedRes.status === 401, 'Forged token rejected with HTTP 401 Unauthorized');
    assert(forgedData.success === false, 'Forged token returns success: false');

    // --- 3. Mock Google Verification for End-to-End User Journeys ---
    console.log('\n--- 3. New User Registration via Continue with Google ---');

    // Clean any prior test users
    const testGoogleId = `google_sub_test_${Date.now()}`;
    const testGoogleEmail = `billa_google_test_${Date.now()}@example.com`;
    await User.deleteMany({ email: { $regex: /billa_google_test_/ } });

    // Spy / override verifyGoogleIdToken to simulate verified Google OAuth payload
    let mockProfile = {
      googleId: testGoogleId,
      email: testGoogleEmail,
      emailVerified: true,
      name: 'Padhaku Google Scholar',
      avatarUrl: 'https://lh3.googleusercontent.com/a/test-avatar-123',
    };

    const originalVerify = googleAuthModule.verifyGoogleIdToken;

    // Use OAuth2Client spy
    const oauthProto = OAuth2Client.prototype;
    const originalVerifyIdToken = oauthProto.verifyIdToken;
    oauthProto.verifyIdToken = async function ({ idToken, audience }) {
      if (idToken === 'valid_mock_google_id_token') {
        return {
          getPayload: () => ({
            sub: mockProfile.googleId,
            email: mockProfile.email,
            email_verified: mockProfile.emailVerified,
            name: mockProfile.name,
            picture: mockProfile.avatarUrl,
          }),
        };
      }
      throw new Error('Invalid token signature');
    };

    // Post valid mock credential
    const signupRes = await fetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'valid_mock_google_id_token' }),
    });
    const signupData = await signupRes.json();

    assert(signupRes.status === 200, 'Google sign-up returns HTTP 200 OK');
    assert(signupData.success === true, 'Response contains success: true');
    assert(!!signupData.token, 'Response contains signed JWT token');
    assert(signupData.isNewUser === true, 'isNewUser is true for first-time Google user');
    assert(signupData.user.googleId === testGoogleId, 'User has correct stable Google subject ID');
    assert(signupData.user.email === testGoogleEmail, 'User has correct verified Google email');
    assert(signupData.user.isEmailVerified === true, 'User isEmailVerified is automatically true');
    assert(signupData.user.hasCompletedOnboarding === false, 'New user hasCompletedOnboarding is false');
    assert(signupData.user.coins === 0, 'New user starts with 0 coins');
    assert(signupData.user.authProvider === 'google', 'User authProvider is set to "google"');

    // Verify issued token
    const decodedJwt = jwt.verify(
      signupData.token,
      process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt'
    );
    assert(decodedJwt.userId === signupData.user._id, 'Issued JWT contains correct userId');

    // --- 4. Preserved Onboarding Flow for Google User ---
    console.log('\n--- 4. Completing Onboarding Sequence for New Google User ---');
    const googleAuthToken = signupData.token;

    // Onboarding Step 2: Name
    const nameRes = await fetch(`${baseUrl}/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleAuthToken}`,
      },
      body: JSON.stringify({ name: 'Padhaku Master' }),
    });
    const nameData = await nameRes.json();
    assert(nameRes.status === 200, 'Onboarding name update returns HTTP 200');
    assert(nameData.user.name === 'Padhaku Master', 'User name updated to "Padhaku Master"');
    assert(nameData.user.hasCompletedOnboarding === false, 'Onboarding not finished yet');

    // Onboarding Step 3 & Finish
    const finishRes = await fetch(`${baseUrl}/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleAuthToken}`,
      },
      body: JSON.stringify({
        finish: true,
        hasCompletedOnboarding: true,
        socialLinks: { instagram: '@padhaku_billa', linkedin: 'linkedin.com/in/padhaku' },
      }),
    });
    const finishData = await finishRes.json();
    assert(finishRes.status === 200, 'Onboarding finish returns HTTP 200');
    assert(finishData.user.hasCompletedOnboarding === true, 'hasCompletedOnboarding is now true');
    assert(
      finishData.user.socialLinks.instagram === 'https://instagram.com/padhaku_billa',
      'Instagram link normalized and saved'
    );

    // --- 5. Returning Google User Login ---
    console.log('\n--- 5. Returning Google User Login (No Repeated Onboarding) ---');

    // Simulate returning login
    const returningRes = await fetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'valid_mock_google_id_token' }),
    });
    const returningData = await returningRes.json();

    assert(returningRes.status === 200, 'Returning Google login returns HTTP 200');
    assert(returningData.isNewUser === false, 'isNewUser is false for returning user');
    assert(returningData.user.hasCompletedOnboarding === true, 'hasCompletedOnboarding is preserved as true');
    assert(returningData.user.name === 'Padhaku Master', 'User custom display name is strictly preserved');
    assert(
      returningData.user.socialLinks.instagram === 'https://instagram.com/padhaku_billa',
      'User social links are strictly preserved'
    );

    // --- 6. Safe Account Linking for Existing Email User ---
    console.log('\n--- 6. Safe Account Linking for Existing Email User ---');

    const legacyEmail = `legacy_user_${Date.now()}@example.com`;
    const legacyGoogleSub = `google_sub_legacy_${Date.now()}`;

    // Create existing user with 50 coins and a pet name
    const existingLegacyUser = await User.create({
      name: 'Legacy Scholar',
      email: legacyEmail,
      passwordHash: 'otp_verified_account',
      coins: 50,
      hasCompletedOnboarding: true,
      isEmailVerified: true,
      pet: { name: 'Chotu', health: 90 },
    });

    assert(existingLegacyUser.coins === 50, 'Existing user initially has 50 coins');
    assert(!existingLegacyUser.googleId, 'Existing user initially has no googleId');

    // Google login with the matching verified email
    mockProfile = {
      googleId: legacyGoogleSub,
      email: legacyEmail,
      emailVerified: true,
      name: 'Legacy Scholar via Google',
      avatarUrl: 'https://lh3.googleusercontent.com/legacy.jpg',
    };

    const linkRes = await fetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'valid_mock_google_id_token' }),
    });
    const linkData = await linkRes.json();

    assert(linkRes.status === 200, 'Account linking returns HTTP 200');
    assert(linkData.user.googleId === legacyGoogleSub, 'googleId safely linked to existing user');
    assert(linkData.user.coins === 50, 'Existing coins (50) strictly preserved after linking');
    assert(linkData.user.pet.name === 'Chotu', 'Existing pet data strictly preserved after linking');
    assert(linkData.user.hasCompletedOnboarding === true, 'Onboarding completion status preserved');

    // Confirm no duplicate account was created in MongoDB
    const duplicateCount = await User.countDocuments({ email: legacyEmail });
    assert(duplicateCount === 1, 'Exactly one user record exists in database (no duplicates)');

    // --- 7. Security: Reject Unverified Google Email Linking ---
    console.log('\n--- 7. Security: Reject Unverified Google Email Linking ---');

    const victimEmail = `victim_account_${Date.now()}@example.com`;
    await User.create({
      name: 'Victim User',
      email: victimEmail,
      passwordHash: 'secret_hash_password',
      coins: 100,
      isEmailVerified: true,
    });

    mockProfile = {
      googleId: `attacker_sub_${Date.now()}`,
      email: victimEmail,
      emailVerified: false, // NOT verified by Google!
      name: 'Attacker Impersonator',
      avatarUrl: '',
    };

    const unverifiedLinkRes = await fetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'valid_mock_google_id_token' }),
    });
    assert(
      unverifiedLinkRes.status === 403,
      'Unverified Google email rejected with HTTP 403 Forbidden'
    );

    const victimRecord = await User.findOne({ email: victimEmail });
    assert(!victimRecord.googleId, 'Victim account googleId was NOT hijacked');
    assert(victimRecord.coins === 100, 'Victim account coins remain 100');

    // --- 8. Password Login Safety on Google Account ---
    console.log('\n--- 8. Password Login Safety on Google Account ---');

    const passwordAttemptRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testGoogleEmail, password: 'any_password' }),
    });
    const passwordAttemptData = await passwordAttemptRes.json();
    assert(passwordAttemptRes.status === 400, 'Password login on Google-only account rejected');
    assert(
      passwordAttemptData.message.includes('Continue with Google') ||
        passwordAttemptData.message.includes('Google'),
      'Helpful error directs user to Continue with Google'
    );

    // --- 9. Protected Routes with Google JWT Token ---
    console.log('\n--- 9. Protected Routes Work with Google-Issued Token ---');

    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${googleAuthToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me returns HTTP 200 with Google token');
    assert(meData.user.email === testGoogleEmail, 'Returned user has expected email');

    // Restore OAuth2Client prototype
    oauthProto.verifyIdToken = originalVerifyIdToken;

    // Clean up test data
    await User.deleteMany({ email: { $regex: /billa_google_test_/ } });
    await User.deleteMany({ email: { $regex: /legacy_user_/ } });
    await User.deleteMany({ email: { $regex: /victim_account_/ } });

    console.log('\n================================================================');
    console.log(`🎉 ALL ${testsPassed} TESTS PASSED SUCCESSFULLY! (0 Failures)`);
    console.log('================================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runGoogleAuthSuite().catch((err) => {
  console.error('\n❌ Google Auth Suite Failed:', err);
  process.exit(1);
});

