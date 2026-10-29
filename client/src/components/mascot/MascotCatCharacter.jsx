import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../audio/soundEffects.js';

/**
 * Resolve asset URL relative to Vite base
 */
const getAssetUrl = (fileName) => {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  return `${cleanBase}${cleanName}`;
};

/**
 * MascotCatCharacter
 * Pure Cinematic Mascot Video Component using approved MP4 video assets.
 * 
 * Video Assets:
 * - cat_brash.mp4: Website entry & default idle loop
 * - cat_eat.mp4: Feeding animation (plays once, then returns to idle)
 * - cat_water.mp4: Drinking water animation (plays once, then returns to idle)
 * - cat_study.mp4: Focus/study session animation (loops while session active)
 */
export const MascotCatCharacter = ({
  actionState = 'idle', // 'idle' | 'eating' | 'drinking' | 'sleeping' | 'studying' | 'happy'
  _actionProgress = 0,
  accessory: _accessory = 'none',
  previewAccessory: _previewAccessory = null,
  equippedHat: _equippedHat = 'none',
  equippedGlasses: _equippedGlasses = 'none',
  equippedNeckwear: _equippedNeckwear = 'none',
  _equippedOutfit = 'none',
  customOffsets: _customOffsets = {},
  health = 100,
  _hunger = 100,
  _thirst = 100,
  onPetClick = null,
  onActionComplete = null,
  className = 'w-full h-80 sm:h-96',
  _allowVideoToggle = false,
  onOpenTuner: _onOpenTuner = null,
}) => {
  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [completedOneShot, setCompletedOneShot] = useState(null);

  const isAlive = health > 0;

  // Resolve target action with proper priority:
  // studying while timer running > eating while feeding > drinking while water > idle
  const activeAction = (() => {
    if (actionState === 'studying') return 'studying';
    if (actionState === 'eating' && completedOneShot !== 'eating') return 'eating';
    if (actionState === 'drinking' && completedOneShot !== 'drinking') return 'drinking';
    return 'idle';
  })();

  // Reset completedOneShot tracker when actionState changes
  useEffect(() => {
    if (completedOneShot && actionState !== completedOneShot) {
      setCompletedOneShot(null);
    }
  }, [actionState, completedOneShot]);

  // Video source selector
  const getVideoSrc = (action) => {
    switch (action) {
      case 'studying':
        return getAssetUrl('cat_study.mp4');
      case 'eating':
        return getAssetUrl('cat_eat.mp4');
      case 'drinking':
        return getAssetUrl('cat_water.mp4');
      case 'idle':
      default:
        return getAssetUrl('cat_brash.mp4');
    }
  };

  const isLooping = activeAction === 'idle' || activeAction === 'studying';
  const currentSrc = getVideoSrc(activeAction);

  // Manage video playback transitions without remounting the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = true; // Required for reliable autoplay policy
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Handle browser autoplay policy restrictions gracefully
        console.warn('Video playback notice (autoplay policy or interruption):', err.message);
      });
    }
  }, [activeAction, currentSrc]);

  // Pause video if pet is dead/fainted (resting state fallback)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isAlive) {
      video.pause();
    } else if (video.paused && (activeAction === 'idle' || activeAction === 'studying')) {
      video.play().catch(() => {});
    }
  }, [isAlive, activeAction]);

  // Handle one-time video completion (eating / drinking)
  const handleVideoEnded = () => {
    if (activeAction === 'eating' || activeAction === 'drinking') {
      setCompletedOneShot(activeAction);
      if (onActionComplete) {
        onActionComplete();
      }
    }
  };

  // Fallback if cat_water fails (e.g. if environment uses cat_drink.mp4)
  const handleVideoError = () => {
    const video = videoRef.current;
    if (video && activeAction === 'drinking' && !video.src.includes('cat_drink.mp4')) {
      video.src = getAssetUrl('cat_drink.mp4');
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  };

  // Handle clicking / cuddling the cat
  const handleCharacterClick = () => {
    sounds.playPetCuddle();
    if (onPetClick) onPetClick();
  };

  return (
    <div
      className={`relative select-none flex items-center justify-center overflow-hidden rounded-2xl ${className}`}
      onClick={handleCharacterClick}
    >
      {/* Graceful loading placeholder */}
      {!videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100/50 dark:bg-stone-900/50 animate-pulse pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        </div>
      )}

      {/* Main Single Video Element (Muted, Inline, AutoPlay, Object-Contain, No Controls) */}
      <video
        ref={videoRef}
        src={currentSrc}
        autoPlay
        loop={isLooping}
        muted
        playsInline
        controls={false}
        onLoadedData={() => setVideoLoaded(true)}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        } ${!isAlive ? 'filter grayscale contrast-75 opacity-60' : ''}`}
      />

      {/* Bottom-Left Quick Mood & State Badge */}
      <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-stone-800/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center space-x-1 shadow-sm pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="capitalize">{activeAction}</span>
        {activeAction === 'eating' && <span>🥣</span>}
        {activeAction === 'drinking' && <span>💧</span>}
        {activeAction === 'studying' && <span>📖</span>}
        {activeAction === 'idle' && <span>✨</span>}
      </div>
    </div>
  );
};
