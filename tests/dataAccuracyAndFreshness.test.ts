import { describe, it, expect, vi } from 'vitest';
import React from 'react';
// @ts-ignore
import ReactDOMServer from 'react-dom/server';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: '127.0.0.1:8081',
    },
  },
}));

vi.mock('react-native', () => {
  const React = require('react');

  class MockAnimatedValue {
    val: number;
    constructor(val: number) {
      this.val = val;
    }
    interpolate() {
      return this;
    }
  }

  return {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    View: ({ children, style, testID, ...props }: any) =>
      React.createElement('div', { style, 'data-testid': testID, ...props }, children),
    Text: ({ children, style, testID, ...props }: any) =>
      React.createElement('span', { style, 'data-testid': testID, ...props }, children),
    TouchableOpacity: ({ children, onPress, ...props }: any) =>
      React.createElement('button', { onClick: onPress, ...props }, children),
    ScrollView: ({ children, style, ...props }: any) =>
      React.createElement('div', { style, ...props }, children),
    TextInput: (props: any) => React.createElement('input', props),
    Animated: {
      Value: MockAnimatedValue,
      View: ({ children, style, ...props }: any) =>
        React.createElement('div', { style, ...props }, children),
      loop: vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
      })),
      sequence: vi.fn(() => ({
        start: vi.fn(),
      })),
      timing: vi.fn(() => ({
        start: vi.fn(),
      })),
    },
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import { PositionBadge } from '../src/components/common/PositionBadge';
import { LiveTelemetryBar } from '../src/components/common/LiveTelemetryBar';
import { StatusPill } from '../src/components/common/StatusPill';
import { PlatformCard, formatPlatformDisplay } from '../src/components/train/PlatformCard';
import { CoachLayout } from '../src/components/train/CoachLayout';
import { NextStationCard } from '../src/components/train/NextStationCard';
import { StationTimeline } from '../src/components/train/StationTimeline';
import type { PlatformInfo, CoachComposition, NextStation, StationPoint } from '../src/types/api';

function renderText(element: React.ReactElement): string {
  const html = ReactDOMServer.renderToStaticMarkup(element);
  // Strip HTML tags to get pure text content
  return html.replace(/<[^>]*>/g, ' ');
}

