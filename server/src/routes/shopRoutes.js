import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

export const BADGES_CATALOG = [
  { id: 'rookie', name: 'Rookie Scout', image: '/badges/rookie.png', price: 5, description: 'First steps into the world of daily focus and determination.', tier: 'Common' },
  { id: 'sad', name: 'Rainy Day', image: '/badges/sad.png', price: 8, description: 'Even on cloudy days, perseverance keeps you moving forward.', tier: 'Common' },
  { id: 'cat', name: 'Lucky Cat', image: '/badges/cat.png', price: 10, description: 'A charming lucky feline bringing good fortune and cozy study vibes.', tier: 'Common' },
  { id: 'eating', name: 'Snack Master', image: '/badges/eating.png', price: 12, description: 'Fueling deep study sessions with healthy snacks and berries.', tier: 'Common' },
  { id: 'mocking', name: 'Playful Jester', image: '/badges/mocking.png', price: 14, description: 'Lighthearted humor that defeats burnout and procrastination.', tier: 'Common' },
  { id: 'award', name: 'Golden Award', image: '/badges/award.png', price: 15, description: 'Recognized excellence for staying committed to study schedules.', tier: 'Rare' },
  { id: 'house', name: 'Cozy Haven', image: '/badges/house.png', price: 15, description: 'Building a warm sanctuary of quiet focus and peaceful thoughts.', tier: 'Rare' },
  { id: 'skincare', name: 'Self Care Glow', image: '/badges/skincare.png', price: 15, description: 'Balancing intense study effort with restful mindfulness and wellness.', tier: 'Rare' },
  { id: 'party-popper', name: 'Celebration Popper', image: '/badges/party-popper.png', price: 16, description: 'Throw confetti for every milestone, streak day, and completed quest!', tier: 'Rare' },
  { id: 'fingerprint', name: 'Unique Identity', image: '/badges/fingerprint.png', price: 18, description: 'Your one-of-a-kind learning signature and personal style.', tier: 'Rare' },
  { id: 'microphone', name: 'Broadcast Mic', image: '/badges/microphone.png', price: 18, description: 'Speak your goals into existence and present with confidence.', tier: 'Rare' },
  { id: 'astronaut', name: 'Starlight Astronaut', image: '/badges/astronaut.png', price: 20, description: 'Exploring the vast frontiers of knowledge beyond the stratosphere.', tier: 'Epic' },
  { id: 'karaoke', name: 'Karaoke Star', image: '/badges/karaoke.png', price: 20, description: 'Unwinding with rhythm and high notes after a marathon focus sprint.', tier: 'Epic' },
  { id: 'romantic-music', name: 'Sweet Melody', image: '/badges/romantic-music.png', price: 20, description: 'Gentle lofi soundscapes harmonizing your mind into pure flow.', tier: 'Epic' },
  { id: 'guitar', name: 'Acoustic Rhythms', image: '/badges/guitar.png', price: 22, description: 'Strumming through challenging problem sets with melodic grace.', tier: 'Epic' },
  { id: 'boombox', name: 'Retro Boombox', image: '/badges/boombox.png', price: 25, description: 'Cranking heavy beats and lofi tape vibes for high-energy study.', tier: 'Epic' },
  { id: 'maloik', name: 'Rock On Horns', image: '/badges/maloik.png', price: 25, description: 'Unstoppable rock-and-roll energy powering through tough deadlines.', tier: 'Epic' },
  { id: 'vr-glasses', name: 'Virtual Visionary', image: '/badges/vr-glasses.png', price: 28, description: 'Immersing yourself in cutting-edge holographic workspaces.', tier: 'Epic' },
  { id: 'explorer', name: 'Frontier Explorer', image: '/badges/explorer.png', price: 30, description: 'Venturing boldly into uncharted subjects and complex concepts.', tier: 'Legendary' },
  { id: 'witch', name: 'Mystic Alchemist', image: '/badges/witch.png', price: 32, description: 'Brewing potions of pure discipline, deep memory, and focus.', tier: 'Legendary' },
  { id: 'rocket-ship', name: 'Orbital Rocket', image: '/badges/rocket-ship.png', price: 35, description: 'Launching your academic momentum to escape velocity.', tier: 'Legendary' },
  { id: 'iron-man', name: 'Titan Armor', image: '/badges/iron-man.png', price: 40, description: 'Indestructible willpower reinforced by high-tech focus mechanics.', tier: 'Legendary' },
  { id: 'king', name: 'Crown of Focus', image: '/badges/king.png', price: 50, description: 'Ruling your attention with supreme mastery and regal composure.', tier: 'Mythic' },
  { id: 'legend', name: 'Eternal Legend', image: '/badges/legend.png', price: 60, description: 'The highest echelon of focus prestige. Unmatched discipline.', tier: 'Mythic' },
];

