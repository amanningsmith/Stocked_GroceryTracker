import { CapacitorConfig } from '@capacitor/cli';

// Capacitor config. App targets a single Android tablet, sideloaded APK.
const config: CapacitorConfig = {
  appId: 'com.manning.recipeapp',
  appName: 'Recipe App',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      // Native Android uses the built-in SQLite. No encryption in v1 (single-user device).
      androidIsEncryption: false,
    },
  },
};

export default config;
