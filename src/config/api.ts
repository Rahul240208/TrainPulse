import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the TrainPulse backend API base URL across:
 * 1. Explicit environment override (EXPO_PUBLIC_API_URL)
 * 2. Web browser running on localhost (http://localhost:3000)
 * 3. Mobile device running via Expo Go (extracts host machine LAN IP from hostUri)
 * 4. Fallback default
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // Running in browser (React Native Web)
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // Running on Android or iOS (Expo Go / Emulator)
  // Constants.expoConfig?.hostUri returns e.g. "192.168.1.5:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp) {
      return `http://${hostIp}:3000`;
    }
  }

  return 'http://localhost:3000';
}

