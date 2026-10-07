import { getLiveTrainTelemetry } from './src/services/railradar.service';
import { transformRailRadarToTrainPulse } from './src/services/transformer.service';

getLiveTrainTelemetry('22418').then(data => {
  const result = transformRailRadarToTrainPulse(data);
  console.log(JSON.stringify(result.currentLocation, null, 2));
}).catch(e => console.error(e));
