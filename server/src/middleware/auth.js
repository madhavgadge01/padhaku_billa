import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_lifelevel_rpg_key_2026_jwt';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User session expired or user not found.' });
    }

    // Auto-migrate users with legacy default 06:00 to new 00:00 (12:00 AM Midnight) default
    if (!user.hasExplicitResetTime && (!user.dailyResetTime || user.dailyResetTime === '06:00')) {
      user.dailyResetTime = '00:00';
      try {
        await user.save();
      } catch (saveErr) {
        console.warn('[Auth Middleware] User reset migration notice:', saveErr.message);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};
