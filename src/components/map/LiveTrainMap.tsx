import React from 'react';
import { Platform } from 'react-native';
import type { LiveTrainMapProps } from './types';
import { LiveTrainMap as WebMap } from './LiveTrainMap.web';
import { LiveTrainMap as NativeMap } from './LiveTrainMap.native';

export { type LiveTrainMapProps } from './types';

/**
 * Universal cross-platform LiveTrainMap component:
 * - Delegates to WebMap (DOM iframe Leaflet) on Web
 * - Delegates to NativeMap (react-native-webview Leaflet) on Android/iOS
 */
export const LiveTrainMap: React.FC<LiveTrainMapProps> = (props) => {
  if (Platform.OS === 'web') {
    return <WebMap {...props} />;
  }
  return <NativeMap {...props} />;
};

