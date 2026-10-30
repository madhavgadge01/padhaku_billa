import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PushSubscription } from '../models/PushSubscription.js';
import {
  getVapidPublicKey,
  sendPushToUser,
} from '../utils/notificationService.js';

const router = express.Router();

// 1. Get VAPID Public Key for frontend client subscription
router.get('/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: 'VAPID public key is not configured on server.',
    });
  }
  return res.json({
    success: true,
    publicKey,
  });
});

// 2. Subscribe user's browser device to Push Notifications
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription payload. Endpoint and keys are required.',
      });
    }

    const { endpoint, keys } = subscription;
    const userAgent = req.headers['user-agent'] || '';

    // Upsert subscription for this endpoint
    const updated = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Push notification subscription registered successfully.',
      subscriptionId: updated._id,
    });
  } catch (error) {
    console.error('[Notification Error] Subscribe:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save push notification subscription.',
    });
  }
});

// 3. Unsubscribe a specific browser endpoint
router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
    } else {
      await PushSubscription.deleteMany({ userId: req.user._id });
    }
    return res.json({
      success: true,
      message: 'Push notification subscription removed.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription.',
    });
  }
});

// 4. Send test push notification to user's registered devices
router.post('/test', requireAuth, async (req, res) => {
  try {
    const result = await sendPushToUser(req.user._id, {
      title: 'Padhaku Billa Notifications Active! 🐾',
      body: 'Your device is configured to receive background focus notifications.',
      icon: '/favicon.svg',
      tag: 'test-notification',
      url: '/focus',
    });

    return res.json({
      success: true,
      message: `Test notification dispatched to ${result.sentCount} device(s).`,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch test notification.',
    });
  }
});

export default router;

