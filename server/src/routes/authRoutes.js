import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { generateOTP, sendOTPEmail } from '../utils/emailService.js';
import { requireAuth } from '../middleware/auth.js';
import { checkAndRefreshStreaks } from '../utils/streakEngine.js';
import { checkAndApplyPetDecay } from '../utils/petSurvivalEngine.js';
import { normalizeSocialLinks } from '../utils/socialUtils.js';
import { verifyGoogleIdToken } from '../utils/googleAuth.js';

const router = express.Router();

const createToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt';
  return jwt.sign({ userId }, secret, { expiresIn: '30d' });
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

// =========================================================================
// 0. GOOGLE SIGN-IN / SIGN-UP (PRIMARY AUTHENTICATION)
// Verifies Google ID token using official Google OAuth2Client,
// links or creates accounts securely using stable Google subject ID (sub),
// and issues standard application JWT session.
// =========================================================================
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token credential is required.',
      });
    }

    // Verify token using official Google OAuth2Client
    const googleProfile = await verifyGoogleIdToken(credential);

    const cleanEmail = googleProfile.email;
    const googleSub = googleProfile.googleId;

    // 1. Look up user by verified Google ID (sub)
    let user = await User.findOne({ googleId: googleSub });

    if (user) {
      // Returning Google user: ensure email & avatar are up to date
      let updated = false;
      if (!user.isEmailVerified && googleProfile.emailVerified) {
        user.isEmailVerified = true;
        updated = true;
      }
      if (!user.avatarUrl && googleProfile.avatarUrl) {
        user.avatarUrl = googleProfile.avatarUrl;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // 2. Check if user already exists with this verified email
      const existingUserByEmail = await User.findOne({ email: cleanEmail });

      if (existingUserByEmail) {
        // Safe account linking: Only link if Google confirms the email is verified
        if (!googleProfile.emailVerified) {
          return res.status(403).json({
            success: false,
            message: 'Your Google email is unverified. Cannot safely link account.',
          });
        }

        // Link Google ID to existing account; preserve all user progress, coins, streaks, etc.
        existingUserByEmail.googleId = googleSub;
        existingUserByEmail.isEmailVerified = true;
        if (!existingUserByEmail.avatarUrl && googleProfile.avatarUrl) {
          existingUserByEmail.avatarUrl = googleProfile.avatarUrl;
        }
        if (existingUserByEmail.authProvider === 'local') {
          existingUserByEmail.authProvider = 'google';
        }
        await existingUserByEmail.save();
        user = existingUserByEmail;
      } else {
        // 3. Brand new user registering with Google
        user = new User({
          googleId: googleSub,
          email: cleanEmail,
          name: googleProfile.name,
          passwordHash: 'google_oauth_account',
          avatarUrl: googleProfile.avatarUrl,
          authProvider: 'google',
          isEmailVerified: true,
          hasCompletedOnboarding: false, // New users will complete onboarding
          coins: 0,
          health: 100,
        });
        await user.save();
      }
    }

    // Refresh streaks and check pet decay
    const tzOffset = req.headers['x-timezone-offset'] ? Number(req.headers['x-timezone-offset']) : null;
    await checkAndRefreshStreaks(user, tzOffset);
    await checkAndApplyPetDecay(user);

    // Issue application JWT
    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Authenticated successfully with Google!',
      token,
      user,
      isNewUser: !user.hasCompletedOnboarding,
    });
  } catch (error) {
    console.error('[Auth Error] Google Sign-In:', error.message || error);
    return res.status(401).json({
      success: false,
      message: error.message || 'Google authentication failed. Please try again.',
    });
  }
});

// =========================================================================
// 1. REQUEST OTP FOR SIGNUP OR LOGIN
// Sensible OTP expiry (10 min), resend cooldown (60s), rate limiting
// =========================================================================
router.post('/request-otp', async (req, res) => {
  try {
    const { email, purpose = 'register' } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    // Prevent duplicate registrations for already verified accounts
    if (purpose === 'register' && existingUser && (existingUser.hasCompletedOnboarding || existingUser.isEmailVerified)) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please choose Log In instead.',
        code: 'USER_EXISTS',
      });
    }

    // Require account existence for login
    if (purpose === 'login' && !existingUser) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please start your adventure with Sign Up first.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check resend cooldown rate limit (60 seconds)
    const existingVerification = await EmailVerification.findOne({ email: cleanEmail });
    if (existingVerification && existingVerification.lastRequestedAt) {
      const secondsSinceLast = Math.round((Date.now() - new Date(existingVerification.lastRequestedAt).getTime()) / 1000);
      if (secondsSinceLast < 60) {
        const remaining = 60 - secondsSinceLast;
        return res.status(429).json({
          success: false,
          message: `Please wait ${remaining}s before requesting a new verification code.`,
          cooldownSeconds: remaining,
          code: 'RATE_LIMITED',
        });
      }
    }

    // Generate secure 6-digit OTP and hash it with bcrypt before persistence
    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await EmailVerification.findOneAndUpdate(
      { email: cleanEmail },
      {
        email: cleanEmail,
        otpHash,
        purpose,
        attempts: 0,
        lastRequestedAt: new Date(),
        expiresAt,
        verified: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Gated exclusively by server environment (cannot be overridden by any client parameter or flag)
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Production: dispatch real transactional email via Brevo REST API v3
      const dispatchResult = await sendOTPEmail(
        cleanEmail,
        otp,
        purpose === 'register' ? 'Account Registration' : 'Account Login'
      );

      if (!dispatchResult.success) {
        return res.status(502).json({
          success: false,
          message: dispatchResult.error || 'Failed to dispatch verification email. Please check sender verification in Brevo.',
        });
      }

      return res.json({
        success: true,
        message: `Verification code sent to ${cleanEmail}. Check your inbox or spam folder.`,
        cooldownSeconds: 60,
      });
    }

    // Local Development Only (NODE_ENV !== 'production'):
    console.log(`\n======================================================`);
    console.log(`🔑 [DEVELOPMENT OTP GENERATED] (localhost only)`);
    console.log(`📧 Destination: ${cleanEmail}`);
    console.log(`🎯 Passcode:    >>> ${otp} <<<`);
    console.log(`⏱️  Expires in:  10 minutes`);
    console.log(`======================================================\n`);

    return res.json({
      success: true,
      message: 'Email delivery is disabled in local development; use the development OTP below.',
      devOtp: otp,
      cooldownSeconds: 60,
    });
  } catch (error) {
    console.error('[Auth Error] Request OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch verification code. Please try again.',
    });
  }
});

