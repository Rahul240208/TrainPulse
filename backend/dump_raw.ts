import { getLiveTrainTelemetry } from './src/services/railradar.service';
import fs from 'fs';

getLiveTrainTelemetry('22418').then(data => {
  fs.writeFileSync('raw.json', JSON.stringify(data, null, 2));
}).catch(e => console.error(e));
