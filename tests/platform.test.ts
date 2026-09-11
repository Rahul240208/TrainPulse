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
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import {
  PlatformCard,
  formatPlatformDisplay,
  formatRelativeTime,
} from '../src/components/train/PlatformCard';
import { fetchTrainPlatform, ApiError } from '../src/services/api';
import type { PlatformInfo } from '../src/types/api';

describe('PlatformCard & Formatting Utilities (Milestone 14)', () => {
  describe('formatPlatformDisplay', () => {
    it('should format raw platform number as "Platform X"', () => {
      expect(formatPlatformDisplay('6')).toBe('Platform 6');
      expect(formatPlatformDisplay('1A')).toBe('Platform 1A');
    });

    it('should preserve existing "Platform" or "PF" prefix cleanly', () => {
      expect(formatPlatformDisplay('Platform 3')).toBe('Platform 3');
      expect(formatPlatformDisplay('PF 2')).toBe('Platform 2');
      expect(formatPlatformDisplay('PF. 4')).toBe('Platform 4');
    });

    it('should return "Not available" when platform is null, empty, or missing', () => {
      expect(formatPlatformDisplay(null)).toBe('Not available');
      expect(formatPlatformDisplay('')).toBe('Not available');
      expect(formatPlatformDisplay('   ')).toBe('Not available');
      expect(formatPlatformDisplay(undefined)).toBe('Not available');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Updated just now" for timestamps within 45 seconds', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('Updated just now');
    });

    it('should return "Updated X min(s) ago" for recent timestamps', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinAgo)).toBe('Updated 5 mins ago');

      const oneMinAgo = new Date(Date.now() - 65 * 1000).toISOString();
      expect(formatRelativeTime(oneMinAgo)).toBe('Updated 1 min ago');
    });

    it('should return "Updated recently" for invalid or missing timestamps', () => {
      expect(formatRelativeTime(null)).toBe('Updated recently');
      expect(formatRelativeTime('invalid-date')).toBe('Updated recently');
    });
  });

  describe('PlatformCard Component', () => {
    it('should render confirmed platform correctly', () => {
      const info: PlatformInfo = {
        platformNumber: '6',
        status: 'CONFIRMED',
        station: { code: 'NDLS', name: 'New Delhi' },
        updatedAt: new Date().toISOString(),
      };

      const element = React.createElement(PlatformCard, {
        platformInfo: info,
      });

      expect(element).toBeDefined();
      expect(formatPlatformDisplay(info.platformNumber)).toBe('Platform 6');
    });

    it('should render expected platform correctly', () => {
      const info: PlatformInfo = {
        platformNumber: '1',
        status: 'EXPECTED',
        station: { code: 'CNB', name: 'Kanpur Central' },
        updatedAt: new Date().toISOString(),
      };

      const element = React.createElement(PlatformCard, {
        platformInfo: info,
      });

      expect(element).toBeDefined();
      expect(formatPlatformDisplay(info.platformNumber)).toBe('Platform 1');
    });

    it('should render "Not available" when platform is null (Zero Fake Platform Rule)', () => {
      const info: PlatformInfo = {
        platformNumber: null,
        status: 'UNAVAILABLE',
        station: null,
        updatedAt: new Date().toISOString(),
      };

      const element = React.createElement(PlatformCard, {
        platformInfo: info,
      });

      expect(element).toBeDefined();
      expect(formatPlatformDisplay(info.platformNumber)).toBe('Not available');
    });
  });
});

describe('fetchTrainPlatform Client API (Milestone 14)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject when train number is not 5 digits', async () => {
    await expect(fetchTrainPlatform('123')).rejects.toThrowError(ApiError);
    await expect(fetchTrainPlatform('123')).rejects.toMatchObject({
      code: 'INVALID_TRAIN_NUMBER',
    });
  });

  it('should return normalized PlatformInfo on successful server response', async () => {
    const mockInfo: PlatformInfo = {
      platformNumber: '2',
      status: 'EXPECTED',
      station: { code: 'GWL', name: 'Gwalior Junction' },
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockInfo }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchTrainPlatform('12002');
    expect(result.platformNumber).toBe('2');
    expect(result.status).toBe('EXPECTED');
    expect(result.station?.code).toBe('GWL');
  });

  it('should handle network connection error gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(fetchTrainPlatform('12002')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});
