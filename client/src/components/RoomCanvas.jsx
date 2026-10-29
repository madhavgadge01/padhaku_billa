import React from 'react';
import { RenderAvatar } from './VectorAvatars.jsx';
import { VectorPet } from './VectorPets.jsx';
import { VectorRealEstate, VectorVehicle } from './VectorCosmetics.jsx';
import { Flame, Sparkles, Shield, Heart, Cookie } from 'lucide-react';

export const RoomCanvas = ({ user, pet, onOpenPetModal, onOpenShop }) => {
  const selectedAvatar = user?.selectedAvatar || 'cat';
  const equippedApparel = user?.inventory?.equippedApparel || 'basic_clothes';
  const equippedVehicle = user?.inventory?.equippedVehicle || 'bicycle';
  const equippedRealEstate = user?.inventory?.equippedRealEstate || 'cozy_room';
  const globalStreak = user?.streaks?.currentGlobalStreak || 0;
  const isBusinessman = selectedAvatar === 'businessman';

  const estateTitles = {
    cozy_room: 'Cozy Minimalist Room',
    apartment: 'Metropolis Skyline Studio',
    villa: 'Oceanfront Sunset Sanctuary',
    mansion: 'Futuristic Command Mansion',
  };

  const vehicleTitles = {
    bicycle: 'Eco Commuter Bicycle',
    hatchback: 'Urban Turbo Hatchback',
    sedan: 'Executive Luxury Sedan',
    supercar: 'Apex Cyber Hypercar',
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900 group">
      {/* Real Estate Environment Canvas Backdrop */}
      <div className="w-full h-80 sm:h-96 relative">
        <VectorRealEstate estateId={equippedRealEstate} className="w-full h-full" />

        {/* Ambient Top Overlay with Room Info */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              {estateTitles[equippedRealEstate] || 'RPG Room'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isBusinessman ? (
              <div className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 px-3 py-1 rounded-full text-xs font-extrabold shadow-lg animate-pulse">
               
                <span>365-Day Businessman</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/50 text-amber-400 text-xs font-bold shadow">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Streak: {globalStreak} Days</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Showcase Spot (Left-Center) */}
        <div
          onClick={onOpenShop}
          title={`Equipped Vehicle: ${vehicleTitles[equippedVehicle] || 'Vehicle'}. Click to customize in shop.`}
          className="absolute bottom-6 left-6 sm:left-10 cursor-pointer transform hover:scale-105 transition-all duration-300 group-hover:drop-shadow-[0_10px_20px_rgba(56,189,248,0.3)]"
        >
          <div className="relative">
            <VectorVehicle vehicleId={equippedVehicle} className="w-28 sm:w-36 h-16 sm:h-20" />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition text-[10px] bg-slate-900/90 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/40 whitespace-nowrap">
              {vehicleTitles[equippedVehicle]}
            </span>
          </div>
        </div>

        {/* Active 3D-Styled Avatar (Center Stage) */}
        <div
          onClick={onOpenShop}
          title={`Active Avatar: ${selectedAvatar}. Equipped Outfit: ${equippedApparel}. Click to open shop.`}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 cursor-pointer transform hover:scale-105 transition-all duration-300 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]"
        >
          <RenderAvatar avatarId={selectedAvatar} apparel={equippedApparel} className="w-44 sm:w-52 h-52 sm:h-60" />
        </div>

        {/* Tamagotchi Pet Companion (Right Stage) */}
        <div
          onClick={onOpenPetModal}
          title={`Pet: ${pet?.name || 'Companion'}. Health: ${pet?.health || 100}%. Hunger: ${pet?.hunger || 100}%. Click for Pet Care.`}
          className="absolute bottom-6 right-6 sm:right-12 cursor-pointer transform hover:scale-110 transition-all duration-300"
        >
          <div className="relative flex flex-col items-center">
            <VectorPet
              type={pet?.type || 'cyber-pup'}
              health={pet?.health || 100}
              hunger={pet?.hunger || 100}
              isAlive={pet?.isAlive !== false}
              className="w-20 sm:w-24 h-20 sm:h-24"
            />
            {/* Quick mini-status */}
            <div className="mt-1 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur px-2 py-0.5 rounded-full border border-slate-700 text-[10px] font-semibold text-slate-300">
              <Heart className={`w-3 h-3 ${pet?.health > 30 ? 'text-rose-500 fill-rose-500' : 'text-rose-400'}`} />
              <span>{pet?.health ?? 100}%</span>
              <Cookie className="w-3 h-3 text-amber-500 fill-amber-500 ml-1" />
              <span>{pet?.hunger ?? 100}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
