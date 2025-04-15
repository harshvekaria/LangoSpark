import React from 'react';
import Svg, { Path, G, Text, TSpan, Circle, Rect } from 'react-native-svg';
import { View } from 'react-native';

interface LogoSvgProps {
  width?: number;
  height?: number;
  color?: string;
  showTagline?: boolean;
}

export function LogoSvg({ width = 120, height = 45, color = '#1DB954', showTagline = true }: LogoSvgProps) {
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 120 45">
        <G fill="none">
          <Circle cx="20" cy="18" r="16" fill={color} />
          
          {/* Speech bubble with globe */}
          <Path
            d="M12 13C12 11.8954 12.8954 11 14 11H26C27.1046 11 28 11.8954 28 13V20C28 21.1046 27.1046 22 26 22H22L18 26V22H14C12.8954 22 12 21.1046 12 20V13Z"
            fill="white"
          />
          
          {/* Small globe */}
          <Circle cx="20" cy="16.5" r="7" fill={color} opacity="0.2" />
          <Path
            d="M16 16.5 h8 M20 12.5 v8 M15 14 q5 5 10 0 M15 19 q5 -5 10 0"
            stroke={color}
            strokeWidth="1"
            opacity="0.8"
          />
          
          {/* LangoSpark text */}
          <Text
            fill={color}
            fontSize="16"
            fontWeight="bold"
            x="34"
            y="23"
          >
            <TSpan>LangoSpark</TSpan>
          </Text>
          
          {/* Tagline */}
          {showTagline && (
            <Text
              fill={color}
              fontSize="6"
              x="34"
              y="32"
            >
              <TSpan>Learn Languages Naturally</TSpan>
            </Text>
          )}
        </G>
      </Svg>
    </View>
  );
}

// Simpler version without text for small displays
export function LogoIconSvg({ width = 40, height = 40, color = '#1DB954' }: LogoSvgProps) {
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 40 40">
        <G fill="none">
          <Circle cx="20" cy="20" r="16" fill={color} />
          
          {/* Speech bubble */}
          <Path
            d="M12 15C12 13.8954 12.8954 13 14 13H26C27.1046 13 28 13.8954 28 15V22C28 23.1046 27.1046 24 26 24H22L18 28V24H14C12.8954 24 12 23.1046 12 22V15Z"
            fill="white"
          />
          
          {/* Small globe */}
          <Circle cx="20" cy="18.5" r="7" fill={color} opacity="0.2" />
          <Path
            d="M16 18.5 h8 M20 14.5 v8 M15 16 q5 5 10 0 M15 21 q5 -5 10 0"
            stroke={color}
            strokeWidth="1"
            opacity="0.8"
          />
        </G>
      </Svg>
    </View>
  );
} 