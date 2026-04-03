import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LevelProgress } from '@/components/gamification/level-progress';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export function AppHeader() {
  const router = useRouter();
  const { user } = useAuth();

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || '?'
    : '?';

  return (
    <View style={[styles.container, { backgroundColor: surface, borderBottomColor: border }]}>
      <View style={styles.left}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          style={({ pressed }) => [
            styles.avatarButton,
            { backgroundColor: tint + '15' },
            pressed && styles.pressed,
          ]}
          onPress={() => router.navigate('/(tabs)/profile')}
        >
          <ThemedText style={[styles.avatarText, { color: tint }]}>{initials}</ThemedText>
        </Pressable>
        <ThemedText style={styles.greeting} numberOfLines={1}>
          Hi, {user?.firstName || 'there'}!
        </ThemedText>
      </View>

      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Points"
          onPress={() => router.navigate('/(tabs)/profile')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <LevelProgress showDetails={false} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: mutedText + '10' },
            pressed && styles.pressed,
          ]}
          onPress={() => {}}
        >
          <MaterialIcons name="notifications-none" size={22} color={mutedText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
