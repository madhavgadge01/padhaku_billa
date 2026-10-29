/**
 * Padhaku Billa Badges Configuration
 * Fixed definitions and coin prices for all 24 PNG badges in client/public/badges.
 */

export const getBadgeAssetUrl = (fileName) => {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const name = fileName.replace(/^\/?(badges\/)?/, '');
  return `${cleanBase}badges/${name}`;
};

export const BADGES = [
  {
    id: 'rookie',
    name: 'Rookie Scout',
    fileName: 'rookie.png',
    price: 5,
    description: 'First steps into the world of daily focus and determination.',
    tier: 'Common',
  },


  {
    id: 'cat',
    name: 'Lucky Cat',
    fileName: 'cat.png',
    price: 5,
    description: 'A charming lucky feline bringing good fortune and cozy study vibes.',
    tier: 'Common',
  },
 
 

 
  


  {
    id: 'microphone',
    name: 'Broadcast Mic',
    fileName: 'microphone.png',
    price: 18,
    description: 'Speak your goals into existence and present with confidence.',
    tier: 'Rare',
  },
  {
    id: 'party-popper',
    name: 'Celebration Popper',
    fileName: 'party-popper.png',
    price: 33,
    description: 'Throw confetti for every milestone, streak day, and completed Task!',
    tier: 'Rare',
  },
  {
    id: 'romantic-music',
    name: 'Sweet Melody',
    fileName: 'romantic-music.png',
    price: 38,
    description: 'Gentle lofi soundscapes harmonizing your mind into pure flow.',
    tier: 'Epic',
  },
  {
    id: 'guitar',
    name: 'Acoustic Rhythms',
    fileName: 'guitar.png',
    price: 38,
    description: 'Strumming through challenging problem sets with melodic grace.',
    tier: 'Epic',
  },


    {
    id: 'explorer',
    name: 'Frontier Explorer',
    fileName: 'explorer.png',
    price: 39,
    description: 'Venturing boldly into uncharted subjects and complex concepts.',
    tier: 'Legendary',
  },

     {
    id: 'king',
    name: 'Crown of Focus',
    fileName: 'king.png',
    price: 50,
    description: 'Ruling your attention with supreme mastery and regal composure.',
    tier: 'Mythic',
  },

   {
    id: 'eating',
    name: 'Snack Master',
    fileName: 'eating.png',
    price: 65,
    description: 'Fueling deep study sessions with healthy snacks and berries.',
    tier: 'Common',
  },
  {
    id: 'karaoke',
    name: 'Karaoke Star',
    fileName: 'karaoke.png',
    price: 85,
    description: 'Unwinding with rhythm and high notes after a marathon focus sprint.',
    tier: 'Epic',
  },
  

 {
    id: 'boombox',
    name: 'Retro Boombox',
    fileName: 'boombox.png',
    price: 125,
    description: 'Cranking heavy beats and lofi tape vibes for high-energy study.',
    tier: 'Epic',
  },
  {
    id: 'vr-glasses',
    name: 'Virtual Visionary',
    fileName: 'vr-glasses.png',
    price: 170,
    description: 'Immersing yourself in cutting-edge holographic workspaces.',
    tier: 'Epic',
  },
{
    id: 'maloik',
    name: 'Rock On Horns',
    fileName: 'maloik.png',
    price: 210,
    description: 'Unstoppable rock-and-roll energy powering through tough deadlines.',
    tier: 'Epic',
  },
   {
    id: 'house',
    name: 'Cozy Haven',
    fileName: 'house.png',
    price: 380,
    description: 'Building a warm sanctuary of quiet focus and peaceful thoughts.',
    tier: 'Rare',
  },
  {
    id: 'sad',
    name: 'Rainy Day',
    fileName: 'sad.png',
    price: 401,
    description: 'Even on cloudy days, perseverance keeps you moving forward.',
    tier: 'Common',
  },
   {
    id: 'mocking',
    name: 'Playful Jester',
    fileName: 'mocking.png',
    price: 404,
    description: 'Lighthearted humor that defeats burnout and procrastination.',
    tier: 'Common',
  },
   {
    id: 'astronaut',
    name: 'Starlight Astronaut',
    fileName: 'astronaut.png',
    price:513,
    description: 'Exploring the vast frontiers of knowledge beyond the stratosphere.',
    tier: 'Epic',
  },
  {
    id: 'skincare',
    name: 'Self Care Glow',
    fileName: 'skincare.png',
    price: 630,
    description: 'Balancing intense study effort with restful mindfulness and wellness.',
    tier: 'Rare',
  },
  {
    id: 'witch',
    name: 'Mystic Alchemist',
    fileName: 'witch.png',
    price: 750,
    description: 'Brewing potions of pure discipline, deep memory, and focus.',
    tier: 'Legendary',
  },
  {
    id: 'rocket-ship',
    name: 'Orbital Rocket',
    fileName: 'rocket-ship.png',
    price: 839,
    description: 'Launching your academic momentum to escape velocity.',
    tier: 'Legendary',
  },
 
 

    {
    id: 'fingerprint',
    name: 'Unique Identity',
    fileName: 'fingerprint.png',
    price: 999,
    description: 'Your one-of-a-kind learning signature and personal style.',
    tier: 'Rare',
  },

   {
    id: 'iron-man',
    name: 'Titan Armor',
    fileName: 'iron-man.png',
    price: 1300,
    description: 'Indestructible willpower reinforced by high-tech focus mechanics.',
    tier: 'Legendary',
  },
  {
    id: 'legend',
    name: 'Eternal Legend',
    fileName: 'legend.png',
    price: 2000,
    description: 'The highest echelon of focus prestige. Unmatched discipline.',
    tier: 'Mythic',
  },
    {
    id: 'award',
    name: 'Golden Award',
    fileName: 'award.png',
    price: 4000,
    description: 'Recognized excellence for staying committed to study schedules.',
    tier: 'Rare',
  },
];

export const BADGES_MAP = BADGES.reduce((acc, badge) => {
  acc[badge.id] = badge;
  return acc;
}, {});

