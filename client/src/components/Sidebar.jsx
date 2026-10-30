import React from 'react';
import {
  Home,
  Timer,
  CheckSquare,
  Heart,
  BarChart2,
  Trophy,
  Gift,
  Settings,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sparkles,
  Flame,
  Coins,
  BookOpen,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

export const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, desc: 'Overview & Sparky' },
  { id: 'focus', label: 'Focus', icon: Timer, desc: 'Pomodoro Timer' },
   { id: 'quests', label: 'Tasks', icon: CheckSquare, desc: 'Tasks & Streaks' },
  { id: 'timetable', label: 'Weekly Plan', icon: BookOpen, desc: 'Daily Subject Schedule' },
 
 
  { id: 'progress', label: 'Progress', icon: BarChart2, desc: 'Stats & History' },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, desc: 'Adventurer Ranks' },
  { id: 'rewards', label: 'Rewards', icon: Gift, desc: 'Badge Shop' },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'Preferences' },
];

export const Sidebar = ({
  activePage,
  onNavigate,
  user,
  pet,
  theme,
  onToggleTheme,
  soundMuted,
  onToggleSound,
}) => {
  const globalStreak = user?.streaks?.currentGlobalStreak || 0;
  const coins = user?.coins || 0;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#F6FAF7] dark:bg-[#0A0F0D] border-r border-emerald-950/5 dark:border-white/5 px-4 py-6 transition-colors duration-200 select-none z-30">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#0D1F17] dark:bg-[#10B981] text-emerald-400 dark:text-[#06140D] flex items-center justify-center font-black text-xl shadow-sm">
          🌱
        </div>
        <div>
          <h1 className="text-lg font-black text-[#0D1F17] dark:text-white tracking-tight leading-tight">
            Padhaku Billa
          </h1>
         
        </div>
      </div>

      {/* Mini Streak & Coin Badge Bar */}
      <div className="mx-2 mb-6 p-3 rounded-2xl bg-[#E8F7F0] dark:bg-[#121A17] border border-emerald-500/20 dark:border-white/5 flex items-center justify-between text-xs font-bold">
        <div className="flex items-center space-x-1.5 text-[#D97724] dark:text-[#F59E0B]">
          <Flame className="w-4 h-4 fill-current" />
          <span>{globalStreak}d Streak</span>
        </div>
        <div className="flex items-center space-x-1 text-[#065F46] dark:text-[#34D399]">
          <Coins className="w-4 h-4 fill-current" />
          <span>{coins} Coins</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sounds.playClick();
                onNavigate(item.id);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-[#0D1F17] text-white dark:bg-[#10B981] dark:text-[#06140D] shadow-sm font-black'
                  : 'text-[#4A5B53] dark:text-[#94A3B8] hover:bg-[#E8F7F0]/60 dark:hover:bg-[#141C18] hover:text-[#0D1F17] dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400 dark:text-[#06140D]' : 'text-current'}`} />
              <div className="flex-1">
                <span className="block text-xs font-bold">{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Controls */}
      <div className="pt-4 border-t border-emerald-950/5 dark:border-white/5 flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            className="p-2 rounded-xl text-[#576560] dark:text-[#9EB5AB] hover:bg-[#F0ECE6] dark:hover:bg-[#1C2E29] transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2 rounded-xl text-[#576560] dark:text-[#9EB5AB] hover:bg-[#F0ECE6] dark:hover:bg-[#1C2E29] transition cursor-pointer"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-[#2B5A52]" />}
          </button>
        </div>

      
      </div>
    </aside>
  );
};
