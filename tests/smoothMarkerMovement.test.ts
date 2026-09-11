import { describe, it, expect } from 'vitest';
import {
  shouldInterpolateMovement,
  isValidCoordinate,
  PositionInterpolator,
  ESTIMATED_MOVEMENT_LABEL,
  DISALLOWED_INTERPOLATION_STATUSES,
  type Coordinates,
} from '../src/utils/interpolation';
import { generateLeafletHtml } from '../src/components/map/leafletTemplate';
import type { NormalizedMapData } from '../src/components/map/types';

describe('Milestone 15: Smooth Live Train Marker Movement', () => {
  const pAmbala: Coordinates = { latitude: 30.3782, longitude: 76.7767 };
  const pKurukshetra: Coordinates = { latitude: 29.9695, longitude: 76.8783 }; // ~46 km away
  const pDelhi: Coordinates = { latitude: 28.6139, longitude: 77.209 }; // ~200 km from Ambala

  describe('1. Normal Movement Interpolation', () => {
    it('permits smooth interpolation when consecutive fresh positions are within realistic bounds', () => {
      const allowed = shouldInterpolateMovement({
        prevCoords: pAmbala,
        nextCoords: { latitude: 30.35, longitude: 76.79 }, // ~3.5 km progress
        isStale: false,
        status: 'RUNNING',
      });
      expect(allowed).toBe(true);
    });

    it('interpolates smoothly with Estimated movement indicator and reverts upon completion', () => {
      const interpolator = new PositionInterpolator({ transitionDurationMs: 1500 });
      const p1: Coordinates = { latitude: 30.3782, longitude: 76.7767 };
      const p2: Coordinates = { latitude: 30.35, longitude: 76.79 };

      interpolator.pushTelemetry(p1, 0, 85, 'ACTUAL_GPS', 'RUNNING', false);
      interpolator.pushTelemetry(p2, 1000, 85, 'ACTUAL_GPS', 'RUNNING', false);

      // Mid-transition at t=1750ms (50% through 1500ms duration)
      const mid = interpolator.getCurrentPosition(1750);
      expect(mid.isComplete).toBe(false);
      expect(mid.fraction).toBeGreaterThan(0);
      expect(mid.fraction).toBeLessThan(1);
      // Truthful Telemetry Rule: intermediate positions must be tagged as ESTIMATED_SCHEDULE & display movement label
      expect(mid.effectivePositionType).toBe('ESTIMATED_SCHEDULE');
      expect(mid.movementLabel).toBe(ESTIMATED_MOVEMENT_LABEL);

      // Completion at t=2600ms (> 1500ms duration)
      const end = interpolator.getCurrentPosition(2600);
      expect(end.isComplete).toBe(true);
      expect(end.position).toEqual(p2);
      // Upon completion, authentic position classification resumes and label clears
      expect(end.effectivePositionType).toBe('ACTUAL_GPS');
      expect(end.movementLabel).toBeNull();
    });
  });

  describe('2. Delayed Update', () => {
    it('gracefully retains the current position without jumping or drifting when an update is delayed', () => {
      const interpolator = new PositionInterpolator({ transitionDurationMs: 1500, staleThresholdMs: 60000 });
      const p1: Coordinates = { latitude: 30.3782, longitude: 76.7767 };
      const p2: Coordinates = { latitude: 30.35, longitude: 76.79 };

      interpolator.pushTelemetry(p1, 0, 85, 'ACTUAL_GPS');
      interpolator.pushTelemetry(p2, 1000, 85, 'ACTUAL_GPS');

      // Settled at t=3000ms
      const settled = interpolator.getCurrentPosition(3000);
      expect(settled.position).toEqual(p2);
      expect(settled.isComplete).toBe(true);

      // Delayed update: 25 seconds later (t=26000ms) with no new telemetry
      const delayed = interpolator.getCurrentPosition(26000);
      expect(delayed.position).toEqual(p2);
      expect(delayed.isStale).toBe(false);
      expect(delayed.movementLabel).toBeNull();
    });
  });

  describe('3. Missing Update / Invalid Coordinates', () => {
    it('bypasses interpolation if next coordinate is missing (null or undefined)', () => {
      expect(
        shouldInterpolateMovement({
          prevCoords: pAmbala,
          nextCoords: null,
          status: 'RUNNING',
        })
      ).toBe(false);

      expect(
        shouldInterpolateMovement({
          prevCoords: null,
          nextCoords: pAmbala,
          status: 'RUNNING',
        })
      ).toBe(false);
    });

    it('bypasses interpolation if coordinates are NaN or out of geographical bounds', () => {
      expect(
        shouldInterpolateMovement({
          prevCoords: pAmbala,
          nextCoords: { latitude: NaN, longitude: 76.77 },
          status: 'RUNNING',
        })
      ).toBe(false);

      // Outside India (e.g. lat=0, lng=0 or lat=80)
      expect(
        shouldInterpolateMovement({
          prevCoords: pAmbala,
          nextCoords: { latitude: 0, longitude: 0 },
          status: 'RUNNING',
        })
      ).toBe(false);

      expect(
        shouldInterpolateMovement({
          prevCoords: pAmbala,
          nextCoords: { latitude: 75.0, longitude: 10.0 }, // Far outside
          status: 'RUNNING',
        })
      ).toBe(false);
    });

    it('isValidCoordinate strictly validates realistic railway coordinates', () => {
      expect(isValidCoordinate(pAmbala)).toBe(true);
      expect(isValidCoordinate(null)).toBe(false);
      expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(false);
      expect(isValidCoordinate({ latitude: -15, longitude: 75 })).toBe(false);
      expect(isValidCoordinate({ latitude: 50, longitude: 75 })).toBe(false);
    });
  });

  describe('4. Stale Update Guard', () => {
    it('bypasses interpolation if telemetry is marked stale (isStale === true)', () => {
      const allowed = shouldInterpolateMovement({
        prevCoords: pAmbala,
        nextCoords: { latitude: 30.35, longitude: 76.79 },
        isStale: true,
        status: 'RUNNING',
      });
      expect(allowed).toBe(false);
    });

    it('PositionInterpolator immediately snaps to target without animation if isStale is true', () => {
      const interpolator = new PositionInterpolator();
      interpolator.pushTelemetry(pAmbala, 0, 80, 'ACTUAL_GPS', 'RUNNING', false);

      const pNext: Coordinates = { latitude: 30.35, longitude: 76.79 };
      interpolator.pushTelemetry(pNext, 1000, 80, 'ACTUAL_GPS', 'RUNNING', true); // isStale = true

      // Snapped immediately at t=1050ms
      const state = interpolator.getCurrentPosition(1050);
      expect(state.position).toEqual(pNext);
      expect(state.isComplete).toBe(true);
      expect(state.movementLabel).toBeNull();
    });
  });

  describe('5. Large Position Jump Guard', () => {
    it('bypasses interpolation if coordinates jump across > 100km (>1 degree)', () => {
      const allowed = shouldInterpolateMovement({
        prevCoords: pAmbala,
        nextCoords: pDelhi, // ~200 km jump
        isStale: false,
        status: 'RUNNING',
        maxJumpKm: 100,
      });
      expect(allowed).toBe(false);
    });

    it('PositionInterpolator snaps directly on abnormal jump without gliding across terrain', () => {
      const interpolator = new PositionInterpolator({ jumpThresholdKm: 100 });
      interpolator.pushTelemetry(pAmbala, 0, 90, 'ACTUAL_GPS');
      interpolator.pushTelemetry(pDelhi, 1000, 90, 'ACTUAL_GPS'); // ~200km jump

      const state = interpolator.getCurrentPosition(1100);
      expect(state.position).toEqual(pDelhi);
      expect(state.isComplete).toBe(true);
      expect(state.movementLabel).toBeNull();
    });
  });

  describe('6. Completed Train Guard', () => {
    it('bypasses interpolation when status is ARRIVED', () => {
      const allowed = shouldInterpolateMovement({
        prevCoords: pAmbala,
        nextCoords: { latitude: 30.35, longitude: 76.79 },
        isStale: false,
        status: 'ARRIVED',
      });
      expect(allowed).toBe(false);
    });

    it('bypasses interpolation when status is COMPLETED', () => {
      const allowed = shouldInterpolateMovement({
        prevCoords: pAmbala,
        nextCoords: { latitude: 30.35, longitude: 76.79 },
        isStale: false,
        status: 'COMPLETED',
      });
      expect(allowed).toBe(false);
    });
  });

  describe('7. Cancelled Train Guard', () => {
    it('bypasses interpolation when status is CANCELLED', () => {
      const allowed = shouldInterpolateMovement({
        prevCoords: pAmbala,
        nextCoords: { latitude: 30.35, longitude: 76.79 },
        isStale: false,
        status: 'CANCELLED',
      });
      expect(allowed).toBe(false);
    });

    it('PositionInterpolator snaps without animating for CANCELLED service', () => {
      const interpolator = new PositionInterpolator();
      interpolator.pushTelemetry(pAmbala, 0, 80, 'ACTUAL_GPS', 'RUNNING');

      const pNext: Coordinates = { latitude: 30.35, longitude: 76.79 };
      interpolator.pushTelemetry(pNext, 1000, 0, 'ESTIMATED_SCHEDULE', 'CANCELLED');

      const state = interpolator.getCurrentPosition(1100);
      expect(state.position).toEqual(pNext);
      expect(state.isComplete).toBe(true);
      expect(state.movementLabel).toBeNull();
    });
  });

  describe('8. Diverted Train Guard', () => {
    it('bypasses interpolation when status is DIVERTED to prevent incorrect interpolation off route', () => {
      const allowed = shouldInterpolateMovement({
        prevCoords: pAmbala,
        nextCoords: { latitude: 30.35, longitude: 76.79 },
        isStale: false,
        status: 'DIVERTED',
      });
      expect(allowed).toBe(false);
    });
  });

  describe('9. Authentic Speed and Delay Display', () => {
    it('strictly preserves upstream speed and delay without computing synthetic animation velocity', () => {
      const interpolator = new PositionInterpolator();
      interpolator.pushTelemetry(pAmbala, 0, 92, 'ACTUAL_GPS');
      expect(interpolator.currentSpeed).toBe(92);

      interpolator.pushTelemetry(pKurukshetra, 1000, 78, 'ACTUAL_GPS');
      expect(interpolator.currentSpeed).toBe(78);
    });
  });

  describe('10. Leaflet HTML Template Integration', () => {
    const mockNormalizedData: NormalizedMapData = {
      trainNumber: '12046',
      trainName: 'Chandigarh Shatabdi Express',
      trainType: 'Shatabdi',
      sourceCode: 'CDG',
      sourceStation: 'Chandigarh Junction',
      destinationCode: 'NDLS',
      destinationStation: 'New Delhi',
      speedKmH: 82,
      delayMinutes: 5,
      status: 'RUNNING',
      positionType: 'ACTUAL_GPS',
      currentStationName: 'Ambala Cantt',
      latitude: 30.3782,
      longitude: 76.7767,
      hasExactCoordinates: true,
      nextStation: {
        code: 'KKDE',
        name: 'Kurukshetra',
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
          scheduledArrival: null,
          actualArrival: null,
          delayMinutes: 0,
          platform: '1',
          stationType: 'ORIGIN',
        },
        {
          code: 'UMB',
          name: 'Ambala Cantt',
          latitude: 30.3782,
          longitude: 76.7767,
          hasDeparted: false,
          scheduledArrival: '23:10',
          actualArrival: '23:15',
          delayMinutes: 5,
          platform: '2',
          stationType: 'CURRENT',
          isCurrent: true,
        },
      ],
    };

    it('contains the .train-movement-badge style and HTML element', () => {
      const html = generateLeafletHtml(mockNormalizedData);
      expect(html).toContain('.train-movement-badge');
      expect(html).toContain('<div class="train-movement-badge">Estimated movement</div>');
    });

    it('contains shouldInterpolate guard function in Leaflet script', () => {
      const html = generateLeafletHtml(mockNormalizedData);
      expect(html).toContain('function shouldInterpolate(prevLatLng, targetLatLng, newData)');
      expect(html).toContain('newData.isStale === true');
      expect(html).toContain("['CANCELLED', 'ARRIVED', 'COMPLETED', 'DIVERTED']");
    });

    it('contains setMarkerMovementIndicator and smoothMoveMarker with Estimated movement support', () => {
      const html = generateLeafletHtml(mockNormalizedData);
      expect(html).toContain('function setMarkerMovementIndicator(marker, isMoving)');
      expect(html).toContain('setMarkerMovementIndicator(marker, true)');
      expect(html).toContain('setMarkerMovementIndicator(marker, false)');
      expect(html).toContain('ESTIMATED MOVEMENT');
    });

    it('honors prompt requirement that disallowed statuses are handled', () => {
      for (const status of DISALLOWED_INTERPOLATION_STATUSES) {
        expect(['CANCELLED', 'ARRIVED', 'COMPLETED', 'DIVERTED']).toContain(status);
      }
    });
  });
});
