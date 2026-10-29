import React, { useState } from 'react';
import {
  User,
  Calendar,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ShieldCheck,
  Save,
  LogOut,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Award,
  Star,
  ExternalLink,
} from 'lucide-react';
import { formatResetTimeDisplay } from '../utils/dateUtils.js';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import { BADGES_MAP, getBadgeAssetUrl } from '../constants/badges.js';
import { InstagramIcon, LinkedInIcon } from '../components/SocialIcons.jsx';

const FIELDS_OF_STUDY = [
  'Computer Science',
  'Software Engineer',
  'Medical',
  'Competitive Exams',
  'Law',
  'Business & Finance',
  'Design & Arts',
  'Engineering (General)',
  'Other',
];

const DAYS_OF_WEEK = [
  { day: 0, name: 'Sunday' },
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
];

const RESET_TIME_OPTIONS = [
  { label: '12:00 AM — Midnight', value: '00:00' },
  { label: '3:00 AM', value: '03:00' },
  { label: '6:00 AM (Recommended)', value: '06:00' },
  { label: '8:00 AM', value: '08:00' },
];

export const SettingsPage = ({
  user,
  onUserUpdate,
  theme,
  onToggleTheme,
  soundMuted,
  onToggleSound,
  onLogout,
  onNavigate,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age || 22);
  const [fieldOfStudy, setFieldOfStudy] = useState(user?.fieldOfStudy || 'Computer Science');
  const [instagram, setInstagram] = useState(user?.socialLinks?.instagram || '');
  const [linkedin, setLinkedin] = useState(user?.socialLinks?.linkedin || '');

  // Study Preferences: Daily Reset Time
  const currentResetTime = user?.dailyResetTime || '06:00';
  const [resetTime, setResetTime] = useState(currentResetTime);
  const [isCustomReset, setIsCustomReset] = useState(
    !RESET_TIME_OPTIONS.some((o) => o.value === currentResetTime)
  );
  const [customTime, setCustomTime] = useState(
    !RESET_TIME_OPTIONS.some((o) => o.value === currentResetTime) ? currentResetTime : '05:00'
  );

  const [restDayEnabled, setRestDayEnabled] = useState(user?.restDay?.enabled ?? true);
  const [restDayOfWeek, setRestDayOfWeek] = useState(user?.restDay?.dayOfWeek ?? 0);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // My Badges & Profile Showcase
  const [updatingShowcase, setUpdatingShowcase] = useState(false);
  const [badgeNotice, setBadgeNotice] = useState('');

  const ownedBadgeIds = user?.inventory?.badges || [];
  const showcaseBadgeIds = user?.inventory?.showcaseBadges || [];

  const handleToggleShowcase = async (badgeId) => {
    if (updatingShowcase) return;
    try {
      setUpdatingShowcase(true);
      sounds.playClick();
      let nextShowcase;
      const bName = BADGES_MAP[badgeId]?.name || 'Badge';
      if (showcaseBadgeIds.includes(badgeId)) {
        nextShowcase = showcaseBadgeIds.filter((id) => id !== badgeId);
        setBadgeNotice(`Removed "${bName}" from showcase.`);
      } else {
        if (showcaseBadgeIds.length >= 5) {
          sounds.playPausePenalty();
          setBadgeNotice('Maximum 5 showcase badges reached.');
          setUpdatingShowcase(false);
          return;
        }
        nextShowcase = [...showcaseBadgeIds, badgeId];
        setBadgeNotice(`Added "${bName}" to showcase!`);
      }

      const res = await api.updateShowcaseBadges(nextShowcase);
      if (res.success && onUserUpdate) {
        onUserUpdate(user?.coins, res.inventory);
      }
    } catch (err) {
      sounds.playPausePenalty();
      setBadgeNotice(err.message || 'Failed to update showcase badges.');
    } finally {
      setUpdatingShowcase(false);
    }
  };

  const effectiveResetTime = isCustomReset ? customTime : resetTime;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      sounds.playClick();

      const res = await api.onboarding({
        name: name.trim(),
        age: Number(age),
        fieldOfStudy,
        dailyResetTime: effectiveResetTime,
        restDay: {
          enabled: restDayEnabled,
          dayOfWeek: Number(restDayOfWeek),
        },
        socialLinks: {
          instagram: instagram.trim(),
          linkedin: linkedin.trim(),
        },
      });

      if (res.success) {
        sounds.playTimerComplete();
        setStatusMsg(
          `Settings saved! Study day resets at ${formatResetTimeDisplay(effectiveResetTime)}.`
        );
        if (onUserUpdate) onUserUpdate(res.user);
      }
    } catch (err) {
      sounds.playPausePenalty();
      setStatusMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 select-none">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
          Settings
        </h2>
      </div>

      {statusMsg && (
        <div className="p-3 bg-[#E8F5EE] dark:bg-[#162420] border border-[#C8E6D5] dark:border-[#2B5246] rounded-2xl text-xs text-[#1B3B2F] dark:text-[#A3D9C9] text-center font-bold">
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 1. STUDY PREFERENCES (Daily Reset Time Boundary) */}
        <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm">
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-[#D97724] dark:text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                Daily Reset Time
              </h3>
              <p className="text-xs text-[#576560] dark:text-[#8BA398]">
                Set your personal midnight. Sessions before this time count towards yesterday.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RESET_TIME_OPTIONS.map((opt) => {
              const isSelected = !isCustomReset && resetTime === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setIsCustomReset(false);
                    setResetTime(opt.value);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'border-[#1B3B2F] bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-white shadow-xs'
                      : 'border-[#EAE5DD] dark:border-[#253D35] text-[#576560] dark:text-[#8BA398] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29]/50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#1B3B2F] dark:text-[#A3D9C9]" />}
                </button>
              );
            })}

            {/* Custom Time Option */}
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsCustomReset(true);
              }}
              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                isCustomReset
                  ? 'border-[#1B3B2F] bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-white shadow-xs'
                  : 'border-[#EAE5DD] dark:border-[#253D35] text-[#576560] dark:text-[#8BA398] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29]/50'
              }`}
            >
              <span>Custom Time</span>
              {isCustomReset && <Check className="w-4 h-4 text-[#1B3B2F] dark:text-[#A3D9C9]" />}
            </button>
          </div>

          {/* Custom Time Picker */}
          {isCustomReset && (
            <div className="mt-3 flex items-center space-x-3 p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]">
              <span className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                Custom Target:
              </span>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="bg-white dark:bg-stone-900 border border-[#EAE5DD] dark:border-[#253D35] rounded-xl px-3 py-1.5 text-xs text-[#1C2A24] dark:text-[#F2F7F4] font-bold focus:outline-none focus:border-[#2B5A52] focus:ring-2 focus:ring-[#2B5A52]/20 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 2. WEEKLY REST DAY CARD */}
        <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#2B5A52] dark:text-[#A3D9C9]" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  Weekly Rest Day
                </h3>
                <p className="text-[11px] text-[#576560] dark:text-[#8BA398] mt-0.5">
                  Streaks pause, Sparky stats freeze, and tasks become optional.
                </p>
              </div>
            </div>

            {/* Segmented Toggle */}
            <div className="flex p-1 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-xl border border-[#EAE5DD] dark:border-[#253D35] self-start sm:self-center">
              <button
                type="button"
                onClick={() => setRestDayEnabled(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  restDayEnabled ? 'bg-white dark:bg-[#162420] text-[#1B3B2F] dark:text-white shadow-sm' : 'text-[#576560] dark:text-[#8BA398]'
                }`}
              >
                Enabled
              </button>
              <button
                type="button"
                onClick={() => setRestDayEnabled(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !restDayEnabled ? 'bg-white dark:bg-[#162420] text-[#1B3B2F] dark:text-white shadow-sm' : 'text-[#576560] dark:text-[#8BA398]'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>

          {restDayEnabled && (
            <div className="pt-2 border-t border-[#EAE5DD] dark:border-[#253D35]">
              <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-2 pt-3">
                Choose Off Day
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => setRestDayOfWeek(d.day)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      restDayOfWeek === d.day
                        ? 'border-[#1B3B2F] bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-white shadow-xs'
                        : 'border-[#EAE5DD] dark:border-[#253D35] text-[#576560] dark:text-[#8BA398] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29]/50'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. PROFILE CARD */}
        <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm">
          <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
              Adventurer Identity
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-xl px-4 py-2.5 text-sm text-[#1C2A24] dark:text-[#F2F7F4] focus:outline-none focus:border-[#2B5A52] focus:ring-2 focus:ring-[#2B5A52]/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1.5">
                Age
              </label>
              <input
                type="number"
                min="12"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-xl px-4 py-2.5 text-sm text-[#1C2A24] dark:text-[#F2F7F4] focus:outline-none focus:border-[#2B5A52] focus:ring-2 focus:ring-[#2B5A52]/20 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1.5">
                Field of Study / Discipline
              </label>
              <select
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className="w-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-xl px-4 py-2.5 text-sm text-[#1C2A24] dark:text-[#F2F7F4] focus:outline-none focus:border-[#2B5A52] focus:ring-2 focus:ring-[#2B5A52]/20 transition cursor-pointer"
              >
                {FIELDS_OF_STUDY.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Social Profiles */}
            <div className="sm:col-span-2 pt-4 border-t border-[#EAE5DD] dark:border-[#253D35] space-y-3">
              <span className="block text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                Social Profiles (Optional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1.5">
                    <InstagramIcon className="w-3.5 h-3.5 text-rose-500" />
                    <span>Instagram</span>
                  </label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-xl px-4 py-2.5 text-sm text-[#1C2A24] dark:text-[#F2F7F4] focus:outline-none focus:border-[#2B5A52] focus:ring-2 focus:ring-[#2B5A52]/20 transition"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-bold text-[#576560] dark:text-[#8BA398] mb-1.5">
                    <LinkedInIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>LinkedIn</span>
                  </label>
                  <input
                    type="text"
                    placeholder="linkedin.com/in/..."
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-xl px-4 py-2.5 text-sm text-[#1C2A24] dark:text-[#F2F7F4] focus:outline-none focus:border-[#2B5A52] focus:ring-2 focus:ring-[#2B5A52]/20 transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. MY BADGES & PROFILE SHOWCASE */}
        <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EAE5DD] dark:border-[#253D35] gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                  My Badges
                </h3>
                <span className="text-[11px] text-[#576560] dark:text-[#8BA398]">
                  Showcase up to 5 on your profile
                </span>
              </div>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onNavigate('rewards');
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#1B3B2F] dark:text-[#A3D9C9] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer self-start sm:self-auto shadow-sm"
              >
                <span>Visit Badge Shop</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {badgeNotice && (
            <div className="p-2.5 bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] rounded-xl text-xs text-[#1B3B2F] dark:text-[#A3D9C9] text-center font-bold">
              {badgeNotice}
            </div>
          )}

          {/* Active Profile Showcase Area */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]">
            <div className="flex items-center space-x-1.5 mb-3">
              <Star className="w-4 h-4 text-[#D97724] fill-current" />
              <span className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                Showcase ({showcaseBadgeIds.length}/5)
              </span>
            </div>

            {showcaseBadgeIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2.5">
                {showcaseBadgeIds.map((id) => {
                  const b = BADGES_MAP[id];
                  if (!b) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] shadow-xs group"
                    >
                      <img
                        src={getBadgeAssetUrl(b.fileName)}
                        alt={b.name}
                        className="w-5 h-5 object-contain"
                      />
                      <span className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">
                        {b.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleShowcase(id)}
                        disabled={updatingShowcase}
                        className="text-[#576560] hover:text-rose-500 font-black text-[10px] ml-1 cursor-pointer transition"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#576560] dark:text-[#8BA398] italic">
                No badges showcased yet.
              </p>
            )}
          </div>

          {/* Owned Badges Collection */}
          {ownedBadgeIds.length > 0 ? (
            <div className="pt-2">
              <span className="text-xs font-bold text-[#576560] dark:text-[#8BA398] block mb-3">
                Your Collection:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ownedBadgeIds.map((badgeId) => {
                  const badge = BADGES_MAP[badgeId];
                  if (!badge) return null;
                  const isShowcased = showcaseBadgeIds.includes(badgeId);

                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-2xl border transition flex flex-col items-center text-center space-y-2 ${
                        isShowcased
                          ? 'bg-[#E8F5EE] dark:bg-[#1C2E29] border-[#1B3B2F] dark:border-[#2B5246] shadow-xs'
                          : 'bg-[#FAF8F5] dark:bg-[#162420] border-[#EAE5DD] dark:border-[#253D35] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="w-12 h-12 flex items-center justify-center p-1 bg-white dark:bg-black/20 rounded-xl shadow-xs">
                        <img
                          src={getBadgeAssetUrl(badge.fileName)}
                          alt={badge.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      <div className="w-full">
                        <h4 className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] truncate" title={badge.name}>
                          {badge.name}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleShowcase(badge.id)}
                        disabled={updatingShowcase}
                        className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center space-x-1 ${
                          isShowcased
                            ? 'bg-[#1B3B2F] text-white'
                            : 'bg-white dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-[#E8F5EE] dark:hover:bg-[#253D35]'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${isShowcased ? 'fill-current text-amber-300' : 'text-[#576560]'}`} />
                        <span>{isShowcased ? 'Showcased' : 'Showcase'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 px-4 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl border border-[#EAE5DD] dark:border-[#253D35]">
              <div className="w-10 h-10 mx-auto rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-lg shadow-inner mb-3">
                🎖️
              </div>
              <h4 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4]">
                Collection Empty
              </h4>
              <p className="text-[11px] text-[#576560] dark:text-[#8BA398] mt-1 max-w-xs mx-auto">
                Complete study sessions to earn coins and unlock badges.
              </p>
            </div>
          )}
        </div>

        {/* 5. APP PREFERENCES (Audio & Theme) */}
        <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-7 shadow-sm">
          <h3 className="text-base font-black text-[#1C2A24] dark:text-[#F2F7F4] pb-4 mb-4 border-b border-[#EAE5DD] dark:border-[#253D35]">
            App Preferences
          </h3>

          <div className="space-y-4">
            {/* Audio Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl border border-[#EAE5DD] dark:border-[#253D35]">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white dark:bg-[#162420] rounded-xl shadow-xs">
                  {soundMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-[#2B5A52]" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-[#1C2A24] dark:text-[#F2F7F4] block">
                    Sound Effects
                  </span>
                  <span className="text-[11px] text-[#576560] dark:text-[#8BA398]">
                    {soundMuted ? 'Muted' : 'Timer chimes and UI sounds'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSound}
                className="px-4 py-1.5 rounded-lg border border-[#EAE5DD] dark:border-[#253D35] bg-white dark:bg-[#162420] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer shadow-sm"
              >
                {soundMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#FAF8F5] dark:bg-[#1C2E29] rounded-2xl border border-[#EAE5DD] dark:border-[#253D35]">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white dark:bg-[#162420] rounded-xl shadow-xs">
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-[#1C2A24] dark:text-[#F2F7F4] block">
                    App Theme
                  </span>
                  <span className="text-[11px] text-[#576560] dark:text-[#8BA398]">
                    {theme === 'dark' ? 'Forest Dark Night' : 'Warm Off-White Cream'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="px-4 py-1.5 rounded-lg border border-[#EAE5DD] dark:border-[#253D35] bg-white dark:bg-[#162420] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer shadow-sm"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-[#1B3B2F] hover:bg-[#142C23] text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-md transition transform hover:scale-105 cursor-pointer disabled:opacity-70 disabled:hover:scale-100"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;