import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ContentContainer } from '@/components/content-container';
import { MatchScoreBadge } from '@/components/legislator-match-detail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLegislatorMatch } from '@/hooks/use-legislator-match';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import { districtLabel } from '@/services/district-label';
import { getLegislatorImageAssetLocal } from '@/services/kansas-legislators';
import { officialPhone } from '@/services/official-contact';
import type { Official } from '@/services/openstates';

/**
 * "Saved" sub-tab of the Electeds view: the user's individually bookmarked
 * officials (the Saved Electeds bucket). Address-derived My Electeds live on
 * the Dashboard — this tab is only the bookmarks, and un-bookmarking here is
 * allowed the same as everywhere else.
 */
export default function SavedElectedsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedElecteds, isLoaded, removeOfficial } = useSavedOfficials();
  const { getMatch } = useLegislatorMatch();

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const democrat = useThemeColor({ light: '#2563eb', dark: '#7aa7f0' }, 'tint');
  const republican = useThemeColor({ light: '#fa3332', dark: '#FF6B6A' }, 'tint');

  const getPartyColor = (party: string) => {
    const lower = party.toLowerCase();
    if (lower.includes('democrat')) return democrat;
    if (lower.includes('republican')) return republican;
    return mutedText;
  };

  const handleRemove = (official: Official) => {
    removeOfficial(official.id).catch((error) => {
      const message =
        error instanceof Error ? error.message : 'Unable to remove this official. Please try again.';
      AppAlert.alert('Error', message);
    });
  };

  const renderCard = (item: Official) => {
    const imageAsset = getLegislatorImageAssetLocal(item.id);
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: surface, borderColor: border },
          Shadows.sm,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push({ pathname: '/legislator-detail', params: { id: item.id } })}
      >
        <View style={styles.cardRow}>
          {imageAsset ? (
            <Image source={imageAsset} style={styles.photo} contentFit="cover" />
          ) : item.image ? (
            <Image source={{ uri: item.image }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: inputBackground }]}>
              <ThemedText style={[styles.photoInitials, { color: mutedText }]}>
                {(item.givenName ?? '').charAt(0)}
                {(item.familyName ?? '').charAt(0)}
              </ThemedText>
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" style={styles.officialName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name} from Saved Electeds`}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemove(item);
                }}
                hitSlop={8}
                style={styles.saveButton}
              >
                <MaterialIcons name="bookmark" size={22} color={tint} />
              </Pressable>
            </View>
            <View style={styles.tagRow}>
              {item.party ? (
                <View style={[styles.partyBadge, { backgroundColor: getPartyColor(item.party) + '14' }]}>
                  <ThemedText style={[styles.partyText, { color: getPartyColor(item.party) }]}>
                    {item.party}
                  </ThemedText>
                </View>
              ) : null}
              {item.chamber ? (
                <View style={[styles.chamberChip, { backgroundColor: border }]}>
                  <ThemedText type="caption" style={{ color: mutedText }}>{item.chamber}</ThemedText>
                </View>
              ) : null}
            </View>
            <View style={styles.districtRow}>
              <ThemedText type="caption" style={{ color: mutedText }}>
                {districtLabel(item.district)}
              </ThemedText>
              {(() => {
                const match = getMatch(item);
                return match ? <MatchScoreBadge percent={match.compositePercent} /> : null;
              })()}
            </View>
            {item.email ? (
              <ThemedText type="caption" style={{ color: tint }} numberOfLines={1}>
                {item.email}
              </ThemedText>
            ) : null}
            {officialPhone(item) ? (
              <ThemedText type="caption" style={{ color: mutedText }} numberOfLines={1}>
                {officialPhone(item)}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ContentContainer>
          <View style={styles.header}>
            <ThemedText type="title">Saved Electeds</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              Officials you&apos;ve bookmarked around the app
            </ThemedText>
          </View>

          {!user ? (
            <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
              <MaterialIcons name="bookmark-border" size={32} color={mutedText} />
              <ThemedText style={[styles.emptyPrimary, { color: mutedText }]}>
                Sign in to save electeds
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.emptyButton, { backgroundColor: tint }, pressed && styles.pressed]}
                onPress={() => router.navigate('/(auth)/login')}
              >
                <ThemedText style={styles.emptyButtonText}>Sign In</ThemedText>
              </Pressable>
            </View>
          ) : !isLoaded ? null : savedElecteds.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
              <MaterialIcons name="bookmark-border" size={32} color={mutedText} />
              <ThemedText style={[styles.emptyPrimary, { color: mutedText }]}>
                No saved electeds yet
              </ThemedText>
              <ThemedText type="caption" style={[styles.emptySecondary, { color: mutedText }]}>
                Tap the bookmark on any official — in State, Federal, or a profile — to save them
                here. Your own representatives live on the Dashboard under My Electeds.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.list}>{savedElecteds.map(renderCard)}</View>
          )}
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['4xl'] },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  subtitle: { fontSize: 15, marginTop: Spacing.xs },
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  cardRow: { flexDirection: 'row', gap: 14 },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  photoInitials: { fontSize: 18, fontWeight: '600' },
  cardContent: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  officialName: { fontSize: 16, flex: 1 },
  saveButton: { padding: 2 },
  tagRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  partyBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm },
  partyText: { fontSize: 12, fontWeight: '700' },
  chamberChip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm },
  districtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['2xl'],
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  emptyPrimary: { fontSize: 16, fontWeight: '600' },
  emptySecondary: { textAlign: 'center', lineHeight: 18 },
  emptyButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
