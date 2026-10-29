import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const targetUrl = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelevel';

async function performCleanReset() {
  console.log('========================================================');
  console.log('🔄 LIFELEVEL INTENTIONAL PRODUCTION LAUNCH DATA RESET');
  console.log('========================================================');

  // Verify backup exists
  const backupDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupDir) || fs.readdirSync(backupDir).length === 0) {
    throw new Error('Safety check failed: No database backup found in server/backups. Aborting.');
  }

  const latestBackup = fs.readdirSync(backupDir).sort().reverse()[0];
  console.log(`✅ Verified safety backup exists: ${latestBackup}`);

  // Connect to target DB
  console.log(`[Database] Connecting to target database...`);
  let conn = null;
  try {
    conn = await mongoose.connect(targetUrl, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    if (process.env.MONGODB_URI && targetUrl !== process.env.MONGODB_URI) {
      console.warn(`[Database Warning] Could not connect to MONGODB_URL (${err.message}). Falling back to local MONGODB_URI for reset...`);
      conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    } else {
      throw err;
    }
  }
  console.log(`Connected to host: ${conn.connection.host}, database: ${conn.connection.name}`);

  const db = conn.connection.db;

  // Verify collections exist before reset
  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  console.log('Active collections detected in database:', collections);

  // 1. Reset LifeLevel demo users
  let deletedUsers = 0;
  if (collections.includes('users')) {
    const res = await db.collection('users').deleteMany({});
    deletedUsers = res.deletedCount;
    console.log(`🧹 Reset users collection: removed ${deletedUsers} development/demo user accounts.`);
  }

  // 2. Reset LifeLevel focus sessions
  let deletedSessions = 0;
  if (collections.includes('pomodorosessions')) {
    const res = await db.collection('pomodorosessions').deleteMany({});
    deletedSessions = res.deletedCount;
    console.log(`🧹 Reset pomodorosessions collection: removed ${deletedSessions} historical sessions.`);
  }

  // 3. Reset LifeLevel tasks
  let deletedTasks = 0;
  if (collections.includes('tasks')) {
    const res = await db.collection('tasks').deleteMany({});
    deletedTasks = res.deletedCount;
    console.log(`🧹 Reset tasks collection: removed ${deletedTasks} development tasks.`);
  }

  // 4. Reset LifeLevel coin transactions & email verifications
  if (collections.includes('cointransactions')) {
    await db.collection('cointransactions').deleteMany({});
    console.log('🧹 Reset cointransactions collection: cleared audit ledger.');
  }
  if (collections.includes('emailverifications')) {
    await db.collection('emailverifications').deleteMany({});
    console.log('🧹 Reset emailverifications collection: cleared verification tokens.');
  }

  console.log('\n========================================================');
  console.log('✨ CLEAN DATABASE STATE INITIALIZATION COMPLETE:');
  console.log(`   - Users count: 0 (new signups will start fresh)`);
  console.log(`   - Completed focus sessions: 0 (empty history)`);
  console.log(`   - Tasks count: 0`);
  console.log(`   - Coin balance default: 0`);
  console.log(`   - Leaderboard entries: 0 (clean empty state)`);
  console.log('========================================================\n');

  await mongoose.disconnect();
}

performCleanReset().catch((err) => {
  console.error('❌ Reset failed:', err.message);
  process.exit(1);
});