export const SHOP_CATALOG = {
  badges: BADGES_CATALOG,
  apparel: [
    {
      id: 'basic_clothes',
      name: 'Basic Trainee Gear',
      category: 'apparel',
      price: 0,
      description: 'Standard comfortable casuals for starter adventurers.',
      tier: 'Common',
      bonusText: 'Starter Outfit',
    },
    {
      id: 'casual_wear',
      name: 'Cyberpunk Casual Drip',
      category: 'apparel',
      price: 25,
      description: 'Stylized streetwear with neon trim and tactical pockets.',
      tier: 'Rare',
      bonusText: '+5% Focus Aura',
    },
    {
      id: 'premium_boots',
      name: 'Quantum High-Top Boots',
      category: 'apparel',
      price: 60,
      description: 'High-traction magnetic boots designed for long study marathons.',
      tier: 'Epic',
      bonusText: 'Fatigue Resistance',
    },
    {
      id: 'luxury_suit',
      name: 'Platinum Velvet Suit & Chronograph',
      category: 'apparel',
      price: 75,
      description: 'Handcrafted luxury blazer with matching gold chronograph watch.',
      tier: 'Legendary',
      bonusText: 'Charisma +20',
    },
    {
      id: 'neon_tactical',
      name: 'Cyber Samurai Tactical Armor',
      category: 'apparel',
      price: 120,
      description: 'Futuristic glowing battle vest with holographic focus displays.',
      tier: 'Mythic',
      bonusText: 'Deep Flow Shield',
    },
  ],
  vehicles: [
    {
      id: 'bicycle',
      name: 'Eco Commuter Bicycle',
      category: 'vehicles',
      price: 0,
      description: 'Clean, reliable 7-speed city bicycle.',
      tier: 'Common',
    },
    {
      id: 'hatchback',
      name: 'Urban Hatchback Sport',
      category: 'vehicles',
      price: 60,
      description: 'Zippy turbocharged hatchback for daily city commutes.',
      tier: 'Rare',
    },
    {
      id: 'sedan',
      name: 'Executive Luxury Sedan',
      category: 'vehicles',
      price: 150,
      description: 'Smooth tinted German executive cruiser with massage seats.',
      tier: 'Epic',
    },
    {
      id: 'supercar',
      name: 'Apex Cyber Hypercar',
      category: 'vehicles',
      price: 350,
      description: 'Twin-turbine all-wheel drive exotic hypercar with butterfly doors.',
      tier: 'Mythic',
    },
  ],
  realEstate: [
    {
      id: 'cozy_room',
      name: 'Cozy Minimalist Room',
      category: 'realEstate',
      price: 0,
      description: 'Warm, quiet bedroom with desk and warm ambient lights.',
      tier: 'Common',
    },
    {
      id: 'apartment',
      name: 'Skyline View Apartment',
      category: 'realEstate',
      price: 100,
      description: 'High-rise studio with floor-to-ceiling panoramic glass windows.',
      tier: 'Rare',
    },
    {
      id: 'villa',
      name: 'Modern Oceanfront Villa',
      category: 'realEstate',
      price: 250,
      description: 'Multi-level seaside sanctuary with infinity pool and private study deck.',
      tier: 'Epic',
    },
    {
      id: 'mansion',
      name: 'Futuristic Peak Mansion',
      category: 'realEstate',
      price: 500,
      description: 'Cliffside architectural marvel with holographic command center.',
      tier: 'Mythic',
    },
  ],
  accessories: [
    {
      id: 'none',
      name: 'Natural (No Accessory)',
      subCategory: 'all',
      price: 0,
      description: 'Sparky in their natural cute glory.',
      tier: 'Standard',
      compatibility: 'All Cats',
    },
    // --- HATS ---
    {
      id: 'wizard_hat',
      name: 'Sage Wizard Hat',
      subCategory: 'hats',
      price: 20,
      description: 'Charming pointed wizard hat with star band and brim.',
      tier: 'Rare',
      compatibility: 'Headwear',
    },
    {
      id: 'gold_crown',
      name: 'Tiny Royal Crown',
      subCategory: 'hats',
      price: 45,
      description: 'A polished golden crown studded with royal ruby jewels.',
      tier: 'Legendary',
      compatibility: 'Headwear',
    },
    {
      id: 'strawberry_beret',
      name: 'Pastel Strawberry Beret',
      subCategory: 'hats',
      price: 22,
      description: 'Hand-felted pink wool beret with a miniature strawberry stem.',
      tier: 'Rare',
      compatibility: 'Headwear',
    },
    {
      id: 'dapper_tophat',
      name: 'Dapper Victorian Top Hat',
      subCategory: 'hats',
      price: 25,
      description: 'Aristocratic silk top hat with crimson ribbon band.',
      tier: 'Epic',
      compatibility: 'Headwear',
    },
    {
      id: 'party_hat',
      name: 'Festive Celebration Cone',
      subCategory: 'hats',
      price: 0,
      description: 'Cheerful polka-dot party cone hat with fluffy pompom.',
      tier: 'Common',
      compatibility: 'Headwear',
    },
    {
      id: 'winter_beanie',
      name: 'Cozy Knit Bobble Beanie',
      subCategory: 'hats',
      price: 15,
      description: 'Warm ribbed sky-blue winter beanie with puffy pompom.',
      tier: 'Common',
      compatibility: 'Headwear',
    },
    // --- GLASSES ---
    {
      id: 'wire_glasses',
      name: 'Classic Round Wire Glasses',
      subCategory: 'glasses',
      price: 0,
      description: 'Vintage brass wireframe reading spectacles.',
      tier: 'Common',
      compatibility: 'Eyewear',
    },
    {
      id: 'cool_sunglasses',
      name: 'Retro Cool Aviators',
      subCategory: 'glasses',
      price: 18,
      description: 'Dark tinted cool wayfarer sunglasses with sleek shine.',
      tier: 'Rare',
      compatibility: 'Eyewear',
    },
    {
      id: 'cyber_goggles',
      name: 'Tactical Cyber Visor',
      subCategory: 'glasses',
      price: 30,
      description: 'Futuristic glowing neon cyan HUD tactical goggles.',
      tier: 'Epic',
      compatibility: 'Eyewear',
    },
    {
      id: 'reading_nerd_glasses',
      name: 'Professor Study Glasses',
      subCategory: 'glasses',
      price: 15,
      description: 'Classic tortoiseshell thick-frame focus spectacles.',
      tier: 'Common',
      compatibility: 'Eyewear',
    },
    // --- BOWS ---
    {
      id: 'red_bowtie',
      name: 'Gentleman Crimson Bowtie',
      subCategory: 'bows',
      price: 0,
      description: 'Vibrant crimson satin bowtie with center knot.',
      tier: 'Common',
      compatibility: 'Neckwear',
    },
    {
      id: 'pastel_ear_bow',
      name: 'Pastel Peachy Ear Ribbon',
      subCategory: 'bows',
      price: 12,
      description: 'Charming pink silk bow clipped onto Sparky’s ear.',
      tier: 'Rare',
      compatibility: 'Earwear',
    },
    {
      id: 'polka_dot_bow',
      name: 'Golden Polka Dot Bow',
      subCategory: 'bows',
      price: 14,
      description: 'Celebratory golden bow with crisp white dots.',
      tier: 'Rare',
      compatibility: 'Neckwear',
    },
    // --- SCARVES & COLLARS ---
    {
      id: 'cozy_scarf',
      name: 'Warm Emerald Knit Scarf',
      subCategory: 'scarves',
      price: 0,
      description: 'Soft hand-knitted forest emerald scarf with tail fringe.',
      tier: 'Common',
      compatibility: 'Neckwear',
    },
    {
      id: 'crimson_winter_scarf',
      name: 'Festive Burgundy Winter Scarf',
      subCategory: 'scarves',
      price: 16,
      description: 'Deep holiday red woolen wrap scarf.',
      tier: 'Rare',
      compatibility: 'Neckwear',
    },
    {
      id: 'bell_collar',
      name: 'Golden Bell Ribbon Collar',
      subCategory: 'collars',
      price: 10,
      description: 'Soft crimson velvet ribbon with a gentle jingle bell.',
      tier: 'Common',
      compatibility: 'Neckwear',
    },
    {
      id: 'cherry_bandana',
      name: 'Cherry Blossom Bandana',
      subCategory: 'collars',
      price: 14,
      description: 'A playful folded triangular bandana with cherry blossom motif.',
      tier: 'Common',
      compatibility: 'Neckwear',
    },
    // --- CLOTHING & OUTFITS ---
    {
      id: 'cozy_sweater',
      name: 'Cozy Forest Aran Sweater',
      subCategory: 'outfits',
      price: 0,
      description: 'Chunky cream-knit wool cable sweater for brisk autumn mornings.',
      tier: 'Epic',
      compatibility: 'Full Body',
    },
    {
      id: 'pastel_hoodie',
      name: 'Minty Comfort Hoodie',
      subCategory: 'outfits',
      price: 28,
      description: 'Casual pastel hoodie with front pouch pocket.',
      tier: 'Rare',
      compatibility: 'Full Body',
    },
    {
      id: 'gentleman_vest',
      name: 'Classic Tweed Study Vest',
      subCategory: 'outfits',
      price: 32,
      description: 'Sharp tailored tweed vest with polished brass buttons.',
      tier: 'Legendary',
      compatibility: 'Full Body',
    },
    {
      id: 'hero_cape',
      name: 'Brave Crimson Adventurer Cape',
      subCategory: 'outfits',
      price: 35,
      description: 'Regal red hero cape fluttering behind Sparky’s shoulders.',
      tier: 'Legendary',
      compatibility: 'Full Body',
    },
    {
      id: 'mini_backpack',
      name: 'Tiny Explorer Rucksack',
      subCategory: 'backpacks',
      price: 25,
      description: 'Miniature canvas backpack equipped for study adventures.',
      tier: 'Epic',
      compatibility: 'Back / Body',
    },
  ],
  habitats: [
    {
      id: 'forest_meadow',
      name: 'Misty Forest Meadow',
      category: 'habitats',
      price: 0,
      description: 'Lush green moss, soft sunlight, and wildflowers.',
      tier: 'Standard',
      compatibility: 'Room Ambience',
    },
    {
      id: 'cozy_nook',
      name: 'Sunlit Study Nook',
      category: 'habitats',
      price: 35,
      description: 'Warm oak desk, monstera plant, and amber study lamp.',
      tier: 'Rare',
      compatibility: 'Room Ambience',
    },
    {
      id: 'sunset_beach',
      name: 'Sunset Coastline',
      category: 'habitats',
      price: 80,
      description: 'Warm golden hour sands and calm pastel teal sea breeze.',
      tier: 'Epic',
      compatibility: 'Room Ambience',
    },
    {
      id: 'celestial',
      name: 'Celestial Observatory',
      category: 'habitats',
      price: 150,
      description: 'Deep midnight blue canopy with glowing star constellations.',
      tier: 'Mythic',
      compatibility: 'Room Ambience',
    },
  ],
  specialAvatars: [
    {
      id: 'businessman',
      name: 'Suit & Boot Businessman',
      category: 'avatar',
      price: 'Locked (365-Day Streak)',
      description: 'The pinnacle of discipline and unshakeable consistency. Wears an immaculate gold-threaded three-piece suit with polished Italian boots.',
      unlockRequirement: 'Achieve a 365-Day Global Main Consistency Streak.',
      tier: 'Ascendant Mythic',
    },
  ],
};

