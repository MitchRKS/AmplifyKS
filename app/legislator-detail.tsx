import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getCommitteeAssignments,
  getOfficialDetail,
  type CommitteeAssignment,
  type OfficialDetail,
} from '@/services/openstates';
import { searchSponsoredBills, type SponsoredBillSummary } from '@/services/legiscan';

type ProfileTab = 'contact' | 'committees' | 'bills' | 'votes';

const TABS: { key: ProfileTab; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'contact', label: 'Contact', icon: 'contact-phone' },
  { key: 'committees', label: 'Committees', icon: 'groups' },
  { key: 'bills', label: 'Bills', icon: 'description' },
  { key: 'votes', label: 'Votes', icon: 'how-to-vote' },
];

export default function LegislatorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [legislator, setLegislator] = useState<OfficialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('contact');

  const [committees, setCommittees] = useState<CommitteeAssignment[]>([]);
  const [committeesLoading, setCommitteesLoading] = useState(false);
  const committeesLoaded = useRef(false);

  const [sponsoredBills, setSponsoredBills] = useState<SponsoredBillSummary[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const billsLoaded = useRef(false);

  const { saveOfficial, removeOfficial, isSaved } = useSavedOfficials();

  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const democrat = useThemeColor({ light: '#1c355e', dark: '#6B8DC2' }, 'tint');
  const republican = useThemeColor({ light: '#fa3332', dark: '#FF6B6A' }, 'tint');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!params.id) throw new Error('Missing legislator ID');
        const detail = await getOfficialDetail(params.id);
        setLegislator(detail);
      } catch (err) {
        console.error('Error loading legislator:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  const loadCommittees = useCallback(async () => {
    if (committeesLoaded.current || !legislator) return;
    committeesLoaded.current = true;
    setCommitteesLoading(true);
    try {
      const legUrl = legislator.legislatureLinks.find((l) =>
        l.url.includes('kslegislature.gov'),
      )?.url;
      if (legUrl) {
        const result = await getCommitteeAssignments(legUrl);
        setCommittees(result);
      }
    } catch {
      /* handled gracefully */
    } finally {
      setCommitteesLoading(false);
    }
  }, [legislator]);

  const loadBills = useCallback(async () => {
    if (billsLoaded.current || !legislator) return;
    billsLoaded.current = true;
    setBillsLoading(true);
    try {
      const result = await searchSponsoredBills(legislator.familyName);
      setSponsoredBills(result);
    } catch {
      /* handled gracefully */
    } finally {
      setBillsLoading(false);
    }
  }, [legislator]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    if (tab === 'committees') loadCommittees();
    if (tab === 'bills') loadBills();
  };

  const getPartyColor = (party: string) => {
    const lower = party.toLowerCase();
    if (lower.includes('democrat')) return democrat;
    if (lower.includes('republican')) return republican;
    return mutedText;
  };

  const saved = legislator ? isSaved(legislator.id) : false;

  const toggleSave = () => {
    if (!legislator) return;
    if (saved) {
      removeOfficial(legislator.id);
    } else {
      saveOfficial(legislator);
    }
  };

  if (loading || !legislator) {
    return (
      <ThemedView style={styles.container}>
        <ContentContainer>
          <View style={styles.navHeader}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={tint} />
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.navTitle}>
              Legislator
            </ThemedText>
            <View style={styles.navSpacer} />
          </View>
        </ContentContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={{ color: mutedText, fontSize: 16 }}>
            Loading profile...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const partyColor = getPartyColor(legislator.party);
  const capitolOffice = legislator.offices.find((o) => o.classification === 'capitol');

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.navHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tint} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.navTitle}>
            Legislator
          </ThemedText>
          <Pressable onPress={toggleSave} style={styles.backButton}>
            <MaterialIcons
              name={saved ? 'bookmark' : 'bookmark-border'}
              size={24}
              color={saved ? tint : mutedText}
            />
          </Pressable>
        </View>
      </ContentContainer>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ContentContainer style={styles.contentPadding}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {legislator.image ? (
              <Image source={{ uri: legislator.image }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: inputBackground }]}>
                <ThemedText style={[styles.photoInitials, { color: mutedText }]}>
                  {legislator.givenName.charAt(0)}
                  {legislator.familyName.charAt(0)}
                </ThemedText>
              </View>
            )}

            <ThemedText type="title" style={styles.name}>
              {legislator.name}
            </ThemedText>

            {legislator.title ? (
              <ThemedText style={[styles.titleLabel, { color: mutedText }]}>
                {legislator.title}
              </ThemedText>
            ) : null}

            <View style={styles.badgeRow}>
              {legislator.party ? (
                <View style={[styles.badge, { backgroundColor: partyColor + '14' }]}>
                  <ThemedText style={[styles.badgeText, { color: partyColor }]}>
                    {legislator.party}
                  </ThemedText>
                </View>
              ) : null}
              {legislator.chamber ? (
                <View style={[styles.badge, { backgroundColor: border }]}>
                  <ThemedText style={[styles.badgeText, { color: mutedText }]}>
                    {legislator.chamber}
                  </ThemedText>
                </View>
              ) : null}
              {legislator.district ? (
                <View style={[styles.badge, { backgroundColor: border }]}>
                  <ThemedText style={[styles.badgeText, { color: mutedText }]}>
                    District {legislator.district}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          {/* Tab Bar */}
          <View style={[styles.tabBar, { borderColor: border }]}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.tab,
                    active && { borderBottomColor: tint, borderBottomWidth: 2 },
                  ]}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <MaterialIcons
                    name={tab.icon}
                    size={18}
                    color={active ? tint : mutedText}
                  />
                  <ThemedText
                    style={[
                      styles.tabLabel,
                      { color: active ? tint : mutedText },
                      active && { fontWeight: '700' },
                    ]}
                  >
                    {tab.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === 'contact' && (
            <ContactTab
              legislator={legislator}
              capitolOffice={capitolOffice}
              tint={tint}
              mutedText={mutedText}
              surface={surface}
              border={border}
              inputBackground={inputBackground}
            />
          )}
          {activeTab === 'committees' && (
            <CommitteesTab
              committees={committees}
              loading={committeesLoading}
              tint={tint}
              mutedText={mutedText}
              surface={surface}
              border={border}
              inputBackground={inputBackground}
            />
          )}
          {activeTab === 'bills' && (
            <BillsTab
              bills={sponsoredBills}
              loading={billsLoading}
              tint={tint}
              mutedText={mutedText}
              surface={surface}
              border={border}
              router={router}
            />
          )}
          {activeTab === 'votes' && (
            <VotesTab
              legislator={legislator}
              tint={tint}
              mutedText={mutedText}
              surface={surface}
              border={border}
              inputBackground={inputBackground}
            />
          )}
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

