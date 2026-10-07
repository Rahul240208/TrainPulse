import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeProvider';
import { normalizeMapData, type LiveTrainMapProps } from './types';
import { generateLeafletHtml } from './leafletTemplate';
import { MapTruthfulBanner } from './MapTruthfulBanner';

const NativeWebView = WebView as unknown as React.ComponentType<any>;

export const LiveTrainMap: React.FC<LiveTrainMapProps> = ({
  train,
  height = 320,
  showOverlay = true,
  focusStationCode,
  isStale,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const webViewRef = useRef<any>(null);
  const normalizedData = useMemo(() => {
    const data = normalizeMapData(train);
    if (isStale !== undefined) {
      data.isStale = isStale;
    }
    return data;
  }, [train, isStale]);
  
  const activeTrainNumberRef = useRef<string>(normalizedData.trainNumber);
  const activeCoordsRef = useRef<boolean>(normalizedData.hasExactCoordinates);
  const activeStationsCountRef = useRef<number>(normalizedData.stations.length);
  
  const [initialHtml, setInitialHtml] = useState<string>(() =>
    generateLeafletHtml(normalizedData)
  );

  // Send smooth station focus when focusStationCode changes
  useEffect(() => {
    if (focusStationCode) {
      try {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: 'FOCUS_STATION',
            data: { code: focusStationCode },
          })
        );
      } catch {
        // Ignored if webView not ready
      }
    }
  }, [focusStationCode]);

  // Send smooth telemetry updates to WebView via postMessage
  useEffect(() => {
    const isNewTrain = normalizedData.trainNumber !== activeTrainNumberRef.current;
    const gainedCoords = !activeCoordsRef.current && normalizedData.hasExactCoordinates;
    const gainedStations = activeStationsCountRef.current === 0 && normalizedData.stations.length > 0;

    if (isNewTrain || gainedCoords || gainedStations) {
      activeTrainNumberRef.current = normalizedData.trainNumber;
      activeCoordsRef.current = normalizedData.hasExactCoordinates;
      activeStationsCountRef.current = normalizedData.stations.length;
      setInitialHtml(generateLeafletHtml(normalizedData));
    } else {
      try {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: 'UPDATE_TELEMETRY',
            data: normalizedData,
          })
        );
      } catch {
        // Ignored if webView not mounted
      }
    }
  }, [normalizedData]);

  return (
    <View style={[styles.container, { height }]}>
      <NativeWebView
        ref={webViewRef}
        source={{ html: initialHtml }}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
          </View>
        )}
      />

      {/* Real-time Truthful Telemetry Floating Header */}
      {showOverlay && <MapTruthfulBanner data={normalizedData} />}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: '#070B14',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  webViewContainer: {
    backgroundColor: '#070B14',
  },
  webView: {
    backgroundColor: '#070B14',
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
