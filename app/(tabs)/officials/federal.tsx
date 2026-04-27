import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MatchScoreBadge } from '@/components/legislator-match-detail';
import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useLegislatorMatch } from '@/hooks/use-legislator-match';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getKansasFederalDelegation, type Official } from '@/services/openstates';

type ChamberFilter = 'All' | 'Senate' | 'House';
type PartyFilter = 'All' | 'Democratic' | 'Republican';
type SortOption = 'nameAsc' | 'nameDesc' | 'districtAsc' | 'districtDesc' | 'partyAsc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'nameAsc', label: 'Name (A-Z)' },
  { value: 'nameDesc', label: 'Name (Z-A)' },
  { value: 'districtAsc', label: 'District (low to high)' },
  { value: 'districtDesc', label: 'District (high to low)' },
  { value: 'partyAsc', label: 'Party (A-Z)' },
];

const sortOfficials = (items: Official[], sortBy: SortOption): Official[] => {
  const sorted = [...items];
  switch (sortBy) {
    case 'nameAsc':
      return sorted.sort((a, b) => a.familyName.localeCompare(b.familyName));
    case 'nameDesc':
      return sorted.sort((a, b) => b.familyName.localeCompare(a.familyName));
    case 'districtAsc':
      return sorted.sort((a, b) => {
        const da = parseInt(a.district, 10) || 0;
        const db = parseInt(b.district, 10) || 0;
        return da - db || a.familyName.localeCompare(b.familyName);
      });
    case 'districtDesc':
      return sorted.sort((a, b) => {
        const da = parseInt(a.district, 10) || 0;
        const db = parseInt(b.district, 10) || 0;
        return db - da || a.familyName.localeCompare(b.familyName);
      });
    case 'partyAsc':
      return sorted.sort((a, b) => a.party.localeCompare(b.party) || a.familyName.localeCompare(b.familyName));
    default:
      return sorted;
  }
};

