import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // jeep-sqlite (the web build of @capacitor-community/sqlite) loads a wasm binary.
  // We don't pre-bundle it so the custom element registers correctly at runtime.
  optimizeDeps: { exclude: ['jeep-sqlite'] },
  server: { 
    port: 5173,
    middlewareMode: false,
    // Don't use SPA fallback for static files - serve them as-is
    fs: { strict: false },
  },
  publicDir: 'public',
});
