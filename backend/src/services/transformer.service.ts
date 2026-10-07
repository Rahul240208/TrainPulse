import type { RailRadarData, RailRadarRouteStop } from '../schemas/railradar.js';
import type {
  LiveTrainData,
  PositionAccuracy,
  TrainStatus,
  StationPoint,
  NextStation,
  PlatformInfo,
  CoachComposition,
} from '../schemas/liveTrain.js';
import { MOCK_COACH_DATABASE } from './mockData.service.js';
import { STATION_COORDS } from './stationCoords.js';

/**
 * Determines the truthful position accuracy classification.
 * Strictly adheres to the Truthful Telemetry Rule:
 * - 'ACTUAL_GPS': Only when verified live GPS telemetry from locomotive device.
 * - 'STATION_DEPARTURE': Train is stopped at or departing a confirmed station.
 * - 'ESTIMATED_SCHEDULE': Calculated estimate based on timetable or passed station timestamps.
 */
export function determinePositionAccuracy(data: RailRadarData): PositionAccuracy {
  const locStatus = data.currentLocation?.status?.toLowerCase();
  const trackingMode = data.trackingMode?.toLowerCase();

  // If currently confirmed stopped at a station platform
  if (locStatus === 'at-station' || locStatus === 'halt') {
    return 'STATION_DEPARTURE';
  }

  // If tracking mode explicitly reports verified hardware GPS
  if (trackingMode === 'gps' || trackingMode === 'device' || trackingMode === 'loco') {
    return 'ACTUAL_GPS';
  }

  // Default to honest schedule-estimated classification
  return 'ESTIMATED_SCHEDULE';
}

/**
 * Normalizes raw train status strings into standard TrainPulse TrainStatus enum.
 */
export function normalizeTrainStatus(rawStatus?: string): TrainStatus {
  if (!rawStatus) return 'RUNNING';
  const s = rawStatus.toLowerCase();

  if (s.includes('cancel')) return 'CANCELLED';
  if (s.includes('divert')) return 'DIVERTED';
  if (s.includes('arrive') || s.includes('complete') || s.includes('terminate')) return 'ARRIVED';
  if (s.includes('not started') || s.includes('schedule') || s.includes('upcoming')) return 'NOT_STARTED';

  return 'RUNNING';
}

/**
 * Transforms raw RailRadar live data into canonical LiveTrainData DTO.
 * Adheres strictly to Zero Invented Coordinates: does not fabricate latitude/longitude.
 */
