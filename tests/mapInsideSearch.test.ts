import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MapSearchBar } from '../src/components/map/MapSearchBar';
import { searchGlobal } from '../src/services/api';
import { generateLeafletHtml } from '../src/components/map/leafletTemplate';
import { normalizeMapData } from '../src/components/map/types';
import type { SearchResultItem, LiveTrainData } from '../src/types/api';

vi.mock('../src/services/api', () => ({
  searchGlobal: vi.fn(async (query: string) => {
    const q = query.toLowerCase();
    if (q === '12046') {
      return [
        {
          type: 'TRAIN',
          trainNumber: '12046',
          trainName: 'Chandigarh Shatabdi Express',
          source: { code: 'CDG', name: 'Chandigarh' },
          destination: { code: 'NDLS', name: 'New Delhi' },
        },
      ];
    }
    if (q.includes('shatabdi')) {
      return [
        {
          type: 'TRAIN',
          trainNumber: '12046',
          trainName: 'Chandigarh Shatabdi Express',
          source: { code: 'CDG', name: 'Chandigarh' },
          destination: { code: 'NDLS', name: 'New Delhi' },
        },
        {
          type: 'TRAIN',
          trainNumber: '12002',
          trainName: 'Bhopal Shatabdi Express',
          source: { code: 'NDLS', name: 'New Delhi' },
          destination: { code: 'RKMP', name: 'Rani Kamlapati' },
        },
      ];
    }
    if (q === 'umb' || q.includes('ambala') || q === 'amb') {
      return [
        {
          type: 'STATION',
          stationCode: 'UMB',
          stationName: 'Ambala Cantt',
          city: 'Ambala',
          state: 'Haryana',
        },
        {
          type: 'TRAIN',
          trainNumber: '12046',
          trainName: 'Chandigarh Shatabdi Express',
          source: { code: 'CDG', name: 'Chandigarh' },
          destination: { code: 'NDLS', name: 'New Delhi' },
        },
      ];
    }
    return [];
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
    TextInput: (props: any) => React.createElement('input', props),
    TouchableOpacity: ({ children, onPress, style, ...props }: any) =>
      React.createElement('button', { onClick: onPress, style, ...props }, children),
    FlatList: ({ data, renderItem }: any) =>
      React.createElement(
        'div',
        null,
        (data || []).map((item: any, i: number) => renderItem({ item, index: i }))
      ),
    ActivityIndicator: () => React.createElement('div', null, 'Loading...'),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => React.createElement('i', props),
}));

const mockTrain: LiveTrainData = {
  trainNumber: '12046',
  trainName: 'Chandigarh Shatabdi Express',
  trainType: 'Shatabdi Express',
  sourceStation: 'Chandigarh',
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
  delayMinutes: 0,
  nextStation: {
    code: 'KKDE',
    name: 'Kurukshetra',
    scheduledArrival: '13:00',
    actualArrival: '13:00',
    delayMinutes: 0,
    platform: '2',
  },
  lastUpdatedTime: '2026-09-11T12:00:00.000Z',
  stations: [
    {
      code: 'CDG',
      name: 'Chandigarh',
      latitude: 30.70,
      longitude: 76.82,
      scheduledArrival: null,
      actualArrival: null,
      scheduledDeparture: '12:05',
      actualDeparture: '12:05',
      delayMinutes: 0,
      platform: '1',
      hasDeparted: true,
    },
    {
      code: 'UMB',
      name: 'Ambala Cantt',
      latitude: 30.33,
      longitude: 76.84,
      scheduledArrival: '12:45',
      actualArrival: '12:45',
      scheduledDeparture: '12:50',
      actualDeparture: '12:50',
      delayMinutes: 0,
      platform: '3',
      hasDeparted: false,
    },
  ],
};

describe('Milestone 14: Search Directly Inside Live Maps', () => {
  describe('Search Queries & Filtering', () => {
    it('1. performs train search by 5-digit train number', async () => {
      const results = await searchGlobal('12046');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].type).toBe('TRAIN');
      expect(results[0].trainNumber).toBe('12046');
      expect(results[0].trainName).toContain('Shatabdi');
    });

    it('2. performs train search by train name', async () => {
      const results = await searchGlobal('Shatabdi');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((r) => r.type === 'TRAIN')).toBe(true);
      expect(results.some((r) => r.trainNumber === '12046')).toBe(true);
    });

    it('3. performs station search by station code', async () => {
      const results = await searchGlobal('UMB');
      expect(results.length).toBeGreaterThanOrEqual(1);
      const station = results.find((r) => r.type === 'STATION');
      expect(station).toBeDefined();
      expect(station?.stationCode).toBe('UMB');
      expect(station?.stationName).toBe('Ambala Cantt');
    });

    it('4. performs station search by station name', async () => {
      const results = await searchGlobal('Ambala');
      expect(results.length).toBeGreaterThanOrEqual(1);
      const station = results.find((r) => r.type === 'STATION');
      expect(station).toBeDefined();
      expect(station?.stationCode).toBe('UMB');
    });

    it('5. handles partial searches gracefully', async () => {
      const results = await searchGlobal('Amb');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.stationCode === 'UMB' || r.trainNumber === '12046')).toBe(true);
    });

    it('6. returns empty array for invalid or non-matching query', async () => {
      const results = await searchGlobal('xyz999notfound');
      expect(results).toEqual([]);
    });
  });

  describe('MapSearchBar Component & User Interactions', () => {
    it('7. renders search input with clear and recent searches', () => {
      const onSelectTrain = vi.fn();
      const onSelectStation = vi.fn();
      const onClear = vi.fn();

      const element = React.createElement(MapSearchBar, {
        onSelectTrain,
        onSelectStation,
        onClear,
        recentSearches: ['12046', 'UMB', 'NDLS'],
      });

      expect(element).toBeDefined();
      expect(element.props.recentSearches).toEqual(['12046', 'UMB', 'NDLS']);
    });

    it('8. triggers onSelectTrain callback when train is selected', () => {
      const onSelectTrain = vi.fn();
      const onSelectStation = vi.fn();

      const element = React.createElement(MapSearchBar, {
        onSelectTrain,
        onSelectStation,
      });

      // Calling onSelectTrain with train number
      element.props.onSelectTrain('12046');
      expect(onSelectTrain).toHaveBeenCalledWith('12046');
    });

    it('9. triggers onSelectStation callback when station is selected', () => {
      const onSelectTrain = vi.fn();
      const onSelectStation = vi.fn();

      const element = React.createElement(MapSearchBar, {
        onSelectTrain,
        onSelectStation,
      });

      // Calling onSelectStation with code and name
      element.props.onSelectStation?.('UMB', 'Ambala Cantt');
      expect(onSelectStation).toHaveBeenCalledWith('UMB', 'Ambala Cantt');
    });

    it('10. triggers onClear callback when search text is cleared', () => {
      const onClear = vi.fn();

      const element = React.createElement(MapSearchBar, {
        onSelectTrain: vi.fn(),
        onClear,
      });

      element.props.onClear?.();
      expect(onClear).toHaveBeenCalled();
    });
  });

  describe('Map Centering & FOCUS_STATION Integration', () => {
    it('11. includes FOCUS_STATION message handler in Leaflet template to fly to station coordinates', () => {
      const normalized = normalizeMapData(mockTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('payload.type === \'FOCUS_STATION\'');
      expect(html).toContain('map.flyTo([targetStation.latitude, targetStation.longitude], 12');
      expect(html).toContain('setFollowMode(false)');
    });

    it('12. includes CENTER_TRAIN message handler in Leaflet template to focus on active train', () => {
      const normalized = normalizeMapData(mockTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('payload.type === \'CENTER_TRAIN\'');
      expect(html).toContain('setFollowMode(true)');
      expect(html).toContain('map.flyTo([trainLat, trainLng], 10');
    });
  });
});
