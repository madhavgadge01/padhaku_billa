import React, { useState } from 'react';
import {
  Coins,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Gift,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BADGES, getBadgeAssetUrl } from '../constants/badges.js';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';

export const FocusRewardSpotlight = ({
  user,
  pet,
  onUserUpdate,
  onNavigate,
  className = '',
}) => {
  const [purchasing, setPurchasing] = useState(false);
  const [justPurchasedId, setJustPurchasedId] = useState(null);
  const [errorNotice, setErrorNotice] = useState('');

  // Persist dismissed badges in sessionStorage so the user is never repeatedly nagged
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = sessionStorage.getItem('padhaku_dismissed_spotlight_badges');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const userCoins = user?.coins || 0;
  const ownedBadges = user?.inventory?.badges || [];
  const isPetAlive = pet?.isAlive !== false && (pet?.health ?? 100) > 0;

  // Find all unowned badges the user can afford with their current coin balance
  const affordableBadges = BADGES.filter(
    (b) => !ownedBadges.includes(b.id) && userCoins >= b.price
  );

  // Filter out badges dismissed by the user in this session
  const eligibleBadges = affordableBadges.filter(
    (b) => !dismissedIds.includes(b.id)
  );

  // If no affordable badges remain to spotlight, render nothing
  if (eligibleBadges.length === 0) {
    return null;
  }

  // Spotlight the most prestigious / highest-value badge the user can currently afford
  const spotlightBadge = [...eligibleBadges].sort((a, b) => b.price - a.price)[0];
  const otherAffordableCount = affordableBadges.length - 1;

  // Tier color styling
  const getTierBadgeStyle = (tier) => {
    switch (tier) {
      case 'Mythic':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Legendary':
        return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'Epic':
        return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'Rare':
        return 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30';
      default:
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getTierGlowStyle = (tier) => {
    switch (tier) {
      case 'Mythic':
        return 'bg-amber-400/20 shadow-[0_0_35px_rgba(245,158,11,0.25)]';
      case 'Legendary':
        return 'bg-orange-400/20 shadow-[0_0_35px_rgba(234,88,12,0.25)]';
      case 'Epic':
        return 'bg-purple-400/20 shadow-[0_0_35px_rgba(168,85,247,0.25)]';
      case 'Rare':
        return 'bg-sky-400/20 shadow-[0_0_35px_rgba(59,130,246,0.25)]';
      default:
        return 'bg-emerald-400/20 shadow-[0_0_35px_rgba(16,185,129,0.25)]';
    }
  };

  // Handle Dismiss / Skip (remembers choice for this badge in this session)
  const handleDismiss = () => {
    sounds.playClick();
    const nextDismissed = [...dismissedIds, spotlightBadge.id];
    setDismissedIds(nextDismissed);
    try {
      sessionStorage.setItem(
        'padhaku_dismissed_spotlight_badges',
        JSON.stringify(nextDismissed)
      );
    } catch {}
  };

  // 1-Click Buy directly from Focus Page
  const handleDirectBuy = async () => {
    if (purchasing) return;

    if (!isPetAlive) {
      sounds.playPausePenalty();
      setErrorNotice('Shop locked while Sparky is resting. Revive Sparky in Pet Care first.');
      setTimeout(() => setErrorNotice(''), 4000);
      return;
    }

    if (userCoins < spotlightBadge.price) {
      sounds.playPausePenalty();
      setErrorNotice('Not enough coins to claim this reward.');
      setTimeout(() => setErrorNotice(''), 3000);
      return;
    }

    try {
      setPurchasing(true);
      sounds.playCoinSound();

      const res = await api.buyItem('badges', spotlightBadge.id);
      if (res && res.success) {
        sounds.playTimerComplete();
        confetti({
          particleCount: 65,
          spread: 75,
          origin: { y: 0.8 },
          colors: ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'],
        });

        setJustPurchasedId(spotlightBadge.id);
        if (onUserUpdate) {
          onUserUpdate(res.coins, res.inventory);
        }

        // Keep success feedback briefly before moving to next state
        setTimeout(() => {
          setJustPurchasedId(null);
        }, 2400);
      } else {
        setErrorNotice(res?.message || 'Failed to complete unlock.');
        setTimeout(() => setErrorNotice(''), 3500);
      }
    } catch (err) {
      sounds.playPausePenalty();
      setErrorNotice(err?.message || 'Error processing purchase.');
      setTimeout(() => setErrorNotice(''), 3500);
    } finally {
      setPurchasing(false);
    }
  };

  const isPurchasedNow = justPurchasedId === spotlightBadge.id;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-stone-200/90 dark:border-white/10 bg-white/80 dark:bg-[#121A17]/80 backdrop-blur-xl shadow-lg dark:shadow-2xl p-5 sm:p-6 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${className}`}
    >
      {/* Top subtle ambient highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/50 dark:via-emerald-400/50 to-transparent pointer-events-none" />

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 transition cursor-pointer"
        title="Dismiss suggestion"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pr-6 sm:pr-8">
        {/* Badge Icon Showcase with Apple-style ambient glow */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full blur-xl scale-90 ${getTierGlowStyle(
              spotlightBadge.tier
            )}`}
          />
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-stone-50 to-stone-100 dark:from-[#1C2E29]/70 dark:to-[#162420]/70 border border-stone-200/80 dark:border-white/10 flex items-center justify-center p-2.5 relative shadow-inner">
            <img
              src={getBadgeAssetUrl(spotlightBadge.fileName)}
              alt={spotlightBadge.name}
              className={`w-full h-full object-contain transition-transform duration-300 ${
                isPurchasedNow ? 'scale-110 rotate-6' : 'hover:scale-105'
              }`}
            />
          </div>
        </div>

        {/* Content Details */}
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          {/* Header Row: Kicker & Coin Balance */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-widest text-[#D97724] dark:text-[#F59E0B]">
              <Sparkles className="w-3 h-3" />
              <span>Reward Ready to Claim</span>
            </span>

            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTierBadgeStyle(
                spotlightBadge.tier
              )}`}
            >
              {spotlightBadge.tier}
            </span>

            <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              <Coins className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{userCoins} Coins available</span>
            </span>
          </div>

          {/* Badge Title */}
          <h4 className="text-base sm:text-lg font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
            {spotlightBadge.name}
          </h4>

          {/* Short Description */}
          <p className="text-xs text-[#576560] dark:text-[#8BA398] max-w-xl leading-relaxed">
            {spotlightBadge.description}
          </p>

          {/* Error Notice */}
          {errorNotice && (
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center sm:justify-start space-x-1.5 pt-1 animate-in fade-in">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
            {isPurchasedNow ? (
              <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-md animate-in zoom-in-95">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Claimed! Added to Badges</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDirectBuy}
                disabled={purchasing}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#1B3B2F] hover:bg-[#142C23] text-white dark:bg-[#10B981] dark:hover:bg-[#0EA572] dark:text-[#06140D] font-black text-xs shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5 fill-current text-amber-300 dark:text-[#06140D]" />
                    <span>Unlock for {spotlightBadge.price} Coins</span>
                  </>
                )}
              </button>
            )}

            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onNavigate('rewards');
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 font-bold text-xs border border-stone-200/70 dark:border-white/10 transition-all cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                <span>View Rewards Emporium</span>
                <ArrowRight className="w-3 h-3 text-stone-400" />
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 text-xs font-semibold px-2 py-1 transition cursor-pointer"
            >
              Skip
            </button>
          </div>

          {/* Other affordable rewards hint */}
          {otherAffordableCount > 0 && onNavigate && (
            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium pt-1">
              +{otherAffordableCount} more reward{otherAffordableCount > 1 ? 's' : ''}{' '}
              ready to unlock with your current balance.{' '}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onNavigate('rewards');
                }}
                className="underline hover:text-[#1B3B2F] dark:hover:text-[#A3D9C9] font-bold cursor-pointer"
              >
                Explore shop →
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FocusRewardSpotlight;

