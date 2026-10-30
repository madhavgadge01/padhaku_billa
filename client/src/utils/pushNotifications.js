import { api } from '../services/api';

// Convert a base64 string to a Uint8Array for applicationServerKey
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the Service Worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Push] Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if the browser supports notifications and push
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Detect iOS environment
 */
export function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Check if app is running as installed standalone PWA
 */
export function isStandalonePWA() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Get current push notification status
 */
export async function getPushNotificationStatus() {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      reason: 'Browser does not support Web Push notifications.',
    };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      subscribed: Boolean(subscription),
      subscription,
    };
  } catch (err) {
    return {
      supported: true,
      permission,
      subscribed: false,
      error: err.message,
    };
  }
}

/**
 * Subscribe the user to Web Push notifications
 */
export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notification permission was denied. Please enable notifications in your browser settings.'
        : 'Notification permission was dismissed.'
    );
  }

  // Ensure Service Worker is ready
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await registerServiceWorker();
  }
  await navigator.serviceWorker.ready;

  // Retrieve VAPID public key
  let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    try {
      const res = await api.getVapidPublicKey();
      if (res.success && res.publicKey) {
        vapidPublicKey = res.publicKey;
      }
    } catch (e) {
      console.warn('[Push] Failed to fetch VAPID key from backend:', e);
    }
  }

  if (!vapidPublicKey) {
    throw new Error('VAPID public key is not configured.');
  }

  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

  // Subscribe via PushManager
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  }

  // Send to backend
  await api.subscribePush(subscription);
  console.log('[Push] Successfully subscribed to background notifications!');
  return subscription;
}

/**
 * Unsubscribe the user from Web Push notifications
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.unsubscribePush(subscription.endpoint).catch(() => {});
      await subscription.unsubscribe();
      console.log('[Push] Successfully unsubscribed from push notifications.');
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
    throw err;
  }
}

