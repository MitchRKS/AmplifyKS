import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { BillCard } from '@/components/bill-card';
import { ContentContainer } from '@/components/content-container';
import { MatchScoreBadge } from '@/components/legislator-match-detail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLegislatorMatch } from '@/hooks/use-legislator-match';
import { useOpenTestimonyBillIds } from '@/hooks/use-open-testimony-bills';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getLegislatorImageAssetLocal } from '@/services/kansas-legislators';
import * as LegiscanAPI from '@/services/legiscan';
import type { Official } from '@/services/openstates';

// Ported from the iOS app's DashboardView.swift. Section order:
// My Alerts → Open for Testimony (hidden when empty) → My Electeds.
// Deliberate deviations from iOS, all pre-decided:
// - My Electeds stays a vertical list (iOS uses a swipe carousel — awkward
//   with a mouse); Open for Testimony keeps the carousel.
// - "My Bills" section omitted: the app has no bill watchlist store yet, so
//   iOS's empty state ("tap the bookmark…") would reference a nonexistent
//   affordance. Add it when a watchlist ships.
// - Admin dashboard variant not ported (its quick actions are no-ops on iOS).
// - Kept Expo conventions: Democrat blue, no "District" word, initials
//   photo placeholder, greeting falls back to "Dashboard" (iOS: "Hi!!").

interface OpenBill {
  id: number;
  billNumber: string;
  title: string;
  description: string;
  lastAction: string;
  lastActionDate: string;
}

/** iOS displaySortOrder: State Rep → State Senator → U.S. Rep → U.S. Senator. */
const chamberSortOrder = (chamber: string): number => {
  switch (chamber) {
    case 'House':
      return 0;
    case 'Senate':
      return 1;
    case 'U.S. House':
      return 2;
    case 'U.S. Senate':
      return 3;
    default:
      return chamber.startsWith('U.S.') ? 5 : 4;
  }
};

const normalizedTitle = (chamber: string): string => {
  switch (chamber) {
    case 'House':
      return 'State Representative';
    case 'Senate':
      return 'State Senator';
    case 'U.S. House':
      return 'U.S. Representative';
    case 'U.S. Senate':
      return 'U.S. Senator';
    default:
      return chamber;
  }
};

