import { describe, it, expect } from 'vitest';
import {
  clamp,
  easeOutCubic,
  interpolateCoordinates,
  haversineDistanceKm,
  calculateBearing,
  PositionInterpolator,
  type Coordinates,
} from '../src/utils/interpolation';

describe('Position Interpolation Engine (Milestone 9)', () => {
  describe('Pure Math Utilities', () => {
    it('1. clamp restricts values within [min, max]', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-2, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('2. easeOutCubic starts at 0, ends at 1, and decelerates smoothly', () => {
      expect(easeOutCubic(0)).toBe(0);
      expect(easeOutCubic(1)).toBe(1);
      // Halfway in time produces > 0.5 in distance due to deceleration
      expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
      expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 3);
    });

    it('3. interpolateCoordinates lerps between start and end with clamping', () => {
      const start: Coordinates = { latitude: 20.0, longitude: 80.0 };
      const end: Coordinates = { latitude: 22.0, longitude: 82.0 };

      // Fraction 0 -> Start
      expect(interpolateCoordinates(start, end, 0)).toEqual(start);

      // Fraction 1 -> End
      expect(interpolateCoordinates(start, end, 1)).toEqual(end);

      // Fraction 0.5 -> Midpoint
      const mid = interpolateCoordinates(start, end, 0.5);
      expect(mid.latitude).toBe(21.0);
      expect(mid.longitude).toBe(81.0);

      // Out of bounds clamped
      expect(interpolateCoordinates(start, end, -0.5)).toEqual(start);
      expect(interpolateCoordinates(start, end, 1.5)).toEqual(end);
    });

    it('4. haversineDistanceKm computes great-circle distance accurately', () => {
      // New Delhi: 28.6139° N, 77.2090° E
      // Kanpur: 26.4499° N, 80.3319° E (~390-400 km)
      const delhi: Coordinates = { latitude: 28.6139, longitude: 77.209 };
      const kanpur: Coordinates = { latitude: 26.4499, longitude: 80.3319 };

      const dist = haversineDistanceKm(delhi, kanpur);
      expect(dist).toBeGreaterThan(380);
      expect(dist).toBeLessThan(420);
    });

    it('5. calculateBearing computes heading degrees accurately', () => {
      const p1: Coordinates = { latitude: 20.0, longitude: 80.0 };
      const north: Coordinates = { latitude: 25.0, longitude: 80.0 };
      const south: Coordinates = { latitude: 15.0, longitude: 80.0 };
      const east: Coordinates = { latitude: 20.0, longitude: 85.0 };
      const equator1: Coordinates = { latitude: 0, longitude: 80.0 };
      const equatorEast: Coordinates = { latitude: 0, longitude: 85.0 };

      expect(calculateBearing(p1, north)).toBeCloseTo(0, 1);
      expect(calculateBearing(p1, south)).toBeCloseTo(180, 1);
      expect(calculateBearing(equator1, equatorEast)).toBeCloseTo(90, 1);
      expect(calculateBearing(p1, east)).toBeGreaterThan(88);
      expect(calculateBearing(p1, east)).toBeLessThan(91);
    });
  });

  describe('Stateful PositionInterpolator', () => {
    it('6. Initializes directly on first telemetry update without animation jump', () => {
      const interpolator = new PositionInterpolator();
      const initialCoords: Coordinates = { latitude: 26.45, longitude: 80.35 };

      expect(interpolator.isInitialized).toBe(false);

      interpolator.pushTelemetry(initialCoords, 1000, 80, 'ACTUAL_GPS');

      expect(interpolator.isInitialized).toBe(true);
      const state = interpolator.getCurrentPosition(1000);

      expect(state.position).toEqual(initialCoords);
      expect(state.isComplete).toBe(true);
      expect(state.effectivePositionType).toBe('ACTUAL_GPS');
    });

    it('7. Smoothly interpolates coordinates over transition duration', () => {
      const interpolator = new PositionInterpolator({ transitionDurationMs: 2000 });
      const p1: Coordinates = { latitude: 26.0, longitude: 80.0 };
      const p2: Coordinates = { latitude: 26.2, longitude: 80.2 };

      interpolator.pushTelemetry(p1, 0, 80, 'ACTUAL_GPS');

      // Second update at t=10000ms
      interpolator.pushTelemetry(p2, 10000, 80, 'ACTUAL_GPS');

      // Quarterway through transition (t=10500ms -> 25% time)
      const stateQuarter = interpolator.getCurrentPosition(10500);
      expect(stateQuarter.fraction).toBeGreaterThan(0);
      expect(stateQuarter.isComplete).toBe(false);
      expect(stateQuarter.position.latitude).toBeGreaterThan(26.0);
      expect(stateQuarter.position.latitude).toBeLessThan(26.2);

      // Truthful Rule: During active interpolation, position is ESTIMATED_SCHEDULE, not ACTUAL_GPS
      expect(stateQuarter.effectivePositionType).toBe('ESTIMATED_SCHEDULE');

      // Completion (t=12000ms -> 100% time)
      const stateComplete = interpolator.getCurrentPosition(12000);
      expect(stateComplete.isComplete).toBe(true);
      expect(stateComplete.position.latitude).toBe(26.2);
      expect(stateComplete.position.longitude).toBe(80.2);
      // Once settled, verified classification resumes
      expect(stateComplete.effectivePositionType).toBe('ACTUAL_GPS');
    });

    it('8. Respects and immediately steers toward fresh telemetry updates', () => {
      const interpolator = new PositionInterpolator({ transitionDurationMs: 2000 });
      const p1: Coordinates = { latitude: 26.0, longitude: 80.0 };
      const p2: Coordinates = { latitude: 26.2, longitude: 80.2 };
      const p3: Coordinates = { latitude: 26.3, longitude: 80.3 };

      interpolator.pushTelemetry(p1, 0, 80, 'ACTUAL_GPS');
      interpolator.pushTelemetry(p2, 1000, 80, 'ACTUAL_GPS');

      // Mid-transition at t=1500ms, new telemetry p3 arrives
      const midPosition = interpolator.getCurrentPosition(1500).position;
      interpolator.pushTelemetry(p3, 1500, 80, 'ACTUAL_GPS');

      // Start position should now be the midPosition
      const newMid = interpolator.getCurrentPosition(1500).position;
      expect(newMid.latitude).toBeCloseTo(midPosition.latitude, 2);

      // At t=3500ms, reaches p3
      const stateFinished = interpolator.getCurrentPosition(3500);
      expect(stateFinished.position).toEqual(p3);
      expect(stateFinished.isComplete).toBe(true);
    });

    it('9. Does NOT interpolate when train is stationary (speedKmH <= 0)', () => {
      const interpolator = new PositionInterpolator();
      const p1: Coordinates = { latitude: 26.0, longitude: 80.0 };
      const p2: Coordinates = { latitude: 26.05, longitude: 80.05 };

      interpolator.pushTelemetry(p1, 0, 80, 'ACTUAL_GPS');

      // Halted at station: speed is 0
      interpolator.pushTelemetry(p2, 1000, 0, 'STATION_DEPARTURE');

      const state = interpolator.getCurrentPosition(1100);
      expect(state.isStationary).toBe(true);
      expect(state.isComplete).toBe(true);
      expect(state.position).toEqual(p2);
    });

    it('10. Staleness Guard: stops interpolation when telemetry is older than staleThresholdMs', () => {
      const interpolator = new PositionInterpolator({ staleThresholdMs: 60000 });
      const p1: Coordinates = { latitude: 26.0, longitude: 80.0 };

      interpolator.pushTelemetry(p1, 0, 80, 'ACTUAL_GPS');

      // Active state at 30 seconds
      expect(interpolator.getCurrentPosition(30000).isStale).toBe(false);

      // Stale state at 65 seconds (>60s threshold)
      const staleState = interpolator.getCurrentPosition(65000);
      expect(staleState.isStale).toBe(true);
      expect(staleState.isComplete).toBe(true);
    });

    it('11. Jump Threshold Guard: snaps immediately without interpolating if distance > jumpThresholdKm', () => {
      const interpolator = new PositionInterpolator({ jumpThresholdKm: 50 });
      const delhi: Coordinates = { latitude: 28.6139, longitude: 77.209 };
      const kanpur: Coordinates = { latitude: 26.4499, longitude: 80.3319 }; // ~390km jump

      interpolator.pushTelemetry(delhi, 0, 80, 'ACTUAL_GPS');

      // Massive jump (>50km threshold)
      interpolator.pushTelemetry(kanpur, 1000, 80, 'ACTUAL_GPS');

      // Snaps directly to target without lerping across 400km
      const immediateState = interpolator.getCurrentPosition(1100);
      expect(immediateState.position).toEqual(kanpur);
      expect(immediateState.isComplete).toBe(true);
    });

    it('12. Reset clears all state properly', () => {
      const interpolator = new PositionInterpolator();
      interpolator.pushTelemetry({ latitude: 20, longitude: 80 }, 0, 60);
      expect(interpolator.isInitialized).toBe(true);

      interpolator.reset();
      expect(interpolator.isInitialized).toBe(false);
    });
  });
});
