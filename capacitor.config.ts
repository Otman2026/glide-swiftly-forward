import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saifo.transport.erp',
  appName: 'SAIFO TRANSPORT ERP',
  webDir: 'dist',
  // Hot-reload from the published Lovable URL during development.
  // For production store builds, comment out the `server` block below,
  // run `bun run build`, then `npx cap sync`.
  server: {
    url: 'https://id-preview--6022ace2-8024-4a28-8eaa-13f2d183b5ee.lovable.app?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0B2545',
  },
  android: {
    backgroundColor: '#0B2545',
    allowMixedContent: false,
  },
};

export default config;
