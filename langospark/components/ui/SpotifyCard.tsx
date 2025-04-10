import React from 'react';
import { View, StyleSheet, ViewProps, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

interface SpotifyCardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated';
}

export function SpotifyCard({ 
  children, 
  style, 
  onPress, 
  variant = 'default',
  ...props 
}: SpotifyCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
    },
    variant === 'elevated' && styles.elevated,
    style,
  ];

  if (onPress) {
    return (
      <Pressable 
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
}); 