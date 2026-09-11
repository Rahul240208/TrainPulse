import { describe, it, expect } from 'vitest';
import {
  determinePositionAccuracy,
  normalizeTrainStatus,
  transformRailRadarToTrainPulse,
} from '../src/services/transformer.service.js';
import { liveTrainDataSchema } from '../src/schemas/liveTrain.js';
import type { RailRadarData } from '../src/schemas/railradar.js';

describe('Transformer Service & Truthful Telemetry', () => {
  const mockRailRadarPayload: RailRadarData = {
    trainNumber: '12301',
    trainName: 'Howrah - New Delhi Rajdhani Express',
    status: 'running',
    trackingMode: 'hybrid',
    isLive: true,
    delayMinutes: 15,
    train: {
      number: '12301',
      name: 'Howrah - New Delhi Rajdhani Express',
      type: 'Rajdhani Express',
      category: 'Premium',
      source: { code: 'HWH', name: 'Howrah', lat: 22.58, lng: 88.34 },
      destination: { code: 'NDLS', name: 'New Delhi', lat: 28.64, lng: 77.22 },
      avgSpeed: 84.5,
    },
    currentLocation: {
      stationCode: 'CNB',
      stationName: 'Kanpur Central',
      status: 'in-transit',
      isHalt: true,
      delayMinutes: 15,
      lat: 26.45,
      lng: 80.35,
      speedKmH: 112,
    },
    nextHalt: {
      stationCode: 'PRYJ',
      stationName: 'Prayagraj Jn',
      distance: 194.2,
    },
    route: [
      {
        sequence: 1,
        stationCode: 'HWH',
        stationName: 'Howrah',
        isHalt: true,
        status: 'passed',
        scheduledDeparture: '2026-09-11T16:50:00+05:30',
        actualDeparture: '2026-09-11T16:50:00+05:30',
        platform: '9',
      },
      {
        sequence: 2,
        stationCode: 'CNB',
        stationName: 'Kanpur Central',
        isHalt: true,
        status: 'at-station',
        scheduledArrival: '2026-09-12T00:45:00+05:30',
        actualArrival: '2026-09-12T01:00:00+05:30',
        delayArrival: 15,
        platform: '1',
      },
      {
        sequence: 3,
        stationCode: 'PRYJ',
        stationName: 'Prayagraj Jn',
        isHalt: true,
        status: 'upcoming',
        scheduledArrival: '2026-09-12T03:10:00+05:30',
        delayArrival: 15,
        platform: '2',
        distance: 194.2,
      },
      {
        sequence: 4,
        stationCode: 'NDLS',
        stationName: 'New Delhi',
        isHalt: true,
        status: 'upcoming',
        scheduledArrival: '2026-09-12T10:05:00+05:30',
        platform: '14',
      },
    ],
    lastUpdatedAt: '2026-09-11T18:30:00+05:30',
  };

  describe('Truthful Telemetry Classification (Truthfulness Rule)', () => {
    it('should classify as STATION_DEPARTURE when train is confirmed at station', () => {
      const payload: RailRadarData = {
        ...mockRailRadarPayload,
        currentLocation: {
          ...mockRailRadarPayload.currentLocation,
          status: 'at-station',
        },
      };
      expect(determinePositionAccuracy(payload)).toBe('STATION_DEPARTURE');
    });

    it('should classify as ACTUAL_GPS when tracking mode is verified hardware GPS', () => {
      const payload: RailRadarData = {
        ...mockRailRadarPayload,
        currentLocation: {
          ...mockRailRadarPayload.currentLocation,
          status: 'in-transit',
        },
        trackingMode: 'gps',
      };
      expect(determinePositionAccuracy(payload)).toBe('ACTUAL_GPS');
    });

    it('should classify as ESTIMATED_SCHEDULE when tracking is hybrid or schedule-derived', () => {
      const payload: RailRadarData = {
        ...mockRailRadarPayload,
        currentLocation: {
          ...mockRailRadarPayload.currentLocation,
          status: 'in-transit',
        },
        trackingMode: 'hybrid',
      };
      expect(determinePositionAccuracy(payload)).toBe('ESTIMATED_SCHEDULE');
    });
  });

  describe('Train Status Normalization', () => {
    it('should normalize various status strings correctly', () => {
      expect(normalizeTrainStatus('running')).toBe('RUNNING');
      expect(normalizeTrainStatus('Train is Cancelled')).toBe('CANCELLED');
      expect(normalizeTrainStatus('Diverted via loop line')).toBe('DIVERTED');
      expect(normalizeTrainStatus('Arrived at destination')).toBe('ARRIVED');
      expect(normalizeTrainStatus('Journey Completed')).toBe('ARRIVED');
      expect(normalizeTrainStatus('Scheduled / Not started')).toBe('NOT_STARTED');
      expect(normalizeTrainStatus(undefined)).toBe('RUNNING');
    });
  });

  describe('DTO Transformation', () => {
    it('should transform raw RailRadar payload into canonical LiveTrainData passing schema check', () => {
      const result = transformRailRadarToTrainPulse(mockRailRadarPayload);

      expect(result.trainNumber).toBe('12301');
      expect(result.trainName).toBe('Howrah - New Delhi Rajdhani Express');
      expect(result.sourceCode).toBe('HWH');
      expect(result.destinationCode).toBe('NDLS');
      expect(result.status).toBe('RUNNING');
      expect(result.delayMinutes).toBe(15);
      expect(result.currentLocation.speedKmH).toBe(112);

      // Verify next station
      expect(result.nextStation).toBeDefined();
      expect(result.nextStation?.code).toBe('PRYJ');
      expect(result.nextStation?.delayMinutes).toBe(15);

      // Verify halts filtering
      expect(result.stations.length).toBe(4);
      expect(result.stations[0].code).toBe('HWH');
      expect(result.stations[0].hasDeparted).toBe(true);
      expect(result.stations[3].code).toBe('NDLS');
      expect(result.stations[3].hasDeparted).toBe(false);

      // Strict canonical schema check
      const validation = liveTrainDataSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });
  });
});

