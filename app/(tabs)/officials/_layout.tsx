import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useThemeColor } from '@/hooks/use-theme-color';

const SUBTABS = [
  { path: '/officials/lookup', label: 'Lookup' },
  { path: '/officials/state', label: 'State' },
  { path: '/officials/federal', label: 'Federal' },
  { path: '/officials/committees', label: 'Committees' },
];

export default function OfficialsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { showSidebar } = useResponsiveLayout();
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  if (showSidebar) return <Slot />;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.tabBar, { borderBottomColor: border }]}>
        {SUBTABS.map((tab) => {
          const isActive =
            pathname === tab.path ||
            (tab.path === '/officials/lookup' &&
              (pathname === '/officials' || pathname === '/officials/'));
          return (
            <Pressable
              key={tab.path}
              style={[
                styles.tab,
                isActive && { borderBottomColor: tint, borderBottomWidth: 2 },
              ]}
              onPress={() => router.navigate(tab.path as any)}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  { color: isActive ? tint : mutedText },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <Slot />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
