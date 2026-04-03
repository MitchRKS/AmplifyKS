import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { AchievementBadge } from '@/components/gamification/achievement-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ACHIEVEMENT_COLORS,
  ACTION_POINTS,
  ALL_ACHIEVEMENTS,
  ALL_ACTIONS,
  type AdvocacyAction,
} from '@/constants/gamification';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useGamification } from '@/contexts/gamification-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function PointsScreen() {
  const {
    totalPoints,
    currentLevel,
    progress,
    remaining,
    next,
    currentStreak,
    longestStreak,
    lastActiveDate,
    unlockedAchievements,
    countOfAction,
    recentActions,
    getUnlocked,
    progressForAchievement,
  } = useGamification();

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const barBg = useThemeColor({ light: '#E5E7EB', dark: '#2D3139' }, 'background');

  const unlocked = getUnlocked();
  const locked = ALL_ACHIEVEMENTS.filter((a) => !unlockedAchievements.has(a.id));
  const recent = recentActions(5).reverse();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* ── Level & Points ── */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <View style={styles.levelRow}>
              <MaterialIcons
                name={currentLevel.iconName as any}
                size={48}
                color={currentLevel.iconColor}
              />
              <View style={styles.levelInfo}>
                <ThemedText style={[styles.levelLabel, { color: mutedText }]}>
                  Level {currentLevel.id}
                </ThemedText>
                <ThemedText type="subtitle">{currentLevel.name}</ThemedText>
              </View>
            </View>

            <View style={styles.pointsCenter}>
              <ThemedText style={[styles.pointsBig, { color: tint }]}>{totalPoints}</ThemedText>
              <ThemedText style={[styles.pointsLabel, { color: mutedText }]}>
                Total Points
              </ThemedText>
            </View>

            {next && (
              <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                  <ThemedText style={[styles.small, { color: mutedText }]}>
                    Next: {next.name}
                  </ThemedText>
                  <ThemedText style={[styles.small, { color: mutedText }]}>
                    {remaining} pts to go
                  </ThemedText>
                </View>
                <View style={[styles.barOuter, { backgroundColor: barBg }]}>
                  <View
                    style={[
                      styles.barInner,
                      {
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: next.iconColor,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* ── Streak ── */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Activity Streak
            </ThemedText>
            <View style={styles.streakRow}>
              <View style={styles.streakItem}>
                <MaterialIcons name="local-fire-department" size={20} color="#FF9800" />
                <ThemedText style={[styles.small, { color: mutedText }]}>Current</ThemedText>
                <ThemedText type="subtitle">{currentStreak} days</ThemedText>
              </View>
              <View style={styles.streakItem}>
                <MaterialIcons name="emoji-events" size={20} color="#ffc629" />
                <ThemedText style={[styles.small, { color: mutedText }]}>Best</ThemedText>
                <ThemedText type="subtitle">{longestStreak} days</ThemedText>
              </View>
            </View>
            {lastActiveDate && (
              <ThemedText style={[styles.small, { color: mutedText, marginTop: Spacing.sm }]}>
                Last active: {new Date(lastActiveDate).toLocaleDateString()}
              </ThemedText>
            )}
          </View>

          {/* ── Achievements ── */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Achievements
              </ThemedText>
              <ThemedText style={[styles.small, { color: mutedText }]}>
                {unlocked.length}/{ALL_ACHIEVEMENTS.length}
              </ThemedText>
            </View>

            {unlocked.length > 0 && (
              <>
                <ThemedText style={[styles.groupLabel, { color: mutedText }]}>Unlocked</ThemedText>
                <View style={styles.badgeGrid}>
                  {unlocked.map((a) => (
                    <AchievementBadge key={a.id} achievement={a} isUnlocked />
                  ))}
                </View>
              </>
            )}

            {locked.length > 0 && (
              <>
                <ThemedText style={[styles.groupLabel, { color: mutedText, marginTop: Spacing.lg }]}>
                  In Progress
                </ThemedText>
                <View style={styles.badgeGrid}>
                  {locked.map((a) => (
                    <AchievementBadge
                      key={a.id}
                      achievement={a}
                      isUnlocked={false}
                      progress={progressForAchievement(a)}
                    />
                  ))}
                </View>
              </>
            )}
          </View>

          {/* ── Ways to Earn ── */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Ways to Earn Points
            </ThemedText>
            {ALL_ACTIONS.map((action) => (
              <View key={action} style={[styles.earnRow, { borderBottomColor: border }]}>
                <View style={styles.earnLeft}>
                  <ThemedText style={styles.earnAction}>{action}</ThemedText>
                  <ThemedText style={[styles.small, { color: mutedText }]}>
                    Completed {countOfAction(action)} times
                  </ThemedText>
                </View>
                <View style={styles.earnRight}>
                  <ThemedText style={[styles.earnPoints, { color: tint }]}>
                    +{ACTION_POINTS[action]}
                  </ThemedText>
                  <ThemedText style={[styles.small, { color: mutedText }]}>pts</ThemedText>
                </View>
              </View>
            ))}
          </View>

          {/* ── Recent Activity ── */}
          {recent.length > 0 && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Recent Activity
              </ThemedText>
              {recent.map((r) => (
                <View key={r.id} style={[styles.activityRow, { borderBottomColor: border }]}>
                  <View style={styles.activityLeft}>
                    <ThemedText style={styles.activityAction}>{r.action}</ThemedText>
                    <ThemedText style={[styles.small, { color: mutedText }]} numberOfLines={1}>
                      {r.description}
                    </ThemedText>
                    <ThemedText style={[styles.tiny, { color: mutedText }]}>
                      {new Date(r.timestamp).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.activityPoints}>+{r.points}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingVertical: Spacing.lg, paddingBottom: Spacing['4xl'] },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  levelInfo: { gap: 2 },
  levelLabel: { fontSize: 13 },

  pointsCenter: { alignItems: 'center', paddingVertical: Spacing.lg },
  pointsBig: { fontSize: 48, fontWeight: '800' },
  pointsLabel: { fontSize: 14, marginTop: 2 },

  progressSection: { gap: Spacing.sm },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barOuter: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barInner: { height: 6, borderRadius: 3 },

  sectionTitle: { fontSize: 17, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  streakRow: { flexDirection: 'row', justifyContent: 'space-around' },
  streakItem: { alignItems: 'center', gap: 4 },

  groupLabel: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase' as const },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'flex-start',
  },

  earnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  earnLeft: { flex: 1, gap: 2 },
  earnAction: { fontSize: 15 },
  earnRight: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  earnPoints: { fontSize: 17, fontWeight: '700' },

  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityLeft: { flex: 1, gap: 2 },
  activityAction: { fontSize: 14, fontWeight: '600' },
  activityPoints: { fontSize: 15, fontWeight: '700', color: '#4CAF50' },

  small: { fontSize: 13 },
  tiny: { fontSize: 11 },
});
