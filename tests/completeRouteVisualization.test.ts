import { describe, it, expect } from 'vitest';
import { normalizeMapData } from '../src/components/map/types';
import { generateLeafletHtml } from '../src/components/map/leafletTemplate';
import type { LiveTrainData } from '../src/types/api';

const route5StationsTrain: LiveTrainData = {
  trainNumber: '12046',
  trainName: 'Chandigarh Shatabdi Express',
  trainType: 'Shatabdi Express',
  sourceStation: 'Chandigarh Junction',
  sourceCode: 'CDG',
  destinationStation: 'New Delhi',
  destinationCode: 'NDLS',
  status: 'RUNNING',
  currentLocation: {
    name: 'Kurukshetra',
    latitude: 29.96,
    longitude: 76.85,
    speedKmH: 88,
    positionType: 'ACTUAL_GPS',
  },
  delayMinutes: 4,
  nextStation: {
    code: 'PNP',
    name: 'Panipat Junction',
    scheduledArrival: '13:45',
    actualArrival: '13:49',
    delayMinutes: 4,
    platform: '2',
    distanceRemainingKm: 65,
  },
  lastUpdatedTime: '2026-09-11T13:10:00Z',
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
      hasDeparted: true,
    },
    {
      code: 'KKDE',
      name: 'Kurukshetra',
      latitude: 29.96,
      longitude: 76.85,
      scheduledArrival: '13:12',
      actualArrival: '13:16',
      scheduledDeparture: '13:14',
      actualDeparture: '13:18',
      delayMinutes: 4,
      platform: '2',
      hasDeparted: false,
    },
    {
      code: 'PNP',
      name: 'Panipat Junction',
      latitude: 29.39,
      longitude: 76.97,
      scheduledArrival: '13:45',
      actualArrival: '13:49',
      scheduledDeparture: '13:47',
      actualDeparture: '13:51',
      delayMinutes: 4,
      platform: '1',
      hasDeparted: false,
    },
    {
      code: 'NDLS',
      name: 'New Delhi',
      latitude: 28.64,
      longitude: 77.22,
      scheduledArrival: '15:20',
      actualArrival: '15:24',
      scheduledDeparture: null,
      actualDeparture: null,
      delayMinutes: 4,
      platform: '4',
      hasDeparted: false,
    },
  ],
};

