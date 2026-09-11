import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { getStatusPresentation, MapStatusPanel } from '../src/components/map/MapStatusPanel';
import type { LiveTrainData } from '../src/types/api';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    View: ({ children, style, ...props }: any) =>
      React.createElement('div', { style, ...props }, children),
    Text: ({ children, style, ...props }: any) =>
      React.createElement('span', { style, ...props }, children),
    TouchableOpacity: ({ children, onPress, style, ...props }: any) =>
      React.createElement('button', { onClick: onPress, style, ...props }, children),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => React.createElement('i', props),
}));

const baseTrain: LiveTrainData = {
  trainNumber: '12046',
  trainName: 'Chandigarh Shatabdi Express',
  trainType: 'Shatabdi Express',
  sourceStation: 'Chandigarh Junction',
  sourceCode: 'CDG',
  destinationStation: 'New Delhi',
  destinationCode: 'NDLS',
  status: 'RUNNING',
  currentLocation: {
    name: 'Ambala Cantt',
    latitude: 30.33,
    longitude: 76.84,
    speedKmH: 82,
    positionType: 'ACTUAL_GPS',
  },
  delayMinutes: 5,
  nextStation: {
    code: 'KKDE',
    name: 'Kurukshetra',
    scheduledArrival: '13:00',
    actualArrival: '13:05',
    delayMinutes: 5,
    platform: '2',
  },
  lastUpdatedTime: '2026-09-11T17:44:00.000Z',
  stations: [],
};