// =========================================================================
// 2. VERIFY OTP (FOR SIGNUP OR PASSWORDLESS LOGIN)
// Enforces 5-attempt limit, sensible expiry, and secure hash check
// =========================================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, purpose = 'register' } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP code are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const verificationRecord = await EmailVerification.findOne({ email: cleanEmail });

    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        message: 'No verification code requested for this email. Please request a new code.',
        code: 'OTP_NOT_FOUND',
      });
    }

    // Check expiry
    if (new Date() > new Date(verificationRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a fresh code.',
        code: 'OTP_EXPIRED',
      });
    }

    // Check max attempts (limit to 5 attempts to prevent brute-force attacks)
    if (verificationRecord.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.',
        code: 'MAX_ATTEMPTS_EXCEEDED',
      });
    }

    // Secure bcrypt comparison
    const isMatch = await bcrypt.compare(cleanOtp, verificationRecord.otpHash);
    if (!isMatch) {
      verificationRecord.attempts = (verificationRecord.attempts || 0) + 1;
      await verificationRecord.save();
      const remainingAttempts = Math.max(0, 5 - verificationRecord.attempts);

      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts,
        code: 'INVALID_OTP',
      });
    }

    // Single-use verification: delete verification record once successfully verified
    await EmailVerification.deleteOne({ _id: verificationRecord._id });

    // Check existing user
    let user = await User.findOne({ email: cleanEmail });

    if (purpose === 'login') {
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Account not found. Please sign up first.',
          code: 'USER_NOT_FOUND',
        });
      }

      await checkAndRefreshStreaks(user);
      await checkAndApplyPetDecay(user);

      const token = createToken(user._id);
      return res.json({
        success: true,
        message: 'Logged in successfully via OTP!',
        token,
        user,
      });
    }

    // Purpose is 'register': create authenticated user with email verified
    if (!user) {
      user = new User({
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        passwordHash: 'otp_verified_account',
        coins: 0, // Starts at 0
        isEmailVerified: true,
        hasCompletedOnboarding: false,
      });
      await user.save();
    } else {
      user.isEmailVerified = true;
      await user.save();
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Proceeding to your adventurer profile.',
      token,
      user,
    });
  } catch (error) {
    console.error('[Auth Error] Verify OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
    });
  }
});

// Backward-compatible alias for verify-otp-register
router.post('/verify-otp-register', async (req, res) => {
  const { email, otp } = req.body;
  req.body.purpose = 'register';
  return router.handle(req, res);
});

// Backward-compatible alias for verify-otp-login
router.post('/verify-otp-login', async (req, res) => {
  const { email, otp } = req.body;
  req.body.purpose = 'login';
  return router.handle(req, res);
});

