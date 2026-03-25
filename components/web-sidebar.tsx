import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface NavItem {
  route: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { route: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { route: '/bills', label: 'Bills', icon: 'description' },
  { route: '/officials', label: 'Officials', icon: 'how-to-vote' },
  { route: '/testimony', label: 'Testimony', icon: 'edit-note' },
  { route: '/profile', label: 'Profile', icon: 'person' },
];

const ACTIVE_BG = 'rgba(0, 151, 178, 0.12)';
const ACTIVE_COLOR = '#0097b2';
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.6)';
const HOVER_BG = 'rgba(255, 255, 255, 0.06)';
const DIVIDER_COLOR = 'rgba(255, 255, 255, 0.1)';

export function WebSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logoCircle}>
          <MaterialIcons name="campaign" size={22} color="#1c355e" />
        </View>
        <View>
          <ThemedText style={styles.brandName}>AmplifyKS</ThemedText>
          <ThemedText style={styles.brandTagline}>Kansas Legislature</ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: DIVIDER_COLOR }]} />

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route);
          return (
            <Pressable
              key={item.route}
              style={({ pressed }) => [
                styles.navItem,
                active && { backgroundColor: ACTIVE_BG },
                pressed && !active && { backgroundColor: HOVER_BG },
              ]}
              onPress={() => router.navigate(item.route as any)}
            >
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
                ]}
              >
                {item.label}
              </ThemedText>
              {active && <View style={[styles.activeIndicator, { backgroundColor: ACTIVE_COLOR }]} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.divider, { backgroundColor: DIVIDER_COLOR }]} />

      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && { backgroundColor: HOVER_BG },
        ]}
        onPress={logout}
      >
        <MaterialIcons name="logout" size={18} color={INACTIVE_COLOR} />
        <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 256,
    backgroundColor: '#1c355e',
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
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
  divider: {
    height: 1,
    marginHorizontal: Spacing.xl,
  },
  nav: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    marginBottom: 2,
    position: 'relative',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    fontWeight: '700',
  },
  activeIndicator: {
    width: 3,
    height: 20,
    borderRadius: 2,
    position: 'absolute',
    right: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginHorizontal: Spacing.md,
    borderRadius: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
