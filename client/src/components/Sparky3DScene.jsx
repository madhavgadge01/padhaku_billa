import React from 'react';
import { MascotCatCharacter } from './mascot/MascotCatCharacter.jsx';
import { Sparkles, Heart } from 'lucide-react';

/**
 * PetDisplay2D (formerly Sparky3DScene)
 * 100% Pure 2D Virtual Mascot Component.
 * Powered by high-fidelity layered vector art & approved cinematic animation video engine.
 * Completely eliminates Three.js, WebGL, 3D Canvas, and heavy GLB models.
 */
export const PetDisplay2D = ({
  actionState = 'idle', // 'idle' | 'eating' | 'drinking' | 'sleeping' | 'studying' | 'happy'
  accessory = 'none',
  previewAccessory = null,
  equippedHat = 'none',
  equippedGlasses = 'none',
  equippedNeckwear = 'none',
  equippedOutfit = 'none',
  customOffsets = {},
  habitat = 'forest_meadow',
  health = 100,
  hunger = 100,
  thirst = 100,
  onPetClick,
  onActionComplete = null,
  actionProgress = 0,
  className = 'w-full h-80 sm:h-96',
  allowVideoToggle = true,
  onOpenTuner = null,
}) => {
  // Active accessory resolution (prioritize live Emporium preview if available)
  const activeAccessory = previewAccessory !== null ? previewAccessory : accessory;

  // 2D Ambient Habitat Backdrop styles
  const getHabitatBackdrop = () => {
    switch (habitat) {
      case 'cozy_room':
        return 'from-amber-50/80 via-orange-50/40 to-stone-100/60 dark:from-stone-900/80 dark:via-stone-900/60 dark:to-stone-950/80';
      case 'high_rise':
        return 'from-sky-50/80 via-indigo-50/40 to-slate-100/60 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/80';
      case 'ocean_villa':
        return 'from-cyan-50/80 via-teal-50/40 to-emerald-50/60 dark:from-teal-950/80 dark:via-cyan-950/60 dark:to-slate-950/80';
      case 'forest_meadow':
      default:
        return 'from-emerald-50/70 via-teal-50/40 to-[#FAF8F5] dark:from-[#142620]/80 dark:via-[#162B24]/50 dark:to-[#0F1A16]';
    }
  };

  return (
    <div
      className={`relative ${className} select-none overflow-hidden rounded-2xl bg-gradient-to-b ${getHabitatBackdrop()} transition-colors duration-300`}
    >
      {/* Decorative Subtle 2D Room/Habitat Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {habitat === 'forest_meadow' && (
          <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
            <circle cx="40" cy="80" r="60" fill="#10B981" fillOpacity="0.08" />
            <circle cx="360" cy="110" r="80" fill="#059669" fillOpacity="0.06" />
            <ellipse cx="200" cy="285" rx="190" ry="25" fill="#047857" fillOpacity="0.08" />
          </svg>
        )}
        {habitat === 'ocean_villa' && (
          <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
            <circle cx="80" cy="60" r="45" fill="#38BDF8" fillOpacity="0.09" />
            <circle cx="320" cy="90" r="70" fill="#0EA5E9" fillOpacity="0.07" />
            <ellipse cx="200" cy="285" rx="190" ry="25" fill="#0284C7" fillOpacity="0.08" />
          </svg>
        )}
      </div>

      {/* Primary Approved 2D Cartoon Mascot Character Rig & Video */}
      <MascotCatCharacter
        actionState={actionState}
        actionProgress={actionProgress}
        accessory={activeAccessory}
        previewAccessory={previewAccessory}
        equippedHat={equippedHat}
        equippedGlasses={equippedGlasses}
        equippedNeckwear={equippedNeckwear}
        equippedOutfit={equippedOutfit}
        customOffsets={customOffsets}
        health={health}
        hunger={hunger}
        thirst={thirst}
        onPetClick={onPetClick}
        onActionComplete={onActionComplete}
        className="w-full h-full"
        allowVideoToggle={allowVideoToggle}
        onOpenTuner={onOpenTuner}
      />
    </div>
  );
};

// Backward-compatible alias export so all existing imports throughout the app continue working seamlessly
export const Sparky3DScene = PetDisplay2D;
export default PetDisplay2D;