/* ── Contact Tab ── */

function ContactTab({
  legislator,
  capitolOffice,
  tint,
  mutedText,
  surface,
  border,
}: {
  legislator: OfficialDetail;
  capitolOffice?: OfficialDetail['offices'][number];
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
  inputBackground: string;
}) {
  return (
    <>
      {(legislator.email || capitolOffice?.voice) && (
        <View style={styles.quickActions}>
          {legislator.email ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: tint },
                pressed && styles.pressed,
              ]}
              onPress={() => Linking.openURL(`mailto:${legislator.email}`)}
            >
              <MaterialIcons name="email" size={20} color="#fff" />
              <ThemedText style={styles.actionButtonText}>Email</ThemedText>
            </Pressable>
          ) : null}
          {capitolOffice?.voice ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: tint },
                pressed && styles.pressed,
              ]}
              onPress={() => Linking.openURL(`tel:${capitolOffice.voice}`)}
            >
              <MaterialIcons name="phone" size={20} color="#fff" />
              <ThemedText style={styles.actionButtonText}>Call</ThemedText>
            </Pressable>
          ) : null}
        </View>
      )}

      {legislator.offices.length > 0 && (
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Offices
          </ThemedText>
          {legislator.offices.map((office, i) => (
            <View
              key={i}
              style={[
                styles.officeBlock,
                i > 0 && { borderTopWidth: 1, borderTopColor: border, paddingTop: Spacing.md },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={styles.officeLabel}>
                {office.name}
              </ThemedText>
              {office.address ? (
                <Pressable
                  onPress={() => {
                    const q = encodeURIComponent(office.address!);
                    Linking.openURL(`https://maps.google.com/?q=${q}`);
                  }}
                >
                  <View style={styles.infoRow}>
                    <MaterialIcons name="location-on" size={16} color={mutedText} />
                    <ThemedText style={[styles.infoText, { color: tint }]}>
                      {office.address}
                    </ThemedText>
                  </View>
                </Pressable>
              ) : null}
              {office.voice ? (
                <Pressable onPress={() => Linking.openURL(`tel:${office.voice}`)}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="phone" size={16} color={mutedText} />
                    <ThemedText style={[styles.infoText, { color: tint }]}>
                      {office.voice}
                    </ThemedText>
                  </View>
                </Pressable>
              ) : null}
              {office.fax ? (
                <View style={styles.infoRow}>
                  <MaterialIcons name="print" size={16} color={mutedText} />
                  <ThemedText style={[styles.infoText, { color: mutedText }]}>
                    {office.fax}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {legislator.email && (
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Email
          </ThemedText>
          <Pressable onPress={() => Linking.openURL(`mailto:${legislator.email}`)}>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={16} color={mutedText} />
              <ThemedText style={[styles.infoText, { color: tint }]}>
                {legislator.email}
              </ThemedText>
            </View>
          </Pressable>
        </View>
      )}

      {(legislator.legislatureLinks.length > 0 ||
        legislator.sources.length > 0 ||
        legislator.openstatesUrl) && (
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Links
          </ThemedText>
          {legislator.legislatureLinks.map((link, i) => (
            <Pressable
              key={`link-${i}`}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              onPress={() => WebBrowser.openBrowserAsync(link.url)}
            >
              <ThemedText style={[styles.linkText, { color: tint }]} numberOfLines={1}>
                {link.note || 'Legislature Website'}
              </ThemedText>
              <IconSymbol name="arrow.up.right" size={16} color={tint} />
            </Pressable>
          ))}
          {legislator.openstatesUrl ? (
            <>
              {legislator.legislatureLinks.length > 0 && (
                <View style={[styles.linkDivider, { backgroundColor: border }]} />
              )}
              <Pressable
                style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
                onPress={() => WebBrowser.openBrowserAsync(legislator.openstatesUrl)}
              >
                <ThemedText style={[styles.linkText, { color: tint }]}>
                  OpenStates Profile
                </ThemedText>
                <IconSymbol name="arrow.up.right" size={16} color={tint} />
              </Pressable>
            </>
          ) : null}
          {legislator.sources.map((source, i) => {
            const label = labelForSource(source.url);
            return (
              <View key={`source-${i}`}>
                <View style={[styles.linkDivider, { backgroundColor: border }]} />
                <Pressable
                  style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
                  onPress={() => WebBrowser.openBrowserAsync(source.url)}
                >
                  <ThemedText style={[styles.linkText, { color: tint }]} numberOfLines={1}>
                    {source.note || label}
                  </ThemedText>
                  <IconSymbol name="arrow.up.right" size={16} color={tint} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

/* ── Committees Tab ── */

function CommitteesTab({
  committees,
  loading,
  tint,
  mutedText,
  surface,
  border,
  inputBackground,
}: {
  committees: CommitteeAssignment[];
  loading: boolean;
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
  inputBackground: string;
}) {
  if (loading) {
    return (
      <View style={styles.tabLoadingContainer}>
        <ActivityIndicator size="large" color={tint} />
        <ThemedText style={{ color: mutedText }}>Loading committees...</ThemedText>
      </View>
    );
  }

  if (committees.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
        <View style={[styles.emptyIcon, { backgroundColor: inputBackground }]}>
          <MaterialIcons name="groups" size={32} color={mutedText} />
        </View>
        <ThemedText type="defaultSemiBold" style={{ color: mutedText }}>
          No committee assignments found
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      {committees.map((committee, i) => (
        <Pressable
          key={i}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: surface, borderColor: border },
            Shadows.sm,
            pressed && styles.pressed,
          ]}
          onPress={() => WebBrowser.openBrowserAsync(committee.url)}
        >
          <View style={styles.committeeHeader}>
            <ThemedText type="defaultSemiBold" style={styles.committeeName}>
              {committee.name}
            </ThemedText>
            <IconSymbol name="arrow.up.right" size={14} color={tint} />
          </View>
          {(committee.day || committee.time || committee.room) && (
            <View style={styles.committeeDetails}>
              {committee.day ? (
                <View style={styles.committeeDetail}>
                  <MaterialIcons name="event" size={14} color={mutedText} />
                  <ThemedText type="caption" style={{ color: mutedText }}>
                    {committee.day}
                  </ThemedText>
                </View>
              ) : null}
              {committee.time ? (
                <View style={styles.committeeDetail}>
                  <MaterialIcons name="schedule" size={14} color={mutedText} />
                  <ThemedText type="caption" style={{ color: mutedText }}>
                    {committee.time}
                  </ThemedText>
                </View>
              ) : null}
              {committee.room ? (
                <View style={styles.committeeDetail}>
                  <MaterialIcons name="room" size={14} color={mutedText} />
                  <ThemedText type="caption" style={{ color: mutedText }}>
                    Room {committee.room}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          )}
        </Pressable>
      ))}
    </>
  );
}

/* ── Bills Tab ── */

function BillsTab({
  bills,
  loading,
  tint,
  mutedText,
  surface,
  border,
  router,
}: {
  bills: SponsoredBillSummary[];
  loading: boolean;
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
  router: ReturnType<typeof useRouter>;
}) {
  if (loading) {
    return (
      <View style={styles.tabLoadingContainer}>
        <ActivityIndicator size="large" color={tint} />
        <ThemedText style={{ color: mutedText }}>Loading sponsored bills...</ThemedText>
      </View>
    );
  }

  if (bills.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
        <View style={[styles.emptyIcon, { backgroundColor: border }]}>
          <MaterialIcons name="description" size={32} color={mutedText} />
        </View>
        <ThemedText type="defaultSemiBold" style={{ color: mutedText }}>
          No sponsored bills found
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      <ThemedText type="caption" style={{ color: mutedText }}>
        {bills.length} sponsored bill{bills.length !== 1 ? 's' : ''}
      </ThemedText>
      {bills.map((bill) => (
        <Pressable
          key={bill.billId}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: surface, borderColor: border },
            Shadows.sm,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push({ pathname: '/bill-detail', params: { id: bill.billId } })
          }
        >
          <ThemedText type="defaultSemiBold" style={[styles.billNumber, { color: tint }]}>
            {bill.billNumber}
          </ThemedText>
          <ThemedText style={styles.billTitle} numberOfLines={2}>
            {bill.title}
          </ThemedText>
          {bill.lastAction ? (
            <View style={[styles.billActionRow, { borderTopColor: border }]}>
              <MaterialIcons name="history" size={14} color={mutedText} />
              <ThemedText type="caption" style={{ color: mutedText, flex: 1 }} numberOfLines={2}>
                {bill.lastAction}
                {bill.lastActionDate
                  ? ` · ${new Date(bill.lastActionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : ''}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      ))}
    </>
  );
}

/* ── Votes Tab ── */

function VotesTab({
  legislator,
  tint,
  mutedText,
  surface,
  border,
  inputBackground,
}: {
  legislator: OfficialDetail;
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
  inputBackground: string;
}) {
  const voteSmartUrl = legislator.sources.find((s) =>
    s.url.includes('votesmart'),
  )?.url;

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
      <View style={styles.votesIntro}>
        <View style={[styles.emptyIcon, { backgroundColor: inputBackground }]}>
          <MaterialIcons name="how-to-vote" size={32} color={mutedText} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.votesTitle}>
          Voting Record
        </ThemedText>
        <ThemedText style={[styles.votesBody, { color: mutedText }]}>
          View {legislator.givenName || legislator.name}'s full voting record on these external platforms.
        </ThemedText>
      </View>

      {legislator.openstatesUrl ? (
        <Pressable
          style={({ pressed }) => [styles.voteLink, { borderColor: border }, pressed && styles.pressed]}
          onPress={() => WebBrowser.openBrowserAsync(legislator.openstatesUrl)}
        >
          <View style={styles.voteLinkContent}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
              OpenStates
            </ThemedText>
            <ThemedText type="caption" style={{ color: mutedText }}>
              Bills, votes, and legislative activity
            </ThemedText>
          </View>
          <IconSymbol name="arrow.up.right" size={16} color={tint} />
        </Pressable>
      ) : null}

      {voteSmartUrl ? (
        <Pressable
          style={({ pressed }) => [styles.voteLink, { borderColor: border }, pressed && styles.pressed]}
          onPress={() => WebBrowser.openBrowserAsync(voteSmartUrl)}
        >
          <View style={styles.voteLinkContent}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
              VoteSmart
            </ThemedText>
            <ThemedText type="caption" style={{ color: mutedText }}>
              Voting record, positions, and ratings
            </ThemedText>
          </View>
          <IconSymbol name="arrow.up.right" size={16} color={tint} />
        </Pressable>
      ) : null}

      {legislator.legislatureLinks.length > 0 ? (
        <Pressable
          style={({ pressed }) => [styles.voteLink, { borderColor: border }, pressed && styles.pressed]}
          onPress={() =>
            WebBrowser.openBrowserAsync(legislator.legislatureLinks[0].url)
          }
        >
          <View style={styles.voteLinkContent}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
              Kansas Legislature
            </ThemedText>
            <ThemedText type="caption" style={{ color: mutedText }}>
              Official profile and activity
            </ThemedText>
          </View>
          <IconSymbol name="arrow.up.right" size={16} color={tint} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── Helpers ── */

const labelForSource = (url: string): string => {
  if (url.includes('ballotpedia')) return 'Ballotpedia';
  if (url.includes('linkedin')) return 'LinkedIn';
  if (url.includes('kslegislature')) return 'Kansas Legislature';
  if (url.includes('wikipedia')) return 'Wikipedia';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Website';
  }
};

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  navTitle: {
    fontSize: 17,
  },
  navSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
    gap: Spacing.lg,
  },
  contentPadding: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 36,
    fontWeight: '600',
  },
  name: {
    textAlign: 'center',
  },
  titleLabel: {
    fontSize: 16,
    marginTop: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  tabLoadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },

  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: Spacing.md,
  },
  officeBlock: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  officeLabel: {
    fontSize: 15,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  linkDivider: {
    height: 1,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  committeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  committeeName: {
    fontSize: 16,
    flex: 1,
  },
  committeeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  committeeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  billNumber: {
    fontSize: 17,
    marginBottom: Spacing.xs,
  },
  billTitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  billActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },

  votesIntro: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  votesTitle: {
    fontSize: 17,
  },
  votesBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  voteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  voteLinkContent: {
    flex: 1,
    gap: 2,
  },
});
