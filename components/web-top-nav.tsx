import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface SubNavItem {
  route: string;
  label: string;
}

interface NavItem {
  route: string;
  label: string;
  icon: IconName;
  children?: SubNavItem[];
  activePrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: '/profile', label: 'Profile', icon: 'person' },
  { route: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { route: '/actions', label: 'Actions', icon: 'campaign' },
  {
    route: '/officials/lookup',
    label: 'Electeds',
    icon: 'how-to-vote',
    activePrefix: '/officials',
    children: [
      { route: '/officials/lookup', label: 'Lookup' },
      { route: '/officials/state', label: 'State' },
      { route: '/officials/federal', label: 'Federal' },
    ],
  },
  { route: '/bills', label: 'Bills', icon: 'description' },
  { route: '/organizations', label: 'Organizations', icon: 'groups' },
];

const ACTIVE_BG = 'rgba(0, 151, 178, 0.12)';
const ACTIVE_COLOR = '#0097b2';
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.6)';
const HOVER_BG = 'rgba(255, 255, 255, 0.06)';
const DIVIDER_COLOR = 'rgba(255, 255, 255, 0.1)';
const SUB_BAR_BG = 'rgba(0, 0, 0, 0.2)';

const HOVER_CLEAR_MS = 180;

export function WebTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const hoverClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHoverClear = () => {
    if (hoverClearRef.current) {
      clearTimeout(hoverClearRef.current);
      hoverClearRef.current = null;
    }
  };

  const scheduleHoverClear = () => {
    cancelHoverClear();
    hoverClearRef.current = setTimeout(() => {
      setHoveredGroup(null);
      hoverClearRef.current = null;
    }, HOVER_CLEAR_MS);
  };

  useEffect(() => () => cancelHoverClear(), []);

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');

  const officialsItem = NAV_ITEMS.find((i) => i.children);
  const officialsPrefix = officialsItem?.activePrefix ?? '';
  const onOfficialsSection =
    officialsPrefix.length > 0 && pathname.startsWith(officialsPrefix);
  const showOfficialsSub =
    officialsItem &&
    (hoveredGroup === officialsItem.route || onOfficialsSection);

  return (
    <View style={styles.wrapper}>
      <View style={styles.mainRow}>
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="campaign" size={22} color="#1c355e" />
          </View>
          <View style={styles.brandText}>
            <ThemedText style={styles.brandName}>AmplifyKS</ThemedText>
            <ThemedText style={styles.brandTagline}>Kansas Legislature</ThemedText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navScroll}
          contentContainerStyle={styles.navScrollContent}>
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              const groupActive = item.activePrefix
                ? pathname.startsWith(item.activePrefix)
                : isActive(item.route);
              const showChildren = hoveredGroup === item.route || groupActive;

              return (
                <View
                  key={item.route}
                  onPointerEnter={() => {
                    cancelHoverClear();
                    setHoveredGroup(item.route);
                  }}
                  onPointerLeave={scheduleHoverClear}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.navItem,
                      groupActive && { backgroundColor: ACTIVE_BG },
                      pressed && !groupActive && { backgroundColor: HOVER_BG },
                    ]}
                    onPress={() => router.navigate(item.route as any)}>
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={groupActive ? ACTIVE_COLOR : INACTIVE_COLOR}
                    />
                    <ThemedText
                      style={[
                        styles.navLabel,
                        { color: groupActive ? ACTIVE_COLOR : INACTIVE_COLOR },
                        groupActive && styles.navLabelActive,
                      ]}>
                      {item.label}
                    </ThemedText>
                    <MaterialIcons
                      name={showChildren ? 'expand-less' : 'expand-more'}
                      size={18}
                      color={groupActive ? ACTIVE_COLOR : INACTIVE_COLOR}
                    />
                  </Pressable>
                </View>
              );
            }

            const active = isActive(item.route);
            return (
              <Pressable
                key={item.route}
                style={({ pressed }) => [
                  styles.navItem,
                  active && { backgroundColor: ACTIVE_BG },
                  pressed && !active && { backgroundColor: HOVER_BG },
                ]}
                onPress={() => router.navigate(item.route as any)}>
                <MaterialIcons
                  name={item.icon}
                  size={20}
                  color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
                />
                <ThemedText
                  style={[
                    styles.navLabel,
                    { color: active ? ACTIVE_COLOR : INACTIVE_COLOR },
                    active && styles.navLabelActive,
                  ]}>
                  {item.label}
                </ThemedText>
                {active && <View style={[styles.activeUnderline, { backgroundColor: ACTIVE_COLOR }]} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { backgroundColor: HOVER_BG },
          ]}
          onPress={logout}>
          <MaterialIcons name="logout" size={18} color={INACTIVE_COLOR} />
          <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
        </Pressable>
      </View>

      {showOfficialsSub && officialsItem?.children && (
        <View
          style={[styles.subBar, { borderTopColor: DIVIDER_COLOR }]}
          onPointerEnter={() => {
            cancelHoverClear();
            setHoveredGroup(officialsItem.route);
          }}
          onPointerLeave={() => {
            if (!onOfficialsSection) scheduleHoverClear();
          }}>
          {officialsItem.children.map((child) => {
            const childActive = pathname === child.route;
            return (
              <Pressable
                key={child.route}
                style={({ pressed }) => [
                  styles.subNavItem,
                  childActive && { backgroundColor: ACTIVE_BG },
                  pressed && !childActive && { backgroundColor: HOVER_BG },
                ]}
                onPress={() => router.navigate(child.route as any)}>
                <ThemedText
                  style={[
                    styles.subNavLabel,
                    { color: childActive ? ACTIVE_COLOR : INACTIVE_COLOR },
                    childActive && styles.navLabelActive,
                  ]}>
                  {child.label}
                </ThemedText>
                {childActive && (
                  <View style={[styles.subActiveUnderline, { backgroundColor: ACTIVE_COLOR }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#1c355e',
    zIndex: 10,
  },
  mainRow: {
    minHeight: Layout.topNavHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 0,
  },
  brandText: {
    justifyContent: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  navScroll: {
    flex: 1,
    minWidth: 0,
  },
  navScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    position: 'relative',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '700',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    height: 3,
    borderRadius: 2,
  },
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    backgroundColor: SUB_BAR_BG,
  },
  subNavItem: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    position: 'relative',
  },
  subNavLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  subActiveUnderline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    height: 2,
    borderRadius: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    flexShrink: 0,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
