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
    View: ({ children, style, ...props }: any) => React.createElement('div', { style, ...props }, children),
    Text: ({ children, style, ...props }: any) => React.createElement('span', { style, ...props }, children),
    TouchableOpacity: ({ children, onPress, style, ...props }: any) =>
      React.createElement('button', { onClick: onPress, style, ...props }, children),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import { fetchTrainsBetween, ApiError } from '../src/services/api';
import {
  TrainResultCard,
  formatRunningDays,
  formatDuration,
  formatDelay,
  formatStatus,
  formatTime,
} from '../src/components/journey/TrainResultCard';
import type { TrainBetweenItem, TrainsBetweenResult } from '../src/types/api';
import { normalizeMapData } from '../src/components/map/types';
import { generateLeafletHtml } from '../src/components/map/leafletTemplate';
import { MOCK_TRAINS } from '../src/data/mockTrains';

describe('Milestone 16: Where-to-Where Train Search & Map Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Chandigarh ➔ New Delhi (CDG ➔ NDLS) Search', () => {
    it('returns available trains between CDG and NDLS with all required result fields', async () => {
      const mockResult: TrainsBetweenResult = {
        from: { code: 'CDG', name: 'Chandigarh' },
        to: { code: 'NDLS', name: 'New Delhi' },
        totalTrains: 4,
        trains: [
          {
            trainNumber: '12012',
            trainName: 'Kalka Shatabdi Express',
            trainType: 'Shatabdi Express',
            source: { code: 'KLK', name: 'Kalka' },
            destination: { code: 'NDLS', name: 'New Delhi' },
            departure: '06:53',
            arrival: '10:15',
            duration: '3h 22m',
            runningDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
            status: 'ON_TIME',
            delayMinutes: 0,
            platform: '1',
            distanceKm: 244,
          },
          {
            trainNumber: '22448',
            trainName: 'Amb Andaura - New Delhi Vande Bharat Express',
            trainType: 'Vande Bharat Express',
            source: { code: 'AADR', name: 'Amb Andaura' },
            destination: { code: 'NDLS', name: 'New Delhi' },
            departure: '15:30',
            arrival: '18:25',
            duration: '2h 55m',
            runningDays: ['MON', 'TUE', 'WED', 'THU', 'SAT', 'SUN'],
            status: 'DELAYED',
            delayMinutes: 5,
            platform: '2',
            distanceKm: 244,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: mockResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchTrainsBetween('CDG', 'NDLS');
      expect(result.from.code).toBe('CDG');
      expect(result.to.code).toBe('NDLS');
      expect(result.totalTrains).toBe(4);
      expect(result.trains.length).toBe(2);

      // Verify each result includes all 8 required fields
      const train = result.trains[0];
      expect(train.trainNumber).toBe('12012');
      expect(train.trainName).toBe('Kalka Shatabdi Express');
      expect(train.departure).toBe('06:53');
      expect(train.arrival).toBe('10:15');
      expect(train.duration).toBe('3h 22m');
      expect(train.runningDays).toContain('MON');
      expect(train.status).toBe('ON_TIME');
      expect(train.delayMinutes).toBe(0);
    });
  });

  describe('2. Other Valid Routes', () => {
    it('successfully retrieves trains for NDLS ➔ CDG', async () => {
      const mockResult: TrainsBetweenResult = {
        from: { code: 'NDLS', name: 'New Delhi' },
        to: { code: 'CDG', name: 'Chandigarh' },
        totalTrains: 1,
        trains: [
          {
            trainNumber: '12046',
            trainName: 'Chandigarh Shatabdi Express',
            source: { code: 'NDLS', name: 'New Delhi' },
            destination: { code: 'CDG', name: 'Chandigarh' },
            departure: '12:00',
            arrival: '15:20',
            duration: '3h 20m',
            runningDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
            status: 'RUNNING',
            delayMinutes: 2,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: mockResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchTrainsBetween('NDLS', 'CDG');
      expect(result.from.code).toBe('NDLS');
      expect(result.to.code).toBe('CDG');
      expect(result.totalTrains).toBe(1);
      expect(result.trains[0].trainNumber).toBe('12046');
    });

    it('successfully retrieves trains for HWH ➔ NDLS', async () => {
      const mockResult: TrainsBetweenResult = {
        from: { code: 'HWH', name: 'Howrah' },
        to: { code: 'NDLS', name: 'New Delhi' },
        totalTrains: 1,
        trains: [
          {
            trainNumber: '12301',
            trainName: 'Howrah Rajdhani Express',
            source: { code: 'HWH', name: 'Howrah' },
            destination: { code: 'NDLS', name: 'New Delhi' },
            departure: '16:55',
            arrival: '10:05',
            duration: '17h 10m',
            runningDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
            status: 'ON_TIME',
            delayMinutes: 0,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: mockResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchTrainsBetween('HWH', 'NDLS');
      expect(result.totalTrains).toBe(1);
      expect(result.trains[0].trainNumber).toBe('12301');
    });
  });

  describe('3. No Results Route', () => {
    it('returns empty train list gracefully for routes without direct trains', async () => {
      const emptyResult: TrainsBetweenResult = {
        from: { code: 'GKP', name: 'Gorakhpur' },
        to: { code: 'BKN', name: 'Bikaner' },
        totalTrains: 0,
        trains: [],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: emptyResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchTrainsBetween('GKP', 'BKN');
      expect(result.totalTrains).toBe(0);
      expect(result.trains).toEqual([]);
    });
  });

  describe('4. Same Source & Destination Guard', () => {
    it('blocks search when departure and destination stations are identical', async () => {
      await expect(fetchTrainsBetween('CDG', 'CDG')).rejects.toThrowError(ApiError);
      await expect(fetchTrainsBetween('CDG', 'cdg')).rejects.toMatchObject({
        code: 'SAME_STATION',
        statusCode: 400,
      });
    });
  });

  describe('5. Invalid Station Codes Guard', () => {
    it('rejects station code with fewer than 2 characters', async () => {
      await expect(fetchTrainsBetween('C', 'NDLS')).rejects.toMatchObject({
        code: 'INVALID_STATION',
        statusCode: 400,
      });
    });

    it('rejects station code with more than 6 characters', async () => {
      await expect(fetchTrainsBetween('CHANDIGARH', 'NDLS')).rejects.toMatchObject({
        code: 'INVALID_STATION',
        statusCode: 400,
      });
    });

    it('rejects missing station code', async () => {
      await expect(fetchTrainsBetween('', 'NDLS')).rejects.toMatchObject({
        code: 'MISSING_STATION',
        statusCode: 400,
      });
    });
  });

  describe('6. Network Failure Resilience', () => {
    it('surfaces user-friendly NETWORK_ERROR on connection failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(fetchTrainsBetween('CDG', 'NDLS')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });

    it('surfaces user-friendly TIMEOUT on request abort', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

      await expect(fetchTrainsBetween('CDG', 'NDLS')).rejects.toMatchObject({
        code: 'TIMEOUT',
        statusCode: 504,
      });
    });
  });

  describe('7. Train Selection & Map Integration (Central Experience)', () => {
    it('renders TrainResultCard with "Track on Live Map" CTA button', () => {
      const mockTrain: TrainBetweenItem = {
        trainNumber: '12012',
        trainName: 'Kalka Shatabdi Express',
        trainType: 'Shatabdi',
        source: { code: 'CDG', name: 'Chandigarh' },
        destination: { code: 'NDLS', name: 'New Delhi' },
        departure: '06:53',
        arrival: '10:15',
        duration: '3h 22m',
        runningDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        status: 'ON_TIME',
        delayMinutes: 0,
        platform: '1',
      };

      const trackSpy = vi.fn();
      const card = TrainResultCard({ train: mockTrain, onTrack: trackSpy }) as React.ReactElement<any>;

      // Ensure component renders and has accessible CTA
      expect(card).toBeDefined();
      expect(card.props.accessibilityHint).toContain('Opens train route and live tracking on the map');

      // Trigger tracking click
      card.props.onPress();
      expect(trackSpy).toHaveBeenCalledTimes(1);
    });

    it('verifies that selecting a train from Where-to-Where activates Live Map tracking', () => {
      const selectedTrain: any = {
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
          latitude: 30.3782,
          longitude: 76.7767,
          speedKmH: 82,
          positionType: 'ACTUAL_GPS',
        },
        delayMinutes: 5,
        nextStation: {
          code: 'KKDE',
          name: 'Kurukshetra',
          scheduledArrival: '23:30',
          actualArrival: '23:35',
          delayMinutes: 5,
        },
        lastUpdatedTime: '23:14',
        stations: [
          {
            code: 'CDG',
            name: 'Chandigarh',
            latitude: 30.7046,
            longitude: 76.7179,
            hasDeparted: true,
            delayMinutes: 0,
            scheduledArrival: null,
            actualArrival: null,
          },
          {
            code: 'UMB',
            name: 'Ambala Cantt',
            latitude: 30.3782,
            longitude: 76.7767,
            hasDeparted: false,
            delayMinutes: 5,
            scheduledArrival: '23:10',
            actualArrival: '23:15',
          },
          {
            code: 'NDLS',
            name: 'New Delhi',
            latitude: 28.6139,
            longitude: 77.209,
            hasDeparted: false,
            delayMinutes: 5,
            scheduledArrival: '01:45',
            actualArrival: '01:50',
          },
        ],
      };

      // Normalize map data for selected train
      const normalized = normalizeMapData(selectedTrain);
      expect(normalized.trainNumber).toBe('12046');
      expect(normalized.trainName).toContain('Shatabdi');
      expect(normalized.sourceCode).toBe('CDG');
      expect(normalized.destinationCode).toBe('NDLS');
      expect(normalized.hasExactCoordinates).toBe(true);
      expect(normalized.stations.length).toBe(3);

      // Verify Leaflet map can render route and train marker for selected train
      const html = generateLeafletHtml(normalized);
      expect(html).toContain('12046');
      expect(html).toContain('Chandigarh');
      expect(html).toContain('New Delhi');
      expect(html).toContain('btn-follow');
    });
  });

  describe('8. Result Card Information Formatting', () => {
    it('formats running days accurately', () => {
      expect(formatRunningDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).toBe('Daily');
      expect(formatRunningDays(['MON', 'WED', 'FRI'])).toBe('Mon, Wed, Fri');
      expect(formatRunningDays([])).toBe('Not available');
    });

    it('formats duration accurately', () => {
      expect(formatDuration('3h 22m')).toBe('3h 22m');
      expect(formatDuration('')).toBe('Not available');
      expect(formatDuration(null)).toBe('Not available');
    });

    it('formats delay accurately', () => {
      expect(formatDelay(0)).toBe('On Time');
      expect(formatDelay(15)).toBe('15m late');
      expect(formatDelay(-5)).toBe('5m early');
      expect(formatDelay(null)).toBe('Not available');
    });

    it('formats status accurately', () => {
      expect(formatStatus('ON_TIME')).toBe('On Time');
      expect(formatStatus('DELAYED')).toBe('Delayed');
      expect(formatStatus('RUNNING')).toBe('Running');
      expect(formatStatus('CANCELLED')).toBe('Cancelled');
      expect(formatStatus('DIVERTED')).toBe('Diverted');
      expect(formatStatus(null, 0)).toBe('On Time');
      expect(formatStatus(null, 10)).toBe('Delayed');
      expect(formatStatus(null, null)).toBe('Not available');
    });

    it('formats departure and arrival times accurately', () => {
      expect(formatTime('06:53')).toBe('06:53');
      expect(formatTime('')).toBe('Not available');
      expect(formatTime(null)).toBe('Not available');
    });
  });
});
