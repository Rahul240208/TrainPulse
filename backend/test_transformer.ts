import { transformRailRadarToTrainPulse } from './src/services/transformer.service';
import type { RailRadarData } from './src/schemas/railradar';

const mockData: any = {
  trainNumber: '22418',
  status: 'running',
  currentLocation: {
    status: 'at-station',
    stationCode: 'GZB',
    stationName: 'Ghaziabad',
    isHalt: true,
    speedKmH: 56,
  },
  route: [
    { stationCode: 'NDLS', status: 'passed' },
    { stationCode: 'GZB', status: 'at-station' },
    { stationCode: 'MB', status: 'upcoming' },
  ]
};

const res = transformRailRadarToTrainPulse(mockData);
console.log(JSON.stringify(res.currentLocation, null, 2));
