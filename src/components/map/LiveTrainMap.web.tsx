import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { normalizeMapData, type LiveTrainMapProps } from './types';
import { generateLeafletHtml } from './leafletTemplate';
import { MapTruthfulBanner } from './MapTruthfulBanner';

export const LiveTrainMap: React.FC<LiveTrainMapProps> = ({
  train,
  height = 320,
  showOverlay = true,
  focusStationCode,
  isStale,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const normalizedData = useMemo(() => {
    const data = normalizeMapData(train);
    if (isStale !== undefined) {
      data.isStale = isStale;
    }
    return data;
  }, [train, isStale]);
  const activeTrainNumberRef = useRef<string>(normalizedData.trainNumber);
  const [initialHtml, setInitialHtml] = useState<string>(() =>
    generateLeafletHtml(normalizedData)
  );

  // Send smooth station focus when focusStationCode changes
  useEffect(() => {
    if (focusStationCode) {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'FOCUS_STATION',
            data: { code: focusStationCode },
          },
          '*'
        );
      } catch {
        // Ignored if window not ready
      }
    }
  }, [focusStationCode]);

  // Send smooth telemetry updates via postMessage when train data refreshes
  useEffect(() => {
    if (normalizedData.trainNumber !== activeTrainNumberRef.current) {
      activeTrainNumberRef.current = normalizedData.trainNumber;
      setInitialHtml(generateLeafletHtml(normalizedData));
    } else {
      // Telemetry update for same train: dispatch message for smooth marker transition
      try {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'UPDATE_TELEMETRY',
            data: normalizedData,
          },
          '*'
        );
      } catch {
        // Ignored if window not ready
      }
    }
  }, [normalizedData]);

  return (
    <View style={[styles.container, { height }]}>
      {/* Web DOM iframe rendering isolated Leaflet engine */}
      <iframe
        ref={iframeRef}
        title={`Live Map for Train ${normalizedData.trainNumber}`}
        srcDoc={initialHtml}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#070B14',
        }}
        sandbox="allow-scripts allow-same-origin"
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
});
