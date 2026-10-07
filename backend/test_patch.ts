import { transformRailRadarToTrainPulse } from './src/services/transformer.service';
import { getLiveTrainTelemetry } from './src/services/railradar.service';

getLiveTrainTelemetry('22418').then(data => {
  const result = transformRailRadarToTrainPulse(data);
  // I will check the raw data that goes into interpolation
  console.log('stations mapped:', result.stations.map(s => ({ code: s.code, hasDeparted: s.hasDeparted })));
  console.log('nextStation:', result.nextStation);
}).catch(e => console.error(e));
