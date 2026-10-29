import React, { useState } from 'react';
import { X, RotateCcw, Check, Sparkles, Sliders, Eye } from 'lucide-react';
import { ACCESSORY_REGISTRY, getAccessoryTransform } from './accessoryRegistry.js';
import { MascotCatCharacter } from './MascotCatCharacter.jsx';
import { sounds } from '../../audio/soundEffects.js';

export const AccessoryTunerModal = ({
  isOpen,
  onClose,
  equippedHat = 'none',
  equippedGlasses = 'none',
  equippedNeckwear = 'none',
  equippedOutfit = 'none',
  customOffsets = {},
  onSaveOffsets = () => {},
}) => {
  // Active accessory being tuned
  const activeAccessories = [
    { slot: 'hat', id: equippedHat, label: 'Hat' },
    { slot: 'glasses', id: equippedGlasses, label: 'Glasses' },
    { slot: 'neckwear', id: equippedNeckwear, label: 'Neckwear / Bow' },
    { slot: 'outfit', id: equippedOutfit, label: 'Outfit' },
  ].filter((a) => a.id && a.id !== 'none');

  const [selectedAccId, setSelectedAccId] = useState(
    activeAccessories.length > 0 ? activeAccessories[0].id : 'wizard_hat'
  );

  const [testState, setTestState] = useState('idle');
  const [localOffsets, setLocalOffsets] = useState(customOffsets);

  if (!isOpen) return null;

  const curItem = ACCESSORY_REGISTRY[selectedAccId] || ACCESSORY_REGISTRY['wizard_hat'];
  const curOffsets = localOffsets[selectedAccId] || { x: 0, y: 0, scale: 1, rotation: 0 };

  const handleChange = (key, value) => {
    setLocalOffsets((prev) => ({
      ...prev,
      [selectedAccId]: {
        ...(prev[selectedAccId] || { x: 0, y: 0, scale: 1, rotation: 0 }),
        [key]: parseFloat(value),
      },
    }));
  };

  const handleReset = () => {
    sounds.playClick();
    setLocalOffsets((prev) => {
      const next = { ...prev };
      delete next[selectedAccId];
      return next;
    });
  };

  const handleSave = () => {
    sounds.playCoinSound();
    onSaveOffsets(localOffsets);
    localStorage.setItem('mascot_accessory_offsets', JSON.stringify(localOffsets));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Live Mascot Preview */}
        <div className="w-full md:w-1/2 flex flex-col items-center">
          <div className="w-full h-64 sm:h-72 bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-800/50 dark:to-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 relative overflow-hidden flex items-center justify-center">
            <MascotCatCharacter
              actionState={testState}
              equippedHat={selectedAccId in ACCESSORY_REGISTRY && ACCESSORY_REGISTRY[selectedAccId].slot === 'hat' ? selectedAccId : equippedHat}
              equippedGlasses={selectedAccId in ACCESSORY_REGISTRY && ACCESSORY_REGISTRY[selectedAccId].slot === 'glasses' ? selectedAccId : equippedGlasses}
              equippedNeckwear={selectedAccId in ACCESSORY_REGISTRY && ACCESSORY_REGISTRY[selectedAccId].slot === 'neckwear' ? selectedAccId : equippedNeckwear}
              equippedOutfit={selectedAccId in ACCESSORY_REGISTRY && ACCESSORY_REGISTRY[selectedAccId].slot === 'outfit' ? selectedAccId : equippedOutfit}
              customOffsets={localOffsets}
              className="w-full h-full"
              allowVideoToggle={false}
            />
          </div>

          {/* Test Animation States Toggle */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 w-full">
            {['idle', 'eating', 'drinking', 'sleeping', 'studying', 'happy'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  sounds.playClick();
                  setTestState(st);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize transition ${
                  testState === st
                    ? 'bg-[#1B3B2F] text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Adjustment Sliders */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>Modular Alignment Tuner</span>
            </div>
            <h3 className="text-lg font-black text-stone-900 dark:text-white mt-0.5">
              {curItem?.name || 'Accessory'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Anchor: <strong className="text-stone-800 dark:text-stone-200">{curItem?.attachmentPoint}</strong>
            </p>
          </div>

          {/* Accessory Selector Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(ACCESSORY_REGISTRY)
              .filter((id) => id !== 'none')
              .map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedAccId(id);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    selectedAccId === id
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {ACCESSORY_REGISTRY[id].name.split(' ')[0]}
                </button>
              ))}
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-2 text-xs">
            {/* Horizontal Position X */}
            <div>
              <div className="flex justify-between font-bold mb-1 text-stone-700 dark:text-stone-300">
                <span>Horizontal Offset (X)</span>
                <span className="font-mono">{curOffsets.x ?? 0}px</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="1"
                value={curOffsets.x ?? 0}
                onChange={(e) => handleChange('x', e.target.value)}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Vertical Position Y */}
            <div>
              <div className="flex justify-between font-bold mb-1 text-stone-700 dark:text-stone-300">
                <span>Vertical Offset (Y)</span>
                <span className="font-mono">{curOffsets.y ?? 0}px</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="1"
                value={curOffsets.y ?? 0}
                onChange={(e) => handleChange('y', e.target.value)}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Scale */}
            <div>
              <div className="flex justify-between font-bold mb-1 text-stone-700 dark:text-stone-300">
                <span>Scale Multiplier</span>
                <span className="font-mono">{(curOffsets.scale ?? 1).toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.02"
                value={curOffsets.scale ?? 1}
                onChange={(e) => handleChange('scale', e.target.value)}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between font-bold mb-1 text-stone-700 dark:text-stone-300">
                <span>Rotation Angle</span>
                <span className="font-mono">{curOffsets.rotation ?? 0}°</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={curOffsets.rotation ?? 0}
                onChange={(e) => handleChange('rotation', e.target.value)}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Calibrated</span>
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-bold shadow transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
