import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kostin.app',
  appName: 'KostIn',
  webDir: 'out',
  server: {
    url: 'https://kost-in-three.vercel.app',
    cleartext: false
  }
};

export default config;
