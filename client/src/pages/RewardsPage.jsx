import React, { useState, useEffect } from 'react';
import {
  Coins,
  AlertTriangle,
  Check,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';
import { BADGES, getBadgeAssetUrl } from '../constants/badges.js';

export const RewardsPage = ({ user, pet, onUserUpdate, onNavigate }) => {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [purchasingId, setPurchasingId] = useState(null);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await api.getCatalog();
      if (res && res.success) {
        setCatalog(res.catalog);
      }
    } catch (err) {
      console.error('Failed to load shop catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const currentCoins = user?.coins || 0;
  const isPetAlive = pet?.isAlive !== false && (pet?.health ?? 100) > 0;
  const ownedBadgeIds = user?.inventory?.badges || [];

  // 1-Click Buy Badge with validation and state preservation
  const handleBuyBadge = async (badge) => {
    if (purchasingId) return;

    if (!isPetAlive) {
      sounds.playPausePenalty();
      setActionMsg('Shop locked! Sparky has fainted. Please revive Sparky in Pet Care first.');
      return;
    }

    if (ownedBadgeIds.includes(badge.id)) {
      setActionMsg(`You already own the ${badge.name} badge!`);
      return;
    }

    if (currentCoins < badge.price) {
      sounds.playPausePenalty();
      setActionMsg(`Not enough coins! You need ${badge.price} coins, but you only have ${currentCoins} coins.`);
      return;
    }

    try {
      setPurchasingId(badge.id);
      sounds.playCoinSound();

      const res = await api.buyItem('badges', badge.id);
      if (res && res.success) {
        sounds.playTimerComplete();
        setActionMsg(`Purchased ${badge.name}! Added to your profile badge collection.`);
        if (onUserUpdate) {
          onUserUpdate(res.coins, res.inventory);
        }
        loadCatalog();
      }
    } catch (err) {
      sounds.playPausePenalty();
      setActionMsg(err.message || 'Purchase failed.');
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 select-none">
      
      {/* Premium Header Card */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Award className="w-4 h-4 text-[#D97724] dark:text-[#F59E0B]" />
            </div>
            <h2 className="text-2xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
              Badge Shop
            </h2>
          </div>
          <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium max-w-md">
            Collect authentic badges using focus coins earned from your study sessions. Showcase them on your adventurer profile!
          </p>
        </div>

        {/* Current Coin Balance & Collection Stats */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#E8F5EE] dark:bg-[#1C2E29] border border-[#C8E6D5] dark:border-[#2B5246] text-sm font-black text-[#1B3B2F] dark:text-[#A3D9C9] shadow-xs flex-1 sm:flex-auto justify-center">
            <Coins className="w-4 h-4 fill-current text-[#D97724]" />
            <span>{currentCoins} Coins</span>
          </div>

          <div className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#253D35] text-sm font-bold text-[#1C2A24] dark:text-[#F2F7F4] shadow-xs flex-1 sm:flex-auto justify-center">
            
            <span>{ownedBadgeIds.length} / {BADGES.length} Collected</span>
          </div>
        </div>
      </div>

      {/* Pet Neglect Lockdown Warning */}
      {!isPetAlive && (
        <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-600 dark:text-rose-500 mt-0.5" />
            <div>
              <strong className="block text-sm font-black">Shop is Locked!</strong>
              <p className="mt-1 text-xs leading-relaxed max-w-2xl">
                Sparky has fainted from lack of food and water. You cannot buy new badges right now. Revive your companion using an Elixir in Pet Care to unlock the shop again.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('pet')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
            >
              <span>Go to Pet Care</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Action / Error Notification Banner */}
      {actionMsg && (
        <div className="p-3.5 bg-[#E8F5EE] dark:bg-[#1C2E29] border border-[#C8E6D5] dark:border-[#2B5246] rounded-2xl text-xs text-[#1B3B2F] dark:text-[#A3D9C9] text-center font-bold animate-in fade-in zoom-in-95 duration-200">
          {actionMsg}
        </div>
      )}

      {/* BADGE GRID: Exactly 6 Cards Per Row on Desktop/Large Screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {BADGES.map((badge) => {
          const isOwned = ownedBadgeIds.includes(badge.id);
          const canAfford = currentCoins >= badge.price;
          const isBusy = purchasingId === badge.id;

          return (
            <div
              key={badge.id}
              className={`p-4 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-between relative group ${
                isOwned
                  ? 'bg-[#E8F5EE]/50 dark:bg-[#1C2E29]/40 border-[#C8E6D5] dark:border-[#2B5246]'
                  : 'bg-white dark:bg-[#162420] border-[#EAE5DD] dark:border-[#253D35] hover:border-[#2B5A52] dark:hover:border-[#A3D9C9] hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              {/* Badge Header: Tier & Coin Price */}
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#8A9791] dark:text-[#6E8079] bg-stone-100 dark:bg-stone-800/50 px-2 py-0.5 rounded-full">
                  {badge.tier}
                </span>
                <span className="flex items-center space-x-1 text-xs font-black text-[#D97724] dark:text-[#F59E0B] font-mono">
                  <Coins className="w-3.5 h-3.5 fill-current" />
                  <span>{badge.price}</span>
                </span>
              </div>

              {/* Badge PNG Image with backdrop */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center p-2 mb-2 relative">
                {/* Subtle glow behind the badge if owned */}
                {isOwned && (
                  <div className="absolute inset-0 bg-emerald-400/20 dark:bg-emerald-400/10 blur-xl rounded-full scale-75"></div>
                )}
                <img
                  src={getBadgeAssetUrl(badge.fileName)}
                  alt={badge.name}
                  className={`w-16 h-16 sm:w-20 sm:h-20 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md z-10 ${
                    !isOwned ? 'filter grayscale-[30%] opacity-80 group-hover:grayscale-0 group-hover:opacity-100' : ''
                  }`}
                  loading="lazy"
                />
              </div>

              {/* Badge Name & Short Description */}
              <div className="text-center mb-4 w-full px-1">
                <h4 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] truncate mb-1" title={badge.name}>
                  {badge.name}
                </h4>
                <p className="text-[10px] text-[#576560] dark:text-[#8BA398] line-clamp-2 leading-snug" title={badge.description}>
                  {badge.description}
                </p>
              </div>

              {/* Action Button: Owned Pill or Buy Button */}
              <div className="w-full mt-auto">
                {isOwned ? (
                  <div className="w-full py-2.5 rounded-xl text-xs font-black bg-[#1B3B2F] dark:bg-[#1C2E29] text-white dark:text-[#A3D9C9] border border-[#1B3B2F] dark:border-[#2B5246] flex items-center justify-center space-x-1.5 shadow-sm">
                    <Check className="w-4 h-4" />
                    <span>Collected</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuyBadge(badge)}
                    disabled={isBusy || !isPetAlive}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 ${
                      canAfford
                        ? 'bg-[#D97724] hover:bg-[#C06519] text-white'
                        : 'bg-[#FAF8F5] dark:bg-[#1C2E29] text-[#576560] dark:text-[#8BA398] border border-[#EAE5DD] dark:border-[#253D35] hover:bg-[#EAE5DD]'
                    }`}
                    title={canAfford ? `Purchase for ${badge.price} coins` : `Requires ${badge.price} coins`}
                  >
                    {isBusy ? (
                      <span>Buying...</span>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5 text-white/90 fill-current" />
                        <span>Buy Badge</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RewardsPage;