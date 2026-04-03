import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useGamification } from '@/contexts/gamification-context';

interface LevelProgressProps {
  showDetails?: boolean;
}

export function LevelProgress({ showDetails = true }: LevelProgressProps) {
  const { currentLevel, totalPoints, progress, next } = useGamification();

  return (
    <View style={styles.container}>
      <MaterialIcons
        name={currentLevel.iconName as any}
        size={24}
        color={currentLevel.iconColor}
      />

      {showDetails ? (
        <View style={styles.details}>
          <View style={styles.row}>
            <ThemedText style={styles.caption}>
              Level {currentLevel.id}
            </ThemedText>
            <ThemedText style={styles.dot}> · </ThemedText>
            <ThemedText style={styles.caption}>{totalPoints} pts</ThemedText>
          </View>
          {next && (
            <View style={styles.barOuter}>
              <View
                style={[
                  styles.barInner,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: next.iconColor },
                ]}
              />
            </View>
          )}
        </View>
      ) : (
        <ThemedText style={[styles.pointsOnly, { color: currentLevel.iconColor }]}>
          {totalPoints}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  details: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caption: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dot: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  barOuter: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  barInner: {
    height: 4,
    borderRadius: 2,
  },
  pointsOnly: {
    fontSize: 13,
    fontWeight: '600',
  },
});
