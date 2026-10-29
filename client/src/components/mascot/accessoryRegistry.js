/**
 * accessoryRegistry.js
 * Central source of truth for modular 2D mascot accessories.
 * Contains metadata, attachment anchors, and default calibrated transforms (x, y, scale, rotation).
 */

export const ATTACHMENT_POINTS = {
  head: {
    name: 'Head / Hat Anchor',
    defaultPos: { x: 305, y: 115 },
    description: 'Top of the cat head between the ears',
  },
  eyes: {
    name: 'Eyes / Glasses Anchor',
    defaultPos: { x: 310, y: 198 },
    description: 'Across the eyes and nose bridge',
  },
  ear: {
    name: 'Left Ear Clip Anchor',
    defaultPos: { x: 242, y: 135 },
    description: 'Clips gently to the left ear',
  },
  neck: {
    name: 'Neck / Collar / Bow Anchor',
    defaultPos: { x: 320, y: 260 },
    description: 'Directly at the throat and upper chest',
  },
  body: {
    name: 'Body / Outfit Anchor',
    defaultPos: { x: 310, y: 310 },
    description: 'Over the chubby torso and belly',
  },
};

export const ACCESSORY_REGISTRY = {
  // --- HATS ---
  wizard_hat: {
    id: 'wizard_hat',
    name: 'Sage Wizard Hat',
    slot: 'hat',
    category: 'hats',
    attachmentPoint: 'head',
    defaultTransform: { x: 300, y: 92, scale: 1.15, rotation: -4 },
    tier: 'Rare',
    price: 20,
    description: 'Charming pointed wizard hat with star band and wide brim.',
  },
  gold_crown: {
    id: 'gold_crown',
    name: 'Tiny Royal Crown',
    slot: 'hat',
    category: 'hats',
    attachmentPoint: 'head',
    defaultTransform: { x: 305, y: 95, scale: 0.95, rotation: 1 },
    tier: 'Legendary',
    price: 45,
    description: 'A polished golden crown studded with royal ruby jewels.',
  },
  strawberry_beret: {
    id: 'strawberry_beret',
    name: 'Pastel Strawberry Beret',
    slot: 'hat',
    category: 'hats',
    attachmentPoint: 'head',
    defaultTransform: { x: 308, y: 104, scale: 1.05, rotation: -6 },
    tier: 'Rare',
    price: 22,
    description: 'Hand-felted pink wool beret with a miniature strawberry stem.',
  },
  dapper_tophat: {
    id: 'dapper_tophat',
    name: 'Dapper Victorian Top Hat',
    slot: 'hat',
    category: 'hats',
    attachmentPoint: 'head',
    defaultTransform: { x: 304, y: 90, scale: 1.05, rotation: -3 },
    tier: 'Epic',
    price: 25,
    description: 'Aristocratic silk top hat with crimson ribbon band.',
  },
  party_hat: {
    id: 'party_hat',
    name: 'Festive Celebration Cone',
    slot: 'hat',
    category: 'hats',
    attachmentPoint: 'head',
    defaultTransform: { x: 302, y: 92, scale: 1.0, rotation: -5 },
    tier: 'Common',
    price: 0,
    description: 'Cheerful polka-dot party cone hat with fluffy pompom.',
  },
  winter_beanie: {
    id: 'winter_beanie',
    name: 'Cozy Knit Bobble Beanie',
    slot: 'hat',
    category: 'hats',
    attachmentPoint: 'head',
    defaultTransform: { x: 305, y: 100, scale: 1.12, rotation: -2 },
    tier: 'Common',
    price: 15,
    description: 'Warm ribbed sky-blue winter beanie with puffy pompom.',
  },

  // --- GLASSES ---
  wire_glasses: {
    id: 'wire_glasses',
    name: 'Classic Round Wire Glasses',
    slot: 'glasses',
    category: 'glasses',
    attachmentPoint: 'eyes',
    defaultTransform: { x: 310, y: 198, scale: 1.08, rotation: 0 },
    tier: 'Common',
    price: 0,
    description: 'Vintage brass wireframe reading spectacles.',
  },
  cool_sunglasses: {
    id: 'cool_sunglasses',
    name: 'Retro Cool Aviators',
    slot: 'glasses',
    category: 'glasses',
    attachmentPoint: 'eyes',
    defaultTransform: { x: 310, y: 198, scale: 1.05, rotation: 0 },
    tier: 'Rare',
    price: 18,
    description: 'Dark tinted cool wayfarer sunglasses with sleek shine.',
  },
  cyber_goggles: {
    id: 'cyber_goggles',
    name: 'Tactical Cyber Visor',
    slot: 'glasses',
    category: 'glasses',
    attachmentPoint: 'eyes',
    defaultTransform: { x: 310, y: 196, scale: 1.12, rotation: 0 },
    tier: 'Epic',
    price: 30,
    description: 'Futuristic glowing neon cyan HUD tactical goggles.',
  },
  reading_nerd_glasses: {
    id: 'reading_nerd_glasses',
    name: 'Professor Study Glasses',
    slot: 'glasses',
    category: 'glasses',
    attachmentPoint: 'eyes',
    defaultTransform: { x: 310, y: 198, scale: 1.06, rotation: 0 },
    tier: 'Common',
    price: 15,
    description: 'Classic tortoiseshell thick-frame focus spectacles.',
  },

  // --- BOWS ---
  red_bowtie: {
    id: 'red_bowtie',
    name: 'Gentleman Crimson Bowtie',
    slot: 'neckwear',
    category: 'bows',
    attachmentPoint: 'neck',
    defaultTransform: { x: 320, y: 265, scale: 1.05, rotation: 0 },
    tier: 'Common',
    price: 0,
    description: 'Vibrant crimson satin bowtie with center knot.',
  },
  pastel_ear_bow: {
    id: 'pastel_ear_bow',
    name: 'Pastel Peachy Ear Ribbon',
    slot: 'ear',
    category: 'bows',
    attachmentPoint: 'ear',
    defaultTransform: { x: 242, y: 135, scale: 0.95, rotation: -18 },
    tier: 'Rare',
    price: 12,
    description: 'Charming pink silk bow clipped onto Sparky’s ear.',
  },
  polka_dot_bow: {
    id: 'polka_dot_bow',
    name: 'Golden Polka Dot Bow',
    slot: 'neckwear',
    category: 'bows',
    attachmentPoint: 'neck',
    defaultTransform: { x: 320, y: 265, scale: 1.08, rotation: 0 },
    tier: 'Rare',
    price: 14,
    description: 'Celebratory golden bow with crisp white dots.',
  },

  // --- SCARVES & COLLARS ---
  cozy_scarf: {
    id: 'cozy_scarf',
    name: 'Warm Emerald Knit Scarf',
    slot: 'neckwear',
    category: 'scarves',
    attachmentPoint: 'neck',
    defaultTransform: { x: 322, y: 264, scale: 1.12, rotation: 1 },
    tier: 'Common',
    price: 0,
    description: 'Soft hand-knitted forest emerald scarf with tail fringe.',
  },
  crimson_winter_scarf: {
    id: 'crimson_winter_scarf',
    name: 'Festive Burgundy Winter Scarf',
    slot: 'neckwear',
    category: 'scarves',
    attachmentPoint: 'neck',
    defaultTransform: { x: 322, y: 264, scale: 1.12, rotation: 1 },
    tier: 'Rare',
    price: 16,
    description: 'Deep holiday red woolen wrap scarf.',
  },
  bell_collar: {
    id: 'bell_collar',
    name: 'Golden Bell Ribbon Collar',
    slot: 'neckwear',
    category: 'collars',
    attachmentPoint: 'neck',
    defaultTransform: { x: 320, y: 260, scale: 1.02, rotation: 0 },
    tier: 'Common',
    price: 10,
    description: 'Soft crimson velvet ribbon with a gentle jingle bell.',
  },
  cherry_bandana: {
    id: 'cherry_bandana',
    name: 'Cherry Blossom Bandana',
    slot: 'neckwear',
    category: 'collars',
    attachmentPoint: 'neck',
    defaultTransform: { x: 320, y: 265, scale: 1.05, rotation: 0 },
    tier: 'Common',
    price: 14,
    description: 'A playful folded triangular bandana with cherry blossom motif.',
  },

  // --- CLOTHING & OUTFITS ---
  cozy_sweater: {
    id: 'cozy_sweater',
    name: 'Cozy Forest Aran Sweater',
    slot: 'outfit',
    category: 'outfits',
    attachmentPoint: 'body',
    defaultTransform: { x: 308, y: 310, scale: 1.02, rotation: 0 },
    tier: 'Epic',
    price: 0,
    description: 'Chunky cream-knit wool cable sweater for brisk autumn mornings.',
  },
  pastel_hoodie: {
    id: 'pastel_hoodie',
    name: 'Minty Comfort Hoodie',
    slot: 'outfit',
    category: 'outfits',
    attachmentPoint: 'body',
    defaultTransform: { x: 308, y: 310, scale: 1.02, rotation: 0 },
    tier: 'Rare',
    price: 28,
    description: 'Casual pastel hoodie with front pouch pocket.',
  },
  gentleman_vest: {
    id: 'gentleman_vest',
    name: 'Classic Tweed Study Vest',
    slot: 'outfit',
    category: 'outfits',
    attachmentPoint: 'body',
    defaultTransform: { x: 308, y: 308, scale: 1.02, rotation: 0 },
    tier: 'Legendary',
    price: 32,
    description: 'Sharp tailored tweed vest with polished brass buttons.',
  },
  hero_cape: {
    id: 'hero_cape',
    name: 'Brave Crimson Adventurer Cape',
    slot: 'outfit',
    category: 'outfits',
    attachmentPoint: 'neck',
    defaultTransform: { x: 320, y: 262, scale: 1.15, rotation: 0 },
    tier: 'Legendary',
    price: 35,
    description: 'Regal red hero cape fluttering behind Sparky’s shoulders.',
  },
  mini_backpack: {
    id: 'mini_backpack',
    name: 'Tiny Explorer Rucksack',
    slot: 'outfit',
    category: 'backpacks',
    attachmentPoint: 'body',
    defaultTransform: { x: 260, y: 280, scale: 0.95, rotation: 8 },
    tier: 'Epic',
    price: 25,
    description: 'Miniature canvas backpack equipped for study adventures.',
  },
};

/**
 * Get calibrated transform for an accessory, combining default and any user adjustments.
 */
export const getAccessoryTransform = (accessoryId, customOffsets = {}) => {
  const item = ACCESSORY_REGISTRY[accessoryId];
  if (!item) return { x: 0, y: 0, scale: 1, rotation: 0 };

  const def = item.defaultTransform;
  const user = customOffsets[accessoryId] || {};

  return {
    x: (def.x || 0) + (user.x || 0),
    y: (def.y || 0) + (user.y || 0),
    scale: (def.scale || 1) * (user.scale !== undefined ? user.scale : 1),
    rotation: (def.rotation || 0) + (user.rotation || 0),
  };
};

/**
 * Helper to get slot of an accessory
 */
export const getAccessorySlot = (accessoryId) => {
  return ACCESSORY_REGISTRY[accessoryId]?.slot || 'other';
};
