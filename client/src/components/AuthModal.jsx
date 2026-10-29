import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';

export const AuthModal = ({ isOpen, onClose, onAuthSuccess, onSwitchToSignup }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' | 'password'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'info' });

  // Cooldown countdown
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

  if (!isOpen) return null;

  // Request OTP for Login
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatusMsg({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setStatusMsg({ text: 'Sending verification code...', type: 'info' });
      sounds.playClick();

      const res = await api.requestOtp(email.toLowerCase().trim(), tab === 'signup' ? 'register' : 'login');
      setOtpSent(true);
      setResendCooldown(res.cooldownSeconds || 60);
      setStatusMsg({ text: res.message || 'Passcode generated.', type: 'success' });
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
    } catch (err) {
      setStatusMsg({ text: err.message || 'Failed to request verification code.', type: 'error' });
      sounds.playPausePenalty();
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP Login
  const handleVerifyOtpLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setStatusMsg({ text: 'Please enter the 6-digit code.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      sounds.playClick();
      const res = await api.verifyOtp(email.toLowerCase().trim(), cleanOtp, tab === 'signup' ? 'register' : 'login');
      if (res.token) {
        localStorage.setItem('lifelevel_token', res.token);
      }
      sounds.playTimerComplete();
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setStatusMsg({ text: err.message || 'Incorrect verification code.', type: 'error' });
      sounds.playPausePenalty();
    } finally {
      setLoading(false);
    }
  };

  // Direct Password Login
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setStatusMsg({ text: 'Please enter email and password.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      sounds.playClick();
      const res = await api.login(email.toLowerCase().trim(), password);
      if (res.token) {
        localStorage.setItem('lifelevel_token', res.token);
      }
      sounds.playTimerComplete();
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setStatusMsg({ text: err.message || 'Invalid email or password.', type: 'error' });
      sounds.playPausePenalty();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1A16]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-[#1C2A24] dark:text-[#F2F7F4] animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#576560] dark:text-[#8BA398] hover:bg-[#EAE5DD] dark:hover:bg-[#253D35] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#1B3B2F] text-[#DCEFE3] flex items-center justify-center font-black text-2xl shadow-sm mb-2.5">
            🌱
          </div>
          <h2 className="text-2xl font-black tracking-tight">Padhaku Billa Focus RPG</h2>
          <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1 font-medium">
            Honest with yourself. I track your time, not your lies.👀
          </p>
        </div>

        {/* Tab Toggle: Log In / Sign Up */}
        <div className="flex bg-[#EAE5DD]/70 dark:bg-[#0F1A16] p-1 rounded-2xl mb-5 border border-[#EAE5DD] dark:border-[#253D35]">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setTab('login');
              setStatusMsg({ text: '', type: 'info' });
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              tab === 'login'
                ? 'bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] shadow-xs'
                : 'text-[#576560] dark:text-[#8BA398]'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              if (onSwitchToSignup) {
                onClose();
                onSwitchToSignup();
              } else {
                setTab('signup');
                setStatusMsg({ text: '', type: 'info' });
              }
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              tab === 'signup'
                ? 'bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] shadow-xs'
                : 'text-[#576560] dark:text-[#8BA398]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Status Message */}
        {statusMsg.text && (
          <div
            className={`mb-4 p-3 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
              statusMsg.type === 'error'
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {statusMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="flex-1">{statusMsg.text}</span>
          </div>
        )}

        {/* Login Method Sub-Toggle (OTP / Password) */}
        {tab === 'login' && (
          <div className="flex justify-center space-x-4 mb-4 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('otp');
                setStatusMsg({ text: '', type: 'info' });
              }}
              className={`pb-1 border-b-2 transition cursor-pointer ${
                loginMethod === 'otp'
                  ? 'border-[#1B3B2F] dark:border-[#A3D9C9] text-[#1B3B2F] dark:text-[#A3D9C9]'
                  : 'border-transparent text-[#576560] dark:text-[#8BA398]'
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setStatusMsg({ text: '', type: 'info' });
              }}
              className={`pb-1 border-b-2 transition cursor-pointer ${
                loginMethod === 'password'
                  ? 'border-[#1B3B2F] dark:border-[#A3D9C9] text-[#1B3B2F] dark:text-[#A3D9C9]'
                  : 'border-transparent text-[#576560] dark:text-[#8BA398]'
              }`}
            >
              Password
            </button>
          </div>
        )}

        {/* Form Body */}
        {tab === 'login' && loginMethod === 'password' ? (
          /* Password Login */
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-semibold outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9]"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-semibold outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Log In with Password</span>}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* OTP Login / Signup */
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398] mb-1">
                Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || otpSent}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-semibold outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading || (otpSent && resendCooldown > 0)}
                  className="px-4 py-3 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center space-x-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{otpSent ? (resendCooldown > 0 ? `${resendCooldown}s` : 'Resend') : 'Send Code'}</span>
                  )}
                </button>
              </div>

              {devOtp && (
                <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 animate-in fade-in">
                  <div className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Development OTP (localhost only)
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-xl font-black tracking-widest text-[#1B3B2F] dark:text-[#A3D9C9] select-all">
                      {devOtp}
                    </span>
                    <span className="text-[10px] text-amber-700/90 dark:text-amber-400/90 font-medium">
                      Enter code in the box below
                    </span>
                  </div>
                </div>
              )}
            </div>

            {otpSent && (
              <div className="space-y-2 pt-2 animate-in fade-in">
                <label className="block text-xs font-black uppercase tracking-wider text-[#576560] dark:text-[#8BA398]">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 rounded-2xl bg-white dark:bg-[#0F1A16] border border-[#EAE5DD] dark:border-[#253D35] outline-none focus:border-[#1B3B2F] dark:focus:border-[#A3D9C9] font-black"
                />

                <button
                  type="button"
                  onClick={handleVerifyOtpLogin}
                  disabled={loading || otp.trim().length !== 6}
                  className="w-full mt-2 py-3.5 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Log In</span>}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