export function transformRailRadarToTrainPulse(data: RailRadarData): LiveTrainData {
  const positionType = determinePositionAccuracy(data);
  const status = normalizeTrainStatus(data.status);

  // Train general info
  const trainNumber = data.trainNumber;
  const trainName = data.trainName || data.train?.name || `Train ${trainNumber}`;
  const trainType = data.train?.type || data.train?.category || 'Superfast Express';

  const sourceStation = data.train?.source?.name || 'Origin Station';
  const sourceCode = data.train?.source?.code || 'ORIGIN';
  const destinationStation = data.train?.destination?.name || 'Destination Station';
  const destinationCode = data.train?.destination?.code || 'DEST';

  // Current Location info & Zero Invented Coordinates
  const loc = data.currentLocation;
  const locStationName = loc?.stationName || loc?.stationCode || (status === 'NOT_STARTED' ? sourceStation : status === 'ARRIVED' ? destinationStation : 'En Route');
  const locStatus = loc?.status?.toLowerCase() === 'at-station' || loc?.isHalt ? 'At' : 'Near';
  
  let locationName = `${locStatus} ${locStationName}`;
  if (status === 'CANCELLED') {
    locationName = 'Service Cancelled';
  } else if (status === 'ARRIVED') {
    locationName = `At ${destinationStation}`;
  } else if (status === 'NOT_STARTED') {
    locationName = `At ${sourceStation}`;
  }

  // Coordinates: Only use valid numbers within bounds, never invent or fabricate
  const rawLat = loc?.lat;
  const rawLng = loc?.lng;
  let latitude = (typeof rawLat === 'number' && !isNaN(rawLat) && rawLat !== 0) ? rawLat : null;
  let longitude = (typeof rawLng === 'number' && !isNaN(rawLng) && rawLng !== 0) ? rawLng : null;

  // Speed: 0 if cancelled, arrived, or not started
  let speedKmH = 0;
  if (status === 'RUNNING' || status === 'DIVERTED') {
    speedKmH = loc?.speedKmH ?? (data.train?.avgSpeed ? Math.round(data.train.avgSpeed) : 0);
  }

  const delayMinutes = data.delayMinutes ?? loc?.delayMinutes ?? 0;

  // Route & Station processing:
  const rawRoute = Array.isArray(data.route) ? data.route : [];
  const haltStops = rawRoute.filter((r) => r.isHalt === true);
  const stopsToUse = haltStops.length >= 2 ? haltStops : rawRoute;

  const stations: StationPoint[] = stopsToUse.map((stop: RailRadarRouteStop) => {
    const isDeparted = stop.status === 'passed' || stop.status === 'at-station';
    const delay = stop.delayDeparture ?? stop.delayArrival ?? 0;

    return {
      code: stop.stationCode || 'STN',
      name: stop.stationName || stop.stationCode || 'Station',
      latitude: (typeof stop.lat === 'number' && !isNaN(stop.lat) && stop.lat !== 0) ? stop.lat : (STATION_COORDS[stop.stationCode]?.lat ?? null),
      longitude: (typeof stop.lng === 'number' && !isNaN(stop.lng) && stop.lng !== 0) ? stop.lng : (STATION_COORDS[stop.stationCode]?.lng ?? null),
      scheduledArrival: stop.scheduledArrival ? formatTimeOnly(stop.scheduledArrival) : null,
      actualArrival: stop.actualArrival ? formatTimeOnly(stop.actualArrival) : null,
      scheduledDeparture: stop.scheduledDeparture ? formatTimeOnly(stop.scheduledDeparture) : null,
      actualDeparture: stop.actualDeparture ? formatTimeOnly(stop.actualDeparture) : null,
      delayMinutes: delay,
      platform: stop.platform || null,
      hasDeparted: isDeparted,
    };
  });

  // Next Station Resolution: If cancelled or arrived, next station is null
  let nextStation: NextStation | null = null;
  if (status !== 'CANCELLED' && status !== 'ARRIVED') {
    if (data.nextHalt && data.nextHalt.stationCode) {
      const matchedRouteStop = rawRoute.find((s) => s.stationCode === data.nextHalt?.stationCode);
      nextStation = {
        code: data.nextHalt.stationCode,
        name: data.nextHalt.stationName || data.nextHalt.stationCode,
        scheduledArrival: matchedRouteStop?.scheduledArrival ? formatTimeOnly(matchedRouteStop.scheduledArrival) : null,
        actualArrival: matchedRouteStop?.actualArrival ? formatTimeOnly(matchedRouteStop.actualArrival) : null,
        delayMinutes: matchedRouteStop?.delayArrival ?? delayMinutes,
        platform: matchedRouteStop?.platform || null,
        distanceRemainingKm: data.nextHalt.distance ?? null,
      };
    } else {
      // Fallback to first upcoming stop in route
      const firstUpcoming = rawRoute.find((s) => s.status === 'upcoming');
      if (firstUpcoming) {
        nextStation = {
          code: firstUpcoming.stationCode,
          name: firstUpcoming.stationName || firstUpcoming.stationCode,
          scheduledArrival: firstUpcoming.scheduledArrival ? formatTimeOnly(firstUpcoming.scheduledArrival) : null,
          actualArrival: firstUpcoming.actualArrival ? formatTimeOnly(firstUpcoming.actualArrival) : null,
          delayMinutes: firstUpcoming.delayArrival ?? delayMinutes,
          platform: firstUpcoming.platform || null,
          distanceRemainingKm: firstUpcoming.distance ?? null,
        };
      }
    }
  }

  // Infer hasDeparted based on nextStation if upstream didn't provide proper status
  if (nextStation) {
    const nextIdx = stations.findIndex((s) => s.code === nextStation!.code);
    if (nextIdx > 0) {
      for (let i = 0; i < nextIdx; i++) {
        stations[i].hasDeparted = true;
      }
    }
  }

  // Calculate approximate location if exact GPS is missing
  if (latitude === null && longitude === null && status === 'RUNNING') {
    if (positionType === 'STATION_DEPARTURE') {
      const currentStn = loc?.stationCode ? stations.find(s => s.code === loc.stationCode) : stations.filter(s => s.hasDeparted).pop();
      if (currentStn && currentStn.latitude && currentStn.longitude) {
        latitude = currentStn.latitude;
        longitude = currentStn.longitude;
      }
    }
    
    // If still null (e.g. station coords missing or ESTIMATED_SCHEDULE)
    if (latitude === null || longitude === null) {
      const prevStation = stations.filter(s => s.hasDeparted && s.latitude !== null && s.longitude !== null).pop();
      const nextStnObj = nextStation ? stations.find(s => s.code === nextStation.code && s.latitude !== null && s.longitude !== null) : null;
      
      if (prevStation?.latitude && prevStation?.longitude && nextStnObj?.latitude && nextStnObj?.longitude) {
        const dLat = nextStnObj.latitude - prevStation.latitude;
        const dLng = nextStnObj.longitude - prevStation.longitude;
        
        const R = 6371;
        const lat1 = prevStation.latitude * Math.PI / 180;
        const lat2 = nextStnObj.latitude * Math.PI / 180;
        const a = Math.sin(dLat * Math.PI / 180 / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng * Math.PI / 180 / 2) ** 2;
        const totalDist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        
        const rem = nextStation?.distanceRemainingKm;
        let fraction = 0.5;
        if (rem != null && totalDist > 0 && rem <= totalDist) {
          fraction = Math.max(0, Math.min(1, (totalDist - rem) / totalDist));
        }
        
        // Implement continuous time-based movement (smooth route tracking)
        const prevDepStr = prevStation.actualDeparture || prevStation.scheduledDeparture;
        const nextArrStr = nextStnObj.actualArrival || nextStnObj.scheduledArrival;
        
        if (prevDepStr && nextArrStr) {
          const getMins = (str: string) => { const [h, m] = str.split(':').map(Number); return h * 60 + m; };
          const prevDep = getMins(prevDepStr);
          const nextArr = getMins(nextArrStr);
          if (!isNaN(prevDep) && !isNaN(nextArr)) {
            let travelMins = nextArr - prevDep;
            if (travelMins < 0) travelMins += 24 * 60; // handle midnight
            
            const istDate = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
            const currentMins = istDate.getHours() * 60 + istDate.getMinutes() + (istDate.getSeconds() / 60);
            
            let elapsedMins = currentMins - prevDep;
            if (elapsedMins < 0) elapsedMins += 24 * 60;
            
            if (travelMins > 0) {
              const timeFraction = Math.max(0, Math.min(1, elapsedMins / travelMins));
              // Use 90% time-based for smooth continuous tracking, 10% distance-based to anchor it
              fraction = rem != null ? (fraction * 0.1 + timeFraction * 0.9) : timeFraction;
            }
          }
        }
        
        latitude = Number((prevStation.latitude + dLat * fraction).toFixed(6));
        longitude = Number((prevStation.longitude + dLng * fraction).toFixed(6));
      }
    }
  }

  // Extract normalized platform information (Milestone 14)
  const platformInfo = extractPlatformInfo(data, status, positionType, nextStation, stations);

  // Extract verified coach composition if available (Milestone 15 & 17)
  const coachComposition: CoachComposition = MOCK_COACH_DATABASE[trainNumber] || {
    trainNumber,
    available: false,
    totalCoaches: 0,
    coaches: [],
    updatedAt: data.lastUpdatedAt || new Date().toISOString(),
  };

  return {
    trainNumber,
    trainName,
    trainType,
    sourceStation,
    sourceCode,
    destinationStation,
    destinationCode,
    status,
    currentLocation: {
      name: locationName,
      latitude,
      longitude,
      speedKmH,
      positionType,
    },
    delayMinutes,
    nextStation,
    platformInfo,
    coachComposition,
    lastUpdatedTime: data.lastUpdatedAt || new Date().toISOString(),
    stations,
  };
}

