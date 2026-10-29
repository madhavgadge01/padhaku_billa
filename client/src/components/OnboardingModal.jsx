import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { InstagramIcon, LinkedInIcon } from './SocialIcons.jsx';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import { GoogleSignInButton } from './GoogleSignInButton.jsx';

export const OnboardingModal = ({ user, onComplete, onCancel }) => {
  // If user is already authenticated with email, start at Step 2; otherwise start at Step 1 (Email)
  const [step, setStep] = useState(() => (user && user.email ? 2 : 1));

  // Step 1: Email & OTP Verification
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 2: Name (Required)
  const [name, setName] = useState(user?.name && user.name !== user.email?.split('@')[0] ? user.name : '');

  // Step 3: Social Links (Optional)
  const [instagram, setInstagram] = useState(user?.socialLinks?.instagram || '');
  const [linkedin, setLinkedin] = useState(user?.socialLinks?.linkedin || '');

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Active user reference if updated during step 1
  const [currentUser, setCurrentUser] = useState(user || null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // =========================================================================
  // STEP 1: GOOGLE AUTH (PRIMARY) OR BREVO OTP
  // =========================================================================
  const handleGoogleSuccess = async (credential) => {
    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('Connecting your Google account...');
      sounds.playClick();

      const res = await api.googleAuth(credential);
      if (res.token) {
        localStorage.setItem('lifelevel_token', res.token);
      }
      if (res.user) {
        setCurrentUser(res.user);
        if (res.user.name) {
          setName(res.user.name);
        }
        if (res.user.hasCompletedOnboarding) {
          sounds.playTimerComplete();
          if (onComplete) onComplete(res.user);
          return;
        }
      }

      sounds.playTimerComplete();
      setInfoMsg('');
      setStep(2); // Advance directly to Name & Profile step
    } catch (err) {
      setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
      sounds.playPausePenalty();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errMsg) => {
    setErrorMsg(errMsg || 'Google authentication error.');
    sounds.playPausePenalty();
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('Connecting to email service...');
      sounds.playClick();

      const res = await api.requestOtp(email.toLowerCase().trim(), 'register');
      setOtpSent(true);
      setResendCooldown(res.cooldownSeconds || 60);
      setInfoMsg(res.message || 'Verification code sent to your email.');
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send verification code.');
      sounds.playPausePenalty();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit passcode.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('Verifying passcode...');
      sounds.playClick();

      const res = await api.verifyOtp(email.toLowerCase().trim(), cleanOtp, 'register');
      if (res.token) {
        localStorage.setItem('lifelevel_token', res.token);
      }
      if (res.user) {
        setCurrentUser(res.user);
        if (res.user.name && res.user.name !== res.user.email?.split('@')[0]) {
          setName(res.user.name);
        }
      }

      sounds.playTimerComplete();
      setInfoMsg('');
      setStep(2); // Proceed to Name step
    } catch (err) {
      setErrorMsg(err.message || 'Invalid verification code.');
      sounds.playPausePenalty();
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // STEP 2: NAME (REQUIRED)
  // =========================================================================
  const handleSaveName = async () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your name (at least 2 characters).');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      sounds.playClick();

      const res = await api.onboarding({ name: cleanName });
      if (res.user) setCurrentUser(res.user);
      setStep(3); // Proceed to Social Links step
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save name.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // STEP 3: SOCIAL LINKS (OPTIONAL) -> FINISH
  // =========================================================================
  const handleSaveSocialsAndFinish = async (skip = false) => {
    try {
      setLoading(true);
      setErrorMsg('');
      sounds.playClick();

      let updatePayload = {
        finish: true,
        hasCompletedOnboarding: true,
      };

      if (!skip) {
        updatePayload.socialLinks = {
          instagram: instagram.trim(),
          linkedin: linkedin.trim(),
        };
      }

      const res = await api.onboarding(updatePayload);
      
      sounds.playTimerComplete();
      sounds.playCoinSound();

      if (onComplete) {
        onComplete(res.user || currentUser);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1A16]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAF8F5] dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-[#1C2A24] dark:text-[#F2F7F4] my-auto">
        
        {/* Progress Bar (3 Steps) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398]">
              Step {step} of 3
            </span>
            <span className="text-xs font-bold text-[#1B3B2F] dark:text-[#A3D9C9]">
              {step === 1 && 'Authentication'}
              {step === 2 && 'Your Profile'}
              {step === 3 && 'Get Connected'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#EAE5DD] dark:bg-[#253D35] overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-[#1B3B2F] to-[#10B981] transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Global Info Banner */}
        {infoMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{infoMsg}</span>
          </div>
        )}

        {/* =========================================================================
            STEP 1: GOOGLE AUTH (PRIMARY) OR EMAIL OTP
            ========================================================================= */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] flex items-center justify-center shadow-inner mb-3 border border-[#C8E6D5] dark:border-[#2B5246]">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-[#1C2A24] dark:text-[#F2F7F4]">Sign In or Register</h3>
              <p className="text-xs font-medium text-[#576560] dark:text-[#8BA398] max-w-xs mx-auto">
                Continue with your Google account for instant access, or use email verification.
              </p>
            </div>

            {/* Primary Action: Google Sign-In */}
            <div className="space-y-3">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                loading={loading}
                text="continue_with"
              />
              <p className="text-[11px] text-center text-[#576560] dark:text-[#8BA398] font-medium">
                One-click authentication. No password or OTP needed.
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-[#EAE5DD] dark:border-[#253D35] w-full" />
              <span className="bg-[#FAF8F5] dark:bg-[#162420] px-3 text-[10px] font-black uppercase tracking-wider text-[#8A9791] absolute">
                or verify with email code
              </span>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398] mb-1.5 ml-1">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || otpSent}
                    placeholder="you@domain.com"
                    className="flex-1 px-4 py-3.5 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-sm font-semibold outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9] disabled:opacity-60 transition-all focus:ring-2 focus:ring-[#1B3B2F]/10 dark:focus:ring-[#A3D9C9]/10"
                  />
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading || (otpSent && resendCooldown > 0)}
                    className="px-5 py-3.5 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-black transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{otpSent ? (resendCooldown > 0 ? `${resendCooldown}s` : 'Resend') : 'Send'}</span>
                    )}
                  </button>
                </div>

                {devOtp && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 animate-in fade-in">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">
                      Development Passcode (Localhost)
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-xl font-black tracking-widest text-[#1B3B2F] dark:text-[#A3D9C9] select-all">
                        {devOtp}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {otpSent && (
                <div className="space-y-3 pt-3 border-t border-[#EAE5DD] dark:border-[#253D35] animate-in fade-in slide-in-from-bottom-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398] ml-1">
                    Secure 6-Digit Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] font-mono text-3xl py-4 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9] font-black transition-all focus:ring-2 focus:ring-[#1B3B2F]/10"
                  />
                  <p className="text-[10px] text-[#576560] dark:text-[#8BA398] text-center font-medium">
                    Code expires in 10 minutes. Check your spam folder if not received.
                  </p>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.trim().length !== 6}
                    className="w-full mt-2 py-4 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-sm font-black transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify Account</span>}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: NAME (REQUIRED)
            ========================================================================= */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-3xl shadow-inner mb-3 border border-[#C8E6D5] dark:border-[#2B5246]">
                🌱
              </div>
              <h3 className="text-2xl font-black tracking-tight text-[#1C2A24] dark:text-[#F2F7F4]">Welcome aboard!</h3>
              <p className="text-xs font-medium text-[#576560] dark:text-[#8BA398]">
                What should we call you on your focus journey?
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398] mb-1.5 ml-1">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mr.Padhaku"
                  className="w-full px-4 py-4 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-sm font-bold outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9] transition-all focus:ring-2 focus:ring-[#1B3B2F]/10"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={handleSaveName}
                disabled={loading || !name.trim()}
                className="w-full py-4 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-sm font-black transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue</span>}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: SOCIAL LINKS (OPTIONAL) -> FINISH
            ========================================================================= */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5EE] dark:bg-[#1C2E29] flex items-center justify-center text-3xl shadow-inner mb-3 border border-[#C8E6D5] dark:border-[#2B5246]">
                🔗
              </div>
              <h3 className="text-2xl font-black tracking-tight text-[#1C2A24] dark:text-[#F2F7F4]">Get Connected</h3>
              <p className="text-xs font-medium text-[#576560] dark:text-[#8BA398] max-w-xs mx-auto">
                Add your social links to display them on the community leaderboard. You can always do this later.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <label className="flex items-center space-x-1.5 text-[11px] font-black tracking-wider text-[#576560] dark:text-[#8BA398] mb-1.5 ml-1">
                    <InstagramIcon className="w-3.5 h-3.5 text-rose-500" />
                    <span>Instagram Username / Link</span>
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@username"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-sm font-semibold outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9] transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-1.5 text-[11px] font-black tracking-wider text-[#576560] dark:text-[#8BA398] mb-1.5 ml-1">
                    <LinkedInIcon className="w-3.5 h-3.5 text-sky-600" />
                    <span>LinkedIn Username / Link</span>
                  </label>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/..."
                    className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-sm font-semibold outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9] transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveSocialsAndFinish(true)}
                  disabled={loading}
                  className="px-5 py-4 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#576560] dark:text-[#8BA398] hover:text-[#1C2A24] dark:hover:text-white hover:bg-[#EAE5DD]/30 transition cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSocialsAndFinish(false)}
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-[#1B3B2F] to-[#142C23] text-white text-sm font-black transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                     
                      <span>Enter Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OnboardingModal;