export default function FederalDelegationScreen() {
  const router = useRouter();
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>('All');
  const [partyFilter, setPartyFilter] = useState<PartyFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('nameAsc');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const { saveOfficial, removeOfficial, isSaved } = useSavedOfficials();
  const { getMatch } = useLegislatorMatch();

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

  const fetchDelegation = async () => {
    try {
      setError(null);
      const results = await getKansasFederalDelegation();
      setOfficials(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      Alert.alert('Error', `Unable to load federal delegation.\n\n${message}`);
      setOfficials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelegation();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDelegation();
    setRefreshing(false);
  };

  const filteredOfficials = sortOfficials(
    officials.filter((official) => {
      const query = searchQuery.toLowerCase();
      const partyLower = partyFilter.toLowerCase();
      const matchesSearch =
        !query ||
        (official.name ?? '').toLowerCase().includes(query) ||
        (official.district ?? '').toLowerCase().includes(query);

      const matchesChamber =
        chamberFilter === 'All' ||
        (chamberFilter === 'Senate' && official.chamber === 'U.S. Senate') ||
        (chamberFilter === 'House' && official.chamber === 'U.S. House');

      const matchesParty =
        partyFilter === 'All' || (official.party ?? '').toLowerCase().startsWith(partyLower.slice(0, 3));

      return matchesSearch && matchesChamber && matchesParty;
    }),
    sortBy,
  );

  const senators = filteredOfficials.filter((o) => o.chamber === 'U.S. Senate');
  const houseMembers = filteredOfficials.filter((o) => o.chamber === 'U.S. House');
  const activeFilterCount = (chamberFilter !== 'All' ? 1 : 0) + (partyFilter !== 'All' ? 1 : 0);

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
                accessibilityLabel={saved ? 'Remove from saved' : 'Save official'}
                onPress={(e) => { e.stopPropagation(); toggleSave(item); }}
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
                  <ThemedText style={[styles.partyText, { color: getPartyColor(item.party) }]}>{item.party}</ThemedText>
                </View>
              ) : null}
            </View>
            <View style={styles.districtRow}>
              <ThemedText type="caption" style={{ color: mutedText }}>
                {item.district ? `District ${item.district}` : ''}
              </ThemedText>
              {(() => {
                const match = getMatch(item);
                return match ? <MatchScoreBadge percent={match.compositePercent} /> : null;
              })()}
            </View>
            {item.email ? (
              <ThemedText type="caption" style={{ color: tint }} numberOfLines={1}>{item.email}</ThemedText>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tint} />}
      >
        <ContentContainer>
          <View style={styles.header}>
            <ThemedText type="title">Federal Delegation</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              Kansas's representatives in the U.S. Congress
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
            <Pressable
              style={({ pressed }) => [
                styles.filterButton,
                { backgroundColor: surface, borderColor: inputBorder },
                Shadows.sm,
                pressed && styles.pressed,
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <MaterialIcons name="tune" size={20} color={tint} />
              {activeFilterCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: tint }]}>
                  <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
                </View>
              )}
            </Pressable>
          </View>
          <View style={styles.resultsHeader}>
            <ThemedText type="caption" style={{ color: mutedText }}>
              {filteredOfficials.length} official{filteredOfficials.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={tint} />
              <ThemedText style={{ color: mutedText, fontSize: 16 }}>Loading federal delegation...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <ThemedText style={{ color: mutedText, fontSize: 16 }}>Error: {error}</ThemedText>
              <Pressable
                style={[styles.retryButton, { backgroundColor: tint }]}
                onPress={() => { setLoading(true); fetchDelegation(); }}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              {senators.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <MaterialIcons name="account-balance" size={20} color={mutedText} />
                    <ThemedText type="subtitle">U.S. Senate</ThemedText>
                  </View>
                  {senators.map(renderCard)}
                </View>
              )}

              {houseMembers.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <MaterialIcons name="groups" size={20} color={mutedText} />
                    <ThemedText type="subtitle">U.S. House</ThemedText>
                  </View>
                  {houseMembers.map(renderCard)}
                </View>
              )}

              {senators.length === 0 && houseMembers.length === 0 && (
                <View style={styles.centerContainer}>
                  <ThemedText style={{ color: mutedText, fontSize: 16 }}>
                    {searchQuery || chamberFilter !== 'All' || partyFilter !== 'All'
                      ? 'No officials match your filters'
                      : 'No federal officials available'}
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </ContentContainer>
      </ScrollView>

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <ThemedText type="subtitle">Filter & Sort</ThemedText>
            <Pressable
              onPress={() => setFilterModalVisible(false)}
              style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
            >
              <ThemedText style={{ color: tint, fontWeight: '700', fontSize: 16 }}>Done</ThemedText>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalSection}>
              <ThemedText type="sectionHeader" style={{ color: mutedText, marginBottom: Spacing.md }}>
                Chamber
              </ThemedText>
              <View style={styles.modalOptions}>
                {(['All', 'Senate', 'House'] as ChamberFilter[]).map((chamber) => (
                  <Pressable
                    key={chamber}
                    style={({ pressed }) => [
                      styles.modalOption,
                      { borderColor: border },
                      chamberFilter === chamber && { backgroundColor: tint + '12', borderColor: tint },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setChamberFilter(chamber)}
                  >
                    <ThemedText
                      style={[
                        styles.modalOptionText,
                        chamberFilter === chamber && { color: tint, fontWeight: '700' },
                      ]}
                    >
                      {chamber}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.modalSection, { borderTopWidth: 1, borderTopColor: border, paddingTop: Spacing['2xl'] }]}>
              <ThemedText type="sectionHeader" style={{ color: mutedText, marginBottom: Spacing.md }}>
                Party
              </ThemedText>
              <View style={styles.modalOptions}>
                {(['All', 'Democratic', 'Republican'] as PartyFilter[]).map((party) => (
                  <Pressable
                    key={party}
                    style={({ pressed }) => [
                      styles.modalOption,
                      { borderColor: border },
                      partyFilter === party && { backgroundColor: tint + '12', borderColor: tint },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setPartyFilter(party)}
                  >
                    <ThemedText
                      style={[
                        styles.modalOptionText,
                        partyFilter === party && { color: tint, fontWeight: '700' },
                      ]}
                    >
                      {party === 'All' ? 'All Parties' : party}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.modalSection, { borderTopWidth: 1, borderTopColor: border, paddingTop: Spacing['2xl'] }]}>
              <ThemedText type="sectionHeader" style={{ color: mutedText, marginBottom: Spacing.md }}>
                Sort by
              </ThemedText>
              <View style={styles.modalSortOptions}>
                {SORT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.modalOptionFull,
                      { borderColor: border },
                      sortBy === opt.value && { backgroundColor: tint + '12', borderColor: tint },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setSortBy(opt.value)}
                  >
                    <ThemedText
                      style={[
                        styles.modalOptionText,
                        sortBy === opt.value && { color: tint, fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                    {sortBy === opt.value && <MaterialIcons name="check" size={20} color={tint} />}
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.clearButton,
                { borderColor: border },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                setChamberFilter('All');
                setPartyFilter('All');
              }}
            >
              <ThemedText style={{ color: mutedText, fontWeight: '600' }}>Clear filters</ThemedText>
            </Pressable>
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['4xl'] },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  subtitle: { fontSize: 15, marginTop: Spacing.xs },
  searchRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.sm },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 16 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  resultsHeader: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalClose: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  modalSection: {
    marginBottom: Spacing['2xl'],
  },
  modalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  modalOption: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalSortOptions: {
    gap: Spacing.sm,
  },
  modalOptionFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalOptionText: {
    fontSize: 15,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
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
  districtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  centerContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  retryButton: { marginTop: Spacing.lg, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, borderRadius: Radius.md },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
