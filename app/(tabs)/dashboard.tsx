import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedOfficials, removeOfficial } = useSavedOfficials();

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const democrat = useThemeColor({ light: '#1c355e', dark: '#6B8DC2' }, 'tint');
  const republican = useThemeColor({ light: '#fa3332', dark: '#FF6B6A' }, 'tint');

  const getPartyColor = (party: string) => {
    const lower = (party ?? '').toLowerCase();
    if (lower.includes('democrat')) return democrat;
    if (lower.includes('republican')) return republican;
    return mutedText;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ContentContainer>
          <View style={styles.header}>
            <ThemedText type="title">
              {user?.firstName ? `Hi, ${user.firstName}` : 'Dashboard'}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              Your AmplifyKS overview
            </ThemedText>
          </View>

          <View style={styles.quickActions}>
            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: surface, borderColor: border },
                Shadows.sm,
                pressed && styles.pressed,
              ]}
              onPress={() => router.navigate('/(tabs)/officials')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: tint + '12' }]}>
                <MaterialIcons name="how-to-vote" size={22} color={tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.quickActionLabel}>Find Electeds</ThemedText>
              <ThemedText type="caption" style={{ color: mutedText }}>
                Your representatives
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: surface, borderColor: border },
                Shadows.sm,
                pressed && styles.pressed,
              ]}
              onPress={() => router.navigate('/(tabs)/bills')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: tint + '12' }]}>
                <MaterialIcons name="description" size={22} color={tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.quickActionLabel}>Browse Bills</ThemedText>
              <ThemedText type="caption" style={{ color: mutedText }}>
                Current session
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">My Lawmakers</ThemedText>
              {savedOfficials.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: tint + '15' }]}>
                  <ThemedText style={[styles.countText, { color: tint }]}>
                    {savedOfficials.length}
                  </ThemedText>
                </View>
              )}
            </View>

            {savedOfficials.length > 0 ? (
              savedOfficials.map((official) => (
                <Pressable
                  key={official.id}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: surface, borderColor: border },
                    Shadows.sm,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push({ pathname: '/legislator-detail', params: { id: official.id } })}
                >
                  <View style={styles.cardRow}>
                    {official.image ? (
                      <Image source={{ uri: official.image }} style={styles.photo} contentFit="cover" />
                    ) : (
                      <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: inputBackground }]}>
                        <ThemedText style={[styles.photoInitials, { color: mutedText }]}>
                          {(official.givenName ?? '').charAt(0)}
                          {(official.familyName ?? '').charAt(0)}
                        </ThemedText>
                      </View>
                    )}

                    <View style={styles.cardContent}>
                      <ThemedText type="defaultSemiBold" style={styles.officialName} numberOfLines={1}>
                        {official.name}
                      </ThemedText>

                      <View style={styles.tagRow}>
                        <View style={[styles.partyBadge, { backgroundColor: getPartyColor(official.party) + '14' }]}>
                          <ThemedText style={[styles.partyText, { color: getPartyColor(official.party) }]}>
                            {official.party}
                          </ThemedText>
                        </View>
                      </View>

                      <ThemedText type="caption" style={{ color: mutedText }}>
                        {official.chamber}{official.district ? ` — District ${official.district}` : ''}
                      </ThemedText>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove official"
                      onPress={(e) => {
                        e.stopPropagation();
                        removeOfficial(official.id);
                      }}
                      hitSlop={8}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="close" size={18} color={mutedText} />
                    </Pressable>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
                <View style={[styles.emptyIcon, { backgroundColor: inputBackground }]}>
                  <MaterialIcons name="how-to-vote" size={32} color={mutedText} />
                </View>
                <ThemedText type="defaultSemiBold" style={[styles.emptyTitle, { color: mutedText }]}>
                  No saved lawmakers yet
                </ThemedText>
                <ThemedText type="caption" style={[styles.emptyBody, { color: mutedText }]}>
                  Look up your elected officials and save them for quick access.
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.emptyButton,
                    { backgroundColor: tint },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.navigate('/(tabs)/officials')}
                >
                  <ThemedText style={styles.emptyButtonText}>Find My Officials</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionLabel: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  officialName: {
    fontSize: 16,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  partyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  partyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  removeButton: {
    padding: Spacing.xs,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
