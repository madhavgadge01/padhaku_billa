import React from 'react';
import { Flame, Coins, ShieldCheck, Sun, Moon, LogOut } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { BADGES_MAP, getBadgeAssetUrl } from '../constants/badges.js';

export const TopHeader = ({
  user,
  isRestDayToday,
  theme,
  onToggleTheme,
  soundMuted: _soundMuted,
  onToggleSound: _onToggleSound,
  onLogout,
  onOpenShop,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const name = user?.name ? user.name.split(' ')[0] : 'Adventurer';
  const globalStreak = user?.streaks?.currentGlobalStreak || 0;
  const coins = user?.coins || 0;
  const showcaseBadgeIds = user?.inventory?.showcaseBadges || [];

  return (
    <header className="px-4 sm:px-8 py-4 flex items-center justify-between border-b border-emerald-950/5 dark:border-white/5 bg-[#F6FAF7]/85 dark:bg-[#0A0F0D]/85 backdrop-blur-md sticky top-0 z-20 transition-colors">
      {/* Left: Friendly Greeting */}
      <div>
        <h2 className="text-base sm:text-lg font-black text-[#0D1F17] dark:text-white tracking-tight">
          {getGreeting()}, {name}! 👋
        </h2>
        <p className="text-xs text-[#4A5B53] dark:text-[#94A3B8] font-medium hidden sm:block">
         Honest with yourself. I track your time, not your lies.👀
        </p>
      </div>

      {/* Right: Badges & Quick Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Rest Day Indicator */}
        {isRestDayToday && (
          <div
            title="Weekly Rest Day is active! Streaks are frozen, 0% pet hunger decay, zero penalties."
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] dark:bg-[#162420] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246]"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Rest Day</span>
          </div>
        )}

        {/* Global Streak Pill */}
        <div
          title={`Global Streak: ${globalStreak} Days! Maintain 100% daily tasks to keep it alive.`}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FEF3C7] dark:bg-[#2A2012] text-[#D97724] dark:text-[#F59E0B] border border-[#FDE68A] dark:border-[#523B18]"
        >
          <Flame className="w-4 h-4 fill-current" />
          <span>{globalStreak}d</span>
        </div>

        {/* User Showcase Badges */}
        {showcaseBadgeIds.length > 0 && (
          <div
            title="Your Showcased Profile Badges"
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35]"
          >
            {showcaseBadgeIds.map((id) => {
              const b = BADGES_MAP[id];
              if (!b) return null;
              return (
                <img
                  key={id}
                  src={getBadgeAssetUrl(b.fileName)}
                  alt={b.name}
                  title={`${b.name} (${b.tier})`}
                  className="w-4 h-4 object-contain"
                />
              );
            })}
          </div>
        )}

        {/* Coins Pill (Click to open Rewards/Shop) */}
        <button
          onClick={() => {
            sounds.playCoinSound();
            if (onOpenShop) onOpenShop();
          }}
          title="Your Focus Coins. Click to open Rewards & Emporium."
          className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#E8F5EE] dark:bg-[#162420] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246] hover:bg-[#D5EBDD] dark:hover:bg-[#1F332D] transition cursor-pointer"
        >
          <Coins className="w-4 h-4 fill-current" />
          <span>{coins}</span>
        </button>

        {/* Theme Toggle Pill (Desktop & Mobile) */}
        <button
          onClick={onToggleTheme}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8F5] dark:bg-[#1C2E29] text-[#1C2A24] dark:text-[#F2F7F4] border border-[#EAE5DD] dark:border-[#253D35] hover:bg-[#EAE5DD] dark:hover:bg-[#253D35] transition cursor-pointer"
          title={theme === 'dark' ? 'Switch to Warm Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#2B5A52]" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-2 rounded-xl text-[#576560] dark:text-[#9EB5AB] hover:text-rose-500 hover:bg-[#EAE5DD] dark:hover:bg-[#1C2E29] transition cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
