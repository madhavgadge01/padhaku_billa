/**
 * Device & APK utilities for Padhaku Billa
 */

export const APP_VERSION = 'v1.7.3-sparky-final';
export const APK_FILE_NAME = 'Padhaku_Billa_v1.7.3.apk';
export const APK_DOWNLOAD_URL = '/Padhaku%20Billa.apk';

export const isIOSDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const triggerApkDownload = () => {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = APK_DOWNLOAD_URL;
  link.download = APK_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

