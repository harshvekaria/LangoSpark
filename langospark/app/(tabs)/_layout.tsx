import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          backgroundColor: colors.navBackground,
          borderTopColor: colors.cardBorder,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        headerStyle: {
          backgroundColor: colors.navBackground,
        },
        headerTitleStyle: {
          color: colors.text,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="languages"
        options={{
          title: 'Languages',
          tabBarIcon: ({ color }) => <FontAwesome name="globe" size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
