import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const currentDir = import.meta.dirname;
  // 1. Load environment variables from client directory
  const clientEnv = loadEnv(mode, currentDir, '');
  // 2. Load environment variables from project root directory (where Vercel creates .env.production.local in monorepos)
  const rootDir = path.resolve(currentDir, '..');
  const rootEnv = loadEnv(mode, rootDir, '');

  // Check all standard sources (Vite prefix, root fallback, process.env)
  const googleClientId = (
    process.env.VITE_GOOGLE_CLIENT_ID ||
    clientEnv.VITE_GOOGLE_CLIENT_ID ||
    rootEnv.VITE_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    clientEnv.GOOGLE_CLIENT_ID ||
    rootEnv.GOOGLE_CLIENT_ID ||
    ''
  ).trim();

  const vapidPublicKey = (
    process.env.VITE_VAPID_PUBLIC_KEY ||
    clientEnv.VITE_VAPID_PUBLIC_KEY ||
    rootEnv.VITE_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    clientEnv.VAPID_PUBLIC_KEY ||
    rootEnv.VAPID_PUBLIC_KEY ||
    ''
  ).trim();

  // Safe build-time diagnostic (does NOT expose the actual ID value or any secret)
  const hasClientId = Boolean(googleClientId && googleClientId.length > 0);
  console.log(
    `[Vite Build Diagnostic] Google Client ID configured: ${hasClientId}` +
      (hasClientId ? ` (length: ${googleClientId.length})` : ' (empty)')
  );

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
      'import.meta.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify(vapidPublicKey),
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});

