import React from 'react';
import { ACCESSORY_REGISTRY, getAccessoryTransform } from './accessoryRegistry.js';

/**
 * MascotAccessory
 * Renders an individual transparent vector accessory with precise position, scale, and rotation.
 */
export const MascotAccessory = ({
  id,
  customOffsets = {},
  className = '',
  overrideTransform = null,
}) => {
  if (!id || id === 'none') return null;

  const t = overrideTransform || getAccessoryTransform(id, customOffsets);
  const transformStr = `translate(${t.x}, ${t.y}) scale(${t.scale}) rotate(${t.rotation})`;

  return (
    <g
      id={`accessory-${id}`}
      transform={transformStr}
      className={`mascot-accessory-layer transition-transform duration-150 ${className}`}
      style={{ transformOrigin: 'center' }}
    >
      {renderAccessoryGraphic(id)}
    </g>
  );
};

/**
 * Individual Vector Artwork for each accessory
 * Built as crisp, self-contained SVG elements centered at (0, 0)
 */
function renderAccessoryGraphic(id) {
  switch (id) {
    // ==========================================
    // 1. HATS & HEADWEAR
    // ==========================================
    case 'wizard_hat':
      return (
        <g id="graphic-wizard-hat">
          {/* Hat Shadow */}
          <ellipse cx="0" cy="18" rx="46" ry="7" fill="#000000" fillOpacity="0.2" />
          {/* Back brim */}
          <ellipse cx="0" cy="15" rx="45" ry="10" fill="#1b3028" stroke="#10201a" strokeWidth="2.5" />
          {/* Main Cone with natural organic bend */}
          <path
            d="M -30 14 C -28 -5, -20 -38, -5 -65 C -2 -72, 8 -70, 4 -60 C -2 -38, 18 -10, 30 14 Z"
            fill="#264438"
            stroke="#12231b"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Crease shadow */}
          <path
            d="M -15 -10 C -8 -25, -4 -45, -2 -60"
            stroke="#1b3028"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Gold Star Hatband */}
          <path
            d="M -30 13 Q 0 20 30 13 L 28 4 Q 0 11 -28 4 Z"
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth="1.5"
          />
          {/* Front brim highlight */}
          <path
            d="M -45 15 C -45 20, 45 20, 45 15 C 38 12, -38 12, -45 15 Z"
            fill="#325647"
            stroke="#10201a"
            strokeWidth="2"
          />
          {/* Golden Star Emblem */}
          <g transform="translate(0, 11) scale(0.7)">
            <polygon
              points="0,-10 3,-3 10,-3 4,2 6,9 0,5 -6,9 -4,2 -10,-3 -3,-3"
              fill="#fef08a"
              stroke="#d97706"
              strokeWidth="1"
            />
          </g>
        </g>
      );

    case 'gold_crown':
      return (
        <g id="graphic-gold-crown">
          {/* Base ellipse shadow */}
          <ellipse cx="0" cy="14" rx="30" ry="6" fill="#000000" fillOpacity="0.2" />
          {/* Crown Base */}
          <ellipse cx="0" cy="12" rx="28" ry="6" fill="#ca8a04" stroke="#78350f" strokeWidth="2" />
          {/* Crown Wall & Peaks */}
          <path
            d="M -26 10 L -28 -10 L -14 0 L 0 -16 L 14 0 L 28 -10 L 26 10 Q 0 16 -26 10 Z"
            fill="url(#crownGoldGrad)"
            stroke="#78350f"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Crown Rim Band */}
          <path
            d="M -26 10 Q 0 15 26 10 L 26 14 Q 0 19 -26 14 Z"
            fill="#eab308"
            stroke="#78350f"
            strokeWidth="1.5"
          />
          {/* Ruby Jewels on peak tips */}
          <circle cx="-28" cy="-10" r="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
          <circle cx="0" cy="-16" r="4" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
          <circle cx="28" cy="-10" r="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
          {/* Center Royal Sapphire jewel on band */}
          <polygon points="0,9 4,13 0,17 -4,13" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
          <defs>
            <linearGradient id="crownGoldGrad" x1="0" y1="-16" x2="0" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fef08a" />
              <stop offset="0.5" stopColor="#eab308" />
              <stop offset="1" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
        </g>
      );

    case 'strawberry_beret':
      return (
        <g id="graphic-strawberry-beret">
          {/* Soft Shadow */}
          <ellipse cx="2" cy="12" rx="36" ry="8" fill="#000000" fillOpacity="0.2" />
          {/* Main Felt Beret Cap */}
          <path
            d="M -34 10 C -38 -8, -20 -22, 2 -22 C 24 -22, 40 -8, 36 10 C 25 18, -25 18, -34 10 Z"
            fill="#f472b6"
            stroke="#9d174d"
            strokeWidth="2.5"
          />
          {/* Beret Felt Fold */}
          <path
            d="M -28 10 Q 2 15 30 10"
            stroke="#db2777"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Strawberry Seeds */}
          {[
            [-16, -6], [-5, -12], [8, -8], [18, -3],
            [-10, 2], [5, 0], [16, 5],
          ].map(([sx, sy], i) => (
            <ellipse key={i} cx={sx} cy={sy} rx="1.2" ry="2" transform={`rotate(15, ${sx}, ${sy})`} fill="#fef08a" />
          ))}
          {/* Green Berry Stem & Calyx Leaves */}
          <path
            d="M 2 -22 C 3 -28, 6 -32, 8 -34"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 2 -22 C -5 -25, -8 -23, -6 -20 C -2 -21, 1 -21, 2 -22 Z"
            fill="#22c55e"
            stroke="#15803d"
            strokeWidth="1"
          />
          <path
            d="M 2 -22 C 8 -26, 12 -24, 10 -21 C 6 -21, 3 -21, 2 -22 Z"
            fill="#22c55e"
            stroke="#15803d"
            strokeWidth="1"
          />
        </g>
      );

    case 'dapper_tophat':
      return (
        <g id="graphic-dapper-tophat">
          {/* Brim Shadow */}
          <ellipse cx="0" cy="14" rx="36" ry="7" fill="#000000" fillOpacity="0.2" />
          {/* Brim */}
          <ellipse cx="0" cy="12" rx="34" ry="8" fill="#1f2937" stroke="#111827" strokeWidth="2.5" />
          {/* Crown Cylindrical Tube */}
          <path
            d="M -20 10 L -22 -28 C -22 -35, 22 -35, 22 -28 L 20 10 Z"
            fill="#374151"
            stroke="#111827"
            strokeWidth="2.5"
          />
          {/* Top of Crown */}
          <ellipse cx="0" cy="-28" rx="22" ry="6" fill="#4b5563" stroke="#111827" strokeWidth="2" />
          {/* Crimson Ribbon Hatband */}
          <path
            d="M -20 10 Q 0 14 20 10 L 20 3 Q 0 7 -20 3 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1.5"
          />
          {/* Gold Feather / Buckle Accent */}
          <path
            d="M 12 6 C 18 -4, 24 -16, 26 -22 C 24 -20, 20 -15, 14 3 Z"
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth="1"
          />
        </g>
      );

    case 'party_hat':
      return (
        <g id="graphic-party-hat">
          {/* Base ellipse shadow */}
          <ellipse cx="0" cy="14" rx="25" ry="6" fill="#000000" fillOpacity="0.2" />
          {/* Main Party Cone */}
          <path
            d="M -22 12 Q 0 17 22 12 L 0 -45 Z"
            fill="#ec4899"
            stroke="#831843"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Diagonal Stripes */}
          <path d="M -16 6 L -5 -20 L 2 -16 L -10 9 Z" fill="#06b6d4" />
          <path d="M -6 -8 L 0 -35 L 4 -32 L -1 -6 Z" fill="#eab308" />
          <path d="M 6 8 L 14 -12 L 18 -8 L 10 11 Z" fill="#22c55e" />
          {/* White Polka Dots */}
          <circle cx="-10" cy="3" r="2.5" fill="#ffffff" />
          <circle cx="8" cy="-2" r="2.5" fill="#ffffff" />
          <circle cx="1" cy="-18" r="2" fill="#ffffff" />
          {/* Fluffy Yellow Pompom at tip */}
          <circle cx="0" cy="-48" r="7" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
            <line
              key={ang}
              x1="0"
              y1="-48"
              x2={Math.cos((ang * Math.PI) / 180) * 9}
              y2={-48 + Math.sin((ang * Math.PI) / 180) * 9}
              stroke="#facc15"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </g>
      );

    case 'winter_beanie':
      return (
        <g id="graphic-winter-beanie">
          {/* Base shadow */}
          <ellipse cx="0" cy="14" rx="34" ry="7" fill="#000000" fillOpacity="0.2" />
          {/* Main Beanie Dome */}
          <path
            d="M -28 10 C -34 -15, -18 -32, 0 -34 C 18 -32, 34 -15, 28 10 Z"
            fill="#0284c7"
            stroke="#0c4a6e"
            strokeWidth="2.5"
          />
          {/* Knit Vertical Ribs */}
          {[-18, -9, 0, 9, 18].map((rx) => (
            <path
              key={rx}
              d={`M ${rx} 10 C ${rx * 0.9} -10, ${rx * 0.5} -25, 0 -34`}
              stroke="#0369a1"
              strokeWidth="2"
              fill="none"
            />
          ))}
          {/* Ribbed Fold-Over Cuff */}
          <rect
            x="-30"
            y="4"
            width="60"
            height="14"
            rx="7"
            fill="#38bdf8"
            stroke="#0c4a6e"
            strokeWidth="2.5"
          />
          {/* Cuff stitch stripes */}
          {[-20, -12, -4, 4, 12, 20].map((cx) => (
            <line key={cx} x1={cx} y1="6" x2={cx} y2="16" stroke="#0284c7" strokeWidth="2" />
          ))}
          {/* Fluffy Snow-White Pompom */}
          <circle cx="0" cy="-38" r="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="-3" cy="-40" r="3" fill="#ffffff" />
        </g>
      );

    // ==========================================
    // 2. GLASSES & EYEWEAR
    // ==========================================
    case 'wire_glasses':
      return (
        <g id="graphic-wire-glasses">
          {/* Left Lens Glass Sheen */}
          <circle cx="-32" cy="0" r="21" fill="#38bdf8" fillOpacity="0.18" />
          {/* Left Golden Wire Ring */}
          <circle cx="-32" cy="0" r="21" fill="none" stroke="#d97706" strokeWidth="3" />
          <circle cx="-32" cy="0" r="19" fill="none" stroke="#fde047" strokeWidth="1" />
          {/* Left Glass Glint */}
          <path
            d="M -44 -12 C -36 -18, -25 -16, -20 -10"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />

          {/* Right Lens Glass Sheen */}
          <circle cx="32" cy="0" r="21" fill="#38bdf8" fillOpacity="0.18" />
          {/* Right Golden Wire Ring */}
          <circle cx="32" cy="0" r="21" fill="none" stroke="#d97706" strokeWidth="3" />
          <circle cx="32" cy="0" r="19" fill="none" stroke="#fde047" strokeWidth="1" />
          {/* Right Glass Glint */}
          <path
            d="M 20 -12 C 28 -18, 39 -16, 44 -10"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />

          {/* Nose Bridge */}
          <path
            d="M -11 -4 Q 0 -12 11 -4"
            fill="none"
            stroke="#d97706"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Temples (Arms extending outwards) */}
          <path d="M -53 0 L -66 -4" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
          <path d="M 53 0 L 66 -4" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
        </g>
      );

    case 'cool_sunglasses':
      return (
        <g id="graphic-cool-sunglasses">
          {/* Acetate Frame */}
          {/* Left Lens */}
          <path
            d="M -54 -10 L -12 -8 C -14 14, -26 18, -42 16 C -52 14, -56 4, -54 -10 Z"
            fill="#111827"
            stroke="#030712"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Left Gloss Sheen */}
          <path
            d="M -50 -6 L -32 -6 L -44 14 L -50 10 Z"
            fill="#ffffff"
            fillOpacity="0.22"
          />

          {/* Right Lens */}
          <path
            d="M 12 -8 L 54 -10 C 56 4, 52 14, 42 16 C 26 18, 14 14, 12 -8 Z"
            fill="#111827"
            stroke="#030712"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Right Gloss Sheen */}
          <path
            d="M 26 -6 L 44 -6 L 32 14 L 26 10 Z"
            fill="#ffffff"
            fillOpacity="0.22"
          />

          {/* Sturdy Bridge */}
          <rect x="-13" y="-10" width="26" height="5" rx="2" fill="#1f2937" stroke="#030712" strokeWidth="1.5" />

          {/* Silver Corner Rivets */}
          <circle cx="-51" cy="-7" r="1.5" fill="#f3f4f6" />
          <circle cx="51" cy="-7" r="1.5" fill="#f3f4f6" />
        </g>
      );

    case 'cyber_goggles':
      return (
        <g id="graphic-cyber-goggles">
          {/* Outer Visor Frame */}
          <path
            d="M -56 -10 L 56 -10 L 50 14 L 2 16 L -2 16 L -50 14 Z"
            fill="#0f172a"
            stroke="#0284c7"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Neon Cyan Glowing Screen */}
          <path
            d="M -50 -6 L 50 -6 L 45 10 L 0 12 L -45 10 Z"
            fill="#0891b2"
            fillOpacity="0.85"
            stroke="#22d3ee"
            strokeWidth="1.5"
          />
          {/* Holographic Hex / Grid Lines */}
          <line x1="-35" y1="2" x2="35" y2="2" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="6,3" />
          <circle cx="-25" cy="-1" r="3" fill="#22d3ee" />
          <circle cx="25" cy="-1" r="3" fill="#22d3ee" />
          {/* Side Module Nodes with Green Power LEDs */}
          <rect x="-60" y="-8" width="6" height="16" rx="2" fill="#1e293b" stroke="#0284c7" strokeWidth="1.5" />
          <circle cx="-57" cy="0" r="1.5" fill="#4ade80" />
          <rect x="54" y="-8" width="6" height="16" rx="2" fill="#1e293b" stroke="#0284c7" strokeWidth="1.5" />
          <circle cx="57" cy="0" r="1.5" fill="#4ade80" />
        </g>
      );

    case 'reading_nerd_glasses':
      return (
        <g id="graphic-reading-nerd-glasses">
          {/* Thick Tortoiseshell Frames */}
          <rect
            x="-54"
            y="-14"
            width="44"
            height="28"
            rx="8"
            fill="#451a03"
            stroke="#271003"
            strokeWidth="3.5"
          />
          <rect
            x="-48"
            y="-8"
            width="32"
            height="18"
            rx="5"
            fill="#e0f2fe"
            fillOpacity="0.3"
          />

          <rect
            x="10"
            y="-14"
            width="44"
            height="28"
            rx="8"
            fill="#451a03"
            stroke="#271003"
            strokeWidth="3.5"
          />
          <rect
            x="16"
            y="-8"
            width="32"
            height="18"
            rx="5"
            fill="#e0f2fe"
            fillOpacity="0.3"
          />

          {/* Thick Bridge */}
          <path
            d="M -10 -5 Q 0 -11 10 -5"
            stroke="#451a03"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Silver Corner Studs */}
          <circle cx="-50" cy="-10" r="1.5" fill="#e2e8f0" />
          <circle cx="50" cy="-10" r="1.5" fill="#e2e8f0" />
        </g>
      );

    // ==========================================
    // 3. BOWS & CLIPS
    // ==========================================
    case 'red_bowtie':
      return (
        <g id="graphic-red-bowtie">
          {/* Shadow */}
          <ellipse cx="0" cy="4" rx="26" ry="6" fill="#000000" fillOpacity="0.25" />
          {/* Left Wing */}
          <path
            d="M 0 0 L -25 -14 C -28 -5, -28 5, -25 14 L 0 0 Z"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Left Wing Fold Shading */}
          <path d="M -8 -3 L -22 -10" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />
          <path d="M -8 3 L -22 10" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />

          {/* Right Wing */}
          <path
            d="M 0 0 L 25 -14 C 28 -5, 28 5, 25 14 L 0 0 Z"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Right Wing Fold Shading */}
          <path d="M 8 -3 L 22 -10" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 3 L 22 10" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />

          {/* Center Knot */}
          <rect
            x="-7"
            y="-8"
            width="14"
            height="16"
            rx="4"
            fill="#ef4444"
            stroke="#7f1d1d"
            strokeWidth="2.5"
          />
          <circle cx="-2" cy="-2" r="2" fill="#fca5a5" />
        </g>
      );

    case 'pastel_ear_bow':
      return (
        <g id="graphic-pastel-ear-bow">
          {/* Shadow */}
          <ellipse cx="0" cy="2" rx="16" ry="4" fill="#000000" fillOpacity="0.2" />
          {/* Left Wing */}
          <path
            d="M 0 0 L -16 -9 C -18 -3, -18 3, -16 9 Z"
            fill="#f472b6"
            stroke="#9d174d"
            strokeWidth="2"
          />
          {/* Right Wing */}
          <path
            d="M 0 0 L 16 -9 C 18 -3, 18 3, 16 9 Z"
            fill="#f472b6"
            stroke="#9d174d"
            strokeWidth="2"
          />
          {/* Dangling Ribbon Tails */}
          <path
            d="M -3 3 Q -8 16 -12 22 L -7 20 Q -4 14 0 5"
            fill="#f472b6"
            stroke="#9d174d"
            strokeWidth="1.5"
          />
          <path
            d="M 3 3 Q 8 16 12 22 L 7 20 Q 4 14 0 5"
            fill="#f472b6"
            stroke="#9d174d"
            strokeWidth="1.5"
          />
          {/* Center Knot with Pearl Stud */}
          <circle cx="0" cy="0" r="5" fill="#fbcfe8" stroke="#9d174d" strokeWidth="2" />
          <circle cx="-1" cy="-1" r="1.5" fill="#ffffff" />
        </g>
      );

    case 'polka_dot_bow':
      return (
        <g id="graphic-polka-dot-bow">
          {/* Left Wing */}
          <path
            d="M 0 0 L -25 -14 C -28 -5, -28 5, -25 14 Z"
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth="2.5"
          />
          <circle cx="-15" cy="-6" r="2" fill="#ffffff" />
          <circle cx="-18" cy="4" r="2" fill="#ffffff" />
          <circle cx="-9" cy="0" r="1.8" fill="#ffffff" />

          {/* Right Wing */}
          <path
            d="M 0 0 L 25 -14 C 28 -5, 28 5, 25 14 Z"
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth="2.5"
          />
          <circle cx="15" cy="-6" r="2" fill="#ffffff" />
          <circle cx="18" cy="4" r="2" fill="#ffffff" />
          <circle cx="9" cy="0" r="1.8" fill="#ffffff" />

          {/* Center Knot */}
          <rect
            x="-7"
            y="-8"
            width="14"
            height="16"
            rx="4"
            fill="#fbbf24"
            stroke="#78350f"
            strokeWidth="2.5"
          />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
        </g>
      );

    // ==========================================
    // 4. SCARVES & COLLARS
    // ==========================================
    case 'cozy_scarf':
      return (
        <g id="graphic-cozy-scarf">
          {/* Shadow under neck */}
          <ellipse cx="0" cy="8" rx="42" ry="9" fill="#000000" fillOpacity="0.2" />
          {/* Main Scarf Wrap Around Neck */}
          <path
            d="M -38 0 C -40 16, 40 16, 38 0 C 35 -6, -35 -6, -38 0 Z"
            fill="#15803d"
            stroke="#052e16"
            strokeWidth="2.5"
          />
          {/* Ribbed Knit Lines */}
          {[-25, -15, -5, 5, 15, 25].map((kx) => (
            <line
              key={kx}
              x1={kx}
              y1="-2"
              x2={kx * 0.95}
              y2="10"
              stroke="#166534"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}
          {/* Scarf Hanging Tail on right */}
          <path
            d="M 12 6 C 14 16, 16 34, 15 48 L 30 46 C 30 32, 28 16, 26 4 Z"
            fill="#16a34a"
            stroke="#052e16"
            strokeWidth="2.5"
          />
          {/* Fringe at bottom of tail */}
          {[16, 20, 24, 28].map((fx) => (
            <line
              key={fx}
              x1={fx}
              y1="47"
              x2={fx}
              y2="54"
              stroke="#ca8a04"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </g>
      );

    case 'crimson_winter_scarf':
      return (
        <g id="graphic-crimson-winter-scarf">
          {/* Shadow under neck */}
          <ellipse cx="0" cy="8" rx="42" ry="9" fill="#000000" fillOpacity="0.2" />
          {/* Main Scarf Wrap */}
          <path
            d="M -38 0 C -40 16, 40 16, 38 0 C 35 -6, -35 -6, -38 0 Z"
            fill="#991b1b"
            stroke="#450a0a"
            strokeWidth="2.5"
          />
          {/* Scarf Tail */}
          <path
            d="M 12 6 C 14 16, 16 34, 15 48 L 30 46 C 30 32, 28 16, 26 4 Z"
            fill="#b91c1c"
            stroke="#450a0a"
            strokeWidth="2.5"
          />
          {/* Fringe */}
          {[16, 20, 24, 28].map((fx) => (
            <line
              key={fx}
              x1={fx}
              y1="47"
              x2={fx}
              y2="54"
              stroke="#fef08a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </g>
      );

    case 'bell_collar':
      return (
        <g id="graphic-bell-collar">
          {/* Crimson Velvet Ribbon Collar */}
          <path
            d="M -36 -2 Q 0 8 36 -2 Q 0 4 -36 -2"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Jingling Golden Bell */}
          <g transform="translate(0, 10)">
            <ellipse cx="0" cy="8" rx="8" ry="3" fill="#000000" fillOpacity="0.2" />
            <circle cx="0" cy="0" r="9" fill="#facc15" stroke="#78350f" strokeWidth="2" />
            {/* Bell Specular Glint */}
            <circle cx="-3" cy="-3" r="2.5" fill="#fef08a" />
            {/* Bell Horizontal Rim */}
            <line x1="-8" y1="2" x2="8" y2="2" stroke="#ca8a04" strokeWidth="1.5" />
            {/* Bell Clapper Hole */}
            <circle cx="0" cy="4" r="2" fill="#78350f" />
            <line x1="0" y1="4" x2="0" y2="7" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>
      );

    case 'cherry_bandana':
      return (
        <g id="graphic-cherry-bandana">
          {/* Folded Neck Band */}
          <path
            d="M -36 -2 Q 0 6 36 -2 L 34 3 Q 0 11 -34 3 Z"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="2"
          />
          {/* Triangular Bandana Bib */}
          <path
            d="M -26 2 Q 0 7 26 2 L 0 28 Z"
            fill="#ef4444"
            stroke="#7f1d1d"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Cherry Blossom Floral Print */}
          <g transform="translate(0, 12) scale(0.6)">
            <circle cx="0" cy="0" r="3" fill="#fef08a" />
            {[0, 72, 144, 216, 288].map((ang) => (
              <circle
                key={ang}
                cx={Math.cos((ang * Math.PI) / 180) * 7}
                cy={Math.sin((ang * Math.PI) / 180) * 7}
                r="4"
                fill="#ffffff"
              />
            ))}
          </g>
        </g>
      );

    // ==========================================
    // 5. CLOTHING & OUTFITS
    // ==========================================
    case 'cozy_sweater':
      return (
        <g id="graphic-cozy-sweater">
          {/* Sweater Torso Body */}
          <path
            d="M -44 -12 C -46 22, -32 50, 0 54 C 32 50, 46 22, 44 -12 C 28 -8, -28 -8, -44 -12 Z"
            fill="#fef3c7"
            stroke="#b45309"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Ribbed Turtleneck Collar */}
          <path
            d="M -36 -14 C -36 -4, 36 -4, 36 -14 C 28 -20, -28 -20, -36 -14 Z"
            fill="#fde68a"
            stroke="#b45309"
            strokeWidth="2.5"
          />
          {/* Cable Knit Patterns */}
          {[-20, 0, 20].map((cx) => (
            <g key={cx}>
              <path
                d={`M ${cx - 2} -4 C ${cx + 4} 10, ${cx - 4} 24, ${cx + 4} 38 L ${cx} 48`}
                stroke="#d97706"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={`M ${cx + 2} -4 C ${cx - 4} 10, ${cx + 4} 24, ${cx - 4} 38 L ${cx} 48`}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ))}
          {/* Bottom Hem Rib */}
          <path
            d="M -32 46 Q 0 55 32 46"
            stroke="#d97706"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );

    case 'pastel_hoodie':
      return (
        <g id="graphic-pastel-hoodie">
          {/* Main Hoodie Torso */}
          <path
            d="M -44 -10 C -46 22, -32 48, 0 52 C 32 48, 46 22, 44 -10 C 26 -6, -26 -6, -44 -10 Z"
            fill="#6ee7b7"
            stroke="#065f46"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Kangaroo Front Pouch */}
          <path
            d="M -24 22 L 24 22 L 28 42 Q 0 48 -28 42 Z"
            fill="#a7f3d0"
            stroke="#065f46"
            strokeWidth="2"
          />
          {/* Pouch Pocket Openings */}
          <path d="M -24 22 L -28 34" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 24 22 L 28 34" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
          {/* Hoodie Collar Hood Neck */}
          <path
            d="M -36 -12 C -24 -2, 24 -2, 36 -12"
            stroke="#047857"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hanging Drawstrings with Aglets */}
          <path d="M -8 -4 L -10 16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="-10" cy="18" r="1.5" fill="#f59e0b" />
          <path d="M 8 -4 L 10 16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="10" cy="18" r="1.5" fill="#f59e0b" />
        </g>
      );

    case 'gentleman_vest':
      return (
        <g id="graphic-gentleman-vest">
          {/* Inner White Shirt Collar */}
          <polygon points="-16,-12 0,4 16,-12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Mini Silk Tie */}
          <polygon points="0,4 -3,14 0,22 3,14" fill="#dc2626" />
          {/* Tweed Vest Left & Right Flaps */}
          <path
            d="M -42 -8 L -18 -8 L 0 20 L 0 48 L -30 46 C -40 30, -44 10, -42 -8 Z"
            fill="#334155"
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          <path
            d="M 42 -8 L 18 -8 L 0 20 L 0 48 L 30 46 C 40 30, 44 10, 42 -8 Z"
            fill="#334155"
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          {/* Brass Buttons */}
          <circle cx="0" cy="24" r="2.5" fill="#facc15" stroke="#78350f" strokeWidth="1" />
          <circle cx="0" cy="34" r="2.5" fill="#facc15" stroke="#78350f" strokeWidth="1" />
          <circle cx="0" cy="44" r="2.5" fill="#facc15" stroke="#78350f" strokeWidth="1" />
          {/* Pocket Watch Chain curve */}
          <path d="M -14 36 Q -6 44 0 34" stroke="#facc15" strokeWidth="1.5" fill="none" />
        </g>
      );

    case 'hero_cape':
      return (
        <g id="graphic-hero-cape">
          {/* Flowing Back Cape Wings */}
          <path
            d="M -36 0 C -60 30, -65 70, -50 95 C -30 90, -10 92, 0 85 C 10 92, 30 90, 50 95 C 65 70, 60 30, 36 0 Z"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Cape Interior Fold Shadows */}
          <path d="M -30 20 Q -40 55 -32 88" stroke="#991b1b" strokeWidth="3" fill="none" />
          <path d="M 30 20 Q 40 55 32 88" stroke="#991b1b" strokeWidth="3" fill="none" />
          {/* Golden Shoulder Clasp Medallion */}
          <path
            d="M -34 -4 Q 0 4 34 -4"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="0" cy="0" r="5" fill="#fef08a" stroke="#b45309" strokeWidth="2" />
        </g>
      );

    case 'mini_backpack':
      return (
        <g id="graphic-mini-backpack">
          {/* Leather Pack Body */}
          <rect
            x="-20"
            y="-22"
            width="40"
            height="46"
            rx="8"
            fill="#92400e"
            stroke="#451a03"
            strokeWidth="2.5"
          />
          {/* Top Flap */}
          <path
            d="M -22 -14 L 22 -14 L 18 6 Q 0 10 -18 6 Z"
            fill="#b45309"
            stroke="#451a03"
            strokeWidth="2"
          />
          {/* Brass Buckle Straps */}
          <rect x="-12" y="-4" width="6" height="18" rx="2" fill="#78350f" />
          <rect x="-12" y="4" width="6" height="6" fill="#facc15" stroke="#78350f" strokeWidth="1" />
          <rect x="6" y="-4" width="6" height="18" rx="2" fill="#78350f" />
          <rect x="6" y="4" width="6" height="6" fill="#facc15" stroke="#78350f" strokeWidth="1" />
          {/* Top Carry Loop */}
          <path
            d="M -8 -22 C -8 -30, 8 -30, 8 -22"
            stroke="#78350f"
            strokeWidth="3"
            fill="none"
          />
        </g>
      );

    default:
      return null;
  }
}
