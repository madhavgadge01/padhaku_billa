import React from 'react';

export const VectorPet = ({
  type = 'cyber-pup',
  health = 100,
  hunger = 100,
  isAlive = true,
  className = 'w-24 h-24',
}) => {
  const isHungry = hunger <= 30;
  const isDead = !isAlive || health <= 0;

  return (
    <div className={`relative inline-block ${className} ${isDead ? 'opacity-80 grayscale' : 'pet-bouncing'}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pupGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="pandaGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="foxPetGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fb923c" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="catPetGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a855f7" />
            <stop offset="1" stopColor="#7e22ce" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="60" cy="108" rx="35" ry="6" fill="#000000" fillOpacity="0.25" />

        {/* --- PET BODY BY TYPE --- */}
        {type === 'robo-panda' ? (
          /* Robo-Panda */
          <g>
            <circle cx="36" cy="38" r="10" fill="#0f172a" />
            <circle cx="84" cy="38" r="10" fill="#0f172a" />
            <ellipse cx="60" cy="70" rx="32" ry="28" fill="url(#pandaGrad)" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="48" cy="62" r="8" fill="#0f172a" />
            <circle cx="72" cy="62" r="8" fill="#0f172a" />
            {/* Holographic Bamboo */}
            <path d="M26 65 L26 95" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
            <path d="M26 75 L18 70" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : type === 'pixel-fox' ? (
          /* Pixel Fox */
          <g>
            {/* Fluffy tail */}
            <path d="M85 80 C105 75 110 50 95 40 C85 45 80 65 85 80 Z" fill="url(#foxPetGrad)" />
            <polygon points="95,40 100,48 90,48" fill="#ffffff" />
            <polygon points="40,40 30,15 55,28" fill="url(#foxPetGrad)" stroke="#0f172a" strokeWidth="2" />
            <polygon points="80,40 90,15 65,28" fill="url(#foxPetGrad)" stroke="#0f172a" strokeWidth="2" />
            <ellipse cx="60" cy="68" rx="28" ry="24" fill="url(#foxPetGrad)" stroke="#0f172a" strokeWidth="2.5" />
            <polygon points="60,82 45,62 75,62" fill="#ffffff" />
          </g>
        ) : type === 'mecha-cat' ? (
          /* Mecha-Cat */
          <g>
            <polygon points="42,38 32,18 52,28" fill="url(#catPetGrad)" stroke="#0f172a" strokeWidth="2" />
            <polygon points="78,38 88,18 68,28" fill="url(#catPetGrad)" stroke="#0f172a" strokeWidth="2" />
            <ellipse cx="60" cy="68" rx="28" ry="24" fill="url(#catPetGrad)" stroke="#0f172a" strokeWidth="2.5" />
            {/* Whiskers */}
            <line x1="32" y1="68" x2="18" y2="66" stroke="#c084fc" strokeWidth="1.5" />
            <line x1="88" y1="68" x2="102" y2="66" stroke="#c084fc" strokeWidth="1.5" />
          </g>
        ) : (
          /* Orange Mascot Cat (Default & Living-Cat) */
          <g>
            {/* Fluffy Striped Tail on left */}
            <path d="M 38 85 C 20 78, 12 55, 18 35 C 24 32, 32 38, 28 48 C 24 62, 30 75, 42 80 Z" fill="#f97914" stroke="#2b1408" strokeWidth="2" />
            <path d="M 18 45 C 22 46, 26 44, 28 42" stroke="#d14f04" strokeWidth="2" fill="none" />
            <path d="M 22 60 C 26 62, 30 58, 32 56" stroke="#d14f04" strokeWidth="2" fill="none" />
            {/* Left Ear */}
            <polygon points="38,40 28,18 50,28" fill="#f97914" stroke="#2b1408" strokeWidth="2" />
            <polygon points="37,36 31,23 45,29" fill="#ac4844" />
            {/* Right Ear */}
            <polygon points="82,40 92,18 70,28" fill="#f97914" stroke="#2b1408" strokeWidth="2" />
            <polygon points="83,36 89,23 75,29" fill="#ac4844" />
            {/* Chubby Orange Head & Torso */}
            <ellipse cx="60" cy="70" rx="32" ry="28" fill="#f97914" stroke="#2b1408" strokeWidth="2.5" />
            {/* Forehead Stripes */}
            <path d="M 54 44 Q 60 48 66 44" stroke="#d14f04" strokeWidth="2" fill="none" />
            <path d="M 50 49 Q 60 54 70 49" stroke="#d14f04" strokeWidth="2" fill="none" />
            {/* Peach Belly & Muzzle Patch */}
            <ellipse cx="60" cy="77" rx="20" ry="16" fill="#fcd8b0" />
            {/* Pink Nose */}
            <polygon points="60,72 63,68 57,68" fill="#8a322e" />
            {/* Smug Smirk Mustache Line */}
            <path d="M 55 75 Q 58 77 60 75 Q 62 77 65 75" stroke="#2b1408" strokeWidth="1.5" fill="none" />
            {/* Whiskers */}
            <line x1="48" y1="72" x2="36" y2="70" stroke="#2b1408" strokeWidth="1.5" />
            <line x1="48" y1="75" x2="36" y2="77" stroke="#2b1408" strokeWidth="1.5" />
            <line x1="72" y1="72" x2="84" y2="70" stroke="#2b1408" strokeWidth="1.5" />
            <line x1="72" y1="75" x2="84" y2="77" stroke="#2b1408" strokeWidth="1.5" />
            {/* Front Paws */}
            <ellipse cx="50" cy="94" rx="7" ry="5" fill="#f97914" stroke="#2b1408" strokeWidth="1.5" />
            <ellipse cx="70" cy="94" rx="7" ry="5" fill="#f97914" stroke="#2b1408" strokeWidth="1.5" />
          </g>
        )}

        {/* --- EYES & EXPRESSION BY HEALTH/HUNGER STATE --- */}
        {isDead ? (
          /* Fainted: X_X Eyes & Halo */
          <g>
            <ellipse cx="60" cy="22" rx="16" ry="4" stroke="#fbbf24" strokeWidth="2" fill="none" />
            {/* Left X */}
            <line x1="44" y1="58" x2="54" y2="66" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="54" y1="58" x2="44" y2="66" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            {/* Right X */}
            <line x1="66" y1="58" x2="76" y2="66" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="76" y1="58" x2="66" y2="66" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            {/* Sad mouth */}
            <path d="M54 78 Q60 72 66 78" stroke="#0f172a" strokeWidth="2" fill="none" />
          </g>
        ) : isHungry ? (
          /* Hungry: Droopy eyes & sweat drop */
          <g>
            <ellipse cx="49" cy="62" rx="4" ry="3" fill="#0f172a" />
            <ellipse cx="71" cy="62" rx="4" ry="3" fill="#0f172a" />
            {/* Sweat Drop */}
            <path d="M85 52 C88 56 86 60 83 60 C80 60 78 56 83 50 Z" fill="#38bdf8" />
            <path d="M55 76 Q60 72 65 76" stroke="#0f172a" strokeWidth="2" fill="none" />
          </g>
        ) : (
          /* Happy / Content: Glowing cute digital eyes */
          <g>
            <ellipse cx="48" cy="62" rx="5" ry="6" fill="#0f172a" />
            <circle cx="50" cy="60" r="2" fill="#ffffff" />
            <ellipse cx="72" cy="62" rx="5" ry="6" fill="#0f172a" />
            <circle cx="74" cy="60" r="2" fill="#ffffff" />
            <ellipse cx="60" cy="70" rx="3" ry="2" fill="#0f172a" />
            <path d="M56 74 Q60 78 64 74" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Cheerful blush */}
            <circle cx="42" cy="70" r="3" fill="#f43f5e" fillOpacity="0.4" />
            <circle cx="78" cy="70" r="3" fill="#f43f5e" fillOpacity="0.4" />
          </g>
        )}
      </svg>

      {/* Floating Status Indicator */}
      {isDead && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow animate-pulse whitespace-nowrap">
          Fainted!
        </span>
      )}
      {!isDead && isHungry && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">
          Hungry!
        </span>
      )}
    </div>
  );
};
