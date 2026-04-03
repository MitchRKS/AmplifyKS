import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { AchievementBadge } from '@/components/gamification/achievement-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACTION_POINTS, ALL_ACHIEVEMENTS, ALL_ACTIONS } from '@/constants/gamification';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGamification } from '@/contexts/gamification-context';
import { useUserProfile, type UserProfile } from '@/hooks/use-user-profile';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, isLoaded, isSaving, updateProfile } = useUserProfile();
  const gamification = useGamification();
  const [pointsExpanded, setPointsExpanded] = useState(false);
  const [form, setForm] = useState<UserProfile>({
    phone: '',
    streetAddress: '',
    city: '',
    state: 'KS',
    zip: '',
    role: 'user',
  });

  useEffect(() => {
    if (isLoaded) {
      setForm(profile);
    }
  }, [isLoaded, profile]);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() || 'No name set' : '';
  const initials = user
    ? `${user.firstName.charAt(0) || ''}${user.lastName.charAt(0) || ''}`.toUpperCase() || '?'
    : '?';

  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ContentContainer>
        <View style={styles.header}>
          <ThemedText type="title">Profile</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            Your AmplifyKS account
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: tint + '15' }]}>
              <ThemedText style={[styles.avatarText, { color: tint }]}>{initials}</ThemedText>
            </View>
            <View style={styles.avatarInfo}>
              <View style={styles.nameRow}>
                <ThemedText type="subtitle">{fullName}</ThemedText>
                {profile.role === 'admin' && (
                  <View style={[styles.adminBadge, { backgroundColor: tint + '15' }]}>
                    <ThemedText style={[styles.adminBadgeText, { color: tint }]}>Admin</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="caption" style={{ color: mutedText }}>
                {user?.email || 'Not set'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Level & Points summary */}
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <View style={styles.levelRow}>
            <MaterialIcons
              name={gamification.currentLevel.iconName as any}
              size={40}
              color={gamification.currentLevel.iconColor}
            />
            <View style={styles.levelInfo}>
              <ThemedText style={[styles.levelLabel, { color: mutedText }]}>
                Level {gamification.currentLevel.id}
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.levelName}>
                {gamification.currentLevel.name}
              </ThemedText>
            </View>
            <View style={styles.pointsColumn}>
              <ThemedText style={[styles.pointsValue, { color: tint }]}>
                {gamification.totalPoints}
              </ThemedText>
              <ThemedText style={[styles.pointsLabel, { color: mutedText }]}>points</ThemedText>
            </View>
          </View>

          {gamification.next && (
            <View style={styles.progressSection}>
              <View style={styles.progressMeta}>
                <ThemedText style={[styles.progressText, { color: mutedText }]}>
                  Next: {gamification.next.name}
                </ThemedText>
                <ThemedText style={[styles.progressText, { color: mutedText }]}>
                  {gamification.remaining} pts to go
                </ThemedText>
              </View>
              <View style={[styles.barOuter, { backgroundColor: inputBackground }]}>
                <View
                  style={[
                    styles.barInner,
                    {
                      width: `${Math.round(gamification.progress * 100)}%`,
                      backgroundColor: gamification.next.iconColor,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="local-fire-department" size={16} color="#FF9800" />
              <ThemedText style={[styles.statValue, { color: mutedText }]}>
                {gamification.currentStreak}d streak
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="emoji-events" size={16} color="#ffc629" />
              <ThemedText style={[styles.statValue, { color: mutedText }]}>
                {gamification.longestStreak}d best
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="verified" size={16} color={tint} />
              <ThemedText style={[styles.statValue, { color: mutedText }]}>
                {gamification.getUnlocked().length}/{ALL_ACHIEVEMENTS.length} badges
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={[styles.expandButton, { borderColor: border }]}
            onPress={() => setPointsExpanded((v) => !v)}
          >
            <ThemedText style={[styles.expandText, { color: tint }]}>
              {pointsExpanded ? 'Show Less' : 'View Details'}
            </ThemedText>
            <MaterialIcons
              name={pointsExpanded ? 'expand-less' : 'expand-more'}
              size={20}
              color={tint}
            />
          </Pressable>

          {pointsExpanded && (
            <View style={styles.expandedContent}>
              {/* Achievements */}
              <View style={styles.expandedSection}>
                <View style={styles.expandedSectionHeader}>
                  <ThemedText type="defaultSemiBold">Achievements</ThemedText>
                  <ThemedText style={[styles.smallMuted, { color: mutedText }]}>
                    {gamification.getUnlocked().length}/{ALL_ACHIEVEMENTS.length}
                  </ThemedText>
                </View>

                {gamification.getUnlocked().length > 0 && (
                  <>
                    <ThemedText style={[styles.groupLabel, { color: mutedText }]}>Unlocked</ThemedText>
                    <View style={styles.badgeGrid}>
                      {gamification.getUnlocked().map((a) => (
                        <AchievementBadge key={a.id} achievement={a} isUnlocked />
                      ))}
                    </View>
                  </>
                )}

                {ALL_ACHIEVEMENTS.filter((a) => !gamification.unlockedAchievements.has(a.id)).length > 0 && (
                  <>
                    <ThemedText style={[styles.groupLabel, { color: mutedText, marginTop: Spacing.lg }]}>
                      In Progress
                    </ThemedText>
                    <View style={styles.badgeGrid}>
                      {ALL_ACHIEVEMENTS.filter((a) => !gamification.unlockedAchievements.has(a.id)).map((a) => (
                        <AchievementBadge
                          key={a.id}
                          achievement={a}
                          isUnlocked={false}
                          progress={gamification.progressForAchievement(a)}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Ways to Earn */}
              <View style={[styles.expandedSection, { borderTopWidth: 1, borderTopColor: border }]}>
                <ThemedText type="defaultSemiBold" style={styles.expandedSectionTitle}>
                  Ways to Earn Points
                </ThemedText>
                {ALL_ACTIONS.map((action) => (
                  <View key={action} style={[styles.earnRow, { borderBottomColor: border }]}>
                    <View style={styles.earnLeft}>
                      <ThemedText style={styles.earnAction}>{action}</ThemedText>
                      <ThemedText style={[styles.smallMuted, { color: mutedText }]}>
                        Completed {gamification.countOfAction(action)} times
                      </ThemedText>
                    </View>
                    <View style={styles.earnRight}>
                      <ThemedText style={[styles.earnPoints, { color: tint }]}>
                        +{ACTION_POINTS[action]}
                      </ThemedText>
                      <ThemedText style={[styles.smallMuted, { color: mutedText }]}>pts</ThemedText>
                    </View>
                  </View>
                ))}
              </View>

              {/* Recent Activity */}
              {gamification.recentActions(5).length > 0 && (
                <View style={[styles.expandedSection, { borderTopWidth: 1, borderTopColor: border }]}>
                  <ThemedText type="defaultSemiBold" style={styles.expandedSectionTitle}>
                    Recent Activity
                  </ThemedText>
                  {gamification.recentActions(5).reverse().map((r) => (
                    <View key={r.id} style={[styles.activityRow, { borderBottomColor: border }]}>
                      <View style={styles.activityLeft}>
                        <ThemedText style={styles.activityAction}>{r.action}</ThemedText>
                        <ThemedText style={[styles.smallMuted, { color: mutedText }]} numberOfLines={1}>
                          {r.description}
                        </ThemedText>
                        <ThemedText style={[styles.tinyMuted, { color: mutedText }]}>
                          {new Date(r.timestamp).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.activityPoints}>+{r.points}</ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Personal Info</ThemedText>
          <ThemedText type="caption" style={[styles.cardHint, { color: mutedText }]}>
            Used when submitting testimony and contacting lawmakers
          </ThemedText>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>Phone</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="(913) 555-0123"
              placeholderTextColor={placeholder}
              value={form.phone}
              onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>Street address</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="123 Main St"
              placeholderTextColor={placeholder}
              value={form.streetAddress}
              onChangeText={(streetAddress) => setForm((f) => ({ ...f, streetAddress }))}
              textContentType="streetAddressLine1"
              autoComplete="street-address"
            />
          </View>

          <View style={styles.addressRow}>
            <View style={[styles.field, { flex: 2 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>City</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="Topeka"
                placeholderTextColor={placeholder}
                value={form.city}
                onChangeText={(city) => setForm((f) => ({ ...f, city }))}
                textContentType="addressCity"
                autoComplete="postal-address-locality"
              />
            </View>
            <View style={[styles.field, { flex: 0.7 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>State</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="KS"
                placeholderTextColor={placeholder}
                value={form.state}
                onChangeText={(state) => setForm((f) => ({ ...f, state }))}
                textContentType="addressState"
                autoComplete="postal-address-region"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.field, { flex: 1.2 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>ZIP</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="66612"
                placeholderTextColor={placeholder}
                value={form.zip}
                onChangeText={(zip) => setForm((f) => ({ ...f, zip }))}
                keyboardType="number-pad"
                textContentType="postalCode"
                autoComplete="postal-code"
                maxLength={10}
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: tint },
              pressed && styles.saveButtonPressed,
              isSaving && styles.saveButtonDisabled,
            ]}
            onPress={() => updateProfile(form)}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
            )}
          </Pressable>
        </View>
      </ContentContainer>
    </ScrollView>
  );

  if (!isLoaded) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
      >
        {content}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  subtitle: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['2xl'],
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
  },
  avatarInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  levelInfo: {
    flex: 1,
    gap: 2,
  },
  levelLabel: {
    fontSize: 12,
  },
  levelName: {
    fontSize: 16,
  },
  pointsColumn: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  pointsLabel: {
    fontSize: 11,
  },
  progressSection: {
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
  },
  barOuter: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barInner: {
    height: 6,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: Spacing.md,
  },
  expandedSection: {
    paddingTop: Spacing.lg,
    marginTop: Spacing.md,
  },
  expandedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  expandedSectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase' as const,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  earnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  earnLeft: {
    flex: 1,
    gap: 2,
  },
  earnAction: {
    fontSize: 15,
  },
  earnRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  earnPoints: {
    fontSize: 17,
    fontWeight: '700',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityLeft: {
    flex: 1,
    gap: 2,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityPoints: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  smallMuted: {
    fontSize: 13,
  },
  tinyMuted: {
    fontSize: 11,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardHint: {
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  field: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
