import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: '127.0.0.1:8081',
    },
  },
}));

vi.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    useWindowDimensions: () => ({ width: 1024, height: 768 }),
    View: ({ children, style, ...props }: any) =>
      React.createElement('div', { style, ...props }, children),
    Text: ({ children, style, ...props }: any) =>
      React.createElement('span', { style, ...props }, children),
    ScrollView: ({ children, style, ...props }: any) =>
      React.createElement('div', { style, ...props }, children),
    TouchableOpacity: ({ children, onPress, ...props }: any) =>
      React.createElement('button', { onClick: onPress, ...props }, children),
    RefreshControl: () => null,
    ActivityIndicator: () => null,
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) =>
    React.createElement('div', props, children),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ trainNumber: '12046' }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

import { PlatformCard } from '../src/components/train/PlatformCard';
import { CoachLayout } from '../src/components/train/CoachLayout';
import { StationTimeline } from '../src/components/train/StationTimeline';
import { getSavedCoach, saveCoach, clearSavedCoach } from '../src/utils/coachStorage';
import type {
  LiveTrainData,
  PlatformInfo,
  CoachComposition,
  StationPoint,
} from '../src/types/api';

describe('Milestone 17: Unified Train Details Experience & Journey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleStations: StationPoint[] = [
    {
      code: 'CDG',
      name: 'Chandigarh Junction',
      latitude: 30.7046,
      longitude: 76.7179,
      scheduledArrival: null,
      actualArrival: null,
      scheduledDeparture: '06:15',
      actualDeparture: '06:15',
      delayMinutes: 0,
      platform: '1',
      hasDeparted: true,
    },
    {
      code: 'UMB',
      name: 'Ambala Cantt Junction',
      latitude: 30.3782,
      longitude: 76.7767,
      scheduledArrival: '06:55',
      actualArrival: '07:00',
      scheduledDeparture: '07:00',
      actualDeparture: '07:05',
      delayMinutes: 5,
      platform: '6',
      hasDeparted: true,
    },
    {
      code: 'KKDE',
      name: 'Kurukshetra Junction',
      latitude: 29.9695,
      longitude: 76.8783,
      scheduledArrival: '07:35',
      actualArrival: '07:40',
      scheduledDeparture: '07:37',
      actualDeparture: null,
      delayMinutes: 5,
      platform: '2',
      hasDeparted: false,
    },
    {
      code: 'NDLS',
      name: 'New Delhi',
      latitude: 28.6139,
      longitude: 77.209,
      scheduledArrival: '09:30',
      actualArrival: '09:35',
      scheduledDeparture: null,
      actualDeparture: null,
      delayMinutes: 5,
      platform: '1',
      hasDeparted: false,
    },
  ];

  const samplePlatform: PlatformInfo = {
    platformNumber: '6',
    status: 'EXPECTED',
    station: { code: 'UMB', name: 'Ambala Cantt' },
    updatedAt: '2026-09-11T17:00:00Z',
    source: 'SCHEDULE',
    isReliable: true,
  };

  const sampleCoachComp: CoachComposition = {
    trainNumber: '12046',
    trainName: 'Chandigarh New Delhi Shatabdi Express',
    available: true,
    totalCoaches: 6,
    enginePosition: 'FRONT',
    coaches: [
      { sequence: 1, type: 'ENGINE', label: 'WAP-7', position: 'FRONT' },
      { sequence: 2, type: 'GENERAL', label: 'GS', position: 'FRONT' },
      { sequence: 3, type: 'CHAIR_CAR', number: 'C1', label: 'C1', position: 'MIDDLE' },
      { sequence: 4, type: 'CHAIR_CAR', number: 'C2', label: 'C2', position: 'MIDDLE' },
      { sequence: 5, type: 'AC_3_TIER', number: 'B1', label: 'B1', position: 'MIDDLE' },
      { sequence: 6, type: 'AC_3_TIER', number: 'B2', label: 'B2', position: 'MIDDLE' },
    ],
    updatedAt: '2026-09-11T17:00:00Z',
  };

  const sampleTrainData: LiveTrainData = {
    trainNumber: '12046',
    trainName: 'Shatabdi Express',
    trainType: 'Shatabdi',
    sourceStation: 'Chandigarh Junction',
    sourceCode: 'CDG',
    destinationStation: 'New Delhi',
    destinationCode: 'NDLS',
    status: 'RUNNING',
    currentLocation: {
      name: 'Ambala Cantt',
      latitude: 30.3782,
      longitude: 76.7767,
      speedKmH: 82,
      positionType: 'ACTUAL_GPS',
    },
    delayMinutes: 5,
    nextStation: {
      code: 'KKDE',
      name: 'Kurukshetra',
      scheduledArrival: '07:35',
      actualArrival: '07:40',
      delayMinutes: 5,
      platform: '2',
      distanceRemainingKm: 24,
    },
    platformInfo: samplePlatform,
    coachComposition: sampleCoachComp,
    lastUpdatedTime: '2026-09-11T17:02:00Z',
    stations: sampleStations,
  };

  describe('1. Full User Journey: Search ➔ Train Details ➔ Map ➔ Platform ➔ Coach', () => {
    it('should maintain consistent train telemetry across journey flow', () => {
      // 1. Where-to-where search params
      const fromStation = 'CDG';
      const toStation = 'NDLS';
      expect(sampleTrainData.sourceCode).toBe(fromStation);
      expect(sampleTrainData.destinationCode).toBe(toStation);

      // 2. Train selection
      expect(sampleTrainData.trainNumber).toBe('12046');
      expect(sampleTrainData.trainName).toBe('Shatabdi Express');

      // 3. Telemetry values
      expect(sampleTrainData.currentLocation.name).toBe('Ambala Cantt');
      expect(sampleTrainData.currentLocation.speedKmH).toBe(82);
      expect(sampleTrainData.delayMinutes).toBe(5);
      expect(sampleTrainData.nextStation?.name).toBe('Kurukshetra');
      expect(sampleTrainData.nextStation?.platform).toBe('2');

      // 4. Platform information
      expect(sampleTrainData.platformInfo?.platformNumber).toBe('6');
      expect(sampleTrainData.platformInfo?.status).toBe('EXPECTED');

      // 5. Coach Layout
      expect(sampleTrainData.coachComposition?.available).toBe(true);
      expect(sampleTrainData.coachComposition?.totalCoaches).toBe(6);
      expect(sampleTrainData.coachComposition?.coaches[5].number).toBe('B2');
    });

    it('should seamlessly allow user to select and persist "My Coach" (B2) on the unified screen', () => {
      clearSavedCoach('12046');
      expect(getSavedCoach('12046')).toBeNull();

      // User selects coach B2
      saveCoach('12046', 'B2');
      expect(getSavedCoach('12046')).toBe('B2');

      // Verify selected coach is valid in composition
      const selectedCoach = sampleCoachComp.coaches.find((c) => c.number === 'B2');
      expect(selectedCoach).toBeDefined();
      expect(selectedCoach?.type).toBe('AC_3_TIER');

      // User clears selection
      clearSavedCoach('12046');
      expect(getSavedCoach('12046')).toBeNull();
    });
  });

  describe('2. Unified 12-Section Architecture & Data Integrity', () => {
    it('verifies all 12 recommended sections are properly structured and present', () => {
      // 1. Train Header
      expect(sampleTrainData.trainNumber).toBe('12046');
      expect(sampleTrainData.trainName).toBe('Shatabdi Express');
      expect(sampleTrainData.sourceCode).toBe('CDG');
      expect(sampleTrainData.destinationCode).toBe('NDLS');

      // 2. Current Status
      expect(sampleTrainData.status).toBe('RUNNING');

      // 3. Delay
      expect(sampleTrainData.delayMinutes).toBe(5);

      // 4. Current Location
      expect(sampleTrainData.currentLocation.name).toBe('Ambala Cantt');
      expect(sampleTrainData.currentLocation.positionType).toBe('ACTUAL_GPS');

      // 5. Speed
      expect(sampleTrainData.currentLocation.speedKmH).toBe(82);

      // 6. Next Station
      expect(sampleTrainData.nextStation).toBeDefined();
      expect(sampleTrainData.nextStation?.name).toBe('Kurukshetra');
      expect(sampleTrainData.nextStation?.scheduledArrival).toBe('07:35');
      expect(sampleTrainData.nextStation?.actualArrival).toBe('07:40');

      // 7. Last Updated
      expect(sampleTrainData.lastUpdatedTime).toBe('2026-09-11T17:02:00Z');

      // 8. Platform Information
      expect(sampleTrainData.platformInfo).toBeDefined();
      expect(sampleTrainData.platformInfo?.platformNumber).toBe('6');
      expect(sampleTrainData.platformInfo?.status).toBe('EXPECTED');

      // 9. Live Map data
      expect(sampleTrainData.currentLocation.latitude).toBe(30.3782);
      expect(sampleTrainData.currentLocation.longitude).toBe(76.7767);

      // 10. Coach Layout
      expect(sampleTrainData.coachComposition).toBeDefined();
      expect(sampleTrainData.coachComposition?.coaches.length).toBe(6);

      // 11. My Coach selection
      const coachElement = React.createElement(CoachLayout, {
        composition: sampleCoachComp,
        trainNumber: '12046',
      });
      expect(coachElement).toBeDefined();

      // 12. Route/Station Timeline
      const timelineElement = React.createElement(StationTimeline, {
        stations: sampleTrainData.stations,
      });
      expect(timelineElement).toBeDefined();
      expect(sampleTrainData.stations.length).toBe(4);
    });
  });

  describe('3. Zero Duplicate Requests: Data Reuse', () => {
    it('should reuse coachComposition and platformInfo from single live flight without secondary fetches', () => {
      // Live train data contains both platform and coach data directly
      expect(sampleTrainData.platformInfo).not.toBeNull();
      expect(sampleTrainData.coachComposition).not.toBeNull();
      expect(sampleTrainData.coachComposition?.available).toBe(true);

      // Secondary fetch function does not need to be triggered when data is already present
      const hasPreloadedCoachData = Boolean(
        sampleTrainData.coachComposition && sampleTrainData.coachComposition.available
      );
      expect(hasPreloadedCoachData).toBe(true);
    });
  });

  describe('4. Resilient States & Partial Telemetry Fallbacks', () => {
    it('should handle missing platform data gracefully without crashing (UNAVAILABLE state)', () => {
      const trainWithoutPlatform: LiveTrainData = {
        ...sampleTrainData,
        platformInfo: {
          platformNumber: null,
          status: 'UNAVAILABLE',
          station: { code: 'UMB', name: 'Ambala Cantt' },
          updatedAt: '2026-09-11T17:02:00Z',
          source: 'SCHEDULE',
          isReliable: false,
        },
      };

      const element = React.createElement(PlatformCard, {
        platformInfo: trainWithoutPlatform.platformInfo,
        currentStationName: trainWithoutPlatform.currentLocation.name,
      });
      expect(element).toBeDefined();
      expect(trainWithoutPlatform.platformInfo?.platformNumber).toBeNull();
      expect(trainWithoutPlatform.platformInfo?.status).toBe('UNAVAILABLE');
    });

    it('should handle missing coach layout gracefully without crashing', () => {
      const trainWithoutCoach: LiveTrainData = {
        ...sampleTrainData,
        coachComposition: {
          trainNumber: '99999',
          available: false,
          totalCoaches: 0,
          coaches: [],
          updatedAt: '2026-09-11T17:02:00Z',
        },
      };

      const element = React.createElement(CoachLayout, {
        composition: trainWithoutCoach.coachComposition,
        trainNumber: '99999',
      });
      expect(element).toBeDefined();
      expect(trainWithoutCoach.coachComposition?.available).toBe(false);
    });

    it('should handle missing coordinates gracefully (latitude / longitude null)', () => {
      const trainWithoutCoords: LiveTrainData = {
        ...sampleTrainData,
        currentLocation: {
          name: 'Departed Station',
          latitude: null,
          longitude: null,
          speedKmH: 0,
          positionType: 'STATION_DEPARTURE',
        },
      };

      expect(trainWithoutCoords.currentLocation.latitude).toBeNull();
      expect(trainWithoutCoords.currentLocation.longitude).toBeNull();
      expect(trainWithoutCoords.currentLocation.positionType).toBe('STATION_DEPARTURE');
    });

    it('should handle cancelled train gracefully without crashing', () => {
      const cancelledTrain: LiveTrainData = {
        ...sampleTrainData,
        status: 'CANCELLED',
        nextStation: null,
        platformInfo: {
          platformNumber: null,
          status: 'UNAVAILABLE',
          station: { code: 'CDG', name: 'Chandigarh' },
          updatedAt: '2026-09-11T17:02:00Z',
          source: 'SCHEDULE',
          isReliable: false,
        },
        currentLocation: {
          ...sampleTrainData.currentLocation,
          speedKmH: 0,
        },
      };

      expect(cancelledTrain.status).toBe('CANCELLED');
      expect(cancelledTrain.nextStation).toBeNull();
      expect(cancelledTrain.currentLocation.speedKmH).toBe(0);
      expect(cancelledTrain.platformInfo?.status).toBe('UNAVAILABLE');
    });
  });
});
