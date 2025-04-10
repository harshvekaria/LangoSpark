import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColorScheme } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        tabBarInactiveTintColor: Colors[theme].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[theme].navBackground,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors[theme].navBackground,
          borderBottomWidth: 0,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: Colors[theme].text,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome 
              name="home" 
              size={24} 
              color={color} 
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome 
              name="search" 
              size={24} 
              color={color} 
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="languages"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome 
              name="book" 
              size={24} 
              color={color} 
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome 
              name="user" 
              size={24} 
              color={color} 
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
