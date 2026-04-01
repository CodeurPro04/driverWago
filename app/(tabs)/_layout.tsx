import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { DriverColors } from '@/constants/driverTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDriverPalette } from '@/lib/driverAppearance';

export default function TabLayout() {
  const palette = getDriverPalette(useColorScheme());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: DriverColors.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: Platform.OS === 'ios' ? 92 : 84,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 20 : 14,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Revenus',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Portefeuille',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