describe('Milestone 18 — Data Accuracy, Freshness and Fallbacks', () => {
  describe('Location & Telemetry Truthfulness (PositionBadge)', () => {
    it('accurately identifies Actual GPS telemetry', () => {
      const text = renderText(React.createElement(PositionBadge, { positionType: 'ACTUAL_GPS' }));
      expect(text).toContain('Actual GPS Telemetry');
      expect(text).not.toContain('Estimated');
    });

    it('accurately identifies Estimated Schedule positions', () => {
      const text = renderText(React.createElement(PositionBadge, { positionType: 'ESTIMATED_SCHEDULE' }));
      expect(text).toContain('Estimated Position');
      expect(text).not.toContain('Actual GPS');
    });

    it('accurately identifies Station Departure estimated positions', () => {
      const text = renderText(React.createElement(PositionBadge, { positionType: 'STATION_DEPARTURE' }));
      expect(text).toContain('Station Departure (Estimated)');
      expect(text).not.toContain('Actual GPS');
    });

    it('accurately distinguishes Stale Position when isStale is true', () => {
      const text = renderText(React.createElement(PositionBadge, { positionType: 'ACTUAL_GPS', isStale: true }));
      expect(text).toContain('Stale Position');
      expect(text).not.toContain('Actual GPS Telemetry');
    });

    it('accurately identifies Unavailable Location when isUnavailable is true', () => {
      const text = renderText(React.createElement(PositionBadge, { positionType: 'ESTIMATED_SCHEDULE', isUnavailable: true }));
      expect(text).toContain('Location Unavailable');
      expect(text).not.toContain('Estimated Position');
    });
  });

  describe('Platform Truthfulness (PlatformCard & formatPlatformDisplay)', () => {
    it('never fabricates a platform when null or missing', () => {
      expect(formatPlatformDisplay(null)).toBe('Not available');
      expect(formatPlatformDisplay(undefined)).toBe('Not available');
      expect(formatPlatformDisplay('')).toBe('Not available');
    });

    it('renders UNAVAILABLE status cleanly with "Not available"', () => {
      const platformInfo: PlatformInfo = {
        platformNumber: null,
        status: 'UNAVAILABLE',
        station: { code: 'NDLS', name: 'New Delhi' },
        updatedAt: new Date().toISOString(),
      };

      const text = renderText(React.createElement(PlatformCard, { platformInfo }));
      expect(text).toContain('Not available');
      expect(text).toContain('UNAVAILABLE');
      expect(text).toContain('Platform information may change');
    });

    it('renders CONFIRMED platform accurately', () => {
      const platformInfo: PlatformInfo = {
        platformNumber: '6',
        status: 'CONFIRMED',
        station: { code: 'CDG', name: 'Chandigarh' },
        updatedAt: new Date().toISOString(),
      };

      const text = renderText(React.createElement(PlatformCard, { platformInfo }));
      expect(text).toContain('Platform 6');
      expect(text).toContain('CONFIRMED');
    });

    it('renders EXPECTED platform accurately', () => {
      const platformInfo: PlatformInfo = {
        platformNumber: '3',
        status: 'EXPECTED',
        station: { code: 'UMB', name: 'Ambala Cantt' },
        updatedAt: new Date().toISOString(),
      };

      const text = renderText(React.createElement(PlatformCard, { platformInfo }));
      expect(text).toContain('Platform 3');
      expect(text).toContain('EXPECTED');
    });
  });

  describe('Coach Layout Truthfulness (CoachLayout)', () => {
    it('renders exact fallback "Coach layout unavailable for this train." when unavailable', () => {
      const comp: CoachComposition = {
        trainNumber: '12046',
        available: false,
        totalCoaches: 0,
        coaches: [],
      };

      const text = renderText(React.createElement(CoachLayout, { composition: comp, trainNumber: '12046' }));
      expect(text).toContain('Coach layout unavailable for this train.');
    });

    it('renders exact fallback when composition is null or coaches are empty', () => {
      const textNull = renderText(React.createElement(CoachLayout, { composition: null, trainNumber: '12046' }));
      expect(textNull).toContain('Coach layout unavailable for this train.');

      const compEmpty: CoachComposition = {
        trainNumber: '12046',
        available: true,
        totalCoaches: 0,
        coaches: [],
      };
      const textEmpty = renderText(React.createElement(CoachLayout, { composition: compEmpty, trainNumber: '12046' }));
      expect(textEmpty).toContain('Coach layout unavailable for this train.');
    });
  });

  describe('Delay & Schedule Truthfulness', () => {
    describe('StatusPill', () => {
      it('displays RUNNING without claiming ON TIME when delayMinutes is null', () => {
        const text = renderText(React.createElement(StatusPill, { status: 'RUNNING', delayMinutes: null }));
        expect(text).toContain('RUNNING');
        expect(text).not.toContain('ON TIME');
      });

      it('displays RUNNING without claiming ON TIME when delayMinutes is undefined', () => {
        const text = renderText(React.createElement(StatusPill, { status: 'RUNNING', delayMinutes: undefined }));
        expect(text).toContain('RUNNING');
        expect(text).not.toContain('ON TIME');
      });

      it('displays ON TIME only when delayMinutes is explicitly 0 or <= 0', () => {
        const text = renderText(React.createElement(StatusPill, { status: 'RUNNING', delayMinutes: 0 }));
        expect(text).toContain('ON TIME');
      });

      it('displays delay minutes when delayMinutes is positive', () => {
        const text = renderText(React.createElement(StatusPill, { status: 'RUNNING', delayMinutes: 12 }));
        expect(text).toContain('LATE +12m');
      });
    });

    describe('NextStationCard', () => {
      it('displays neutral delay fallback "--" when delayMinutes is null', () => {
        const nextStation: NextStation = {
          code: 'KKDE',
          name: 'Kurukshetra',
          scheduledArrival: '18:00',
          actualArrival: null,
          delayMinutes: null as any,
          distanceRemainingKm: 45,
          platform: '2',
        };

        const text = renderText(React.createElement(NextStationCard, { nextStation }));
        expect(text).toContain('--');
        expect(text).not.toContain('On Time');
      });

      it('displays "On Time" when delayMinutes is explicitly 0', () => {
        const nextStation: NextStation = {
          code: 'KKDE',
          name: 'Kurukshetra',
          scheduledArrival: '18:00',
          actualArrival: '18:00',
          delayMinutes: 0,
          distanceRemainingKm: 45,
          platform: '2',
        };

        const text = renderText(React.createElement(NextStationCard, { nextStation }));
        expect(text).toContain('On Time');
      });
    });

    describe('StationTimeline', () => {
      it('displays "--" when stop delayMinutes is null or undefined instead of claiming On Time', () => {
        const stations: StationPoint[] = [
          {
            code: 'CDG',
            name: 'Chandigarh',
            latitude: 30.7046,
            longitude: 76.8013,
            scheduledArrival: '12:00',
            actualArrival: null,
            scheduledDeparture: '12:05',
            actualDeparture: null,
            delayMinutes: null as any,
            platform: '1',
            hasDeparted: true,
          },
        ];

        const text = renderText(React.createElement(StationTimeline, { stations }));
        expect(text).toContain('--');
        expect(text).not.toContain('On Time');
      });

      it('displays "On Time" when stop delayMinutes is explicitly 0', () => {
        const stations: StationPoint[] = [
          {
            code: 'CDG',
            name: 'Chandigarh',
            latitude: 30.7046,
            longitude: 76.8013,
            scheduledArrival: '12:00',
            actualArrival: '12:00',
            scheduledDeparture: '12:05',
            actualDeparture: '12:05',
            delayMinutes: 0,
            platform: '1',
            hasDeparted: true,
          },
        ];

        const text = renderText(React.createElement(StationTimeline, { stations }));
        expect(text).toContain('On Time');
      });
    });
  });

  describe('Freshness, Stale Indicators, and Refresh Failures (LiveTelemetryBar)', () => {
    it('displays exact string "Unable to refresh. Showing last successful update." on background refresh error', () => {
      const text = renderText(React.createElement(LiveTelemetryBar, {
        isRefreshing: false,
        isPolling: true,
        refreshIntervalSeconds: 30,
        lastSuccessfulUpdate: new Date(Date.now() - 45000),
        backgroundError: 'Network request failed',
        onRetry: vi.fn(),
        onDismissError: vi.fn(),
      }));

      expect(text).toContain('Unable to refresh. Showing last successful update.');
    });

    it('displays "DATA MAY BE OUTDATED" and amber indicator when isStale is true', () => {
      const text = renderText(React.createElement(LiveTelemetryBar, {
        isRefreshing: false,
        isPolling: true,
        isStale: true,
        refreshIntervalSeconds: 30,
        lastSuccessfulUpdate: new Date(Date.now() - 90000),
        backgroundError: null,
        onRetry: vi.fn(),
      }));

      expect(text).toContain('DATA MAY BE OUTDATED');
      expect(text).not.toContain('LIVE UPDATING');
    });

    it('displays "LIVE AUTO-REFRESH" when data is fresh and no background error exists', () => {
      const text = renderText(React.createElement(LiveTelemetryBar, {
        isRefreshing: false,
        isPolling: true,
        isStale: false,
        refreshIntervalSeconds: 30,
        lastSuccessfulUpdate: new Date(),
        backgroundError: null,
        onRetry: vi.fn(),
      }));

      expect(text).toContain('LIVE AUTO-REFRESH');
      expect(text).not.toContain('DATA MAY BE OUTDATED');
    });
  });
});