/** iOS row 3: "{district}  |  {Party}"; U.S. Senators show the state instead. */
const detailLine = (official: Official): string => {
  const left = official.chamber === 'U.S. Senate' ? 'Kansas' : official.district;
  return [left, official.party].filter(Boolean).join('  |  ');
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedOfficials } = useSavedOfficials();
  const { getMatch } = useLegislatorMatch();
  const { billIds: openBillIds, isLoading: idsLoading } = useOpenTestimonyBillIds();
  const { width } = useWindowDimensions();

  const [openBills, setOpenBills] = useState<OpenBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  // iOS card chrome: 1.5pt border in the label color at 25% opacity.
  const cardBorder = useThemeColor({ light: 'rgba(0,0,0,0.25)', dark: 'rgba(255,255,255,0.25)' }, 'text');
  const photoRing = useThemeColor({ light: 'rgba(60,60,67,0.29)', dark: 'rgba(84,84,88,0.6)' }, 'background');
  const democrat = useThemeColor({ light: '#2563eb', dark: '#7aa7f0' }, 'tint');
  const republican = useThemeColor({ light: '#fa3332', dark: '#FF6B6A' }, 'tint');

  const getPartyColor = (party: string) => {
    const lower = (party ?? '').toLowerCase();
    if (lower.includes('democrat')) return democrat;
    if (lower.includes('republican')) return republican;
    return mutedText;
  };

  const fetchOpenBills = async () => {
    try {
      setBillsLoading(true);
      const billData = await LegiscanAPI.getKansasBills();
      const transformed: OpenBill[] = billData
        .map((bill) => {
          if (!bill.bill_id || !bill.number) return null;
          return {
            id: bill.bill_id,
            billNumber: bill.number,
            title: bill.title || 'Untitled',
            description: bill.description || '',
            lastAction: bill.last_action || '',
            lastActionDate: bill.last_action_date || bill.status_date || '',
          };
        })
        .filter((b): b is OpenBill => b !== null);
      setOpenBills(transformed);
    } catch {
      setOpenBills([]);
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenBills();
  }, []);

  const visibleOpenBills = useMemo(() => {
    const idSet = new Set(openBillIds);
    return openBills.filter((bill) => idSet.has(String(bill.id)));
  }, [openBills, openBillIds]);

  const sortedOfficials = useMemo(
    () =>
      [...savedOfficials].sort(
        (a, b) => chamberSortOrder(a.chamber) - chamberSortOrder(b.chamber),
      ),
    [savedOfficials],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOpenBills();
    setRefreshing(false);
  };

  const testimonyLoading = idsLoading || billsLoading;
  const showTestimonySection = testimonyLoading || visibleOpenBills.length > 0;
  // iOS: card width = max(240, screenWidth - 72) so the next card peeks.
  // Capped so desktop web doesn't produce absurdly wide carousel cards.
  const carouselCardWidth = Math.min(Math.max(240, width - 72), 340);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ContentContainer>
          <View style={styles.header}>
            <ThemedText type="title">
              {user?.firstName ? `Hi ${user.firstName}!` : 'Dashboard'}
            </ThemedText>
          </View>

          {/* ── My Alerts ── */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>My Alerts</ThemedText>
            <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: cardBorder }]}>
              <MaterialIcons name="notifications" size={32} color={mutedText} />
              <ThemedText style={[styles.emptyPrimary, { color: mutedText }]}>
                No alerts yet
              </ThemedText>
              <ThemedText type="caption" style={[styles.emptySecondary, { color: mutedText }]}>
                Messages and notifications from administrators will appear here
              </ThemedText>
            </View>
          </View>

          {/* ── Open for Testimony (hidden entirely when loaded-and-empty) ── */}
          {showTestimonySection && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Open for Testimony
                </ThemedText>
                {visibleOpenBills.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.navigate('/(tabs)/actions')}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <ThemedText style={[styles.seeAll, { color: tint }]}>See All</ThemedText>
                  </Pressable>
                )}
              </View>
              {testimonyLoading && visibleOpenBills.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: cardBorder }]}>
                  <ThemedText type="caption" style={{ color: mutedText }}>Loading...</ThemedText>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContent}
                >
                  {visibleOpenBills.map((bill) => (
                    <BillCard
                      key={bill.id}
                      billNumber={bill.billNumber}
                      description={bill.description || bill.title}
                      lastAction={bill.lastAction}
                      lastActionDate={bill.lastActionDate}
                      onPress={() =>
                        router.push({ pathname: '/bill-detail', params: { id: bill.id } })
                      }
                      style={{ width: carouselCardWidth }}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── My Electeds ── */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>My Electeds</ThemedText>

            {sortedOfficials.length > 0 ? (
              sortedOfficials.map((official) => {
                const imageAsset = getLegislatorImageAssetLocal(official.id);
                const match = getMatch(official);
                const partyColor = getPartyColor(official.party);
                return (
                  <Pressable
                    key={official.id}
                    style={({ pressed }) => [
                      styles.electedCard,
                      { backgroundColor: surface, borderColor: cardBorder },
                      Shadows.sm,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      router.push({ pathname: '/legislator-detail', params: { id: official.id } })
                    }
                  >
                    {imageAsset ? (
                      <Image
                        source={imageAsset}
                        style={[styles.photo, { borderColor: photoRing }]}
                        contentFit="cover"
                      />
                    ) : official.image ? (
                      <Image
                        source={{ uri: official.image }}
                        style={[styles.photo, { borderColor: photoRing }]}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.photo,
                          styles.photoPlaceholder,
                          { backgroundColor: inputBackground, borderColor: photoRing },
                        ]}
                      >
                        <ThemedText style={[styles.photoInitials, { color: mutedText }]}>
                          {(official.givenName ?? '').charAt(0)}
                          {(official.familyName ?? '').charAt(0)}
                        </ThemedText>
                      </View>
                    )}

                    <View style={styles.electedContent}>
                      <ThemedText type="defaultSemiBold" style={styles.electedName} numberOfLines={1}>
                        {official.name}
                      </ThemedText>
                      <ThemedText style={[styles.electedTitle, { color: mutedText }]} numberOfLines={1}>
                        {normalizedTitle(official.chamber)}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: partyColor }} numberOfLines={1}>
                        {detailLine(official)}
                      </ThemedText>
                    </View>

                    {match ? <MatchScoreBadge percent={match.compositePercent} /> : null}
                  </Pressable>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: cardBorder }, Shadows.sm]}>
                <MaterialIcons name="groups" size={32} color={mutedText} />
                <ThemedText style={[styles.emptyPrimary, { color: mutedText }]}>
                  No electeds yet
                </ThemedText>
                <ThemedText type="caption" style={[styles.emptySecondary, { color: mutedText }]}>
                  Use the address lookup to set your electeds.
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
                  <ThemedText style={styles.emptyButtonText}>Find My Electeds</ThemedText>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  // iOS: 24pt gap between sections, 12pt header→content.
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  carouselContent: {
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  emptyCard: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyPrimary: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySecondary: {
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  electedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm + 2, // iOS: 10pt card gap
  },
  photo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 17,
    fontWeight: '600',
  },
  electedContent: {
    flex: 1,
    gap: 3,
  },
  electedName: {
    fontSize: 17,
  },
  electedTitle: {
    fontSize: 15,
  },
});
