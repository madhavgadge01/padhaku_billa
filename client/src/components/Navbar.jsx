import React from 'react';
import {
  Flame,
  Coins,
  Heart,
  ShoppingBag,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

export const Navbar = ({
  user,
  pet,
  isRestDayToday = false,
  soundMuted,
  onToggleSound,
  theme,
  onToggleTheme,
  onOpenShop,
  onOpenPetCare,
  onLogout,
}) => {
  const globalStreak = user?.streaks?.currentGlobalStreak || 0;
  const coins = user?.coins || 0;

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-sky-500/20">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black text-slate-100 tracking-tight">Padhaku Billa</span>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                RPG Focus
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Honest with yourself. I track your time, not your lies.👀</p>
          </div>
        </div>

        {/* Center: Global Streak & Coin Badges */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Rest Day Indicator */}
          {isRestDayToday && (
            <div
              title="Today is your scheduled Rest Day! Streaks are frozen, 0% pet hunger decay, zero penalties."
              className="hidden md:flex items-center space-x-1.5 bg-sky-950/70 border border-sky-600/50 text-sky-300 px-3 py-1 rounded-full text-xs font-bold shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Rest Day Active</span>
            </div>
          )}

          {/* Global Main Day Streak Badge */}
          <div
            title={`Global Main Consistency Streak: ${globalStreak} Days unbroken. Increments ONLY when all scheduled daily tasks are finished!`}
            className="flex items-center space-x-1.5 bg-slate-800/90 border border-amber-500/50 px-3 py-1 rounded-full text-amber-400 text-xs font-extrabold shadow"
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            <span>{globalStreak}d Streak</span>
          </div>

          {/* Coins Badge */}
          <div
            onClick={() => {
              sounds.playCoinSound();
              onOpenShop();
            }}
            title="Focus Coins. Earn by finishing tasks uninterrupted. Click to open Shop."
            className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/40 px-3 py-1 rounded-full text-amber-400 text-xs font-extrabold shadow cursor-pointer hover:bg-amber-500/20 transition"
          >
            <Coins className="w-4 h-4 fill-amber-400" />
            <span>{coins}</span>
          </div>

          {/* Pet Vitality Quick Badge */}
          {pet && (
            <div
              onClick={onOpenPetCare}
              title={`Pet Health: ${pet.health}%. Click for Tamagotchi Care.`}
              className="hidden sm:flex items-center space-x-1.5 bg-slate-800/90 border border-rose-500/40 px-3 py-1 rounded-full text-rose-300 text-xs font-bold shadow cursor-pointer hover:bg-slate-800 transition"
            >
              <Heart className={`w-3.5 h-3.5 ${pet.health > 20 ? 'text-rose-500 fill-rose-500' : 'text-red-500 animate-ping'}`} />
              <span>{pet.health}%</span>
            </div>
          )}
        </div>

        {/* Right: Controls & Profile */}
        <div className="flex items-center space-x-2">
          {/* Shop Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenShop();
            }}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">EMPORIUM</span>
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={onToggleSound}
            title={soundMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* User Signout */}
          <button
            onClick={() => {
              sounds.playClick();
              onLogout();
            }}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
