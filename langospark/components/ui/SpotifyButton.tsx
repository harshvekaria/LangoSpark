import React from 'react';
import { 
  Pressable, 
  Text, 
  StyleSheet, 
  PressableProps,
  ViewStyle,
  TextStyle,
  ActivityIndicator
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

interface SpotifyButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function SpotifyButton({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  style,
  textStyle,
  disabled,
  ...props
}: SpotifyButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Button styles based on variant
  const getBackgroundColor = () => {
    if (disabled) return '#555555';
    
    switch (variant) {
      case 'primary':
        return colors.tint;
      case 'secondary':
        return 'transparent';
      case 'text':
        return 'transparent';
      default:
        return colors.tint;
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#555555';
    
    switch (variant) {
      case 'secondary':
        return colors.tint;
      default:
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#888888';
    
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
      case 'text':
        return colors.tint;
      default:
        return '#FFFFFF';
    }
  };

  // Button size styles
  const sizeStyles = {
    small: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      fontSize: 12,
    },
    medium: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 24,
      fontSize: 14,
    },
    large: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 32,
      fontSize: 16,
    },
  };

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      paddingVertical: sizeStyles[size].paddingVertical,
      paddingHorizontal: sizeStyles[size].paddingHorizontal,
      borderRadius: sizeStyles[size].borderRadius,
    },
    variant === 'secondary' && styles.secondaryButton,
    style,
  ];

  const textStyles = [
    styles.text,
    {
      color: getTextColor(),
      fontSize: sizeStyles[size].fontSize,
    },
    textStyle,
  ];

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyles,
        pressed && !disabled && styles.pressed,
      ]}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
}); 