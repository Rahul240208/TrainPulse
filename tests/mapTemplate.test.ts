import { describe, it, expect } from 'vitest';
import { normalizeMapData } from '../src/components/map/types';
import { generateLeafletHtml } from '../src/components/map/leafletTemplate';
import type { LiveTrainData } from '../src/types/api';
import type { MockTrain } from '../src/data/mockTrains';

const sampleLiveTrain: LiveTrainData = {
  trainNumber: '12301',
  trainName: 'Howrah Rajdhani Express',
  trainType: 'Rajdhani Express',
  sourceStation: 'Howrah',
  sourceCode: 'HWH',
  destinationStation: 'New Delhi',
  destinationCode: 'NDLS',
  status: 'RUNNING',
  currentLocation: {
    name: 'Kanpur Central',
    latitude: 26.45,
    longitude: 80.35,
    speedKmH: 120,
    positionType: 'ACTUAL_GPS',
  },
  delayMinutes: 0,
  nextStation: {
    code: 'NDLS',
    name: 'New Delhi',
    scheduledArrival: '10:00',
    actualArrival: '10:00',
    delayMinutes: 0,
    platform: '1',
    distanceRemainingKm: 440,
  },
  lastUpdatedTime: '2026-09-11T12:00:00Z',
  stations: [
    {
      code: 'HWH',
      name: 'Howrah',
      latitude: 22.58,
      longitude: 88.34,
      scheduledArrival: null,
      actualArrival: null,
      scheduledDeparture: '16:55',
      actualDeparture: '16:55',
      delayMinutes: 0,
      platform: '9',
      hasDeparted: true,
    },
    {
      code: 'CNB',
      name: 'Kanpur Central',
      latitude: 26.45,
      longitude: 80.35,
      scheduledArrival: '05:20',
      actualArrival: '05:20',
      scheduledDeparture: '05:25',
      actualDeparture: '05:25',
      delayMinutes: 0,
      platform: '1',
      hasDeparted: true,
    },
    {
      code: 'NDLS',
      name: 'New Delhi',
      latitude: 28.64,
      longitude: 77.22,
      scheduledArrival: '10:05',
      actualArrival: '10:05',
      scheduledDeparture: null,
      actualDeparture: null,
      delayMinutes: 0,
      platform: '1',
      hasDeparted: false,
    },
  ],
};

