import { getLiveTrainTelemetry } from './src/services/railradar.service';
getLiveTrainTelemetry('22418').then(data => {
  console.log('loc:', data.currentLocation);
}).catch(e => console.error(e));
