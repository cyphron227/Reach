import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dangur.ringur',
  appName: 'Ringur',
  webDir: 'out',
  server: {
    // Allow loading from the local file system
    androidScheme: 'https'
  }
};

export default config;