describe('Map Normalization & Leaflet Template Engine', () => {
  describe('Truthful Coordinate Normalization', () => {
    it('1. Preserves valid coordinates when present from upstream telemetry', () => {
      const normalized = normalizeMapData(sampleLiveTrain);

      expect(normalized.hasExactCoordinates).toBe(true);
      expect(normalized.latitude).toBe(26.45);
      expect(normalized.longitude).toBe(80.35);
      expect(normalized.positionType).toBe('ACTUAL_GPS');
      expect(normalized.stations.length).toBe(3);
    });

    it('2. Zero Invented Coordinates: sets latitude/longitude to null if coordinates are missing or zero', () => {
      const trainWithoutCoords: LiveTrainData = {
        ...sampleLiveTrain,
        currentLocation: {
          ...sampleLiveTrain.currentLocation,
          latitude: 0,
          longitude: 0,
          positionType: 'ESTIMATED_SCHEDULE',
        },
      };

      const normalized = normalizeMapData(trainWithoutCoords);

      expect(normalized.hasExactCoordinates).toBe(false);
      expect(normalized.latitude).toBeNull();
      expect(normalized.longitude).toBeNull();
      expect(normalized.positionType).toBe('ESTIMATED_SCHEDULE');
    });

    it('3. Filters out stations with invalid or zero coordinates', () => {
      const trainWithInvalidStation: LiveTrainData = {
        ...sampleLiveTrain,
        stations: [
          ...sampleLiveTrain.stations,
          {
            code: 'INV',
            name: 'Invalid Station',
            latitude: 0,
            longitude: 0,
            scheduledArrival: null,
            actualArrival: null,
            scheduledDeparture: null,
            actualDeparture: null,
            delayMinutes: 0,
            platform: null,
            hasDeparted: false,
          },
        ],
      };

      const normalized = normalizeMapData(trainWithInvalidStation);
      expect(normalized.stations.find((s) => s.code === 'INV')).toBeUndefined();
      expect(normalized.stations.length).toBe(3);
    });

    it('4. Normalizes MockTrain gracefully without fabricating GPS coordinates', () => {
      const mockTrain: MockTrain = {
        trainNumber: '12919',
        trainName: 'Malwa Express',
        trainType: 'Superfast',
        sourceStation: 'Dr. Ambedkar Nagar',
        sourceCode: 'DADN',
        destinationStation: 'Katra',
        destinationCode: 'SVDK',
        status: 'ON_TIME',
        statusMessage: 'On time',
        currentLocation: {
          name: 'Bhopal',
          speedKmH: 75,
          positionType: 'ESTIMATED_SCHEDULE',
          lastReportedStation: 'BPL',
        },
        speed: 75,
        delay: 0,
        nextStation: null,
        lastUpdatedTime: '12:30',
        stations: [],
      };

      const normalized = normalizeMapData(mockTrain);
      expect(normalized.hasExactCoordinates).toBe(false);
      expect(normalized.latitude).toBeNull();
      expect(normalized.trainNumber).toBe('12919');
      expect(normalized.positionType).toBe('ESTIMATED_SCHEDULE');
    });
  });

  describe('Leaflet HTML Template Generation', () => {
    it('5. Generates valid HTML document with Leaflet and OpenStreetMap tiles', () => {
      const normalized = normalizeMapData(sampleLiveTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('leaflet@1.9.4/dist/leaflet.js');
      expect(html).toContain('leaflet@1.9.4/dist/leaflet.css');
      expect(html).toContain('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_2yup_2_8e0dc3bb9dc9f0b035620d06');
      expect(html).toContain('https://carto.com/attributions');
      expect(html).toContain('OpenStreetMap');
    });

    it('6. Injects train marker with truthful accuracy color and telemetry callout', () => {
      const normalized = normalizeMapData(sampleLiveTrain);
      const html = generateLeafletHtml(normalized);

      // Has coordinates: renders train marker
      expect(html).toContain('custom-train-marker');
      expect(html).toContain('12301');
      expect(html).toContain('120 km/h');
      // ACTUAL_GPS emerald color
      expect(html).toContain('#10B981');
      expect(html).toContain('ACTUAL GPS');
      expect(html).toContain('trainMarkerInstance');
      // Does NOT show missing coordinates banner
      expect(html).not.toContain('<div class="truthful-notice-banner">');
    });

    it('7. Renders railway route polyline and station halt markers', () => {
      const normalized = normalizeMapData(sampleLiveTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('L.polyline');
      expect(html).toContain('custom-station-icon');
      expect(html).toContain('Kanpur Central');
      expect(html).toContain('New Delhi');
      expect(html).toContain('Howrah');
    });

    it('8. Renders Truthful Telemetry banner when coordinates are not available from upstream', () => {
      const trainWithoutCoords: LiveTrainData = {
        ...sampleLiveTrain,
        currentLocation: {
          ...sampleLiveTrain.currentLocation,
          latitude: 0,
          longitude: 0,
          positionType: 'ESTIMATED_SCHEDULE',
        },
      };

      const normalized = normalizeMapData(trainWithoutCoords);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('<div class="truthful-notice-banner">');
      expect(html).toContain('Truthful Telemetry:');
      expect(html).toContain('Live GPS coordinates not provided by upstream radar for Train 12301');
      // Does not render fake train marker instance
      expect(html).toContain('var trainLat = null;');
      expect(html).toContain('var trainLng = null;');
    });

    it('9. Includes Recenter and Fit Route map controls', () => {
      const normalized = normalizeMapData(sampleLiveTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('id="btn-recenter"');
      expect(html).toContain('id="btn-fit-route"');
      expect(html).toContain('floating-controls');
    });

    it('10. Includes Follow Train button and automatic camera drag pause logic', () => {
      const normalized = normalizeMapData(sampleLiveTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('id="btn-follow"');
      expect(html).toContain('btn-follow-label');
      expect(html).toContain('map.on(\'dragstart\'');
      expect(html).toContain('setFollowMode(false)');
    });

    it('11. Renders differentiated station markers with symbols and segmented route polylines', () => {
      const normalized = normalizeMapData(sampleLiveTrain);
      const html = generateLeafletHtml(normalized);

      // Station symbols: ✓ for previous/departed, ● for current, ◉ for next
      expect(html).toContain('✓');
      expect(html).toContain('●');
      expect(html).toContain('◉');
      // Segmented route polylines
      expect(html).toContain('completedLatLngs');
      expect(html).toContain('allRouteLatLngs');
      expect(html).toContain('#0284C7');
      expect(html).toContain('#334155');
    });
  });
});
