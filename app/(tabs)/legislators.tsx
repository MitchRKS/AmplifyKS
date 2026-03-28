import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getKansasLegislators, type Official } from '@/services/openstates';

type ChamberFilter = 'All' | 'Senate' | 'House';
type PartyFilter = 'All' | 'Democratic' | 'Republican';
type SortOption = 'name' | 'district';

export default function LegislatorsScreen() {
  const router = useRouter();
  const [legislators, setLegislators] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>('All');
  const [partyFilter, setPartyFilter] = useState<PartyFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const { saveOfficial, removeOfficial, isSaved } = useSavedOfficials();

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const democrat = useThemeColor({ light: '#1c355e', dark: '#6B8DC2' }, 'tint');
  const republican = useThemeColor({ light: '#fa3332', dark: '#FF6B6A' }, 'tint');

  const fetchLegislators = async () => {
    try {
      setError(null);
      const results = await getKansasLegislators();
      setLegislators(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      Alert.alert('Error', `Unable to load Kansas legislators.\n\n${message}`);
      setLegislators([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegislators();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLegislators();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const chamberLower = chamberFilter.toLowerCase();
    const partyLower = partyFilter.toLowerCase();
    return legislators
      .filter((l) => {
        const matchesSearch =
          !query ||
          (l.name ?? '').toLowerCase().includes(query) ||
          (l.district ?? '').toLowerCase().includes(query);

        const matchesChamber =
          chamberFilter === 'All' || (l.chamber ?? '').toLowerCase() === chamberLower;

        const matchesParty =
          partyFilter === 'All' || (l.party ?? '').toLowerCase().startsWith(partyLower.slice(0, 3));

        return matchesSearch && matchesChamber && matchesParty;
      })
      .sort((a, b) => {
        if (sortBy === 'district') {
          const da = parseInt(a.district, 10) || 0;
          const db = parseInt(b.district, 10) || 0;
          return da - db || a.familyName.localeCompare(b.familyName);
        }
        return a.familyName.localeCompare(b.familyName);
      });
  }, [legislators, searchQuery, chamberFilter, partyFilter, sortBy]);

  const getPartyColor = (party: string) => {
    const lower = party.toLowerCase();
    if (lower.includes('democrat')) return democrat;
    if (lower.includes('republican')) return republican;
    return mutedText;
  };

  const openProfile = (official: Official) => {
    router.push({ pathname: '/legislator-detail', params: { id: official.id } });
  };

  const toggleSave = (official: Official) => {
    if (isSaved(official.id)) {
      removeOfficial(official.id);
    } else {
      saveOfficial(official);
    }
  };

  const renderCard = (item: Official) => {
    const saved = isSaved(item.id);

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: surface, borderColor: border },
          Shadows.sm,
          pressed && styles.pressed,
        ]}
        onPress={() => openProfile(item)}
      >
        <View style={styles.cardRow}>
          {item.image ? (
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
                accessibilityLabel={saved ? 'Remove from saved' : 'Save legislator'}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleSave(item);
                }}
                hitSlop={8}
                style={styles.saveButton}
              >
                <MaterialIcons
                  name={saved ? 'bookmark' : 'bookmark-border'}
                  size={22}
                  color={saved ? tint : mutedText}
                />
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
                  <ThemedText type="caption" style={{ color: mutedText }}>
                    {item.chamber}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <ThemedText type="caption" style={{ color: mutedText }}>
              {item.district ? `District ${item.district}` : ''}
            </ThemedText>

            {item.email ? (
              <ThemedText type="caption" style={{ color: tint }} numberOfLines={1}>
                {item.email}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tint} />
        }
      >
        <ContentContainer>
          <View style={styles.header}>
            <ThemedText type="title">Legislators</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              Current Kansas Legislature
            </ThemedText>
          </View>

          <View style={styles.searchRow}>
            <View style={[styles.searchInputWrapper, { backgroundColor: inputBackground, borderColor: inputBorder }]}>
              <MaterialIcons name="search" size={20} color={placeholder} />
              <TextInput
                style={[styles.searchInput, { color: inputText }]}
                placeholder="Search by name or district..."
                placeholderTextColor={placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            {(['All', 'Senate', 'House'] as ChamberFilter[]).map((chamber) => (
              <Pressable
                key={chamber}
                style={[
                  styles.filterChip,
                  { borderColor: border },
                  chamberFilter === chamber && { backgroundColor: tint + '12', borderColor: tint },
                ]}
                onPress={() => setChamberFilter(chamber)}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    chamberFilter === chamber && { color: tint, fontWeight: '700' },
                  ]}
                >
                  {chamber}
                </ThemedText>
              </Pressable>
            ))}
            <View style={[styles.filterDivider, { backgroundColor: border }]} />
            {(['All', 'Democratic', 'Republican'] as PartyFilter[]).map((party) => (
              <Pressable
                key={party}
                style={[
                  styles.filterChip,
                  { borderColor: border },
                  partyFilter === party && { backgroundColor: tint + '12', borderColor: tint },
                ]}
                onPress={() => setPartyFilter(party)}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    partyFilter === party && { color: tint, fontWeight: '700' },
                  ]}
                >
                  {party === 'All' ? 'All Parties' : party}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.resultsHeader}>
            <ThemedText type="caption" style={{ color: mutedText }}>
              {filtered.length} legislator{filtered.length !== 1 ? 's' : ''}
            </ThemedText>
            <Pressable
              style={styles.sortToggle}
              onPress={() => setSortBy(sortBy === 'name' ? 'district' : 'name')}
            >
              <MaterialIcons name="sort" size={14} color={tint} />
              <ThemedText type="caption" style={{ color: tint, fontWeight: '600' }}>
                {sortBy === 'name' ? 'Name' : 'District'}
              </ThemedText>
            </Pressable>
          </View>

          {loading && legislators.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tint} />
              <ThemedText style={[styles.loadingText, { color: mutedText }]}>
                Loading legislators...
              </ThemedText>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={[styles.emptyText, { color: mutedText }]}>
                {error
                  ? `Error: ${error}`
                  : searchQuery || chamberFilter !== 'All' || partyFilter !== 'All'
                    ? 'No legislators match your filters'
                    : 'No legislators available'}
              </ThemedText>
              {error && (
                <Pressable
                  style={[styles.retryButton, { backgroundColor: tint }]}
                  onPress={() => {
                    setLoading(true);
                    fetchLegislators();
                  }}
                >
                  <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.listSection}>
              {filtered.map(renderCard)}
            </View>
          )}
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  searchRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterDivider: {
    width: 1,
    height: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: Spacing.xs,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  listSection: {
    gap: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  officialName: {
    fontSize: 16,
    flex: 1,
  },
  saveButton: {
    padding: 2,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  partyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  partyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chamberChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
