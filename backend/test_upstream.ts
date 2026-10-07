import { fetchLiveTrainFromRailRadar } from './src/services/railradar.service';
fetchLiveTrainFromRailRadar('22418').then(data => console.log(JSON.stringify(data.route.slice(0,3), null, 2))).catch(e => console.error(e));
