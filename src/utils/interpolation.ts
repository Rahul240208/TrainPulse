import type { PositionAccuracy } from '../types/api';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface InterpolationOptions {
  /**
   * Duration in ms over which marker animates from previous to new telemetry coordinates.
   * Default: 2000ms.
   */
  transitionDurationMs?: number;

  /**
   * Time in ms without telemetry updates after which data is considered stale and interpolation stops.
   * Default: 60,000ms (60 seconds).
   */
  staleThresholdMs?: number;

  /**
   * Max distance in km beyond which a jump is considered erratic/teleportation and snaps immediately.
   * Default: 100km.
   */
  jumpThresholdKm?: number;
}

export interface InterpolatedState {
  position: Coordinates;
  fraction: number;
  isStale: boolean;
  isComplete: boolean;
  isStationary: boolean;
  /**
   * Truthful position classification:
   * When actively interpolating between positions, accuracy is tagged as 'ESTIMATED_SCHEDULE'
   * and never falsely claims to be 'ACTUAL_GPS'.
   */
  effectivePositionType: PositionAccuracy;
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Cubic deceleration easing curve for natural, smooth deceleration.
 */
export function easeOutCubic(t: number): number {
  const clamped = clamp(t, 0, 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Linearly interpolates between two geographic coordinates.
 */
export function interpolateCoordinates(
  start: Coordinates,
  end: Coordinates,
  fraction: number
): Coordinates {
  const f = clamp(fraction, 0, 1);
  return {
    latitude: Number((start.latitude + (end.latitude - start.latitude) * f).toFixed(6)),
    longitude: Number((start.longitude + (end.longitude - start.longitude) * f).toFixed(6)),
  };
}

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function haversineDistanceKm(p1: Coordinates, p2: Coordinates): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLng = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(3));
}

/**
 * Computes bearing (heading) in degrees (0..360) from p1 to p2.
 */
export function calculateBearing(p1: Coordinates, p2: Coordinates): number {
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;
  const dLng = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Stateful Position Interpolator:
 * - Interpolates smoothly between previous position and new telemetry updates
 * - Uses actual position updates when available
 * - Halts interpolation if telemetry is stale (>60s)
 * - Avoids sudden jumps (>100km snaps directly)
 * - Truthful Telemetry: marks active interpolation as ESTIMATED_SCHEDULE, never fake ACTUAL_GPS
 */
export class PositionInterpolator {
  private startPosition: Coordinates | null = null;
  private targetPosition: Coordinates | null = null;
  private currentPosition: Coordinates | null = null;

  private transitionStartTime = 0;
  private lastTelemetryTime = 0;
  private verifiedPositionType: PositionAccuracy = 'ESTIMATED_SCHEDULE';
  private speedKmH = 0;

  private readonly transitionDurationMs: number;
  private readonly staleThresholdMs: number;
  private readonly jumpThresholdKm: number;

  constructor(options?: InterpolationOptions) {
    this.transitionDurationMs = options?.transitionDurationMs ?? 2000;
    this.staleThresholdMs = options?.staleThresholdMs ?? 60000;
    this.jumpThresholdKm = options?.jumpThresholdKm ?? 100;
  }

  /**
   * Pushes a new telemetry coordinate update into the interpolator.
   */
  public pushTelemetry(
    coords: Coordinates,
    timestamp: number = Date.now(),
    speedKmH = 0,
    positionType: PositionAccuracy = 'ESTIMATED_SCHEDULE'
  ): void {
    this.verifiedPositionType = positionType;
    this.speedKmH = speedKmH;
    this.lastTelemetryTime = timestamp;

    // First coordinate received: initialize directly
    if (!this.currentPosition) {
      this.startPosition = { ...coords };
      this.targetPosition = { ...coords };
      this.currentPosition = { ...coords };
      this.transitionStartTime = timestamp;
      return;
    }

    const distanceKm = haversineDistanceKm(this.currentPosition, coords);

    // Large jump or stationary train: snap immediately without interpolation
    if (distanceKm > this.jumpThresholdKm || speedKmH <= 0 || distanceKm === 0) {
      this.startPosition = { ...coords };
      this.targetPosition = { ...coords };
      this.currentPosition = { ...coords };
      this.transitionStartTime = timestamp;
      return;
    }

    // Normal smooth transition
    this.startPosition = { ...this.currentPosition };
    this.targetPosition = { ...coords };
    this.transitionStartTime = timestamp;
  }

  /**
   * Calculates the current interpolated state for a given timestamp.
   */
  public getCurrentPosition(now: number = Date.now()): InterpolatedState {
    if (!this.currentPosition || !this.targetPosition || !this.startPosition) {
      const fallback = { latitude: 0, longitude: 0 };
      return {
        position: fallback,
        fraction: 1,
        isStale: true,
        isComplete: true,
        isStationary: true,
        effectivePositionType: 'ESTIMATED_SCHEDULE',
      };
    }

    // Check staleness: if no telemetry received for over staleThresholdMs, stop movement
    const isStale = now - this.lastTelemetryTime > this.staleThresholdMs;
    const isStationary = this.speedKmH <= 0;
    const isAtTarget =
      this.startPosition.latitude === this.targetPosition.latitude &&
      this.startPosition.longitude === this.targetPosition.longitude;

    if (isStale || isStationary || isAtTarget) {
      return {
        position: { ...this.targetPosition },
        fraction: 1,
        isStale,
        isComplete: true,
        isStationary,
        effectivePositionType: this.verifiedPositionType,
      };
    }

    const elapsed = now - this.transitionStartTime;
    const rawFraction = clamp(elapsed / this.transitionDurationMs, 0, 1);
    const easedFraction = easeOutCubic(rawFraction);

    const isComplete = rawFraction >= 1;
    this.currentPosition = isComplete
      ? { ...this.targetPosition }
      : interpolateCoordinates(this.startPosition, this.targetPosition, easedFraction);

    // Truthful rule: While in motion between telemetry fixes, position is interpolated (ESTIMATED_SCHEDULE)
    const effectivePositionType: PositionAccuracy = isComplete
      ? this.verifiedPositionType
      : 'ESTIMATED_SCHEDULE';

    return {
      position: { ...this.currentPosition },
      fraction: easedFraction,
      isStale: false,
      isComplete,
      isStationary: false,
      effectivePositionType,
    };
  }

  /**
   * Resets the interpolator state.
   */
  public reset(): void {
    this.startPosition = null;
    this.targetPosition = null;
    this.currentPosition = null;
    this.transitionStartTime = 0;
    this.lastTelemetryTime = 0;
  }

  public get isInitialized(): boolean {
    return this.currentPosition !== null;
  }

  public get currentSpeed(): number {
    return this.speedKmH;
  }
}
