import React, { useState, useEffect } from 'react';
import { ShoppingBag, Lock, Check, Sparkles, AlertTriangle, ShieldAlert, Coins } from 'lucide-react';
import { VectorRealEstate, VectorVehicle } from './VectorCosmetics.jsx';
import { AvatarBusinessman } from './VectorAvatars.jsx';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';

export const CosmeticsShop = ({ user, onClose, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('apparel');
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await api.getCatalog();
      if (res.success) {
        setCatalog(res.catalog);
        setIsLocked(res.isShopLocked);
        setLockReason(res.lockReason);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleBuy = async (category, itemId) => {
    try {
      sounds.playCoinSound();
      const res = await api.buyItem(category, itemId);
      if (res.success) {
        setActionMsg(res.message);
        sounds.playTimerComplete();
        loadCatalog();
        if (onUserUpdate) onUserUpdate(res.coins, res.inventory);
      }
    } catch (err) {
      setActionMsg(err.message);
      sounds.playPausePenalty();
    }
  };

  const handleEquip = async (category, itemId) => {
    try {
      sounds.playClick();
      const res = await api.equipItem(category, itemId);
      if (res.success) {
        setActionMsg(res.message);
        loadCatalog();
        if (onUserUpdate) onUserUpdate(user.coins, res.inventory);
      }
    } catch (err) {
      setActionMsg(err.message);
    }
  };

  const currentCoins = user?.coins || 0;
  const globalStreak = user?.streaks?.bestGlobalStreak || user?.streaks?.currentGlobalStreak || 0;
  const isBusinessmanUnlocked = Boolean(user?.inventory?.unlockedBusinessSuit || globalStreak >= 365);

  const ownedApparel = user?.inventory?.apparel || ['basic_clothes'];
  const ownedVehicles = user?.inventory?.vehicles || ['bicycle'];
  const ownedRealEstate = user?.inventory?.realEstate || ['cozy_room'];

  const equippedApparel = user?.inventory?.equippedApparel || 'basic_clothes';
  const equippedVehicle = user?.inventory?.equippedVehicle || 'bicycle';
  const equippedRealEstate = user?.inventory?.equippedRealEstate || 'cozy_room';
  const selectedAvatar = user?.selectedAvatar || 'cat';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Cosmetics & Assets Emporium</h2>
              <p className="text-xs text-slate-400">Upgrade your lifestyle and flex your discipline.</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Coin Wallet Badge */}
            <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-amber-400 font-black text-sm shadow-inner">
              <Coins className="w-4 h-4 fill-amber-400" />
              <span>{currentCoins} Coins</span>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="text-slate-400 hover:text-slate-100 font-bold p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Pet Neglect Lockdown Warning Overlay */}
        {isLocked && (
          <div className="bg-red-950/90 border-b border-red-700 p-4 flex items-center justify-between text-red-200">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 animate-bounce" />
              <div className="text-xs">
                <h4 className="font-bold text-red-100">MARKETPLACE LOCKED DUE TO PET NEGLECT</h4>
                <p className="mt-0.5 text-red-300">{lockReason || 'Your pet has fainted! Revive it first to make purchases.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-3 space-x-2 bg-slate-900/50 overflow-x-auto">
          {[
            { id: 'apparel', label: 'Apparel & Suits' },
            { id: 'vehicles', label: 'Vehicles' },
            { id: 'realEstate', label: 'Real Estate' },
            { id: 'specialAvatars', label: 'Ascendant 365-Day Avatar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(tab.id);
              }}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Shop Items Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {actionMsg && (
            <div className="mb-4 text-xs bg-slate-800 border border-sky-500/50 text-sky-300 p-2.5 rounded-xl text-center">
              {actionMsg}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">Loading market inventory...</div>
          ) : activeTab === 'specialAvatars' ? (
            /* Special Businessman Showcase */
            <div className="bg-slate-800/40 border border-amber-500/40 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="w-48 h-56 flex-shrink-0 flex items-center justify-center bg-slate-900/90 rounded-2xl border border-amber-500/30 p-2 shadow-2xl">
                <AvatarBusinessman className="w-44 h-52" />
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black text-xs px-3 py-1 rounded-full mb-3 shadow">
                
                  <span>Ascendant Tier • 365-Day Global Streak Achievement</span>
                </div>
                <h3 className="text-2xl font-black text-slate-100">Suit & Boot Businessman</h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  The ultimate pinnacle of unbroken human consistency. Adorned in a bespoke charcoal three-piece tailored suit, champagne gold silk necktie, chronograph timepiece, and mirror-gloss Italian leather boots.
                </p>

                {/* Streak Progress Towards 365 Days */}
                <div className="mt-4 p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 max-w-lg">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Global Consistency Streak Progress:</span>
                    <span className="text-amber-400 font-mono">{globalStreak} / 365 Days</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (globalStreak / 365) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {isBusinessmanUnlocked
                      ? '🎉 Unlocked! You have attained elite 365-day discipline!'
                      : `Maintain 100% daily task completion without a single missed day for ${365 - globalStreak} more days to unlock.`}
                  </p>
                </div>

                <div className="mt-5">
                  {isBusinessmanUnlocked ? (
                    <button
                      onClick={() => handleEquip('avatar', 'businessman')}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-lg transition cursor-pointer ${
                        selectedAvatar === 'businessman'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      }`}
                    >
                      {selectedAvatar === 'businessman' ? '✓ CURRENTLY EQUIPPED' : 'EQUIP BUSINESSMAN AVATAR'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex items-center space-x-2 bg-slate-800 text-slate-500 px-6 py-2.5 rounded-xl text-xs font-bold border border-slate-700 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      <span>LOCKED (365 DAYS REQUIRED)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Items Grid for Apparel, Vehicles, Real Estate */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(catalog?.[activeTab] || []).map((item) => {
                const isOwned =
                  activeTab === 'apparel'
                    ? ownedApparel.includes(item.id)
                    : activeTab === 'vehicles'
                    ? ownedVehicles.includes(item.id)
                    : ownedRealEstate.includes(item.id);

                const isEquipped =
                  activeTab === 'apparel'
                    ? equippedApparel === item.id
                    : activeTab === 'vehicles'
                    ? equippedVehicle === item.id
                    : equippedRealEstate === item.id;

                const canAfford = currentCoins >= item.price;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-800/40 rounded-xl border p-4 flex flex-col justify-between transition group ${
                      isEquipped
                        ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    {/* Item Vector Artwork Preview */}
                    <div className="w-full h-32 bg-slate-900/80 rounded-lg border border-slate-700/60 flex items-center justify-center p-2 mb-3 overflow-hidden">
                      {activeTab === 'realEstate' ? (
                        <VectorRealEstate estateId={item.id} className="w-full h-full object-cover rounded" />
                      ) : activeTab === 'vehicles' ? (
                        <VectorVehicle vehicleId={item.id} className="w-32 h-20" />
                      ) : (
                        <div className="text-center">
                          <span className="text-3xl">🥋</span>
                          <span className="block text-[11px] font-bold text-sky-400 mt-1">{item.bonusText || 'Custom Drip'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full">
                          {item.tier || 'Gear'}
                        </span>
                        {item.price === 0 ? (
                          <span className="text-xs font-bold text-emerald-400">Default Starter</span>
                        ) : (
                          <span className="flex items-center space-x-1 text-xs font-black text-amber-400">
                            <Coins className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{item.price} Coins</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-100 mt-2">{item.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-3 border-t border-slate-700/60">
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold py-2 rounded-lg text-xs flex items-center justify-center space-x-1 cursor-default"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>EQUIPPED</span>
                        </button>
                      ) : isOwned ? (
                        <button
                          onClick={() => handleEquip(activeTab, item.id)}
                          className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                        >
                          EQUIP ITEM
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuy(activeTab, item.id)}
                          disabled={!canAfford || isLocked}
                          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black py-2 rounded-lg text-xs transition cursor-pointer disabled:cursor-not-allowed shadow"
                        >
                          {isLocked
                            ? 'LOCKED (REVIVE PET)'
                            : canAfford
                            ? `BUY FOR ${item.price} COINS`
                            : `NEED ${item.price - currentCoins} MORE COINS`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
