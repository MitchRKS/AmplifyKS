import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="bills"
        options={{
          title: 'House Bills',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="senate-bills"
        options={{
          title: 'Senate Bills',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="testimony"
        options={{
          title: 'Testimony',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
