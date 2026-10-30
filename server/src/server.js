import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import pomodoroRoutes from './routes/pomodoroRoutes.js';
import petRoutes from './routes/petRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { startNotificationWatchdog } from './utils/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust dotenv resolution: checks server/.env, parent .env, or current directory
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Safe startup configuration validation
const validateEnvironment = () => {
  const missing = [];
  if (!process.env.MONGODB_URL && !process.env.MONGODB_URI) {
    missing.push('MONGODB_URL (or MONGODB_URI)');
  }
  if (!process.env.BREVO) {
    console.warn('⚠️  [Config Warning]: BREVO key is not configured. Email OTP delivery will fall back to console output in development.');
  }
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  [Config Warning]: JWT_SECRET is not set. Using internal fallback secret.');
  }

  if (missing.length > 0) {
    console.error(`❌ [Fatal Startup Error]: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please configure these in your server/.env file before running.');
    process.exit(1);
  }
};

validateEnvironment();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Padhaku Billa Gamified Focus RPG Backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/pet', petRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationRoutes);

// SPA Static File Serving & Client Route Fallback (for production direct URL access & refresh)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    startNotificationWatchdog();
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 LIFELEVEL RPG PRODUCTION SERVER RUNNING ON PORT ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Fatal: Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
