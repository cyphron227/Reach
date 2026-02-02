import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dangur.ringur',
  appName: 'Ringur',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,          // 1.5s is plenty
      launchAutoHide: true,
      backgroundColor: '#0F2A1D',         // dark, calm, non-flashy
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  }
};

export default config;
