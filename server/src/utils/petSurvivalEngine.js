import { isRestDayForUser } from './streakEngine.js';

/**
 * Calculates decay for user's pet based on elapsed time and rest days
 * Avoids punishing real study breaks or making pet permanently die
 */
export const checkAndApplyPetDecay = async (user) => {
  if (!user.pet) return user;

  const now = new Date();
  const lastCheck = user.pet.lastDecayCheck ? new Date(user.pet.lastDecayCheck) : new Date(now.getTime() - 3600000);
  const hoursElapsed = Math.max(0, (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60));

  // If today is user's rest day, decay is completely frozen
  const isRestDayToday = isRestDayForUser(user, now);

  if (isRestDayToday) {
    user.pet.lastDecayCheck = now;
    await user.save();
    return {
      user,
      decayApplied: false,
      reason: 'Rest day active: hunger, thirst, and health decay frozen.',
      isRestDay: true,
    };
  }

  if (hoursElapsed < 0.25) {
    return { user, decayApplied: false, isRestDay: false };
  }

  // Gentle, transparent decay rates:
  // Hunger: ~2.5% per elapsed hour
  // Thirst: ~3.0% per elapsed hour
  let currentHunger = user.pet.hunger ?? 50;
  let currentThirst = user.pet.thirst ?? 50;
  let currentHealth = user.pet.health ?? 50;
  let currentVitality = user.pet.vitality ?? currentHealth;
  let currentAffection = user.pet.affection ?? 30;

  // Don't decay if in introductory care state
  if (user.pet.hasCompletedIntroCare) {
    currentHunger = Math.max(0, currentHunger - hoursElapsed * 2.5);
    currentThirst = Math.max(0, currentThirst - hoursElapsed * 3.0);

    // If both hunger and thirst reach 0 for a prolonged time, health decreases gently to a floor of 20 (safe floor)
    if (currentHunger === 0 && currentThirst === 0) {
      currentHealth = Math.max(20, currentHealth - hoursElapsed * 2.0);
      currentVitality = currentHealth;
    }
  }

  user.pet.hunger = Math.round(currentHunger);
  user.pet.thirst = Math.round(currentThirst);
  user.pet.health = Math.round(currentHealth);
  user.pet.vitality = Math.round(currentVitality);
  user.pet.affection = Math.round(currentAffection);
  user.pet.lastDecayCheck = now;

  await user.save();

  return {
    user,
    decayApplied: true,
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
    isRestDay: false,
  };
};

/**
 * Feed pet with food
 * Costs 2 coins (free during intro care), adds +30 hunger, +12 health/vitality, +6 affection
 */
export const feedPetMeal = async (user) => {
  const isIntro = !user.pet.hasCompletedIntroCare;

  if (!isIntro && user.coins < 2) {
    throw new Error('Need 2 coins to buy a berry meal! Complete a focus session to earn coins.');
  }

  if (!isIntro) {
    user.coins = Math.max(0, user.coins - 2);
  }

  user.pet.hunger = Math.min(100, (user.pet.hunger || 0) + 30);
  user.pet.health = Math.min(100, (user.pet.health || 35) + 12);
  user.pet.vitality = user.pet.health;
  user.pet.affection = Math.min(100, (user.pet.affection || 20) + 6);
  user.pet.lastFedAt = new Date();
  user.pet.lastDecayCheck = new Date();

  // Check if intro care is now fulfilled
  if (isIntro && user.pet.hunger >= 25 && (user.pet.thirst || 0) >= 25) {
    user.pet.hasCompletedIntroCare = true;
  }

  await user.save();
  return user;
};

/**
 * Give pet clean water
 * Costs 1 coin (free during intro care), adds +35 thirst, +10 health/vitality, +5 affection
 */
export const hydratePetWater = async (user) => {
  const isIntro = !user.pet.hasCompletedIntroCare;

  if (!isIntro && user.coins < 1) {
    throw new Error('Need 1 coin for pure spring water! Complete a focus session to earn coins.');
  }

  if (!isIntro) {
    user.coins = Math.max(0, user.coins - 1);
  }

  user.pet.thirst = Math.min(100, (user.pet.thirst || 0) + 35);
  user.pet.health = Math.min(100, (user.pet.health || 35) + 10);
  user.pet.vitality = user.pet.health;
  user.pet.affection = Math.min(100, (user.pet.affection || 20) + 5);
  user.pet.lastWateredAt = new Date();
  user.pet.lastDecayCheck = new Date();

  // Check if intro care is now fulfilled
  if (isIntro && (user.pet.hunger || 0) >= 25 && user.pet.thirst >= 25) {
    user.pet.hasCompletedIntroCare = true;
  }

  await user.save();
  return user;
};

/**
 * Revive fainted pet with Revival Elixir
 */
export const revivePet = async (user) => {
  if (user.coins < 10) {
    throw new Error('Revival Elixir costs 10 coins.');
  }

  user.coins -= 10;
  user.pet.isAlive = true;
  user.pet.health = 50;
  user.pet.vitality = 50;
  user.pet.hunger = 40;
  user.pet.thirst = 40;
  user.pet.affection = 30;
  user.pet.lastFedAt = new Date();
  user.pet.lastWateredAt = new Date();
  user.pet.lastDecayCheck = new Date();

  await user.save();
  return user;
};
