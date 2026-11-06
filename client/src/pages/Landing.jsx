import React, { useState } from 'react';
import { Download, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GoogleLogo } from '../components/GoogleSignInButton.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { OnboardingModal } from '../components/OnboardingModal.jsx';
import { sounds } from '../audio/soundEffects.js';
import { APP_VERSION, isIOSDevice, triggerApkDownload } from '../utils/deviceUtils.js';

export const Landing = ({ onAuthSuccess }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [iosNotice, setIosNotice] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const isIOS = isIOSDevice();

  const handleDownloadApp = () => {
    sounds.playClick();
    if (isIOS) {
      setIosNotice(true);
      setTimeout(() => setIosNotice(false), 5000);
      return;
    }

    triggerApkDownload();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F6FAF7] dark:bg-[#0A0F0D] text-[#0D1F17] dark:text-white flex flex-col transition-colors">
      {/* Minimal Navigation */}
      <nav className="p-6 max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/padhaku_billa logo.jpeg"
            alt="Padhaku Billa Logo"
            className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-[#EAE5DD] dark:border-[#253D35]"
          />
          <span className="text-xl font-black tracking-tight">Padhaku Billa</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowAuthModal(true);
            }}
            className="px-4 py-2 text-xs font-bold text-[#576560] dark:text-[#9EB5AB] hover:text-[#1C2A24] dark:hover:text-white transition cursor-pointer"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowOnboardingModal(true);
            }}
            className="bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-sm transition cursor-pointer"
          >
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center justify-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#1C2A24] dark:text-[#F2F7F4] leading-tight">
          Focus deeply. Build discipline.{' '}
          <span className="text-[#2B5A52] dark:text-[#A3D9C9]">Care for Sparky.</span>
        </h1>

        <p className="mt-4 text-base sm:text-lg font-bold text-[#D97724] dark:text-[#F59E0B] tracking-wide">
          “Honest with yourself. I track your time, not your lies.👀”
        </p>

        <p className="mt-2 text-sm sm:text-base text-[#576560] dark:text-[#8BA398] max-w-2xl font-medium leading-relaxed">
          A calm, minimal productivity web app designed to boost consistency through customizable reset times, an interactive 2D cartoon cat, and honest progress tracking.
        </p>

        {/* Primary Auth: Google Sign-in */}
        <div className="mt-8 flex flex-col items-center w-full max-w-xs">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowAuthModal(true);
            }}
            className="w-full flex items-center justify-center space-x-2.5 bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] px-7 py-3.5 rounded-2xl font-black text-sm shadow-sm transition-all transform hover:scale-105 cursor-pointer"
          >
            <GoogleLogo className="w-5 h-5" />
            <span>CONTINUE WITH GOOGLE</span>
          </button>

          {/* APP DOWNLOAD BUTTON JUST BELOW LOGIN */}
          <div className="w-full mt-3 flex flex-col items-center">
            <button
              type="button"
              onClick={handleDownloadApp}
              className="w-full flex items-center justify-center space-x-2.5 bg-[#1B3B2F] hover:bg-[#142C23] text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md transition-all transform hover:scale-105 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download for Android (APK)</span>
            </button>

            {/* Version & Platform Notice */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-[11px] font-bold text-[#576560] dark:text-[#8BA398]">
              <span className="px-2 py-0.5 rounded-md bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246] font-mono">
                {APP_VERSION}
              </span>
              {isIOS && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  • Available on Android only (iOS coming soon)
                </span>
              )}
            </div>

            {/* Short iOS notification banner if iPhone user taps download */}
            {iosNotice && (
              <div className="w-full mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">
                  Available on Android only (iOS version is coming soon).
                </span>
              </div>
            )}

            {/* Download started banner */}
            {downloadSuccess && (
              <div className="w-full mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">
                  Downloading Padhaku Billa APK ({APP_VERSION})...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3 Pillars Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full text-left">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm">
            <span className="text-2xl block mb-2">🐾</span>
            <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
              Interactive 2D Mascot Pet
            </h3>
            <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1.5 leading-relaxed">
              Feed, hydrate, cuddle Sparky, and equip unlocked hats and glasses. When you focus, Sparky studies alongside you.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm">
            <span className="text-2xl block mb-2">🔥</span>
            <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
              Night-Friendly Daily Streaks
            </h3>
            <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1.5 leading-relaxed">
              Configurable study day reset time (e.g. 6 AM). Overnight study sessions never break your streak at midnight.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-sm">
            <span className="text-2xl block mb-2">📅</span>
            <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
              Weekly Subject Timetable
            </h3>
            <p className="text-xs text-[#576560] dark:text-[#8BA398] mt-1.5 leading-relaxed">
              Schedule distinct subjects and targets for each day of the week with 18 vibrant accessible colors.
            </p>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={onAuthSuccess}
        onSwitchToSignup={() => setShowOnboardingModal(true)}
      />

      {/* Public Onboarding Modal (Starts at Step 1: Email) */}
      {showOnboardingModal && (
        <OnboardingModal
          user={null}
          onComplete={(newUser) => {
            setShowOnboardingModal(false);
            onAuthSuccess(newUser);
          }}
          onCancel={() => setShowOnboardingModal(false)}
        />
      )}
    </div>
  );
};

export default Landing;

