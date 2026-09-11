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
  /**
   * Explanatory label during active interpolation.
   * Value is 'Estimated movement' while moving, or null when settled/stationary/stale.
   */
  movementLabel: string | null;
}

export interface MarkerMovementCheckParams {
  prevCoords: Coordinates | null | undefined;
  nextCoords: Coordinates | null | undefined;
  isStale?: boolean;
  status?: string | null;
  maxJumpKm?: number;
}

export const DISALLOWED_INTERPOLATION_STATUSES = [
  'CANCELLED',
  'ARRIVED',
  'COMPLETED',
  'DIVERTED',
] as const;

export const ESTIMATED_MOVEMENT_LABEL = 'Estimated movement';
export const DEFAULT_MAX_JUMP_KM = 100; // ~100 km (~1 degree), abnormal jump guard

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
 * Validates whether a given coordinate represents a plausible geographic location
 * within the Indian subcontinent (5°N - 40°N, 65°E - 100°E).
 */
export function isValidCoordinate(coord: Coordinates | null | undefined): boolean {
  if (!coord) return false;
  const { latitude, longitude } = coord;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  if (latitude < 5 || latitude > 40 || longitude < 65 || longitude > 100) return false;
  return true;
}

/**
 * Determines whether a live train marker should smoothly interpolate between two positions.
 * Adheres strictly to Milestone 15 Truthful Telemetry requirements:
 * - Allowed ONLY when:
 *   - Previous valid position exists.
 *   - New valid position exists.
 *   - Data is sufficiently fresh (!isStale).
 *   - Status is active (!cancelled, !arrived/completed, !diverted).
 *   - Distance jump is within realistic railway bounds (<= maxJumpKm).
 * - Disallowed (Immediate snap without animation) when:
 *   - Data is stale.
 *   - Train is cancelled.
 *   - Train has arrived/completed.
 *   - Train is diverted.
 *   - Coordinates are invalid or missing.
 *   - Distance jump is abnormal (> maxJumpKm).
 */
export function shouldInterpolateMovement(params: MarkerMovementCheckParams): boolean {
  const { prevCoords, nextCoords, isStale, status, maxJumpKm = DEFAULT_MAX_JUMP_KM } = params;

  // 1. Telemetry freshness check: stale updates must not interpolate
  if (isStale) {
    return false;
  }

  // 2. Lifecycle status check: cancelled, arrived, completed, diverted
  if (status) {
    const norm = status.toUpperCase().trim();
    if (
      DISALLOWED_INTERPOLATION_STATUSES.some(
        (disallowed) => norm === disallowed || norm.includes(disallowed)
      )
    ) {
      return false;
    }
  }

  // 3. Coordinate validity check
  if (!isValidCoordinate(prevCoords) || !isValidCoordinate(nextCoords)) {
    return false;
  }

  // 4. Same position check: if distance is negligible (< 10 meters / 0.01 km), no animation
  const distanceKm = haversineDistanceKm(prevCoords!, nextCoords!);
  if (distanceKm < 0.01) {
    return false;
  }

  // 5. Jump distance check: abnormal jump / teleportation guard
  if (distanceKm > maxJumpKm) {
    return false;
  }

  return true;
}

/**
 * Stateful Position Interpolator:
 * - Interpolates smoothly between previous position and new telemetry updates
 * - Uses actual position updates when available
 * - Halts interpolation if telemetry is stale (>60s)
 * - Avoids sudden jumps (>100km snaps directly)
 * - Truthful Telemetry: marks active interpolation as ESTIMATED_SCHEDULE and displays 'Estimated movement'
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
    positionType: PositionAccuracy = 'ESTIMATED_SCHEDULE',
    status?: string,
    isStale?: boolean
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

    const canInterpolate = shouldInterpolateMovement({
      prevCoords: this.currentPosition,
      nextCoords: coords,
      isStale,
      status,
      maxJumpKm: this.jumpThresholdKm,
    });

    // Large jump, stationary train, disallowed status, or stale data: snap immediately
    if (!canInterpolate || speedKmH <= 0) {
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
        movementLabel: null,
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
        movementLabel: null,
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
      movementLabel: isComplete ? null : ESTIMATED_MOVEMENT_LABEL,
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
