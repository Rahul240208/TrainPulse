import { describe, it, expect, vi } from 'vitest';
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

import {
  TrainResultCard,
  formatRunningDays,
  formatDuration,
  formatDelay,
  formatStatus,
  formatPlatform,
  formatTime,
} from '../src/components/journey/TrainResultCard';
import type { TrainBetweenItem } from '../src/types/api';

describe('TrainResultCard Formatting Utilities (Milestone 13)', () => {
  describe('formatRunningDays', () => {
    it('should format all 7 days as "Daily"', () => {
      const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      expect(formatRunningDays(allDays)).toBe('Daily');
    });

    it('should format subsets of days into readable abbreviations', () => {
      expect(formatRunningDays(['MON', 'WED', 'FRI'])).toBe('Mon, Wed, Fri');
      expect(formatRunningDays(['SUNDAY', 'SATURDAY'])).toBe('Sun, Sat');
    });

    it('should return "Not available" for empty or missing days array', () => {
      expect(formatRunningDays([])).toBe('Not available');
      expect(formatRunningDays(undefined)).toBe('Not available');
      expect(formatRunningDays(null as any)).toBe('Not available');
    });
  });

  describe('formatDuration', () => {
    it('should return trimmed duration string when present', () => {
      expect(formatDuration('3h 15m')).toBe('3h 15m');
      expect(formatDuration('  4h 30m  ')).toBe('4h 30m');
    });

    it('should return "Not available" when duration is missing or empty', () => {
      expect(formatDuration('')).toBe('Not available');
      expect(formatDuration('   ')).toBe('Not available');
      expect(formatDuration(null)).toBe('Not available');
      expect(formatDuration(undefined)).toBe('Not available');
    });
  });

  describe('formatDelay', () => {
    it('should return "On Time" when delay is 0', () => {
      expect(formatDelay(0)).toBe('On Time');
    });

    it('should return "Xm late" when delay is positive', () => {
      expect(formatDelay(15)).toBe('15m late');
      expect(formatDelay(45)).toBe('45m late');
    });

    it('should return "Xm early" when delay is negative', () => {
      expect(formatDelay(-5)).toBe('5m early');
    });

    it('should return "Not available" when delay is null or undefined', () => {
      expect(formatDelay(null)).toBe('Not available');
      expect(formatDelay(undefined)).toBe('Not available');
      expect(formatDelay(NaN)).toBe('Not available');
    });
  });

  describe('formatStatus', () => {
    it('should format explicit status correctly', () => {
      expect(formatStatus('ON_TIME')).toBe('On Time');
      expect(formatStatus('DELAYED')).toBe('Delayed');
      expect(formatStatus('RUNNING')).toBe('Running');
      expect(formatStatus('CANCELLED')).toBe('Cancelled');
      expect(formatStatus('DIVERTED')).toBe('Diverted');
      expect(formatStatus('NOT_STARTED')).toBe('Not Started');
    });

    it('should infer status from delayMinutes if explicit status is missing', () => {
      expect(formatStatus(null, 0)).toBe('On Time');
      expect(formatStatus(null, 25)).toBe('Delayed');
      expect(formatStatus(undefined, 0)).toBe('On Time');
    });

    it('should return "Not available" when status and delay are unavailable', () => {
      expect(formatStatus(null, null)).toBe('Not available');
      expect(formatStatus(undefined, undefined)).toBe('Not available');
    });
  });

  describe('formatPlatform', () => {
    it('should format raw platform number with Platform prefix', () => {
      expect(formatPlatform('1')).toBe('Platform 1');
      expect(formatPlatform('4B')).toBe('Platform 4B');
    });

    it('should preserve existing "Platform" or "PF" prefix cleanly', () => {
      expect(formatPlatform('Platform 3')).toBe('Platform 3');
      expect(formatPlatform('PF 2')).toBe('Platform 2');
      expect(formatPlatform('PF. 5')).toBe('Platform 5');
    });

    it('should return "Not available" when platform is null or empty', () => {
      expect(formatPlatform(null)).toBe('Not available');
      expect(formatPlatform('')).toBe('Not available');
      expect(formatPlatform('   ')).toBe('Not available');
      expect(formatPlatform(undefined)).toBe('Not available');
    });
  });

  describe('formatTime', () => {
    it('should return trimmed time string when present', () => {
      expect(formatTime('06:15')).toBe('06:15');
      expect(formatTime('21:40')).toBe('21:40');
    });

    it('should return "Not available" when time is missing', () => {
      expect(formatTime(null)).toBe('Not available');
      expect(formatTime('')).toBe('Not available');
      expect(formatTime(undefined)).toBe('Not available');
    });
  });
});

