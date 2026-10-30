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

// Module-level preloader for primary and priority videos to maximize playback speed
if (typeof window !== 'undefined') {
  const preloadVideoAsset = (fileName) => {
    try {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.src = getAssetUrl(fileName);
      v.load();
    } catch (e) {}
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      preloadVideoAsset('cat_waiting.mp4');
      preloadVideoAsset('cat_hungary.mp4');
    });
  } else {
    setTimeout(() => {
      preloadVideoAsset('cat_waiting.mp4');
      preloadVideoAsset('cat_hungary.mp4');
    }, 400);
  }
}

/**
 * MascotCatCharacter
 * Pure Cinematic Mascot Video Component using approved MP4 video assets.
 * 
 * Video Behaviors:
 * - cat_waiting.mp4: Primary default video (loops when no special state active)
 * - cat_brash.mp4: Occasional brushing animation (plays once at random intervals, then returns to waiting)
 * - cat_hungary.mp4: Priority video when hunger OR thirst < 20% (loops until fed/hydrated)
 * - cat_eat.mp4: Feeding animation (plays once when fed, then returns to appropriate state)
 * - cat_water.mp4: Drinking animation (plays once when watered, then returns to appropriate state)
 * - cat_study.mp4: Focus/study session animation (loops while session active)
 */
