import fs from 'fs';
import path from 'path';

function createComponent(name, svgPath, outFile) {
    const content = fs.readFileSync(svgPath, 'utf8');
    
    // Quick regex to grab the inner SVG contents. We know it has <rect... <g... <text...
    // The SVGs are identical except for colors.
    // In fact, we can just build a single dynamic component!
    
    const componentCode = `import React from 'react';
import Svg, { Rect, G, Path, Circle, Text as SvgText, TSpan } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

export interface TrainPulseLogoProps {
  width?: number | string;
  height?: number | string;
  showBackground?: boolean;
}

export function TrainPulseLogo({ width = 160, height = 35, showBackground = false }: TrainPulseLogoProps) {
  const { theme, isDarkMode } = useTheme();

  // We use the theme colors directly!
  const bgColor = theme.colors.background;
  const cyanColor = theme.colors.accent;
  const textColor = theme.colors.textPrimary;
  const amberColor = theme.colors.warning;
  const amberBg = theme.colors.warningBackground;
  
  return (
    <Svg width={width} height={height} viewBox="0 0 640 140" fill="none">
      {showBackground && <Rect width="640" height="140" fill={bgColor} />}
      <G transform="translate(0,10)">
        <G transform="translate(0,0) scale(0.234375)">
          <Path
            d="M96 350H186L236 212L292 372L338 276H392"
            fill="none"
            stroke={cyanColor}
            strokeWidth="30"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M96 408H416"
            stroke={cyanColor}
            strokeOpacity="0.35"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="2 22"
          />
          <Circle cx="392" cy="276" r="44" fill={amberBg} />
          <Circle cx="392" cy="276" r="20" fill={amberColor} />
        </G>
      </G>
      <SvgText
        x="150"
        y="92"
        fontFamily="'Space Grotesk','Inter','Segoe UI',Arial,sans-serif"
        fontSize="68"
        fill={textColor}
      >
        <TSpan fontWeight="500">Train</TSpan>
        <TSpan fontWeight="700" fill={cyanColor}>Pulse</TSpan>
      </SvgText>
    </Svg>
  );
}
`;

    fs.writeFileSync(outFile, componentCode, 'utf8');
    console.log('Created ' + outFile);
}

createComponent('TrainPulseLogo', 'D:/Live Railway Tracking/TrainPulse/Logo/trainpulse-logo-dark.svg', 'D:/Live Railway Tracking/TrainPulse/src/components/common/TrainPulseLogo.tsx');