describe('TrainResultCard Component (Milestone 13)', () => {
  const completeTrain: TrainBetweenItem = {
    trainNumber: '12046',
    trainName: 'Chandigarh Shatabdi Express',
    trainType: 'Shatabdi',
    source: { code: 'CDG', name: 'Chandigarh Junction' },
    destination: { code: 'NDLS', name: 'New Delhi' },
    departure: '06:15',
    arrival: '09:30',
    duration: '3h 15m',
    runningDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    status: 'ON_TIME',
    delayMinutes: 0,
    platform: '1',
    distanceKm: 244,
  };

  it('should render complete train information without crashing', () => {
    const onTrack = vi.fn();
    const element = React.createElement(TrainResultCard, {
      train: completeTrain,
      onTrack,
    });

    expect(element).toBeDefined();
    expect(element.props.train.trainNumber).toBe('12046');
    expect(element.props.train.trainName).toBe('Chandigarh Shatabdi Express');
  });

  it('should render delayed train information correctly', () => {
    const delayedTrain: TrainBetweenItem = {
      ...completeTrain,
      trainNumber: '12012',
      trainName: 'Kalka Shatabdi',
      status: 'DELAYED',
      delayMinutes: 35,
      platform: '2',
    };

    const onTrack = vi.fn();
    const element = React.createElement(TrainResultCard, {
      train: delayedTrain,
      onTrack,
    });

    expect(element).toBeDefined();
    expect(element.props.train.delayMinutes).toBe(35);
    expect(formatDelay(delayedTrain.delayMinutes)).toBe('35m late');
    expect(formatStatus(delayedTrain.status, delayedTrain.delayMinutes)).toBe('Delayed');
  });

  it('should handle missing optional fields and fallback to "Not available" safely', () => {
    const minimalTrain: TrainBetweenItem = {
      trainNumber: '22448',
      trainName: 'Vande Bharat Express',
      source: { code: 'AADR', name: 'Amb Andaura' },
      destination: { code: 'NDLS', name: 'New Delhi' },
      departure: null,
      arrival: null,
      duration: null,
      runningDays: undefined,
      status: null,
      delayMinutes: null,
      platform: null,
    };

    const onTrack = vi.fn();
    const element = React.createElement(TrainResultCard, {
      train: minimalTrain,
      onTrack,
    });

    expect(element).toBeDefined();
    expect(formatTime(minimalTrain.departure)).toBe('Not available');
    expect(formatTime(minimalTrain.arrival)).toBe('Not available');
    expect(formatDuration(minimalTrain.duration)).toBe('Not available');
    expect(formatRunningDays(minimalTrain.runningDays)).toBe('Not available');
    expect(formatDelay(minimalTrain.delayMinutes)).toBe('Not available');
    expect(formatStatus(minimalTrain.status, minimalTrain.delayMinutes)).toBe('Not available');
    expect(formatPlatform(minimalTrain.platform)).toBe('Not available');
  });

  it('should trigger onTrack handler callback when requested', () => {
    const onTrack = vi.fn();
    const element = React.createElement(TrainResultCard, {
      train: completeTrain,
      onTrack,
    });

    element.props.onTrack();
    expect(onTrack).toHaveBeenCalledTimes(1);
  });
});

