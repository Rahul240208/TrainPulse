import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../../theme';
import { normalizeMapData, type LiveTrainMapProps } from './types';
import { generateLeafletHtml } from './leafletTemplate';
import { MapTruthfulBanner } from './MapTruthfulBanner';

const NativeWebView = WebView as unknown as React.ComponentType<any>;

export const LiveTrainMap: React.FC<LiveTrainMapProps> = ({
  train,
  height = 320,
  showOverlay = true,
}) => {
  const webViewRef = useRef<any>(null);
  const normalizedData = useMemo(() => normalizeMapData(train), [train]);
  const activeTrainNumberRef = useRef<string>(normalizedData.trainNumber);
  const [initialHtml, setInitialHtml] = useState<string>(() =>
    generateLeafletHtml(normalizedData)
  );

  // Send smooth telemetry updates to WebView via postMessage
  useEffect(() => {
    if (normalizedData.trainNumber !== activeTrainNumberRef.current) {
      activeTrainNumberRef.current = normalizedData.trainNumber;
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

const styles = StyleSheet.create({
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
