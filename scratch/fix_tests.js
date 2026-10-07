import fs from 'fs';
import path from 'path';

const mockThemeSnippet = `
const mockTheme = {
  colors: {
    accent: '#38BDF8',
    onTime: '#10B981',
    delayed: '#EF4444',
    textMuted: '#94A3B8',
  }
};
`;

const files = [
  'tests/liveTrainStatusPanel.test.ts',
  'tests/mapFirstSearch.test.ts'
];

for (const file of files) {
  const filePath = path.join('d:/Live Railway Tracking/TrainPulse', file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('const mockTheme = {')) {
    content = content.replace(/import \{ getStatusPresentation, MapStatusPanel \} from '\.\.\/src\/components\/map\/MapStatusPanel';/, 
      `import { getStatusPresentation, MapStatusPanel } from '../src/components/map/MapStatusPanel';\n${mockThemeSnippet}`);
  }
  
  content = content.replace(/getStatusPresentation\(/g, 'getStatusPresentation(mockTheme, ');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}

