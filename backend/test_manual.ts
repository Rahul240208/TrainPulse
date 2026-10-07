import { transformRailRadarToTrainPulse } from './src/services/transformer.service';
import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('response2.json', 'utf8')).data;
// wait, response2 is ALREADY transformed! I need raw railradar data!
