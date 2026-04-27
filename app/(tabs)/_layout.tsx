import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Slot, Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WebTopNav } from '@/components/web-top-nav';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

function DesktopLayout() {
  const colorScheme = useColorScheme();
  const bg = Colors[colorScheme ?? 'light'].background;

  return (
    <View style={styles.desktopContainer}>
      <WebTopNav />
      <View style={[styles.desktopContent, { backgroundColor: bg }]}>
        <Slot />
      </View>
    </View>
  );
}

function MobileLayout() {
  const colorScheme = useColorScheme();
  const { logout } = useAuth();
  const palette = Colors[colorScheme ?? 'light'];
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        headerShown: true,
        header: isWeb ? () => <AppHeader /> : undefined,
        tabBarButton: !isWeb ? HapticTab : undefined,
        headerStyle: {
          backgroundColor: palette.headerBackground,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          color: palette.text,
        },
        headerShadowVisible: false,
        tabBarStyle: Platform.select({
          web: {
            backgroundColor: palette.tabBarBackground,
            borderTopColor: palette.border,
            borderTopWidth: 1,
            paddingBottom: 6,
            paddingTop: 6,
          },
          default: {
            backgroundColor: palette.tabBarBackground,
            borderTopColor: palette.border,
          },
        }),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        headerRight: !isWeb
          ? () => (
              <Pressable onPress={logout} style={{ marginRight: 16, padding: 4 }}>
                <MaterialIcons name="logout" size={22} color={palette.tint} />
              </Pressable>
            )
          : undefined,
      }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="person" color={color} />,
          tabBarItemStyle: isWeb ? { display: 'none' } : undefined,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: 'Actions',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="campaign" color={color} />,
        }}
      />
      <Tabs.Screen
        name="officials"
        options={{
          title: 'Electeds',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="how-to-vote" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Bills',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="doc.text.magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="points"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="organizations"
        options={{
          title: 'Orgs',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="groups" color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { showSidebar } = useResponsiveLayout();

  if (Platform.OS === 'web' && showSidebar) {
    return <DesktopLayout />;
  }

  return <MobileLayout />;
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  desktopContent: {
    flex: 1,
    minHeight: 0,
  },
});