describe('Milestone 12: Complete Train Route Visualization', () => {
  describe('Station Classification & Route Normalization', () => {
    it('1. correctly identifies ORIGIN, PREVIOUS, CURRENT, NEXT, and DESTINATION stations', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      expect(normalized.stations.length).toBe(5);

      const [cdg, umb, kkde, pnp, ndls] = normalized.stations;

      // 1st station: ORIGIN
      expect(cdg.stationType).toBe('ORIGIN');
      expect(cdg.hasDeparted).toBe(true);

      // 2nd station: PREVIOUS (departed)
      expect(umb.stationType).toBe('PREVIOUS');
      expect(umb.hasDeparted).toBe(true);

      // 3rd station: CURRENT (matches currentLocation name)
      expect(kkde.stationType).toBe('CURRENT');
      expect(kkde.isCurrent).toBe(true);

      // 4th station: NEXT (matches nextStation code PNP)
      expect(pnp.stationType).toBe('NEXT');
      expect(pnp.isNext).toBe(true);

      // 5th station: DESTINATION
      expect(ndls.stationType).toBe('DESTINATION');
    });

    it('2. filters out stations with invalid or zero coordinates without breaking route integrity', () => {
      const trainWithInvalid = {
        ...route5StationsTrain,
        stations: [
          ...route5StationsTrain.stations,
          {
            code: 'BAD',
            name: 'Corrupt Station',
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

      const normalized = normalizeMapData(trainWithInvalid);
      expect(normalized.stations.length).toBe(5);
      expect(normalized.stations.find((s) => s.code === 'BAD')).toBeUndefined();
    });

    it('3. handles train at origin before departure (all remaining route)', () => {
      const trainNotStarted = {
        ...route5StationsTrain,
        currentLocation: {
          name: 'Chandigarh',
          latitude: 30.70,
          longitude: 76.82,
          speedKmH: 0,
          positionType: 'STATION_DEPARTURE' as const,
        },
        stations: route5StationsTrain.stations.map((s) => ({
          ...s,
          hasDeparted: false,
        })),
      };

      const normalized = normalizeMapData(trainNotStarted);
      const [origin] = normalized.stations;
      expect(origin.stationType).toBe('ORIGIN');
      expect(origin.hasDeparted).toBe(false);
    });
  });

  describe('Leaflet Route Rendering & Visual Elements', () => {
    it('4. renders route polylines with completed glowing track and remaining dashed track', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      const html = generateLeafletHtml(normalized);

      // Base remaining route polyline (dashed slate track)
      expect(html).toContain('allRouteLatLngs');
      expect(html).toContain('#334155');
      expect(html).toContain('#64748B');
      expect(html).toContain('dashArray: \'6, 8\'');

      // Completed route segment (solid cyan/blue glowing line)
      expect(html).toContain('completedLatLngs');
      expect(html).toContain('#0284C7');
      expect(html).toContain('#38BDF8');
    });

    it('5. renders differentiated station markers with symbols (✓, ●, ◉, ○)', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      const html = generateLeafletHtml(normalized);

      // Symbols
      expect(html).toContain('✓'); // Departed/previous stations
      expect(html).toContain('●'); // Current or Origin station
      expect(html).toContain('◉'); // Next stop
      expect(html).toContain('○'); // Future stop

      // CSS Classes
      expect(html).toContain('.station-marker.previous');
      expect(html).toContain('.station-marker.current');
      expect(html).toContain('.station-marker.next-stop');
      expect(html).toContain('.station-marker.future');
      expect(html).toContain('.station-marker.origin');
      expect(html).toContain('.station-marker.dest');
    });

    it('6. renders detailed popups with arrival/departure times, platforms, and delay for each station', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      const html = generateLeafletHtml(normalized);

      // Station codes & names in stations JSON
      expect(html).toContain('"code":"CDG"');
      expect(html).toContain('"name":"Chandigarh"');
      expect(html).toContain('"code":"UMB"');
      expect(html).toContain('"name":"Ambala Cantt"');
      expect(html).toContain('"code":"KKDE"');
      expect(html).toContain('"name":"Kurukshetra"');
      expect(html).toContain('"code":"PNP"');
      expect(html).toContain('"name":"Panipat Junction"');
      expect(html).toContain('"code":"NDLS"');
      expect(html).toContain('"name":"New Delhi"');

      // Popup formatting in script
      expect(html).toContain('s.code + \' &mdash; \' + s.name');

      // Platform indicators
      expect(html).toContain('PF \' + s.platform');

      // Status labels in popups
      expect(html).toContain('Current Station');
      expect(html).toContain('Next Stop');
      expect(html).toContain('Departed');
    });
  });

  describe('Camera Management & Follow Train Mode', () => {
    it('7. contains Follow Train button with active/inactive state and toggle label', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('id="btn-follow"');
      expect(html).toContain('id="btn-follow-label"');
      expect(html).toContain('follow-btn active');
      expect(html).toContain('Following');
      expect(html).toContain('Follow');
      expect(html).toContain('setFollowMode(true)');
      expect(html).toContain('setFollowMode(false)');
    });

    it('8. automatically pauses follow mode on user manual drag/pan to prevent camera fighting', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('map.on(\'dragstart\'');
      expect(html).toContain('if (isFollowMode)');
      expect(html).toContain('setFollowMode(false);');
    });

    it('9. only pans camera during live telemetry update when follow mode is active', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('if (isFollowMode)');
      expect(html).toContain('map.panTo(targetLatLng, { animate: true, duration: 1.0 });');
    });

    it('10. recenter and fit-route controls function cleanly alongside follow mode', () => {
      const normalized = normalizeMapData(route5StationsTrain);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('id="btn-recenter"');
      expect(html).toContain('id="btn-fit-route"');
      // Fitting route explicitly pauses follow mode
      expect(html).toContain('btnFitRoute.addEventListener(\'click\'');
      expect(html).toContain('setFollowMode(false);');
      // Recenter re-enables follow mode
      expect(html).toContain('btnRecenter.addEventListener(\'click\'');
      expect(html).toContain('setFollowMode(true);');
    });

    it('11. truthful telemetry banner shown when train has no GPS coordinates', () => {
      const trainNoCoords: LiveTrainData = {
        ...route5StationsTrain,
        currentLocation: {
          ...route5StationsTrain.currentLocation,
          latitude: 0,
          longitude: 0,
          positionType: 'ESTIMATED_SCHEDULE',
        },
      };

      const normalized = normalizeMapData(trainNoCoords);
      const html = generateLeafletHtml(normalized);

      expect(html).toContain('<div class="truthful-notice-banner">');
      expect(html).toContain('Truthful Telemetry:');
      // When no train coordinates, follow button is omitted
      expect(html).not.toContain('id="btn-follow"');
      // But Fit Route button is still present to inspect stations
      expect(html).toContain('id="btn-fit-route"');
    });
  });
});
