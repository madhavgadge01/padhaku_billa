import React from 'react';

/**
 * 3D-styled Vector Graphics for Real Estate environments and Vehicles
 * Zero stock images — pure SVG vector artwork!
 */

export const VectorRealEstate = ({ estateId = 'cozy_room', className = 'w-full h-full' }) => {
  switch (estateId) {
    case 'mansion':
      return (
        <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <linearGradient id="mansionSky" x1="400" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0b0f19" />
              <stop offset="0.6" stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#311042" />
            </linearGradient>
            <linearGradient id="marbleFloor" x1="0" y1="280" x2="800" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e293b" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="800" height="400" fill="url(#mansionSky)" />
          {/* Panoramic Penthouse Floor-to-Ceiling Windows */}
          <path d="M0 0 L800 0 L800 280 L0 280 Z" fill="#0f172a" fillOpacity="0.4" />
          {/* Distant Futuristic Cyber City Skyline */}
          <rect x="80" y="100" width="60" height="180" fill="#1e1b4b" fillOpacity="0.6" />
          <rect x="180" y="60" width="75" height="220" fill="#2e1065" fillOpacity="0.6" />
          <rect x="300" y="120" width="50" height="160" fill="#1e1b4b" fillOpacity="0.6" />
          <rect x="520" y="80" width="90" height="200" fill="#2e1065" fillOpacity="0.6" />
          <rect x="650" y="110" width="70" height="170" fill="#1e1b4b" fillOpacity="0.6" />
          {/* Window Frames */}
          <line x1="260" y1="0" x2="260" y2="280" stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.7" />
          <line x1="540" y1="0" x2="540" y2="280" stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.7" />
          {/* Golden Chandelier */}
          <path d="M400 0 L400 60 L350 90 L450 90 Z" fill="#d97706" />
          <circle cx="350" cy="95" r="4" fill="#fef08a" />
          <circle cx="400" cy="98" r="5" fill="#fef08a" />
          <circle cx="450" cy="95" r="4" fill="#fef08a" />
          {/* Luxury Marble Flooring */}
          <rect y="280" width="800" height="120" fill="url(#marbleFloor)" />
          <line x1="0" y1="280" x2="800" y2="280" stroke="#f59e0b" strokeWidth="3" />
        </svg>
      );

    case 'villa':
      return (
        <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <linearGradient id="sunsetSky" x1="400" y1="0" x2="400" y2="260" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f97316" />
              <stop offset="0.4" stopColor="#ec4899" />
              <stop offset="0.8" stopColor="#6366f1" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="oceanGrad" x1="400" y1="180" x2="400" y2="270" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284c7" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="800" height="400" fill="url(#sunsetSky)" />
          {/* Setting Sun */}
          <circle cx="400" cy="170" r="50" fill="#fef08a" fillOpacity="0.9" />
          {/* Ocean Horizon & Gentle Waves */}
          <rect y="200" width="800" height="70" fill="url(#oceanGrad)" />
          {/* Palm Silhouette */}
          <path d="M720 270 Q700 160 670 110" stroke="#0f172a" strokeWidth="12" fill="none" />
          <path d="M670 110 Q610 80 570 110 M670 110 Q660 60 630 65 M670 110 Q730 80 770 100" stroke="#0f172a" strokeWidth="5" fill="none" />
          {/* Infinity Pool Terrace Deck */}
          <rect y="270" width="800" height="130" fill="#0f172a" />
          <rect y="270" width="800" height="18" fill="#06b6d4" fillOpacity="0.6" />
          {/* Teak Wood Planks */}
          <line x1="0" y1="320" x2="800" y2="320" stroke="#334155" strokeWidth="2" />
          <line x1="0" y1="360" x2="800" y2="360" stroke="#334155" strokeWidth="2" />
        </svg>
      );

    case 'apartment':
      return (
        <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <linearGradient id="metroSky" x1="400" y1="0" x2="400" y2="280" gradientUnits="userSpaceOnUse">
              <stop stopColor="#030712" />
              <stop offset="1" stopColor="#111827" />
            </linearGradient>
          </defs>
          <rect width="800" height="400" fill="url(#metroSky)" />
          {/* Neon Metropolian Skyline */}
          <rect x="50" y="80" width="90" height="200" fill="#1f2937" />
          <rect x="180" y="40" width="110" height="240" fill="#111827" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3" />
          <rect x="330" y="110" width="70" height="170" fill="#1f2937" />
          <rect x="440" y="60" width="120" height="220" fill="#1f2937" stroke="#f43f5e" strokeWidth="1" strokeOpacity="0.3" />
          <rect x="600" y="90" width="90" height="190" fill="#111827" />
          {/* Neon Window Dots */}
          <circle cx="210" cy="70" r="2" fill="#38bdf8" />
          <circle cx="230" cy="90" r="2" fill="#fbbf24" />
          <circle cx="480" cy="100" r="2" fill="#f43f5e" />
          <circle cx="510" cy="140" r="2" fill="#34d399" />
          {/* Minimalist Studio Floor */}
          <rect y="280" width="800" height="120" fill="#1e293b" />
          <line x1="0" y1="280" x2="800" y2="280" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.5" />
        </svg>
      );

    case 'cozy_room':
    default:
      return (
        <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <linearGradient id="cozyWall" x1="400" y1="0" x2="400" y2="280" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="warmWood" x1="0" y1="280" x2="800" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#451a03" />
              <stop offset="1" stopColor="#290f02" />
            </linearGradient>
          </defs>
          <rect width="800" height="280" fill="url(#cozyWall)" />
          {/* Window with Moon & Stars */}
          <rect x="100" y="40" width="120" height="150" rx="8" fill="#020617" stroke="#64748b" strokeWidth="4" />
          <line x1="160" y1="40" x2="160" y2="190" stroke="#64748b" strokeWidth="3" />
          <line x1="100" y1="115" x2="220" y2="115" stroke="#64748b" strokeWidth="3" />
          <circle cx="180" cy="75" r="14" fill="#fef08a" />
          <circle cx="140" cy="140" r="1.5" fill="#ffffff" />
          <circle cx="190" cy="155" r="1.5" fill="#ffffff" />
          {/* Motivational Focus RPG Poster */}
          <rect x="580" y="50" width="90" height="120" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
          <polygon points="625,75 640,105 610,105" fill="#f59e0b" />
          <rect x="600" y="125" width="50" height="6" rx="2" fill="#94a3b8" />
          <rect x="610" y="137" width="30" height="5" rx="2" fill="#f59e0b" />
          {/* Warm Wooden Floor */}
          <rect y="280" width="800" height="120" fill="url(#warmWood)" />
          {/* Planks */}
          <line x1="0" y1="320" x2="800" y2="320" stroke="#1c0a01" strokeWidth="2" />
          <line x1="0" y1="360" x2="800" y2="360" stroke="#1c0a01" strokeWidth="2" />
          {/* Cozy Carpet */}
          <ellipse cx="400" cy="335" rx="140" ry="40" fill="#78350f" fillOpacity="0.4" stroke="#d97706" strokeWidth="1.5" />
        </svg>
      );
  }
};

export const VectorVehicle = ({ vehicleId = 'bicycle', className = 'w-32 h-20' }) => {
  switch (vehicleId) {
    case 'supercar':
      return (
        <svg viewBox="0 0 160 80" className={className} fill="none">
          {/* Shadow */}
          <ellipse cx="80" cy="74" rx="70" ry="5" fill="#000000" fillOpacity="0.4" />
          {/* Sleek Hypercar Body */}
          <path
            d="M10 60 C15 52 35 45 60 42 L95 38 C120 38 140 50 152 58 L150 66 C135 68 25 68 10 60 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1.5"
          />
          {/* Cockpit Canopy */}
          <path d="M55 42 L80 25 L115 28 L125 40 Z" fill="#09090b" stroke="#f87171" strokeWidth="1" />
          {/* Neon Headlight */}
          <polygon points="145,55 152,58 148,61" fill="#38bdf8" />
          {/* Rear Wing / Spoiler */}
          <path d="M15 48 L25 38 L38 38 L25 48 Z" fill="#18181b" />
          {/* Wheels */}
          <circle cx="38" cy="62" r="12" fill="#18181b" stroke="#71717a" strokeWidth="2" />
          <circle cx="38" cy="62" r="6" fill="#dc2626" />
          <circle cx="122" cy="62" r="12" fill="#18181b" stroke="#71717a" strokeWidth="2" />
          <circle cx="122" cy="62" r="6" fill="#dc2626" />
        </svg>
      );

    case 'sedan':
      return (
        <svg viewBox="0 0 160 80" className={className} fill="none">
          <ellipse cx="80" cy="74" rx="65" ry="5" fill="#000000" fillOpacity="0.4" />
          {/* Executive Sedan Body */}
          <path
            d="M12 60 C16 52 30 48 50 48 L65 32 L115 32 L135 48 L150 56 L148 65 L18 65 Z"
            fill="#1e3a8a"
            stroke="#172554"
            strokeWidth="1.5"
          />
          {/* Windows */}
          <path d="M68 35 L88 35 L88 47 L53 47 Z" fill="#0f172a" />
          <path d="M92 35 L112 35 L128 47 L92 47 Z" fill="#0f172a" />
          {/* Chrome Grill */}
          <rect x="145" y="55" width="5" height="7" fill="#cbd5e1" />
          {/* Wheels */}
          <circle cx="42" cy="64" r="11" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="120" cy="64" r="11" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
        </svg>
      );

    case 'hatchback':
      return (
        <svg viewBox="0 0 160 80" className={className} fill="none">
          <ellipse cx="80" cy="74" rx="60" ry="5" fill="#000000" fillOpacity="0.4" />
          <path
            d="M15 62 L15 42 L35 34 L95 34 L125 48 L142 56 L140 65 L20 65 Z"
            fill="#059669"
            stroke="#065f46"
            strokeWidth="1.5"
          />
          <path d="M38 37 L70 37 L70 48 L30 48 Z" fill="#0f172a" />
          <path d="M74 37 L94 37 L118 48 L74 48 Z" fill="#0f172a" />
          <circle cx="42" cy="64" r="10" fill="#0f172a" stroke="#6ee7b7" strokeWidth="2" />
          <circle cx="116" cy="64" r="10" fill="#0f172a" stroke="#6ee7b7" strokeWidth="2" />
        </svg>
      );

    case 'bicycle':
    default:
      return (
        <svg viewBox="0 0 160 80" className={className} fill="none">
          <ellipse cx="80" cy="74" rx="55" ry="4" fill="#000000" fillOpacity="0.3" />
          {/* Bicycle Wheels */}
          <circle cx="35" cy="56" r="18" stroke="#38bdf8" strokeWidth="3" fill="none" />
          <circle cx="35" cy="56" r="4" fill="#0f172a" />
          <circle cx="125" cy="56" r="18" stroke="#38bdf8" strokeWidth="3" fill="none" />
          <circle cx="125" cy="56" r="4" fill="#0f172a" />
          {/* Frame */}
          <polyline points="35,56 70,56 100,32 55,32 35,56" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="70,56 82,24" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" />
          <polyline points="125,56 105,22" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" />
          {/* Handlebars & Seat */}
          <path d="M100 22 L112 22 L114 26" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M75 24 L90 24" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
  }
};