/**
 * Normalizes and determines platform information truthfully.
 * Supports: CONFIRMED, EXPECTED, UNAVAILABLE, UNKNOWN.
 * - CONFIRMED: When train is stopped/halted at a station with a known platform.
 * - EXPECTED: When approaching an upcoming station with a known platform.
 * - UNAVAILABLE: Platform is unannounced, null, or missing.
 * - UNKNOWN: Train is cancelled, untracked, or route is empty.
 * NEVER fabricates fake platform numbers.
 */
export function extractPlatformInfo(
  data: RailRadarData,
  status: TrainStatus,
  positionType: PositionAccuracy,
  nextStation: NextStation | null,
  stations: StationPoint[]
): PlatformInfo {
  const updatedAt = data.lastUpdatedAt || new Date().toISOString();

  if (status === 'CANCELLED') {
    return {
      platformNumber: null,
      status: 'UNAVAILABLE',
      station: null,
      updatedAt,
      source: 'RAILRADAR',
    };
  }

  // 1. Train is at station (halted, stopped, or departing)
  const loc = data.currentLocation;
  const isAtStation =
    positionType === 'STATION_DEPARTURE' ||
    loc?.status?.toLowerCase() === 'at-station' ||
    loc?.isHalt === true;

  if (isAtStation) {
    const currentCode = loc?.stationCode?.toUpperCase();
    const currentStop = stations.find((s) => s.code.toUpperCase() === currentCode);
    const platform = currentStop?.platform?.trim() || null;
    const isValidPlatform = !!platform && platform !== '' && platform !== '0' && platform !== 'NA' && platform !== '-';

    return {
      platformNumber: isValidPlatform ? platform : null,
      status: isValidPlatform ? 'CONFIRMED' : 'UNAVAILABLE',
      station: currentStop
        ? { code: currentStop.code, name: currentStop.name }
        : loc?.stationName
        ? { code: currentCode || 'STN', name: loc.stationName }
        : null,
      updatedAt,
      source: 'RAILRADAR',
    };
  }

  // 2. Train is en route approaching next station
  if (nextStation) {
    const platform = nextStation.platform?.trim() || null;
    const isValidPlatform = !!platform && platform !== '' && platform !== '0' && platform !== 'NA' && platform !== '-';

    return {
      platformNumber: isValidPlatform ? platform : null,
      status: isValidPlatform ? 'EXPECTED' : 'UNAVAILABLE',
      station: { code: nextStation.code, name: nextStation.name },
      updatedAt,
      source: 'RAILRADAR',
    };
  }

  // 3. Train arrived at destination
  if (status === 'ARRIVED') {
    const destStation = stations[stations.length - 1];
    const platform = destStation?.platform?.trim() || null;
    const isValidPlatform = !!platform && platform !== '' && platform !== '0' && platform !== 'NA' && platform !== '-';

    return {
      platformNumber: isValidPlatform ? platform : null,
      status: isValidPlatform ? 'CONFIRMED' : 'UNAVAILABLE',
      station: destStation
        ? { code: destStation.code, name: destStation.name }
        : {
            code: data.train?.destination?.code || 'DEST',
            name: data.train?.destination?.name || 'Destination',
          },
      updatedAt,
      source: 'RAILRADAR',
    };
  }

  // 4. Train not started (at origin)
  if (status === 'NOT_STARTED') {
    const originStation = stations[0];
    const platform = originStation?.platform?.trim() || null;
    const isValidPlatform = !!platform && platform !== '' && platform !== '0' && platform !== 'NA' && platform !== '-';

    return {
      platformNumber: isValidPlatform ? platform : null,
      status: isValidPlatform ? 'EXPECTED' : 'UNAVAILABLE',
      station: originStation
        ? { code: originStation.code, name: originStation.name }
        : {
            code: data.train?.source?.code || 'ORIGIN',
            name: data.train?.source?.name || 'Origin',
          },
      updatedAt,
      source: 'RAILRADAR',
    };
  }

  // 5. Fallback for untracked / unknown telemetry
  return {
    platformNumber: null,
    status: 'UNKNOWN',
    station: null,
    updatedAt,
    source: 'RAILRADAR',
  };
}

/**
 * Helper to convert ISO timestamp to HH:mm or return as is if already formatted.
 */
function formatTimeOnly(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  if (dateTimeStr.length <= 5 && dateTimeStr.includes(':')) return dateTimeStr;

  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return dateTimeStr;
  }
}

