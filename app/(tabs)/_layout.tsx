import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { logout } = useAuth();
  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        headerShown: true,
        tabBarButton: HapticTab,
        headerRight: () => (
          <Pressable onPress={logout} style={{ marginRight: 16 }}>
            <MaterialIcons name="logout" size={22} color={tint} />
          </Pressable>
        ),
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
        name="officials"
        options={{
          title: 'My Officials',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="how-to-vote" color={color} />,
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