export const MascotCatCharacter = ({
  actionState = 'idle', // 'idle' | 'eating' | 'drinking' | 'sleeping' | 'studying' | 'happy'
  actionProgress: _actionProgress = 0,
  accessory: _accessory = 'none',
  previewAccessory: _previewAccessory = null,
  equippedHat: _equippedHat = 'none',
  equippedGlasses: _equippedGlasses = 'none',
  equippedNeckwear: _equippedNeckwear = 'none',
  equippedOutfit: _equippedOutfit = 'none',
  customOffsets: _customOffsets = {},
  health = 100,
  hunger = 100,
  thirst = 100,
  onPetClick = null,
  onActionComplete = null,
  className = 'w-full h-80 sm:h-96',
  allowVideoToggle: _allowVideoToggle = false,
  onOpenTuner: _onOpenTuner = null,
}) => {
  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [completedOneShot, setCompletedOneShot] = useState(null);
  const [isBrushingEpisode, setIsBrushingEpisode] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  const isAlive = health > 0;
  const isHungryOrThirsty =
    (typeof hunger === 'number' && hunger < 20) ||
    (typeof thirst === 'number' && thirst < 20);

  // Resolve target action with strict priority:
  // 1. One-shot active eating/drinking (when user feeds/waters)
  // 2. Hungry / Thirsty state (< 20%) -> cat_hungary.mp4 (highest priority over normal/random videos)
  // 3. Studying state during active focus sessions -> cat_study.mp4
  // 4. Occasional random brushing episode -> cat_brash.mp4
  // 5. Default primary idle state -> cat_waiting.mp4
  const activeAction = (() => {
    if (actionState === 'eating' && completedOneShot !== 'eating') return 'eating';
    if (actionState === 'drinking' && completedOneShot !== 'drinking') return 'drinking';

    if (isHungryOrThirsty) {
      return 'hungry';
    }

    if (actionState === 'studying') {
      return 'studying';
    }

    if (isBrushingEpisode) {
      return 'brushing';
    }

    return 'waiting';
  })();

  // Reset completedOneShot tracker when actionState changes
  useEffect(() => {
    if (completedOneShot && actionState !== completedOneShot) {
      setCompletedOneShot(null);
    }
  }, [actionState, completedOneShot]);

  // Occasional Brushing Video Trigger (Random Interval: 60s - 120s)
  useEffect(() => {
    // If hungry, studying, eating, or drinking, cancel any brushing episode
    if (isHungryOrThirsty || actionState === 'studying' || actionState === 'eating' || actionState === 'drinking') {
      if (isBrushingEpisode) setIsBrushingEpisode(false);
      return;
    }

    // Only schedule occasional brushing during normal waiting idle state
    const minDelay = 60000;  // 60 seconds
    const maxDelay = 120000; // 120 seconds
    const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    const timer = setTimeout(() => {
      setIsBrushingEpisode(true);
    }, randomDelay);

    return () => clearTimeout(timer);
  }, [isHungryOrThirsty, actionState, isBrushingEpisode]);

  // Video source selector
  const getVideoSrc = (action) => {
    switch (action) {
      case 'hungry':
        return getAssetUrl('cat_hungary.mp4');
      case 'studying':
        return getAssetUrl('cat_study.mp4');
      case 'eating':
        return getAssetUrl('cat_eat.mp4');
      case 'drinking':
        return getAssetUrl('cat_water.mp4');
      case 'brushing':
        return getAssetUrl('cat_brash.mp4');
      case 'waiting':
      default:
        return getAssetUrl('cat_waiting.mp4');
    }
  };

  const isLooping = activeAction === 'waiting' || activeAction === 'hungry' || activeAction === 'studying';
  const currentSrc = getVideoSrc(activeAction);

  // Manage video playback transitions smoothly without remounting the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset error state on new source
    setHasVideoError(false);

    // If source actually changed, reset loading state
    if (video.src !== currentSrc && !video.src.endsWith(currentSrc)) {
      setVideoLoaded(false);
    }

    video.currentTime = 0;
    video.muted = true; // Required for reliable autoplay policy
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Video playback notice (autoplay policy or interruption):', err.message);
      });
    }
  }, [activeAction, currentSrc]);

  // Pause video if pet is dead/fainted
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isAlive) {
      video.pause();
    } else if (video.paused && (activeAction === 'waiting' || activeAction === 'hungry' || activeAction === 'studying')) {
      video.play().catch(() => {});
    }
  }, [isAlive, activeAction]);

  // Handle video completion
  const handleVideoEnded = () => {
    if (activeAction === 'eating' || activeAction === 'drinking') {
      setCompletedOneShot(activeAction);
      if (onActionComplete) {
        onActionComplete();
      }
    } else if (activeAction === 'brushing') {
      // Once brushing finishes, return smoothly to primary cat_waiting.mp4
      setIsBrushingEpisode(false);
    }
  };

  // Fallback if video fails to load
  const handleVideoError = () => {
    console.warn(`Video error loading: ${currentSrc}`);
    const video = videoRef.current;
    if (!video) return;

    if (activeAction === 'drinking' && !video.src.includes('cat_drink.mp4')) {
      video.src = getAssetUrl('cat_drink.mp4');
      video.currentTime = 0;
      video.play().catch(() => {});
      return;
    }

    // Fallback to cat_waiting.mp4 or cat_brash.mp4
    if (!video.src.includes('cat_waiting.mp4')) {
      video.src = getAssetUrl('cat_waiting.mp4');
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      setHasVideoError(true);
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
      {/* Funny English Loading Message with subtle animated indicator */}
      {(!videoLoaded || hasVideoError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#F6FAF7]/95 dark:bg-[#0A0F0D]/95 backdrop-blur-xs z-10 transition-opacity duration-300">
          <div className="text-4xl mb-3 animate-bounce">🚽🐱</div>
          <p className="text-sm font-black text-[#0D1F17] dark:text-[#F2F7F4] max-w-xs leading-relaxed">
            The cat has gone to the washroom! 🚽🐱
          </p>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-1 max-w-xs">
            Don't worry, it'll be back in a moment!
          </p>
          <div className="mt-4 flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Loading Mascot...</span>
          </div>
        </div>
      )}

      {/* Main Single Video Element (Muted, Inline, AutoPlay, Object-Contain, No Controls) */}
      <video
        ref={videoRef}
        src={currentSrc}
        preload="auto"
        autoPlay
        loop={isLooping}
        muted
        playsInline
        controls={false}
        onLoadedData={() => setVideoLoaded(true)}
        onCanPlay={() => setVideoLoaded(true)}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
          videoLoaded && !hasVideoError ? 'opacity-100' : 'opacity-0'
        } ${!isAlive ? 'filter grayscale contrast-75 opacity-60' : ''}`}
      />

      {/* Bottom-Left Quick Mood & State Badge */}
      <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-stone-800/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center space-x-1 shadow-sm pointer-events-none z-20">
        <span
          className={`w-2 h-2 rounded-full ${
            activeAction === 'hungry'
              ? 'bg-amber-500 animate-ping'
              : activeAction === 'studying'
              ? 'bg-emerald-500 animate-pulse'
              : 'bg-emerald-400'
          }`}
        />
        <span className="capitalize">{activeAction}</span>
        {activeAction === 'hungry' && <span>🍗</span>}
        {activeAction === 'eating' && <span>🥣</span>}
        {activeAction === 'drinking' && <span>💧</span>}
        {activeAction === 'studying' && <span>📖</span>}
        {activeAction === 'brushing' && <span>✨</span>}
        {activeAction === 'waiting' && <span>🐾</span>}
      </div>
    </div>
  );
};
