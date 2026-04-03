import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AchievementBadge } from '@/components/gamification/achievement-badge';
import { ThemedText } from '@/components/themed-text';
import { ACHIEVEMENT_COLORS, type Achievement } from '@/constants/gamification';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useGamification } from '@/contexts/gamification-context';

export function AchievementCelebration() {
  const { newlyUnlocked, clearNewlyUnlocked } = useGamification();

  const achievement = newlyUnlocked[0];
  if (!achievement) return null;

  const color = ACHIEVEMENT_COLORS[achievement.iconColor];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={clearNewlyUnlocked}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={clearNewlyUnlocked} />
        <View style={[styles.card, Shadows.lg]}>
          <MaterialIcons name="star" size={48} color="#ffc629" style={styles.starIcon} />

          <ThemedText style={styles.heading}>Achievement Unlocked!</ThemedText>

          <AchievementBadge achievement={achievement} isUnlocked size="large" />

          <ThemedText style={styles.name}>{achievement.name}</ThemedText>
          <ThemedText style={styles.description}>{achievement.description}</ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: color },
              pressed && styles.pressed,
            ]}
            onPress={clearNewlyUnlocked}
          >
            <ThemedText style={styles.buttonText}>Awesome!</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 340,
  },
  starIcon: {
    marginBottom: Spacing.xs,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1D21',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D21',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#5E6368',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    width: '100%',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
