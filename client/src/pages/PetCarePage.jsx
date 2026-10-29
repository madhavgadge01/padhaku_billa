import React, { useState } from 'react';
import {
  Heart,
  Cookie,
  Droplet,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Smile,
  Coins,
  Gift,
  RotateCw,
} from 'lucide-react';
import { Sparky3DScene } from '../components/Sparky3DScene.jsx';
import { sounds } from '../audio/soundEffects.js';
import { api } from '../services/api.js';

export const PetCarePage = ({
  user,
  pet,
  onPetUpdate,
  onNavigate,
  isRestDayToday = false,
}) => {
  const [petActionState, setPetActionState] = useState('idle');
  const [actionProgress, setActionProgress] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const userCoins = user?.coins || 0;
  const isAlive = pet?.isAlive !== false && (pet?.health ?? 100) > 0;

  // Feed action
  const handleFeed = async () => {
    if (loadingAction || petActionState === 'eating' || petActionState === 'drinking') return;

    if (userCoins < 2) {
      sounds.playPausePenalty();
      setFeedbackMsg('Need 2 focus coins to buy berry food.');
      return;
    }
    if (!isAlive) {
      sounds.playPausePenalty();
      setFeedbackMsg('Sparky has fainted! Please revive Sparky using the Revival Elixir.');
      return;
    }

    try {
      setLoadingAction(true);
      sounds.playFeedPet();
      setPetActionState('eating');
      setActionProgress(0.2);

      const interval = setInterval(() => {
        setActionProgress((p) => {
          if (p >= 1) {
            clearInterval(interval);
            return 1;
          }
          return p + 0.25;
        });
      }, 500);

      const res = await api.feedPet();
      if (res.success) {
        sounds.playHappyPurr();
        setFeedbackMsg('Sparky loved the berry meal! (+25 Hunger, +10 Vitality, +5 Affection).');
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
      }
    } catch (err) {
      setFeedbackMsg(err.message);
      setPetActionState('idle');
    } finally {
      setLoadingAction(false);
    }
  };

  // Water action
  const handleWater = async () => {
    if (loadingAction || petActionState === 'eating' || petActionState === 'drinking') return;

    if (userCoins < 1) {
      sounds.playPausePenalty();
      setFeedbackMsg('Need 1 focus coin for spring water.');
      return;
    }
    if (!isAlive) {
      sounds.playPausePenalty();
      setFeedbackMsg('Sparky has fainted! Please revive Sparky first.');
      return;
    }

    try {
      setLoadingAction(true);
      sounds.playWaterPet();
      setPetActionState('drinking');
      setActionProgress(0.2);

      const interval = setInterval(() => {
        setActionProgress((p) => {
          if (p >= 1) {
            clearInterval(interval);
            return 1;
          }
          return p + 0.25;
        });
      }, 500);

      const res = await api.waterPet();
      if (res.success) {
        sounds.playHappyPurr();
        setFeedbackMsg('Refreshing! Sparky drank pure spring water (+15 Hydration, +5 Vitality, +2 Affection).');
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
      }
    } catch (err) {
      setFeedbackMsg(err.message);
      setPetActionState('idle');
    } finally {
      setLoadingAction(false);
    }
  };

  // Pet / Cuddle action (Free)
  const handlePetCuddle = async () => {
    if (!isAlive) {
      sounds.playPausePenalty();
      setFeedbackMsg('Sparky has fainted! Please revive Sparky first.');
      return;
    }

    sounds.playHappyPurr();
    setPetActionState('happy');
    setFeedbackMsg('Sparky leaned into your hand with happy chirps! (+6 Affection)');

    try {
      const res = await api.playWithPet();
      if (res.success && onPetUpdate) {
        onPetUpdate(res.pet, res.coins);
      }
    } catch (e) {}

    setTimeout(() => {
      setPetActionState('idle');
    }, 1800);
  };

  // Revive action
  const handleRevive = async () => {
    if (userCoins < 10) {
      sounds.playPausePenalty();
      setFeedbackMsg('Revival Elixir costs 10 coins. Earn coins by completing focus tasks!');
      return;
    }

    try {
      setLoadingAction(true);
      sounds.playRevivePet();
      const res = await api.revivePet();
      if (res.success) {
        setFeedbackMsg('Miracle! Sparky opened his eyes and bounced back to life!');
        setPetActionState('happy');
        if (onPetUpdate) onPetUpdate(res.pet, res.coins);
        setTimeout(() => {
          setPetActionState('idle');
        }, 2500);
      }
    } catch (err) {
      setFeedbackMsg(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const equippedAccessory = user?.inventory?.equippedAccessory || 'none';
  const equippedHat = user?.inventory?.equippedHat || 'none';
  const equippedGlasses = user?.inventory?.equippedGlasses || 'none';
  const equippedNeckwear = user?.inventory?.equippedNeckwear || 'none';
  const equippedOutfit = user?.inventory?.equippedOutfit || 'none';
  const equippedHabitat = user?.inventory?.equippedHabitat || 'forest_meadow';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
            Sparky's Sanctuary
          </h2>
          <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium mt-0.5">
            Your faithful 2D mascot companion. Keep Sparky nourished, loved, and energized.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onNavigate('rewards');
          }}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-[#FAF8F5] dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] hover:bg-[#EAE5DD] transition cursor-pointer self-start sm:self-auto"
        >
          <Gift className="w-4 h-4 text-[#D97724]" />
          <span>Customize Mascot Wardrobe</span>
        </button>
      </div>

      {/* Main Interactive Playground */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 shadow-sm overflow-hidden">
        {/* Rest Day Immunity Banner */}
        {isRestDayToday && (
          <div className="mb-4 bg-[#E8F5EE] dark:bg-[#162420] border border-[#C8E6D5] dark:border-[#2B5246] rounded-2xl p-3 flex items-center space-x-2.5 text-xs text-[#1B3B2F] dark:text-[#A3D9C9]">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Rest Day Shield:</strong> 0% Hunger and Vitality degradation today. Sparky is safe!
            </span>
          </div>
        )}

        {/* Live Animation State Selector Pills */}
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Live Animation State:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'idle', label: 'Idle' },
              { id: 'eating', label: 'Eating 🥣' },
              { id: 'drinking', label: 'Drinking 💧' },
              { id: 'sleeping', label: 'Sleeping 💤' },
              { id: 'studying', label: 'Studying 📖' },
              { id: 'happy', label: 'Happy ❤️' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  sounds.playClick();
                  setPetActionState(st.id);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  petActionState === st.id
                    ? 'bg-[#1B3B2F] text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mascot Canvas Box */}
        <div className="rounded-3xl bg-gradient-to-b from-[#F4EFEB]/60 to-[#FAF8F5] dark:from-[#1C2E29]/40 dark:to-[#162420] border border-[#EAE5DD]/60 dark:border-[#253D35]/60 overflow-hidden relative">
          <Sparky3DScene
            actionState={petActionState}
            actionProgress={actionProgress}
            accessory={equippedAccessory}
            equippedHat={equippedHat}
            equippedGlasses={equippedGlasses}
            equippedNeckwear={equippedNeckwear}
            equippedOutfit={equippedOutfit}
            habitat={equippedHabitat}
            health={pet?.health ?? 100}
            hunger={pet?.hunger ?? 100}
            thirst={pet?.thirst ?? 100}
            onPetClick={handlePetCuddle}
            onActionComplete={() => setPetActionState('idle')}
            className="w-full h-80 sm:h-96"
          />

          {/* Sparky's Mood Pill */}
          <div className="absolute top-4 left-4 bg-white/95 dark:bg-[#1C2E29]/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-sm border border-[#EAE5DD] dark:border-[#2B5246] text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4] flex items-center space-x-2">
            <Smile className="w-4 h-4 text-[#D97724]" />
            <span>
              {!isAlive
                ? 'Fainted from neglect! Revive with Elixir.'
                : petActionState === 'eating'
                ? 'Nom nom nom! Crunching delicious meal! 🥣'
                : petActionState === 'drinking'
                ? 'Gulp gulp! Crisp spring water! 💧'
                : petActionState === 'sleeping'
                ? 'Zzz... Resting peacefully... 💤'
                : petActionState === 'studying'
                ? 'Deep focus with open books and warm lamp! 📖'
                : petActionState === 'happy'
                ? 'Purring cheerfully, loving the cuddles! ❤️'
                : (pet?.hunger ?? 100) < 30
                ? 'A little hungry for a snack.'
                : 'Feeling happy, cozy, and loved.'}
            </span>
          </div>
        </div>

        {/* Fainted Neglect Notice */}
        {!isAlive && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start space-x-3 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold">Sparky Has Fainted!</strong>
              <p className="mt-0.5 leading-relaxed">
                When health drops to 0, Sparky falls into a deep faint and all Emporium shop trading is locked until you revive Sparky.
              </p>
            </div>
          </div>
        )}

        {/* Interactive Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {!isAlive ? (
            <button
              onClick={handleRevive}
              disabled={loadingAction || userCoins < 10}
              className="col-span-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>REVIVE SPARKY (10 COINS)</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleFeed}
                disabled={loadingAction || userCoins < 2}
                className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] hover:bg-[#E8F5EE] transition text-left cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <Cookie className="w-4 h-4 text-[#D97724]" />
                  <span className="text-[10px] font-bold text-[#D97724] bg-[#FEF3C7] dark:bg-[#2A2012] px-2 py-0.5 rounded-full">
                    2 Coins
                  </span>
                </div>
                <div className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">Feed Meal</div>
                <div className="text-[10px] text-[#576560] dark:text-[#8BA398]">+25 Hunger</div>
              </button>

              <button
                onClick={handleWater}
                disabled={loadingAction || userCoins < 1}
                className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] hover:bg-[#E8F5EE] transition text-left cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <Droplet className="w-4 h-4 text-[#38bdf8]" />
                  <span className="text-[10px] font-bold text-[#38bdf8] bg-[#E0F2FE] dark:bg-[#082F49] px-2 py-0.5 rounded-full">
                    1 Coin
                  </span>
                </div>
                <div className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">Give Water</div>
                <div className="text-[10px] text-[#576560] dark:text-[#8BA398]">+15 Hydration</div>
              </button>

              <button
                onClick={handlePetCuddle}
                disabled={loadingAction}
                className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] hover:bg-[#E8F5EE] transition text-left cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <Heart className="w-4 h-4 text-[#f43f5e]" />
                  <span className="text-[10px] font-bold text-[#f43f5e] bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                    Free
                  </span>
                </div>
                <div className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">Pet & Cuddle</div>
                <div className="text-[10px] text-[#576560] dark:text-[#8BA398]">+6 Affection</div>
              </button>

              <button
                onClick={() => {
                  sounds.playHappyPurr();
                  setPetActionState('happy');
                  setTimeout(() => setPetActionState('idle'), 1800);
                }}
                className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246] hover:bg-[#E8F5EE] transition text-left cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <Sparkles className="w-4 h-4 text-[#a855f7]" />
                  <span className="text-[10px] font-bold text-[#a855f7] bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full">
                    Action
                  </span>
                </div>
                <div className="text-xs font-bold text-[#1C2A24] dark:text-[#F2F7F4]">Play Tag</div>
                <div className="text-[10px] text-[#576560] dark:text-[#8BA398]">Joyful Hop</div>
              </button>
            </>
          )}
        </div>

        {feedbackMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-[#E8F5EE] dark:bg-[#1C2E29] text-[#1B3B2F] dark:text-[#A3D9C9] border border-[#C8E6D5] dark:border-[#2B5246] text-xs text-center font-medium">
            {feedbackMsg}
          </div>
        )}
      </div>

      {/* Needs Breakdown Meters */}
      <div className="bg-white dark:bg-[#162420] rounded-3xl border border-[#EAE5DD] dark:border-[#253D35] p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-[#1C2A24] dark:text-[#F2F7F4] tracking-tight">
          Sparky's Vital Needs
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Vitality / Health */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246]">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center space-x-1.5 text-[#E06D53]">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Vitality</span>
              </span>
              <span>{pet?.health ?? 100}%</span>
            </div>
            <div className="w-full bg-[#EAE5DD] dark:bg-[#253D35] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#E06D53] h-full rounded-full transition-all duration-500"
                style={{ width: `${pet?.health ?? 100}%` }}
              ></div>
            </div>
          </div>

          {/* Hunger */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246]">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center space-x-1.5 text-[#D97724] dark:text-[#F59E0B]">
                <Cookie className="w-3.5 h-3.5 fill-current" />
                <span>Nourishment</span>
              </span>
              <span>{pet?.hunger ?? 100}%</span>
            </div>
            <div className="w-full bg-[#EAE5DD] dark:bg-[#253D35] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#D97724] h-full rounded-full transition-all duration-500"
                style={{ width: `${pet?.hunger ?? 100}%` }}
              ></div>
            </div>
          </div>

          {/* Hydration / Thirst */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246]">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center space-x-1.5 text-[#0284c7]">
                <Droplet className="w-3.5 h-3.5 fill-current" />
                <span>Hydration</span>
              </span>
              <span>{pet?.thirst ?? 100}%</span>
            </div>
            <div className="w-full bg-[#EAE5DD] dark:bg-[#253D35] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                style={{ width: `${pet?.thirst ?? 100}%` }}
              ></div>
            </div>
          </div>

          {/* Affection */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C2E29] border border-[#EAE5DD] dark:border-[#2B5246]">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center space-x-1.5 text-[#2B5A52] dark:text-[#A3D9C9]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Affection</span>
              </span>
              <span>{pet?.affection ?? 60}%</span>
            </div>
            <div className="w-full bg-[#EAE5DD] dark:bg-[#253D35] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#2B5A52] dark:bg-[#A3D9C9] h-full rounded-full transition-all duration-500"
                style={{ width: `${pet?.affection ?? 60}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
