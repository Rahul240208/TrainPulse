import { MOCK_TRAIN_DATABASE } from './mockData.service.js';
import { BACKEND_STATIONS_DATA } from './stations.service.js';
import type { SearchResultItem } from '../schemas/search.js';

// Comprehensive catalog of known train services with authentic source/destinations
const KNOWN_TRAINS: SearchResultItem[] = [
  {
    type: 'TRAIN',
    trainNumber: '12046',
    trainName: 'Chandigarh Shatabdi Express',
    trainType: 'Shatabdi Express',
    source: { code: 'CDG', name: 'Chandigarh Junction' },
    destination: { code: 'NDLS', name: 'New Delhi' },
  },
  {
    type: 'TRAIN',
    trainNumber: '12012',
    trainName: 'Kalka Shatabdi Express',
    trainType: 'Shatabdi Express',
    source: { code: 'KLK', name: 'Kalka' },
    destination: { code: 'NDLS', name: 'New Delhi' },
  },
  {
    type: 'TRAIN',
    trainNumber: '22448',
    trainName: 'Amb Andaura Vande Bharat Express',
    trainType: 'Vande Bharat Express',
    source: { code: 'AADR', name: 'Amb Andaura' },
    destination: { code: 'NDLS', name: 'New Delhi' },
  },
  {
    type: 'TRAIN',
    trainNumber: '12301',
    trainName: 'Howrah Rajdhani Express',
    trainType: 'Rajdhani Express',
    source: { code: 'HWH', name: 'Howrah Junction' },
    destination: { code: 'NDLS', name: 'New Delhi' },
  },
  {
    type: 'TRAIN',
    trainNumber: '12002',
    trainName: 'Bhopal Shatabdi Express',
    trainType: 'Shatabdi Express',
    source: { code: 'NDLS', name: 'New Delhi' },
    destination: { code: 'RKMP', name: 'Rani Kamlapati' },
  },
  {
    type: 'TRAIN',
    trainNumber: '12951',
    trainName: 'Mumbai Central Rajdhani Express',
    trainType: 'Rajdhani Express',
    source: { code: 'MMCT', name: 'Mumbai Central' },
    destination: { code: 'NDLS', name: 'New Delhi' },
  },
  {
    type: 'TRAIN',
    trainNumber: '22691',
    trainName: 'KSR Bengaluru Rajdhani Express',
    trainType: 'Rajdhani Express',
    source: { code: 'SBC', name: 'KSR Bengaluru' },
    destination: { code: 'NZM', name: 'Hazrat Nizamuddin' },
  },
  {
    type: 'TRAIN',
    trainNumber: '20901',
    trainName: 'Mumbai - Gandhinagar Vande Bharat',
    trainType: 'Vande Bharat Express',
    source: { code: 'MMCT', name: 'Mumbai Central' },
    destination: { code: 'GNC', name: 'Gandhinagar Capital' },
  },
];

// Enrich with any other trains defined in MOCK_TRAIN_DATABASE
for (const [tNum, liveData] of Object.entries(MOCK_TRAIN_DATABASE)) {
  if (!KNOWN_TRAINS.some((t) => t.trainNumber === tNum)) {
    KNOWN_TRAINS.push({
      type: 'TRAIN',
      trainNumber: liveData.trainNumber,
      trainName: liveData.trainName,
      trainType: liveData.trainType || 'Express',
      source: { code: liveData.sourceCode, name: liveData.sourceStation },
      destination: { code: liveData.destinationCode, name: liveData.destinationStation },
    });
  }
}

/**
 * Searches trains and stations matching the query string.
 * Supports:
 * - 5-digit train number (exact or prefix match)
 * - Train name substring
 * - Station code (exact or prefix)
 * - Station name/city substring
 */
export async function searchGlobal(rawQuery: string): Promise<SearchResultItem[]> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return [];
  }

  const queryLower = query.toLowerCase();
  const queryUpper = query.toUpperCase();
  const isNumeric = /^\d+$/.test(query);

  const matchedTrains: SearchResultItem[] = [];
  const matchedStations: SearchResultItem[] = [];

  // 1. Train Search
  for (const train of KNOWN_TRAINS) {
    const tNum = train.trainNumber || '';
    const tName = (train.trainName || '').toLowerCase();
    const srcCode = (train.source?.code || '').toUpperCase();
    const destCode = (train.destination?.code || '').toUpperCase();
    const srcName = (train.source?.name || '').toLowerCase();
    const destName = (train.destination?.name || '').toLowerCase();

    // Exact train number match (highest priority)
    if (tNum === query) {
      matchedTrains.unshift(train);
      continue;
    }

    // Prefix train number
    if (isNumeric && tNum.startsWith(query)) {
      matchedTrains.push(train);
      continue;
    }

    // Name or route matching
    if (
      tName.includes(queryLower) ||
      srcCode === queryUpper ||
      destCode === queryUpper ||
      srcName.includes(queryLower) ||
      destName.includes(queryLower)
    ) {
      matchedTrains.push(train);
    }
  }

  // 2. Station Search
  for (const station of BACKEND_STATIONS_DATA) {
    const sCode = station.code.toUpperCase();
    const sName = station.name.toLowerCase();
    const sCity = (station.city || '').toLowerCase();

    if (sCode === queryUpper) {
      matchedStations.unshift({
        type: 'STATION',
        stationCode: station.code,
        stationName: station.name,
        city: station.city,
        state: station.state,
      });
      continue;
    }

    if (sCode.startsWith(queryUpper) || sName.includes(queryLower) || sCity.includes(queryLower)) {
      matchedStations.push({
        type: 'STATION',
        stationCode: station.code,
        stationName: station.name,
        city: station.city,
        state: station.state,
      });
    }
  }

  // Deduplicate and combine (trains first, then stations, up to 15 items total)
  const combined = [...matchedTrains, ...matchedStations];
  const seen = new Set<string>();
  const results: SearchResultItem[] = [];

  for (const item of combined) {
    const key = item.type === 'TRAIN' ? `TRAIN_${item.trainNumber}` : `STATION_${item.stationCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
      if (results.length >= 15) break;
    }
  }

  return results;
}

