import React, { useState } from 'react';
import {
  Home,
  Timer,
  CheckSquare,
  Heart,
  Menu,
  BarChart2,
  Trophy,
  Gift,
  Settings,
  X,
  BookOpen,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';

export const BottomNav = ({ activePage, onNavigate }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'quests', label: 'Tasks', icon: CheckSquare },
     { id: 'progress', label: 'Progress', icon: BarChart2 },
  ];

  const moreTabs = [
    { id: 'timetable', label: 'Weekly Study Plan', icon: BookOpen },
   
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'rewards', label: 'Rewards Emporium', icon: Gift },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelect = (id) => {
    sounds.playClick();
    onNavigate(id);
    setShowMoreMenu(false);
  };

  const isMoreActive = moreTabs.some((t) => t.id === activePage);

  return (
    <>
      {/* "More" Drawer Modal for Mobile */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden flex flex-col justify-end"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bg-white dark:bg-[#121A17] border-t border-emerald-950/5 dark:border-white/5 rounded-t-3xl p-6 space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-emerald-950/5 dark:border-white/5">
              <h3 className="text-sm font-black text-[#0D1F17] dark:text-white">More Features</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 text-[#4A5B53] dark:text-[#94A3B8] hover:text-[#0D1F17] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {moreTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center space-x-2.5 p-3 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#0D1F17] text-white dark:bg-[#10B981] dark:text-[#06140D] font-black shadow-sm'
                        : 'bg-[#F4FBF7] dark:bg-[#16201C] text-[#0D1F17] dark:text-white hover:bg-[#E8F7F0]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F6FAF7]/95 dark:bg-[#0A0F0D]/95 backdrop-blur-md border-t border-emerald-950/5 dark:border-white/5 px-3 py-2 z-30 select-none">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                  isActive
                    ? 'text-[#0D1F17] dark:text-[#34D399] font-black'
                    : 'text-[#4A5B53] dark:text-[#94A3B8] hover:text-[#0D1F17]'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition ${
                    isActive ? 'bg-[#E8F7F0] dark:bg-[#16201C]' : 'bg-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowMoreMenu((prev) => !prev);
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-2xl transition cursor-pointer ${
              isMoreActive
                ? 'text-[#0D1F17] dark:text-[#34D399] font-black'
                : 'text-[#4A5B53] dark:text-[#94A3B8] hover:text-[#0D1F17]'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition ${
                isMoreActive ? 'bg-[#E8F7F0] dark:bg-[#16201C]' : 'bg-transparent'
              }`}
            >
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
