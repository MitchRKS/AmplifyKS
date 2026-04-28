import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { CommitteeCard } from '@/components/committee-card';
import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getKansasCommittees, type KansasCommittee } from '@/services/openstates';

type ChamberFilter = 'All' | 'Senate' | 'House' | 'Joint';

const CHAMBER_FILTERS: ChamberFilter[] = ['All', 'Senate', 'House', 'Joint'];

const SECTION_ORDER: { key: string; label: string }[] = [
  { key: 'Senate', label: 'Senate' },
  { key: 'House', label: 'House' },
  { key: 'Joint', label: 'Joint' },
  { key: 'Other', label: 'Other' },
];

export default function CommitteesScreen() {
  const router = useRouter();
  const [committees, setCommittees] = useState<KansasCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>('All');

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const fetchCommittees = async () => {
    try {
      setError(null);
      const result = await getKansasCommittees();
      setCommittees(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setCommittees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommittees();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCommittees();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return committees.filter((c) => {
      const matchesQuery = !query || c.name.toLowerCase().includes(query);
      const matchesChamber =
        chamberFilter === 'All' || c.chamber === chamberFilter;
      return matchesQuery && matchesChamber;
    });
  }, [committees, searchQuery, chamberFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, KansasCommittee[]>();
    for (const committee of filtered) {
      const key = ['Senate', 'House', 'Joint'].includes(committee.chamber)
        ? committee.chamber
        : 'Other';
      const existing = map.get(key);
      if (existing) existing.push(committee);
      else map.set(key, [committee]);
    }
    return SECTION_ORDER.map((section) => ({
      ...section,
      items: map.get(section.key) ?? [],
    })).filter((s) => s.items.length > 0);
  }, [filtered]);

  const openCommittee = (committee: KansasCommittee) => {
    router.push({
      pathname: '/committee-detail',
      params: { id: committee.id },
    });
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
            <ThemedText type="title">Committees</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              Kansas Legislature committees
            </ThemedText>
          </View>

          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInputWrapper,
                { backgroundColor: inputBackground, borderColor: inputBorder },
              ]}
            >
              <MaterialIcons name="search" size={20} color={placeholder} />
              <TextInput
                style={[styles.searchInput, { color: inputText }]}
                placeholder="Search committees..."
                placeholderTextColor={placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chamberFilterRow}
          >
            {CHAMBER_FILTERS.map((chamber) => {
              const active = chamberFilter === chamber;
              return (
                <Pressable
                  key={chamber}
                  onPress={() => setChamberFilter(chamber)}
                  style={({ pressed }) => [
                    styles.chamberChip,
                    {
                      backgroundColor: active ? tint + '12' : surface,
                      borderColor: active ? tint : border,
                    },
                    Shadows.sm,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chamberChipText,
                      { color: active ? tint : mutedText },
                      active && { fontWeight: '700' },
                    ]}
                  >
                    {chamber}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.resultsHeader}>
            <ThemedText type="caption" style={{ color: mutedText }}>
              {filtered.length} committee{filtered.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>

          {loading && committees.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={tint} />
              <ThemedText style={{ color: mutedText, fontSize: 16 }}>
                Loading committees...
              </ThemedText>
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.centerContainer}>
              <ThemedText style={{ color: mutedText, fontSize: 16 }}>
                {error
                  ? `Error: ${error}`
                  : searchQuery || chamberFilter !== 'All'
                    ? 'No committees match your filters'
                    : 'No committees available'}
              </ThemedText>
              {error ? (
                <Pressable
                  style={[styles.retryButton, { backgroundColor: tint }]}
                  onPress={() => {
                    setLoading(true);
                    fetchCommittees();
                  }}
                >
                  <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : (
            grouped.map((section) => (
              <View key={section.key} style={styles.section}>
                <ThemedText
                  type="sectionHeader"
                  style={[styles.sectionHeader, { color: mutedText }]}
                >
                  {section.label}
                </ThemedText>
                <View style={styles.sectionItems}>
                  {section.items.map((committee) => (
                    <CommitteeCard
                      key={committee.id}
                      committee={committee}
                      onPress={() => openCommittee(committee)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['4xl'] },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  subtitle: { fontSize: 15, marginTop: Spacing.xs },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
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
  chamberFilterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  chamberChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chamberChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 12,
  },
  sectionItems: {
    gap: Spacing.md,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
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
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