// =========================================================================
// 3. LOGIN WITH PASSWORD (DIRECT)
// =========================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.passwordHash === 'otp_verified_account' || user.passwordHash === 'google_oauth_account') {
      return res.status(400).json({
        success: false,
        message: user?.googleId
          ? 'This account was created with Google. Please use Continue with Google.'
          : 'Invalid credentials. If you registered with OTP, please log in with OTP.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    await checkAndRefreshStreaks(user);
    await checkAndApplyPetDecay(user);

    const token = createToken(user._id);
    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user,
    });
  } catch (error) {
    console.error('[Auth Error] Login:', error);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// =========================================================================
// 4. ONBOARDING SEQUENCE (STEPS 2 - 6)
// Step 2: Name (Required)
// Step 3: Social Links (Optional Instagram & LinkedIn)
// Step 4: Study Start Day ("When would you like to start studying?")
// Step 5: Weekly Off Day
// Step 6: Finish -> Dashboard
// =========================================================================
router.post('/onboarding', requireAuth, async (req, res) => {
  try {
    const {
      name,
      socialLinks,
      instagram,
      linkedin,
      studyStartDate,
      weeklyOffDay,
      restDay,
      dailyResetTime,
      timezone,
      finish = false,
    } = req.body;

    const user = req.user;

    // Step 2: Name (required if finishing)
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length > 0) {
        user.name = cleanName;
      } else if (finish && !user.name) {
        return res.status(400).json({
          success: false,
          message: 'Your adventurer name is required.',
        });
      }
    }

    // Step 3: Optional Social Links (Instagram and LinkedIn)
    if (socialLinks || instagram !== undefined || linkedin !== undefined) {
      const current = user.socialLinks || {};
      const merged = {
        instagram: instagram !== undefined ? instagram : (socialLinks?.instagram !== undefined ? socialLinks.instagram : current.instagram || ''),
        linkedin: linkedin !== undefined ? linkedin : (socialLinks?.linkedin !== undefined ? socialLinks.linkedin : current.linkedin || ''),
      };
      user.socialLinks = normalizeSocialLinks(merged);
    }

    // Step 4: Study Start Day
    if (studyStartDate) {
      user.studyStartDate = String(studyStartDate).trim();
    }

    // Step 5: Weekly Off Day
    if (weeklyOffDay !== undefined || restDay !== undefined) {
      const offDayIndex = weeklyOffDay !== undefined ? Number(weeklyOffDay) : Number(restDay?.dayOfWeek ?? 0);
      user.restDay = {
        enabled: true,
        dayOfWeek: Math.max(0, Math.min(6, isNaN(offDayIndex) ? 0 : offDayIndex)),
      };
    }

    if (dailyResetTime) {
      user.dailyResetTime = String(dailyResetTime).trim();
      user.hasExplicitResetTime = true;
    }
    if (timezone) {
      user.timezone = timezone;
    }

    // Step 6: Finish onboarding
    if (finish || req.body.hasCompletedOnboarding) {
      if (!user.name || user.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide your adventurer name before finishing onboarding.',
        });
      }
      user.hasCompletedOnboarding = true;
    }

    await user.save();

    const tzOffset = req.headers['x-timezone-offset'] ? Number(req.headers['x-timezone-offset']) : null;
    await checkAndRefreshStreaks(user, tzOffset);

    return res.json({
      success: true,
      message: user.hasCompletedOnboarding
        ? 'Onboarding completed! Welcome to your Padhaku Billa adventure.'
        : 'Onboarding step saved.',
      user,
    });
  } catch (error) {
    console.error('[Auth Error] Onboarding:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update onboarding information.',
    });
  }
});

// =========================================================================
// 5. UPDATE STUDY PREFERENCES & SOCIALS (SETTINGS ACCESS)
// =========================================================================
router.put('/study-preferences', requireAuth, async (req, res) => {
  try {
    const { dailyResetTime, restDay, timezone, studyStartDate } = req.body;
    const user = req.user;

    if (dailyResetTime) {
      user.dailyResetTime = dailyResetTime.trim();
      user.hasExplicitResetTime = true;
    }
    if (timezone) user.timezone = timezone;
    if (studyStartDate) user.studyStartDate = studyStartDate.trim();
    if (restDay) {
      user.restDay = {
        enabled: Boolean(restDay.enabled),
        dayOfWeek: restDay.enabled ? Number(restDay.dayOfWeek ?? 0) : 0,
      };
    }

    await user.save();

    const tzOffset = req.headers['x-timezone-offset'] ? Number(req.headers['x-timezone-offset']) : null;
    await checkAndRefreshStreaks(user, tzOffset);

    return res.json({
      success: true,
      message: 'Study preferences updated successfully.',
      user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update study preferences.' });
  }
});

router.put('/socials', requireAuth, async (req, res) => {
  try {
    const { instagram, linkedin, socialLinks } = req.body;
    const user = req.user;

    const merged = {
      instagram: instagram !== undefined ? instagram : (socialLinks?.instagram || ''),
      linkedin: linkedin !== undefined ? linkedin : (socialLinks?.linkedin || ''),
    };

    user.socialLinks = normalizeSocialLinks(merged);
    await user.save();

    return res.json({
      success: true,
      message: 'Social profile links updated successfully.',
      socialLinks: user.socialLinks,
      user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update social links.' });
  }
});

// =========================================================================
// 6. GET CURRENT USER PROFILE (/me)
// =========================================================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const tzOffset = req.headers['x-timezone-offset'] ? Number(req.headers['x-timezone-offset']) : null;
    await checkAndRefreshStreaks(user, tzOffset);
    await checkAndApplyPetDecay(user);
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load profile.' });
  }
});

// =========================================================================
// 7. TOGGLE THEME
// =========================================================================
router.patch('/theme', requireAuth, async (req, res) => {
  try {
    const { theme } = req.body;
    if (theme && ['dark', 'light'].includes(theme)) {
      req.user.theme = theme;
      await req.user.save();
    }
    return res.json({ success: true, theme: req.user.theme });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update theme.' });
  }
});

export default router;
