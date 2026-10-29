import React from 'react';

/**
 * High-detail 3D-stylized vector avatars (Zero stock images)
 * Free Fire / RPG game aesthetic with lighting, gradients, and apparel layering
 */

export const AvatarCat = ({ apparel = 'basic_clothes', className = 'w-48 h-48', animated = true }) => (
  <svg
    viewBox="0 0 200 240"
    className={`${className} ${animated ? 'avatar-breathing' : ''}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="catBodyGrad" x1="50" y1="20" x2="150" y2="220" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="0.6" stopColor="#0284c7" />
        <stop offset="1" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="catVisorGrad" x1="60" y1="65" x2="140" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f43f5e" />
        <stop offset="1" stopColor="#fbbf24" />
      </linearGradient>
      <linearGradient id="neonGlow" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
        <stop stopColor="#06b6d4" stopOpacity="0.8" />
        <stop offset="1" stopColor="#3b82f6" stopOpacity="0.2" />
      </linearGradient>
      <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Shadow base */}
    <ellipse cx="100" cy="225" rx="55" ry="10" fill="#000000" fillOpacity="0.35" />

    {/* Cyber Katana Scabbard on Back */}
    <path d="M45 70 L30 180" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" />
    <path d="M45 70 L50 60" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />

    {/* Body / Torso */}
    <path
      d="M60 115 C55 170 65 210 100 215 C135 210 145 170 140 115 Z"
      fill="url(#catBodyGrad)"
      stroke="#0f172a"
      strokeWidth="3"
    />

    {/* Apparel Layering */}
    {apparel === 'luxury_suit' ? (
      <g>
        <path d="M68 120 L100 170 L132 120 L125 205 L75 205 Z" fill="#0f172a" stroke="#d97706" strokeWidth="2" />
        <path d="M100 120 L96 155 L104 155 Z" fill="#f59e0b" />
        <circle cx="100" cy="180" r="3" fill="#fbbf24" />
      </g>
    ) : apparel === 'casual_wear' ? (
      <g>
        <path d="M68 125 C68 170 75 205 100 205 C125 205 132 170 132 125 Z" fill="#475569" />
        <path d="M85 125 L100 155 L115 125 Z" fill="#06b6d4" />
      </g>
    ) : (
      /* Basic Gear */
      <path d="M78 135 L100 160 L122 135" stroke="#38bdf8" strokeWidth="3" fill="none" />
    )}

    {/* Arms */}
    <path d="M58 125 C45 150 48 180 62 195" stroke="#0284c7" strokeWidth="12" strokeLinecap="round" />
    <path d="M142 125 C155 150 152 180 138 195" stroke="#0284c7" strokeWidth="12" strokeLinecap="round" />

    {/* Tail */}
    <path
      d="M135 190 C165 190 180 160 175 140 C170 125 155 135 160 145"
      stroke="#38bdf8"
      strokeWidth="7"
      strokeLinecap="round"
      fill="none"
    />

    {/* Head */}
    <circle cx="100" cy="78" r="42" fill="url(#catBodyGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* Cat Ears with Neon Interior */}
    <path d="M66 52 L50 15 L82 38 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="2.5" />
    <path d="M68 45 L56 22 L79 38 Z" fill="#06b6d4" filter="url(#glowFilter)" />
    <path d="M134 52 L150 15 L118 38 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="2.5" />
    <path d="M132 45 L144 22 L121 38 Z" fill="#06b6d4" filter="url(#glowFilter)" />

    {/* Cyber Visor / Tactical Goggles */}
    <path
      d="M65 70 C75 66 125 66 135 70 C138 78 130 92 100 92 C70 92 62 78 65 70 Z"
      fill="url(#catVisorGrad)"
      stroke="#0f172a"
      strokeWidth="2.5"
    />
    <path d="M72 73 L128 73" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.7" strokeLinecap="round" />

    {/* Headband / Visor Strap */}
    <path d="M58 74 L65 74" stroke="#0f172a" strokeWidth="4" />
    <path d="M135 74 L142 74" stroke="#0f172a" strokeWidth="4" />

    {/* Whiskers */}
    <line x1="62" y1="95" x2="42" y2="92" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
    <line x1="62" y1="101" x2="44" y2="103" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
    <line x1="138" y1="95" x2="158" y2="92" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
    <line x1="138" y1="101" x2="156" y2="103" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />

    {/* Cute Nose & Mouth */}
    <polygon points="97,97 103,97 100,101" fill="#f43f5e" />
    <path d="M96 103 Q100 107 104 103" stroke="#0f172a" strokeWidth="2" fill="none" />
  </svg>
);

export const AvatarDeer = ({ apparel = 'basic_clothes', className = 'w-48 h-48', animated = true }) => (
  <svg
    viewBox="0 0 200 240"
    className={`${className} ${animated ? 'avatar-breathing' : ''}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="deerGrad" x1="50" y1="20" x2="150" y2="220" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="0.7" stopColor="#047857" />
        <stop offset="1" stopColor="#064e3b" />
      </linearGradient>
      <linearGradient id="antlerGold" x1="40" y1="5" x2="160" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fde047" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
    </defs>

    <ellipse cx="100" cy="225" rx="55" ry="10" fill="#000000" fillOpacity="0.35" />

    {/* Luminous Antlers */}
    <g stroke="url(#antlerGold)" strokeWidth="4.5" strokeLinecap="round">
      <path d="M80 45 C65 25 50 10 32 15 M48 24 C40 12 30 18 24 22 M62 32 C50 32 40 40 35 48" />
      <path d="M120 45 C135 25 150 10 168 15 M152 24 C160 12 170 18 176 22 M138 32 C150 32 160 40 165 48" />
    </g>

    {/* Torso */}
    <path d="M65 115 C58 170 68 210 100 215 C132 210 142 170 135 115 Z" fill="url(#deerGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* Apparel */}
    {apparel === 'luxury_suit' ? (
      <path d="M72 120 L100 165 L128 120 L122 205 L78 205 Z" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
    ) : (
      <path d="M82 130 L100 155 L118 130" stroke="#a7f3d0" strokeWidth="3" fill="none" />
    )}

    {/* Arms */}
    <path d="M60 125 C48 150 52 180 64 195" stroke="#047857" strokeWidth="12" strokeLinecap="round" />
    <path d="M140 125 C152 150 148 180 136 195" stroke="#047857" strokeWidth="12" strokeLinecap="round" />

    {/* Head */}
    <circle cx="100" cy="80" r="40" fill="url(#deerGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* Deer Ears */}
    <path d="M64 68 C45 62 35 75 42 85 C55 88 64 78 64 68 Z" fill="#047857" stroke="#0f172a" strokeWidth="2" />
    <path d="M136 68 C155 62 165 75 158 85 C145 88 136 78 136 68 Z" fill="#047857" stroke="#0f172a" strokeWidth="2" />

    {/* Wise Eyes */}
    <ellipse cx="85" cy="78" rx="6" ry="7" fill="#0f172a" />
    <circle cx="87" cy="76" r="2.5" fill="#ffffff" />
    <ellipse cx="115" cy="78" rx="6" ry="7" fill="#0f172a" />
    <circle cx="117" cy="76" r="2.5" fill="#ffffff" />

    {/* Muzzle */}
    <path d="M92 90 C92 84 108 84 108 90 C108 98 92 98 92 90 Z" fill="#a7f3d0" />
    <polygon points="98,87 102,87 100,90" fill="#0f172a" />
  </svg>
);

export const AvatarBunny = ({ apparel = 'basic_clothes', className = 'w-48 h-48', animated = true }) => (
  <svg
    viewBox="0 0 200 240"
    className={`${className} ${animated ? 'avatar-breathing' : ''}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="bunnyGrad" x1="50" y1="20" x2="150" y2="220" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ec4899" />
        <stop offset="0.7" stopColor="#be185d" />
        <stop offset="1" stopColor="#9d174d" />
      </linearGradient>
    </defs>

    <ellipse cx="100" cy="225" rx="55" ry="10" fill="#000000" fillOpacity="0.35" />

    {/* Cybernetic Tall Bunny Ears */}
    <g stroke="#0f172a" strokeWidth="3">
      <path d="M72 65 C60 20 65 2 78 5 C90 8 85 45 80 65 Z" fill="#be185d" />
      <path d="M75 50 C68 25 72 12 78 15 C83 18 80 40 77 50 Z" fill="#fbcfe8" />
      <path d="M128 65 C140 20 135 2 122 5 C110 8 115 45 120 65 Z" fill="#be185d" />
      <path d="M125 50 C132 25 128 12 122 15 C117 18 120 40 123 50 Z" fill="#fbcfe8" />
    </g>

    {/* Body */}
    <path d="M62 118 C56 170 66 210 100 215 C134 210 144 170 138 118 Z" fill="url(#bunnyGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* Arms */}
    <path d="M58 128 C46 150 50 180 62 195" stroke="#be185d" strokeWidth="12" strokeLinecap="round" />
    <path d="M142 128 C154 150 150 180 138 195" stroke="#be185d" strokeWidth="12" strokeLinecap="round" />

    {/* Head */}
    <circle cx="100" cy="85" r="40" fill="url(#bunnyGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* Speed Visor */}
    <path d="M68 76 C78 72 122 72 132 76 C136 84 128 94 100 94 C72 94 64 84 68 76 Z" fill="#38bdf8" stroke="#0f172a" strokeWidth="2.5" />
    <line x1="74" y1="80" x2="126" y2="80" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.8" />

    {/* Cute Cheeks & Nose */}
    <ellipse cx="80" cy="98" rx="5" ry="3" fill="#f472b6" fillOpacity="0.6" />
    <ellipse cx="120" cy="98" rx="5" ry="3" fill="#f472b6" fillOpacity="0.6" />
    <polygon points="98,96 102,96 100,99" fill="#0f172a" />
    <path d="M97 101 Q100 105 103 101" stroke="#0f172a" strokeWidth="2" fill="none" />
  </svg>
);

export const AvatarBear = ({ apparel = 'basic_clothes', className = 'w-48 h-48', animated = true }) => (
  <svg
    viewBox="0 0 200 240"
    className={`${className} ${animated ? 'avatar-breathing' : ''}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="bearGrad" x1="50" y1="20" x2="150" y2="220" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f59e0b" />
        <stop offset="0.7" stopColor="#b45309" />
        <stop offset="1" stopColor="#78350f" />
      </linearGradient>
    </defs>

    <ellipse cx="100" cy="225" rx="62" ry="12" fill="#000000" fillOpacity="0.35" />

    {/* Broad Cyber Bear Shoulders */}
    <path d="M50 115 C45 175 60 215 100 218 C140 215 155 175 150 115 Z" fill="url(#bearGrad)" stroke="#0f172a" strokeWidth="3.5" />

    {/* Glowing Chest Arc Reactor */}
    <circle cx="100" cy="155" r="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
    <polygon points="100,146 108,160 92,160" fill="#22d3ee" />

    {/* Massive Armored Paws */}
    <path d="M48 125 C30 155 35 185 54 200" stroke="#b45309" strokeWidth="16" strokeLinecap="round" />
    <path d="M152 125 C170 155 165 185 146 200" stroke="#b45309" strokeWidth="16" strokeLinecap="round" />

    {/* Head */}
    <circle cx="100" cy="76" r="44" fill="url(#bearGrad)" stroke="#0f172a" strokeWidth="3.5" />

    {/* Bear Ears */}
    <circle cx="62" cy="46" r="15" fill="#b45309" stroke="#0f172a" strokeWidth="2.5" />
    <circle cx="62" cy="46" r="8" fill="#fde68a" />
    <circle cx="138" cy="46" r="15" fill="#b45309" stroke="#0f172a" strokeWidth="2.5" />
    <circle cx="138" cy="46" r="8" fill="#fde68a" />

    {/* Cybernetic Eye Lens & Scars */}
    <ellipse cx="84" cy="74" rx="7" ry="7" fill="#0f172a" />
    <circle cx="85" cy="73" r="2.5" fill="#ffffff" />
    <circle cx="116" cy="74" r="9" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
    <circle cx="116" cy="74" r="4" fill="#ef4444" />

    {/* Sturdy Muzzle */}
    <ellipse cx="100" cy="94" rx="18" ry="14" fill="#fde68a" stroke="#0f172a" strokeWidth="2" />
    <ellipse cx="100" cy="88" rx="7" ry="5" fill="#0f172a" />
    <path d="M96 97 Q100 102 104 97" stroke="#0f172a" strokeWidth="2.5" fill="none" />
  </svg>
);

export const AvatarFox = ({ apparel = 'basic_clothes', className = 'w-48 h-48', animated = true }) => (
  <svg
    viewBox="0 0 200 240"
    className={`${className} ${animated ? 'avatar-breathing' : ''}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="foxGrad" x1="50" y1="20" x2="150" y2="220" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f97316" />
        <stop offset="0.7" stopColor="#ea580c" />
        <stop offset="1" stopColor="#c2410c" />
      </linearGradient>
    </defs>

    <ellipse cx="100" cy="225" rx="55" ry="10" fill="#000000" fillOpacity="0.35" />

    {/* Grand Kitsune Energy Tail */}
    <path
      d="M135 195 C175 195 200 160 190 125 C180 95 155 110 160 135 C165 160 145 180 135 195 Z"
      fill="#ea580c"
      stroke="#0f172a"
      strokeWidth="2.5"
    />
    <path d="M190 125 C185 105 165 115 170 135 Z" fill="#ffffff" />

    {/* Body */}
    <path d="M60 115 C55 170 65 210 100 215 C135 210 145 170 140 115 Z" fill="url(#foxGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* White Chest Fur */}
    <path d="M85 115 L100 165 L115 115 Z" fill="#ffffff" />

    {/* Arms */}
    <path d="M58 125 C45 150 48 180 62 195" stroke="#c2410c" strokeWidth="12" strokeLinecap="round" />
    <path d="M142 125 C155 150 152 180 138 195" stroke="#c2410c" strokeWidth="12" strokeLinecap="round" />

    {/* Head */}
    <polygon points="60,65 100,110 140,65 100,50" fill="url(#foxGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* Tall Fox Ears with White Tips */}
    <polygon points="65,65 48,15 85,45" fill="#ea580c" stroke="#0f172a" strokeWidth="2.5" />
    <polygon points="54,28 48,15 68,26" fill="#ffffff" />
    <polygon points="135,65 152,15 115,45" fill="#ea580c" stroke="#0f172a" strokeWidth="2.5" />
    <polygon points="146,28 152,15 132,26" fill="#ffffff" />

    {/* Sleek Kitsune Mask Markings */}
    <path d="M72 70 Q82 66 90 74" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M128 70 Q118 66 110 74" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" fill="none" />

    {/* Eyes */}
    <path d="M78 78 Q88 74 94 80" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M122 78 Q112 74 106 80" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none" />

    {/* Snout */}
    <circle cx="100" cy="107" r="4" fill="#0f172a" />
  </svg>
);

/**
 * THE LEGENDARY "SUIT & BOOT BUSINESSMAN"
 * Strictly unlocked via 365-day consistency streak!
 */
export const AvatarBusinessman = ({ className = 'w-48 h-48', animated = true }) => (
  <svg
    viewBox="0 0 200 240"
    className={`${className} ${animated ? 'avatar-breathing' : ''}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="goldAura" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fbbf24" stopOpacity="0.7" />
        <stop offset="0.5" stopColor="#d97706" stopOpacity="0.4" />
        <stop offset="1" stopColor="#78350f" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="suitGrad" x1="70" y1="100" x2="130" y2="210" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1e293b" />
        <stop offset="1" stopColor="#090d16" />
      </linearGradient>
      <linearGradient id="goldTrim" x1="60" y1="80" x2="140" y2="180" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.5" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#b45309" />
      </linearGradient>
    </defs>

    {/* 365-Day Golden Ascendant Halo & Sparkles */}
    <ellipse cx="100" cy="120" rx="90" ry="110" fill="url(#goldAura)" />
    <circle cx="45" cy="40" r="3" fill="#fde047" />
    <circle cx="160" cy="50" r="4" fill="#fde047" />
    <circle cx="25" cy="110" r="2.5" fill="#fde047" />
    <circle cx="175" cy="130" r="3.5" fill="#fde047" />

    {/* Ground Shadow */}
    <ellipse cx="100" cy="228" rx="60" ry="10" fill="#000000" fillOpacity="0.4" />

    {/* Immaculate Charcoal 3-Piece Tailored Suit Body */}
    <path d="M55 105 L70 215 L130 215 L145 105 Z" fill="url(#suitGrad)" stroke="#0f172a" strokeWidth="3" />

    {/* Crisp White Shirt Collar & Golden Tie */}
    <polygon points="100,105 85,135 115,135" fill="#ffffff" />
    <polygon points="100,118 95,165 105,165" fill="url(#goldTrim)" />
    <polygon points="98,165 100,180 102,165" fill="#d97706" />

    {/* Satin Peak Lapels */}
    <path d="M68 105 L90 148 L80 152 L58 112 Z" fill="#0f172a" stroke="url(#goldTrim)" strokeWidth="1.5" />
    <path d="M132 105 L110 148 L120 152 L142 112 Z" fill="#0f172a" stroke="url(#goldTrim)" strokeWidth="1.5" />

    {/* Gold Pocket Square */}
    <polygon points="76,145 84,138 88,145" fill="url(#goldTrim)" />

    {/* Arms with Gold Chronograph Rolex on wrist */}
    <path d="M55 115 C42 145 40 178 52 195" stroke="#1e293b" strokeWidth="13" strokeLinecap="round" />
    <path d="M145 115 C158 145 160 178 148 195" stroke="#1e293b" strokeWidth="13" strokeLinecap="round" />

    {/* Gold Luxury Watch */}
    <circle cx="50" cy="192" r="5.5" fill="url(#goldTrim)" stroke="#0f172a" strokeWidth="1.5" />

    {/* Leather Executive Briefcase in Hand */}
    <rect x="145" y="180" width="22" height="18" rx="3" fill="#78350f" stroke="url(#goldTrim)" strokeWidth="1.5" />
    <path d="M152 180 L152 174 L160 174 L160 180" stroke="url(#goldTrim)" strokeWidth="2" fill="none" />

    {/* Polished High-Gloss Italian Dress Boots */}
    <path d="M72 215 L70 228 L88 228 L88 215 Z" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />
    <path d="M112 215 L112 228 L130 228 L128 215 Z" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />

    {/* Head & Confident Jawline */}
    <path d="M76 60 C76 45 124 45 124 60 C124 85 116 102 100 102 C84 102 76 85 76 60 Z" fill="#fed7aa" stroke="#0f172a" strokeWidth="2.5" />

    {/* Slicked-Back Sharp Businessman Hair */}
    <path d="M72 56 C70 38 90 28 100 28 C115 28 132 38 128 56 C124 45 112 40 100 40 C88 40 76 46 72 56 Z" fill="#18181b" />

    {/* Luxury Dark Aviator Sunglasses */}
    <rect x="76" y="58" width="20" height="13" rx="3" fill="#09090b" stroke="url(#goldTrim)" strokeWidth="1.5" />
    <rect x="104" y="58" width="20" height="13" rx="3" fill="#09090b" stroke="url(#goldTrim)" strokeWidth="1.5" />
    <line x1="96" y1="62" x2="104" y2="62" stroke="url(#goldTrim)" strokeWidth="2" />
    <line x1="79" y1="62" x2="89" y2="62" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="107" y1="62" x2="117" y2="62" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />

    {/* Confident Smile */}
    <path d="M92 84 Q100 90 108 84" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

export const RenderAvatar = ({ avatarId, apparel = 'basic_clothes', className = 'w-48 h-48', animated = true }) => {
  switch (avatarId) {
    case 'deer':
      return <AvatarDeer apparel={apparel} className={className} animated={animated} />;
    case 'bunny':
      return <AvatarBunny apparel={apparel} className={className} animated={animated} />;
    case 'bear':
      return <AvatarBear apparel={apparel} className={className} animated={animated} />;
    case 'fox':
      return <AvatarFox apparel={apparel} className={className} animated={animated} />;
    case 'businessman':
      return <AvatarBusinessman className={className} animated={animated} />;
    case 'cat':
    default:
      return <AvatarCat apparel={apparel} className={className} animated={animated} />;
  }
};
