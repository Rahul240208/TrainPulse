import type { LiveTrainData, PositionAccuracy } from '../../types/api';
import type { MockTrain } from '../../data/mockTrains';

export interface LiveTrainMapProps {
  train: LiveTrainData | MockTrain;
  height?: number;
  showOverlay?: boolean;
  onRefresh?: () => void;
}

export interface MapStationPoint {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  hasDeparted: boolean;
  scheduledArrival: string | null;
  actualArrival: string | null;
  delayMinutes: number;
  platform: string | null;
}

export interface NormalizedMapData {
  trainNumber: string;
  trainName: string;
  trainType: string;
  sourceCode: string;
  sourceStation: string;
  destinationCode: string;
  destinationStation: string;
  speedKmH: number;
  delayMinutes: number;
  status: string;
  positionType: PositionAccuracy;
  currentStationName: string;
  latitude: number | null;
  longitude: number | null;
  hasExactCoordinates: boolean;
  nextStation: {
    code: string;
    name: string;
    estimatedArrival?: string | null;
    delayMinutes?: number;
    platform?: string | null;
  } | null;
  lastUpdatedTime: string;
  stations: MapStationPoint[];
}

/**
 * Normalizes either LiveTrainData (backend canonical) or MockTrain into NormalizedMapData.
 * Strictly adheres to Truthful Telemetry: never invents latitude/longitude coordinates.
 */
export function normalizeMapData(train: LiveTrainData | MockTrain): NormalizedMapData {
  const isLive = 'stations' in train && Array.isArray((train as LiveTrainData).stations);

  if (isLive) {
    const live = train as LiveTrainData;
    const lat = live.currentLocation?.latitude;
    const lng = live.currentLocation?.longitude;
    const hasCoordinates =
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat !== 0 &&
      lng !== 0 &&
      lat >= 5 &&
      lat <= 40 &&
      lng >= 65 &&
      lng <= 100;

    const validStations: MapStationPoint[] = (live.stations || [])
      .filter(
        (s) =>
          typeof s.latitude === 'number' &&
          typeof s.longitude === 'number' &&
          !isNaN(s.latitude) &&
          !isNaN(s.longitude) &&
          s.latitude !== 0 &&
          s.longitude !== 0
      )
      .map((s) => ({
        code: s.code,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        hasDeparted: s.hasDeparted,
        scheduledArrival: s.scheduledArrival,
        actualArrival: s.actualArrival,
        delayMinutes: s.delayMinutes,
        platform: s.platform,
      }));

    return {
      trainNumber: live.trainNumber,
      trainName: live.trainName,
      trainType: live.trainType,
      sourceCode: live.sourceCode,
      sourceStation: live.sourceStation,
      destinationCode: live.destinationCode,
      destinationStation: live.destinationStation,
      speedKmH: live.currentLocation?.speedKmH ?? 0,
      delayMinutes: live.delayMinutes ?? 0,
      status: live.status,
      positionType: live.currentLocation?.positionType || 'ESTIMATED_SCHEDULE',
      currentStationName: live.currentLocation?.name || 'In Transit',
      latitude: hasCoordinates ? lat : null,
      longitude: hasCoordinates ? lng : null,
      hasExactCoordinates: hasCoordinates,
      nextStation: live.nextStation
        ? {
            code: live.nextStation.code,
            name: live.nextStation.name,
            estimatedArrival: live.nextStation.actualArrival || live.nextStation.scheduledArrival,
            delayMinutes: live.nextStation.delayMinutes,
            platform: live.nextStation.platform,
          }
        : null,
      lastUpdatedTime: live.lastUpdatedTime || 'Just now',
      stations: validStations,
    };
  }

  // MockTrain fallback
  const mock = train as MockTrain;
  return {
    trainNumber: mock.trainNumber,
    trainName: mock.trainName,
    trainType: mock.trainType,
    sourceCode: mock.sourceCode,
    sourceStation: mock.sourceStation,
    destinationCode: mock.destinationCode,
    destinationStation: mock.destinationStation,
    speedKmH: mock.speed,
    delayMinutes: mock.delay,
    status: mock.status,
    positionType: mock.currentLocation.positionType,
    currentStationName: mock.currentLocation.name,
    latitude: null, // Mock train has no fake coordinates
    longitude: null,
    hasExactCoordinates: false,
    nextStation: mock.nextStation
      ? {
          code: mock.nextStation.code,
          name: mock.nextStation.name,
          estimatedArrival: mock.nextStation.estimatedArrival,
          delayMinutes: mock.nextStation.delayMinutes,
          platform: mock.nextStation.platform,
        }
      : null,
    lastUpdatedTime: mock.lastUpdatedTime,
    stations: [],
  };
}

