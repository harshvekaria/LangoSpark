import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function LanguagesLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="[id]/conversation" 
        options={{ 
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="[id]/lesson/[lessonId]" 
        options={{ 
          animation: 'slide_from_right'
        }} 
      />
    </Stack>
  );
} 