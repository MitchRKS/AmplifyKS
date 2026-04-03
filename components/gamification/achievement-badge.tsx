import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ACHIEVEMENT_COLORS, type Achievement, type AchievementColor } from '@/constants/gamification';
import { Spacing } from '@/constants/theme';

type BadgeSize = 'small' | 'medium' | 'large';

const ICON_SIZES: Record<BadgeSize, number> = { small: 20, medium: 28, large: 40 };
const CIRCLE_SIZES: Record<BadgeSize, number> = { small: 40, medium: 56, large: 76 };

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: number;
  size?: BadgeSize;
}

function colorFor(c: AchievementColor): string {
  return ACHIEVEMENT_COLORS[c];
}

export function AchievementBadge({
  achievement,
  isUnlocked,
  progress = 0,
  size = 'medium',
}: AchievementBadgeProps) {
  const color = colorFor(achievement.iconColor);
  const circleSize = CIRCLE_SIZES[size];
  const iconSize = ICON_SIZES[size];

  return (
    <View style={[styles.container, !isUnlocked && styles.locked]}>
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: isUnlocked ? color + '30' : '#9CA3AF18',
          },
        ]}
      >
        {!isUnlocked && progress > 0 && (
          <View
            style={[
              styles.progressRing,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                borderColor: color + '80',
                borderWidth: 3,
                borderTopColor: 'transparent',
                borderRightColor: progress > 0.25 ? color + '80' : 'transparent',
                borderBottomColor: progress > 0.5 ? color + '80' : 'transparent',
                borderLeftColor: progress > 0.75 ? color + '80' : 'transparent',
              },
            ]}
          />
        )}
        <MaterialIcons
          name={achievement.iconName as any}
          size={iconSize}
          color={isUnlocked ? color : '#9CA3AF80'}
        />
      </View>

      {size !== 'small' && (
        <View style={styles.label}>
          <ThemedText
            style={[styles.name, size === 'large' && styles.nameLarge]}
            numberOfLines={2}
          >
            {achievement.name}
          </ThemedText>
          {!isUnlocked && progress > 0 && (
            <ThemedText style={styles.progressText}>
              {Math.round(progress * 100)}%
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
    width: 80,
  },
  locked: {
    opacity: 0.6,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  label: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameLarge: {
    fontSize: 14,
  },
  progressText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
