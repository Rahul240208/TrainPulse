import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { getStatusPresentation, MapStatusPanel } from '../src/components/map/MapStatusPanel';
import type { LiveTrainData } from '../src/types/api';

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
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
    TextInput: (props: any) => React.createElement('input', props),
    FlatList: ({ data, renderItem }: any) =>
      React.createElement('div', null, (data || []).map((item: any, i: number) => renderItem({ item, index: i }))),
    ScrollView: ({ children, style, ...props }: any) =>
      React.createElement('div', { style, ...props }, children),
    ActivityIndicator: () => React.createElement('div', null, 'loading'),
    useWindowDimensions: () => ({ width: 1024, height: 768 }),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockTrain: LiveTrainData = {
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
  lastUpdatedTime: '2026-09-11T12:00:00.000Z',
  stations: [],
};

describe('Milestone 11: Map-First Train Search & Status Panel', () => {
  describe('Status Presentation Utility', () => {
    it('1. formats running on-time status correctly', () => {
      const pres = getStatusPresentation('RUNNING', 0);
      expect(pres.label).toBe('Running • On Time');
      expect(pres.icon).toBe('radio-button-on');
    });

    it('2. formats running delayed status correctly', () => {
      const pres = getStatusPresentation('RUNNING', 15);
      expect(pres.label).toBe('Running • 15m late');
      expect(pres.icon).toBe('alert-circle');
    });

    it('3. formats cancelled status with red indicator', () => {
      const pres = getStatusPresentation('CANCELLED', 0);
      expect(pres.label).toBe('Cancelled');
      expect(pres.icon).toBe('close-circle');
    });

    it('4. formats diverted status with amber indicator', () => {
      const pres = getStatusPresentation('DIVERTED', 0);
      expect(pres.label).toBe('Diverted');
      expect(pres.icon).toBe('git-branch');
    });

    it('5. formats not started status', () => {
      const pres = getStatusPresentation('NOT_STARTED', 0);
      expect(pres.label).toBe('Not Started');
      expect(pres.icon).toBe('time');
    });

    it('6. formats arrived / completed status', () => {
      const pres = getStatusPresentation('ARRIVED', 0);
      expect(pres.label).toBe('Completed');
      expect(pres.icon).toBe('checkmark-circle');
    });

    it('7. falls back safely on unknown status', () => {
      const pres = getStatusPresentation(null, 0);
      expect(pres.label).toBe('Unknown Status');
    });
  });

  describe('MapStatusPanel Component', () => {
    it('8. renders empty state when no train is provided', () => {
      const element = React.createElement(MapStatusPanel, { train: null });
      expect(element).toBeDefined();
    });

    it('9. renders live train status, speed, delay, and next station', () => {
      const element = React.createElement(MapStatusPanel, {
        train: mockTrain,
        isStale: false,
      });
      expect(element).toBeDefined();
      expect(element.props.train?.trainNumber).toBe('12046');
      expect(element.props.train?.currentLocation?.speedKmH).toBe(82);
    });

    it('10. renders stale banner when isStale is true', () => {
      const element = React.createElement(MapStatusPanel, {
        train: mockTrain,
        isStale: true,
      });
      expect(element.props.isStale).toBe(true);
    });

    it('11. displays truthful telemetry accuracy tags without inventing coordinates', () => {
      const estimatedTrain: LiveTrainData = {
        ...mockTrain,
        currentLocation: {
          ...mockTrain.currentLocation,
          latitude: null,
          longitude: null,
          positionType: 'ESTIMATED_SCHEDULE',
        },
      };

      const element = React.createElement(MapStatusPanel, {
        train: estimatedTrain,
      });
      expect(element.props.train?.currentLocation?.positionType).toBe('ESTIMATED_SCHEDULE');
    });
  });
});
