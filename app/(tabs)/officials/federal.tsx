import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getKansasFederalDelegation, type Official } from '@/services/openstates';

export default function FederalDelegationScreen() {
  const router = useRouter();
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { saveOfficial, removeOfficial, isSaved } = useSavedOfficials();

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
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

  const senators = officials
    .filter((o) => o.chamber === 'U.S. Senate')
    .sort((a, b) => a.familyName.localeCompare(b.familyName));

  const houseMembers = officials
    .filter((o) => o.chamber === 'U.S. House')
    .sort((a, b) => {
      const da = parseInt(a.district, 10) || 0;
      const db = parseInt(b.district, 10) || 0;
      return da - db || a.familyName.localeCompare(b.familyName);
    });

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
            <ThemedText type="caption" style={{ color: mutedText }}>
              {item.district ? `District ${item.district}` : ''}
            </ThemedText>
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
                    No federal officials available
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['4xl'] },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  subtitle: { fontSize: 15, marginTop: Spacing.xs },
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
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  centerContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  retryButton: { marginTop: Spacing.lg, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, borderRadius: Radius.md },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
