import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

interface GradientBackgroundProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'primary' | 'dark' | 'subtle';
}

export function GradientBackground({ 
  children, 
  style, 
  variant = 'primary',
  ...props 
}: GradientBackgroundProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    switch (variant) {
      case 'primary':
        return colorScheme === 'dark' 
          ? [colors.tint, '#0f7433', colors.background] as const
          : [colors.tint, '#0f7433', '#f5f5f5'] as const;
      case 'dark':
        return ['#000000', '#121212', '#191414'] as const;
      case 'subtle':
        return colorScheme === 'dark'
          ? [colors.card, colors.background] as const
          : ['#f5f5f5', colors.background] as const;
      default:
        return [colors.tint, colors.background] as const;
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={[styles.gradient, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      {...props}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
}); 