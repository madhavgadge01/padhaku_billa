import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const GoogleLogo = ({ className = 'w-5 h-5 flex-shrink-0' }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const GoogleSignInButton = ({
  onSuccess,
  onError,
  loading = false,
  text = 'continue_with', // 'continue_with' | 'signin_with' | 'signup_with'
  className = '',
}) => {
  const containerRef = useRef(null);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [initError, setInitError] = useState('');

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  // 1. Initialize and render official Google Identity Services button
  useEffect(() => {
    // Safe runtime diagnostic: confirms configuration status without exposing the actual Client ID
    const isConfigured = Boolean(clientId && clientId.length > 0);
    const hasGoogleSuffix = isConfigured && clientId.endsWith('.apps.googleusercontent.com');

    console.log(
      `[Padhaku Billa Auth Diagnostic] Google Client ID loaded: ${isConfigured ? 'YES' : 'NO'}` +
        (isConfigured
          ? ` (length: ${clientId.length}, format: ${hasGoogleSuffix ? 'valid Google Client ID' : 'custom ID'})`
          : ' (VITE_GOOGLE_CLIENT_ID missing)')
    );

    if (!clientId) {
      setInitError('VITE_GOOGLE_CLIENT_ID is not configured in Vercel environment.');
      return;
    }

    let intervalId = null;

    const setupGoogleButton = () => {
      if (window.google?.accounts?.id && containerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response && response.credential) {
                onSuccess(response.credential);
              } else {
                if (onError) onError('Google Sign-In was cancelled or did not return a credential.');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Clear any previous rendered button instance
          containerRef.current.innerHTML = '';

          // Render official Google button
          window.google.accounts.id.renderButton(containerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: text,
            shape: 'pill',
            width: 320,
            logo_alignment: 'left',
          });

          setGisLoaded(true);
          setInitError('');
          return true;
        } catch (err) {
          console.error('[Google GIS Error]', err);
          setInitError(err.message || 'Failed to initialize Google Sign-In.');
          return false;
        }
      }
      return false;
    };

    if (!setupGoogleButton()) {
      // Poll briefly for script to load if it hasn't completed yet
      intervalId = setInterval(() => {
        if (setupGoogleButton()) {
          clearInterval(intervalId);
        }
      }, 200);

      // Stop polling after 6 seconds to avoid infinite loop
      const timeoutId = setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
        if (!window.google?.accounts?.id) {
          setInitError('Google Identity Services script did not load. Check internet or adblocker.');
        }
      }, 6000);

      return () => {
        if (intervalId) clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [clientId, text]);

  // Fallback handler if user clicks fallback button
  const handleFallbackClick = () => {
    if (loading) return;

    if (!clientId) {
      if (onError) onError('Google Client ID is not configured in environment variables.');
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One Tap is skipped or blocked, try re-rendering the standard button
          if (containerRef.current?.firstChild) {
            containerRef.current.firstChild.click?.();
          }
        }
      });
    } else {
      if (onError) onError('Google Sign-In is still initializing. Please wait a moment.');
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Official Google Identity Services Rendered Container */}
      <div
        ref={containerRef}
        className={`w-full flex justify-center min-h-[44px] transition-opacity duration-200 ${
          loading ? 'opacity-40 pointer-events-none' : ''
        }`}
      />

      {/* Styled Fallback / Loading placeholder while GIS script attaches */}
      {!gisLoaded && !initError && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={loading}
          className="w-full max-w-[320px] flex items-center justify-center space-x-3 px-5 py-3 rounded-full border border-[#EAE5DD] dark:border-[#253D35] bg-white dark:bg-[#162420] text-[#1C2A24] dark:text-[#F2F7F4] text-xs font-bold shadow-2xs hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#1B3B2F] dark:text-[#A3D9C9]" />
          ) : (
            <GoogleLogo />
          )}
          <span>Continue with Google</span>
        </button>
      )}

      {initError && (
        <p className="text-[11px] font-semibold text-rose-500 mt-1.5 text-center px-2">
          {initError}
        </p>
      )}
    </div>
  );
};

export default GoogleSignInButton;