// 1. Get Catalog & User's inventory status
router.get('/catalog', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const isPetFainted = user.pet && !user.pet.isAlive;

    return res.json({
      success: true,
      catalog: SHOP_CATALOG,
      userCoins: user.coins,
      isShopLocked: isPetFainted,
      lockReason: isPetFainted ? 'Pet has fainted from neglect! Revive pet to unlock shop.' : null,
      inventory: user.inventory,
      currentGlobalStreak: user.streaks?.currentGlobalStreak || 0,
      bestGlobalStreak: user.streaks?.bestGlobalStreak || 0,
      unlockedBusinessSuit: Boolean(user.inventory?.unlockedBusinessSuit || user.streaks?.bestGlobalStreak >= 365),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load shop catalog.' });
  }
});

// 2. Buy Item
router.post('/buy', requireAuth, async (req, res) => {
  try {
    const { category, itemId } = req.body;
    const user = req.user;

    // Neglect rule: If pet faints, shop items are locked
    if (user.pet && !user.pet.isAlive) {
      return res.status(403).json({
        success: false,
        message: 'The Shop is locked! Your pet has fainted from neglect. You must revive your pet before making purchases.',
      });
    }

    if (!category || !itemId) {
      return res.status(400).json({ success: false, message: 'Category and itemId are required.' });
    }

    const items = SHOP_CATALOG[category];
    if (!items) {
      return res.status(400).json({ success: false, message: 'Invalid category.' });
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in catalog.' });
    }

    // Check if user already owns this item
    const userCategoryList = user.inventory[category] || [];
    if (userCategoryList.includes(itemId)) {
      return res.status(400).json({ success: false, message: 'You already own this item!' });
    }

    // Check coins
    if (user.coins < item.price) {
      return res.status(400).json({
        success: false,
        message: `Not enough coins! You need ${item.price} coins, but you only have ${user.coins} coins.`,
      });
    }

    // Deduct coins & add to inventory
    user.coins -= item.price;
    if (!user.inventory[category]) user.inventory[category] = [];
    user.inventory[category].push(itemId);

    if (category === 'badges') {
      if (!user.inventory.showcaseBadges) user.inventory.showcaseBadges = [];
      if (user.inventory.showcaseBadges.length < 5 && !user.inventory.showcaseBadges.includes(itemId)) {
        user.inventory.showcaseBadges.push(itemId);
      }
    }

    // Auto-equip freshly bought item with modular slot support
    if (category === 'apparel') user.inventory.equippedApparel = itemId;
    if (category === 'vehicles') user.inventory.equippedVehicle = itemId;
    if (category === 'realEstate') user.inventory.equippedRealEstate = itemId;
    if (category === 'habitats') user.inventory.equippedHabitat = itemId;
    if (category === 'accessories') {
      user.inventory.equippedAccessory = itemId;
      const sub = item.subCategory;
      if (sub === 'hats') user.inventory.equippedHat = itemId;
      else if (sub === 'glasses') user.inventory.equippedGlasses = itemId;
      else if (sub === 'bows' || sub === 'scarves' || sub === 'collars') user.inventory.equippedNeckwear = itemId;
      else if (sub === 'outfits') user.inventory.equippedOutfit = itemId;
    }

    await user.save();

    return res.json({
      success: true,
      message: `Purchased and equipped ${item.name}!`,
      item,
      coins: user.coins,
      inventory: user.inventory,
    });
  } catch (error) {
    console.error('[Shop Error] Buy:', error);
    return res.status(500).json({ success: false, message: 'Failed to process purchase.' });
  }
});

