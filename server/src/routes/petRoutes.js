import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkAndApplyPetDecay, feedPetMeal, hydratePetWater, revivePet } from '../utils/petSurvivalEngine.js';
import { isRestDayForUser } from '../utils/streakEngine.js';

const router = express.Router();

// 1. Get Pet Status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const decayResult = await checkAndApplyPetDecay(user);
    const isRestDayToday = isRestDayForUser(user, new Date());

    return res.json({
      success: true,
      pet: user.pet,
      coins: user.coins,
      isRestDayToday,
      decayInfo: {
        applied: decayResult.decayApplied,
        isRestDay: isRestDayToday,
      },
    });
  } catch (error) {
    console.error('[Pet Error] Status:', error);
    return res.status(500).json({ success: false, message: 'Failed to load pet status.' });
  }
});

// 2. Feed Pet (Costs 2 coins)
router.post('/feed', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    await feedPetMeal(user);
    return res.json({
      success: true,
      message: 'Pet fed with nutritious meal! (+25 Hunger, +10 Health, +5 Affection).',
      pet: user.pet,
      coins: user.coins,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 3. Hydrate Pet with Water (Costs 1 coin)
router.post('/water', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    await hydratePetWater(user);
    return res.json({
      success: true,
      message: 'Pet refreshed with pure water! (+15 Hydration, +5 Health, +2 Affection).',
      pet: user.pet,
      coins: user.coins,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 4. Revive Pet (Costs 10 coins)
router.post('/revive', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    await revivePet(user);
    return res.json({
      success: true,
      message: 'Miracle! Revival Elixir brought your pet back to life with restored vitality.',
      pet: user.pet,
      coins: user.coins,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 5. Play / Pet companion (Free action that boosts affection)
router.post('/play', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user.pet.isAlive) {
      return res.status(400).json({ success: false, message: 'Your pet has fainted! Please revive Sparky first.' });
    }
    user.pet.affection = Math.min(100, (user.pet.affection || 50) + 6);
    user.pet.health = Math.min(100, (user.pet.health || 80) + 2);
    await user.save();
    return res.json({
      success: true,
      message: 'Sparky loved the cuddle! (+6 Affection, +2 Vitality).',
      pet: user.pet,
      coins: user.coins,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// 6. Complete Introductory Care Moment
router.post('/intro-complete', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    user.pet.hasCompletedIntroCare = true;
    user.pet.hunger = Math.max(user.pet.hunger || 0, 50);
    user.pet.thirst = Math.max(user.pet.thirst || 0, 50);
    user.pet.health = Math.max(user.pet.health || 0, 60);
    user.pet.vitality = user.pet.health;
    await user.save();
    return res.json({
      success: true,
      message: 'Introductory care complete! Focus quests unlocked.',
      pet: user.pet,
      coins: user.coins,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
