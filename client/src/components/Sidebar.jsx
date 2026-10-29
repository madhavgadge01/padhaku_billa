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
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#FAF8F5] dark:bg-[#0F1A16] border-r border-[#EAE5DD] dark:border-[#233831] px-4 py-6 transition-colors duration-200 select-none z-30">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#1B3B2F] text-[#DCEFE3] flex items-center justify-center font-black text-xl shadow-sm">
          🌱
        </div>
        <div>
          <h1 className="text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight leading-tight">
            Padhaku Billa
          </h1>
         
        </div>
      </div>

      {/* Mini Streak & Coin Badge Bar */}
      <div className="mx-2 mb-6 p-3 rounded-2xl bg-[#E8F5EE] dark:bg-[#162420] border border-[#C8E6D5] dark:border-[#2B5246] flex items-center justify-between text-xs font-bold">
        <div className="flex items-center space-x-1.5 text-[#D97724] dark:text-[#F59E0B]">
          <Flame className="w-4 h-4 fill-current" />
          <span>{globalStreak}d Streak</span>
        </div>
        <div className="flex items-center space-x-1 text-[#1B3B2F] dark:text-[#A3D9C9]">
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
                  ? 'bg-[#1B3B2F] text-white shadow-sm'
                  : 'text-[#576560] dark:text-[#9EB5AB] hover:bg-[#F0ECE6] dark:hover:bg-[#1C2E29] hover:text-[#1C2A24] dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#DCEFE3]' : 'text-current'}`} />
              <div className="flex-1">
                <span className="block text-xs font-bold">{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Controls */}
      <div className="pt-4 border-t border-[#EAE5DD] dark:border-[#233831] flex items-center justify-between px-2">
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
