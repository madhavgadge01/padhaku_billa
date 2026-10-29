import React, { useState } from 'react';
import { VectorPet } from './VectorPets.jsx';
import { Heart, Cookie, Droplet, Sparkles, AlertOctagon, ShieldCheck, Coins } from 'lucide-react';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';

export const PetCareCard = ({ pet, userCoins, isRestDayToday = false, onPetUpdate }) => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const isDead = !pet || !pet.isAlive || pet.health <= 0;

  const handleFeed = async () => {
    if (userCoins < 2) {
      setFeedbackMsg('Need 2 coins to feed! Complete a focus Task first.');
      return;
    }
    try {
      setLoadingAction('feed');
      sounds.playFeedPet();
      const res = await api.feedPet();
      if (res.success) {
        setFeedbackMsg(res.message);
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
      }
    } catch (err) {
      setFeedbackMsg(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleWater = async () => {
    if (userCoins < 1) {
      setFeedbackMsg('Need 1 coin for water! Complete a focus Task first.');
      return;
    }
    try {
      setLoadingAction('water');
      sounds.playFeedPet();
      const res = await api.waterPet();
      if (res.success) {
        setFeedbackMsg(res.message);
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
      }
    } catch (err) {
      setFeedbackMsg(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRevive = async () => {
    if (userCoins < 10) {
      setFeedbackMsg('Revival Elixir costs 10 coins. Earn coins by focusing!');
      return;
    }
    try {
      setLoadingAction('revive');
      sounds.playRevivePet();
      const res = await api.revivePet();
      if (res.success) {
        setFeedbackMsg(res.message);
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
      }
    } catch (err) {
      setFeedbackMsg(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Rest Day Zero-Decay Immunity Banner */}
      {isRestDayToday && (
        <div className="mb-4 bg-sky-950/70 border border-sky-800/80 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-sky-200">
          <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            <strong>Rest Day Shield Active:</strong> Hunger and health decay rate is 0% today! Your pet will remain safe and full.
          </span>
        </div>
      )}

      {/* Pet Header & Graphic */}
      <div className="flex flex-col sm:flex-row items-center sm:space-x-6">
        <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/60 shadow-inner flex items-center justify-center">
          <VectorPet
            type={pet?.type || 'cyber-pup'}
            health={pet?.health ?? 100}
            hunger={pet?.hunger ?? 100}
            isAlive={!isDead}
            className="w-28 h-28"
          />
        </div>

        <div className="mt-4 sm:mt-0 flex-1 w-full text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-100 capitalize">
                {pet?.name || 'Pixel'} <span className="text-xs font-semibold text-sky-400">({pet?.type || 'Companion'})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tamagotchi Care: Keep your companion nourished with focus coins.
              </p>
            </div>
          </div>

          {/* Meters: Health, Hunger, Affection */}
          <div className="space-y-2 mt-3 w-full">
            {/* Health Meter */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center space-x-1 text-rose-400">
                  <Heart className="w-3.5 h-3.5 fill-rose-500" />
                  <span>Vitality (Health)</span>
                </span>
                <span className="font-mono text-slate-300">{pet?.health ?? 100}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    pet?.health > 50 ? 'bg-rose-500' : pet?.health > 20 ? 'bg-amber-500' : 'bg-red-600 animate-pulse'
                  }`}
                  style={{ width: `${pet?.health ?? 100}%` }}
                ></div>
              </div>
            </div>

            {/* Hunger Meter */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center space-x-1 text-amber-400">
                  <Cookie className="w-3.5 h-3.5 fill-amber-500" />
                  <span>Nourishment (Hunger)</span>
                </span>
                <span className="font-mono text-slate-300">{pet?.hunger ?? 100}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    pet?.hunger > 50 ? 'bg-amber-400' : pet?.hunger > 20 ? 'bg-amber-600' : 'bg-red-500 animate-pulse'
                  }`}
                  style={{ width: `${pet?.hunger ?? 100}%` }}
                ></div>
              </div>
            </div>

            {/* Affection Meter */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center space-x-1 text-purple-400">
                 
                  <span>Bond / Affection</span>
                </span>
                <span className="font-mono text-slate-300">{pet?.affection ?? 50}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                  style={{ width: `${pet?.affection ?? 50}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dead / Fainted Neglect Warning */}
      {isDead && (
        <div className="mt-4 bg-red-950/80 border border-red-700 rounded-xl p-3.5 flex items-start space-x-3 text-red-200">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-red-100">Companion Has Fainted from Neglect!</h4>
            <p className="mt-0.5 text-red-300">
              Consequence: <strong>The Cosmetics & Assets Shop is completely LOCKED</strong>, and pet affection has reset to 0. Revive your companion using a Revival Elixir (10 Coins) to restore market access.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {isDead ? (
          <button
            onClick={handleRevive}
            disabled={loadingAction === 'revive' || userCoins < 10}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black py-3 rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            
            <span>REVIVE PET (10 COINS)</span>
          </button>
        ) : (
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handleFeed}
              disabled={loadingAction === 'feed' || userCoins < 2}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow transition cursor-pointer disabled:opacity-50 text-xs"
            >
              <Cookie className="w-4 h-4 fill-slate-950" />
              <span>FEED MEAL (2 COINS)</span>
            </button>

            <button
              onClick={handleWater}
              disabled={loadingAction === 'water' || userCoins < 1}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow transition cursor-pointer disabled:opacity-50 text-xs"
            >
              <Droplet className="w-4 h-4 fill-slate-950" />
              <span>GIVE WATER (1 COIN)</span>
            </button>
          </div>
        )}

        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold ml-auto">
          <span>Your Coins:</span>
          <span className="text-amber-400 font-black flex items-center space-x-1">
            <Coins className="w-3.5 h-3.5 fill-amber-400" />
            <span>{userCoins}</span>
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mt-3 text-xs text-sky-300 bg-sky-950/50 border border-sky-800/50 px-3 py-1.5 rounded-lg text-center animate-in fade-in duration-200">
          {feedbackMsg}
        </div>
      )}
    </div>
  );
};