// 3. Equip Item (Supports modular slots: hat, glasses, neckwear, outfit)
router.post('/equip', requireAuth, async (req, res) => {
  try {
    const { category, itemId, slot } = req.body;
    const user = req.user;

    if (category === 'avatar') {
      const allowed = ['cat', 'deer', 'bunny', 'bear', 'fox'];
      if (itemId === 'businessman') {
        const isUnlocked = user.inventory?.unlockedBusinessSuit || (user.streaks && user.streaks.bestGlobalStreak >= 365);
        if (!isUnlocked) {
          return res.status(403).json({
            success: false,
            message: 'Suit & Boot Businessman is strictly locked behind a 365-day consistency streak!',
          });
        }
        user.selectedAvatar = 'businessman';
      } else if (allowed.includes(itemId)) {
        user.selectedAvatar = itemId;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid avatar choice.' });
      }

      await user.save();
      return res.json({ success: true, message: `Equipped ${itemId} avatar!`, user });
    }

    // Unequip handling for modular slots
    if (category === 'accessories' && itemId === 'none') {
      if (slot === 'hat') user.inventory.equippedHat = 'none';
      else if (slot === 'glasses') user.inventory.equippedGlasses = 'none';
      else if (slot === 'neckwear') user.inventory.equippedNeckwear = 'none';
      else if (slot === 'outfit') user.inventory.equippedOutfit = 'none';
      else {
        user.inventory.equippedAccessory = 'none';
        user.inventory.equippedHat = 'none';
        user.inventory.equippedGlasses = 'none';
        user.inventory.equippedNeckwear = 'none';
        user.inventory.equippedOutfit = 'none';
      }
      await user.save();
      return res.json({
        success: true,
        message: `Unequipped ${slot || 'accessory'}!`,
        inventory: user.inventory,
      });
    }

    // For apparel, vehicles, realEstate, accessories
    const userCategoryList = user.inventory[category] || [];
    
    // Auto-grant 0-coin starter items if not yet registered in user list
    if (category === 'accessories' && !userCategoryList.includes(itemId)) {
      const catItem = SHOP_CATALOG.accessories.find((i) => i.id === itemId);
      if (catItem && catItem.price === 0) {
        user.inventory.accessories.push(itemId);
      } else {
        return res.status(400).json({ success: false, message: 'You do not own this item yet.' });
      }
    } else if (!userCategoryList.includes(itemId)) {
      return res.status(400).json({ success: false, message: 'You do not own this item yet.' });
    }

    if (category === 'apparel') user.inventory.equippedApparel = itemId;
    if (category === 'vehicles') user.inventory.equippedVehicle = itemId;
    if (category === 'realEstate') user.inventory.equippedRealEstate = itemId;
    if (category === 'habitats') user.inventory.equippedHabitat = itemId;
    
    if (category === 'accessories') {
      user.inventory.equippedAccessory = itemId;
      const catItem = SHOP_CATALOG.accessories.find((i) => i.id === itemId);
      const sub = slot || catItem?.subCategory;
      if (sub === 'hats' || sub === 'hat') user.inventory.equippedHat = itemId;
      else if (sub === 'glasses') user.inventory.equippedGlasses = itemId;
      else if (sub === 'bows' || sub === 'scarves' || sub === 'collars' || sub === 'neckwear') user.inventory.equippedNeckwear = itemId;
      else if (sub === 'outfits' || sub === 'outfit') user.inventory.equippedOutfit = itemId;
    }

    await user.save();

    return res.json({
      success: true,
      message: `Equipped ${itemId}!`,
      inventory: user.inventory,
    });
  } catch (error) {
    console.error('[Shop Error] Equip:', error);
    return res.status(500).json({ success: false, message: 'Failed to equip item.' });
  }
});

// 4. Update Showcase Badges for Profile
router.post('/showcase-badges', requireAuth, async (req, res) => {
  try {
    const { showcaseBadges } = req.body;
    const user = req.user;

    if (!Array.isArray(showcaseBadges)) {
      return res.status(400).json({ success: false, message: 'showcaseBadges must be an array.' });
    }

    if (!user.inventory) user.inventory = {};
    const owned = user.inventory.badges || [];
    // Only allow badges that the user actually owns, max 5 showcase badges
    const valid = showcaseBadges.filter((id) => owned.includes(id)).slice(0, 5);

    user.inventory.showcaseBadges = valid;
    user.markModified('inventory');
    await user.save();

    return res.json({
      success: true,
      message: 'Showcase badges successfully updated!',
      showcaseBadges: user.inventory.showcaseBadges,
      inventory: user.inventory,
    });
  } catch (error) {
    console.error('[Shop Error] Showcase Badges:', error);
    return res.status(500).json({ success: false, message: 'Failed to update showcase badges.' });
  }
});

export default router;