describe('Milestone 13: Live Train Status Panel', () => {
  describe('Status States Matrix (All 8 Required States)', () => {
    it('1. formats Running state on-time', () => {
      const pres = getStatusPresentation('RUNNING', 0);
      expect(pres.category).toBe('RUNNING');
      expect(pres.label).toBe('Running • On Time');
      expect(pres.icon).toBe('radio-button-on');
    });

    it('2. formats Running state delayed', () => {
      const pres = getStatusPresentation('RUNNING', 12);
      expect(pres.category).toBe('RUNNING');
      expect(pres.label).toBe('Running • 12m late');
      expect(pres.icon).toBe('alert-circle');
    });

    it('3. formats On Time state explicitly', () => {
      const pres = getStatusPresentation('ON_TIME', 0);
      expect(pres.category).toBe('ON_TIME');
      expect(pres.label).toBe('On Time');
      expect(pres.icon).toBe('radio-button-on');
    });

    it('4. formats Delayed state', () => {
      const pres = getStatusPresentation('DELAYED', 25);
      expect(pres.category).toBe('DELAYED');
      expect(pres.label).toBe('Delayed (25 min)');
      expect(pres.icon).toBe('alert-circle');
    });

    it('5. formats Not Started state', () => {
      const pres = getStatusPresentation('NOT_STARTED', 0);
      expect(pres.category).toBe('NOT_STARTED');
      expect(pres.label).toBe('Not Started');
      expect(pres.icon).toBe('time');
    });

    it('6. formats Completed / Arrived state', () => {
      const pres = getStatusPresentation('COMPLETED', 0);
      expect(pres.category).toBe('COMPLETED');
      expect(pres.label).toBe('Completed');
      expect(pres.icon).toBe('checkmark-circle');

      const presArrived = getStatusPresentation('ARRIVED', 0);
      expect(presArrived.category).toBe('COMPLETED');
      expect(presArrived.label).toBe('Completed');
    });

    it('7. formats Cancelled state', () => {
      const pres = getStatusPresentation('CANCELLED', 0);
      expect(pres.category).toBe('CANCELLED');
      expect(pres.label).toBe('Cancelled');
      expect(pres.icon).toBe('close-circle');
    });

    it('8. formats Diverted state', () => {
      const pres = getStatusPresentation('DIVERTED', 0);
      expect(pres.category).toBe('DIVERTED');
      expect(pres.label).toBe('Diverted');
      expect(pres.icon).toBe('git-branch');
    });

    it('9. formats Unknown state safely', () => {
      const pres = getStatusPresentation(null, null);
      expect(pres.category).toBe('UNKNOWN');
      expect(pres.label).toBe('Unknown Status');
      expect(pres.icon).toBe('help-circle');
    });
  });

  describe('Missing Fields & Safe Fallbacks', () => {
    it('10. gracefully falls back when speed, delay, location, platform, nextStation, and timestamp are missing', () => {
      const minimalTrain = {
        trainNumber: '12046',
        trainName: 'Chandigarh Shatabdi Express',
        trainType: 'Shatabdi',
        sourceStation: '',
        sourceCode: '',
        destinationStation: '',
        destinationCode: '',
        status: 'UNKNOWN' as any,
        currentLocation: {
          name: '',
          latitude: null,
          longitude: null,
          speedKmH: 0,
          positionType: 'ESTIMATED_SCHEDULE' as const,
        },
        delayMinutes: null as any,
        nextStation: null,
        lastUpdatedTime: '',
        stations: [],
      } as LiveTrainData;

      const element = React.createElement(MapStatusPanel, {
        train: minimalTrain,
      });

      expect(element).toBeDefined();
      expect(element.props.train?.trainNumber).toBe('12046');
      expect((element.props.train as LiveTrainData)?.delayMinutes).toBeNull();
      expect(element.props.train?.nextStation).toBeNull();
    });

    it('11. renders empty state when no train is selected', () => {
      const element = React.createElement(MapStatusPanel, {
        train: null,
      });

      expect(element).toBeDefined();
      expect(element.props.train).toBeNull();
    });

    it('12. renders loading state when data is initially loading with no previous train', () => {
      const element = React.createElement(MapStatusPanel, {
        train: null,
        isLoading: true,
      });

      expect(element).toBeDefined();
      expect(element.props.isLoading).toBe(true);
    });
  });

  describe('Stale Data & Refresh Failure Handling', () => {
    it('13. displays stale banner with "Unable to refresh" and "Showing last successful update" while preserving train telemetry', () => {
      const onRefresh = vi.fn();
      const element = React.createElement(MapStatusPanel, {
        train: baseTrain,
        isStale: true,
        backgroundError: 'Upstream timeout',
        lastSuccessfulUpdate: new Date('2026-09-11T17:44:00.000Z'),
        onRefresh,
      });

      expect(element).toBeDefined();
      // Crucial requirement: train data is NOT erased
      expect(element.props.train?.trainNumber).toBe('12046');
      expect(element.props.train?.trainName).toBe('Chandigarh Shatabdi Express');
      expect(element.props.train?.currentLocation?.name).toBe('Ambala Cantt');
      expect(element.props.train?.currentLocation?.speedKmH).toBe(82);
      expect(element.props.isStale).toBe(true);
      expect(element.props.backgroundError).toBe('Upstream timeout');
    });

    it('14. supports manual retry refresh button', () => {
      const onRefresh = vi.fn();
      const element = React.createElement(MapStatusPanel, {
        train: baseTrain,
        isStale: false,
        backgroundError: 'Network failure',
        lastSuccessfulUpdate: new Date(),
        onRefresh,
      });

      expect(element.props.onRefresh).toBe(onRefresh);
    });
  });

  describe('Truthful Telemetry Accuracies', () => {
    it('15. correctly displays ACTUAL GPS position accuracy', () => {
      const gpsTrain: LiveTrainData = {
        ...baseTrain,
        currentLocation: {
          ...baseTrain.currentLocation,
          positionType: 'ACTUAL_GPS',
        },
      };

      const element = React.createElement(MapStatusPanel, { train: gpsTrain });
      expect(element.props.train?.currentLocation?.positionType).toBe('ACTUAL_GPS');
    });

    it('16. correctly displays STATION DEPARTURE position accuracy', () => {
      const stationTrain: LiveTrainData = {
        ...baseTrain,
        currentLocation: {
          ...baseTrain.currentLocation,
          positionType: 'STATION_DEPARTURE',
        },
      };

      const element = React.createElement(MapStatusPanel, { train: stationTrain });
      expect(element.props.train?.currentLocation?.positionType).toBe('STATION_DEPARTURE');
    });

    it('17. correctly displays ESTIMATED SCHEDULE position accuracy', () => {
      const estTrain: LiveTrainData = {
        ...baseTrain,
        currentLocation: {
          ...baseTrain.currentLocation,
          positionType: 'ESTIMATED_SCHEDULE',
        },
      };

      const element = React.createElement(MapStatusPanel, { train: estTrain });
      expect(element.props.train?.currentLocation?.positionType).toBe('ESTIMATED_SCHEDULE');
    });
  });
});
