import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { TestimonyForm } from '@/components/testimony-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useBillTestimonyStatus } from '@/hooks/use-bill-testimony-status';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useUserProfile } from '@/hooks/use-user-profile';
import * as LegiscanAPI from '@/services/legiscan';

interface BillDetail {
  billNumber: string;
  title: string;
  description: string;
  sponsors: Array<{
    name: string;
    type: string;
  }>;
  status: string;
  chamber: string;
  sessionName: string;
  committee?: string;
  url: string;
  stateLink: string;
  history: Array<{
    date: string;
    action: string;
    chamber: string;
  }>;
  texts: Array<{
    date: string;
    type: string;
    url: string;
  }>;
}

export default function BillDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [testimonyExpanded, setTestimonyExpanded] = useState(false);
  const { profile } = useUserProfile();
  const { isOpen: testimonyOpen, isLoading: testimonyStatusLoading, toggleOpen } = useBillTestimonyStatus(params.id as string);

  useEffect(() => {
    const fetchBillDetail = async () => {
      try {
        setLoading(true);
        const billId = Number(params.id);
        
        if (!billId) {
          throw new Error('Invalid bill ID');
        }

        const billData = await LegiscanAPI.getBillDetail(billId);
        
        const transformedBill: BillDetail = {
          billNumber: billData.bill_number,
          title: billData.title,
          description: billData.description,
          sponsors: billData.sponsors.map(sponsor => ({
            name: sponsor.name,
            type: sponsor.sponsor_type_id === 1 ? 'Primary Sponsor' : 'Co-Sponsor',
          })),
          status: LegiscanAPI.getStatusLabel(billData.status),
          chamber: LegiscanAPI.getChamber(billData.bill_number),
          sessionName: billData.session.session_name,
          committee: billData.committee?.chamber && billData.committee?.name 
            ? LegiscanAPI.formatCommitteeName(billData.committee.chamber, billData.committee.name)
            : billData.committee?.name,
          url: billData.url,
          stateLink: billData.state_link,
          history: billData.history.map(h => ({
            date: h.date,
            action: h.action,
            chamber: h.chamber,
          })).reverse(),
          texts: billData.texts.map(t => ({
            date: t.date,
            type: t.type,
            url: t.url,
          })),
        };

        setBill(transformedBill);
      } catch (error) {
        console.error('Error fetching bill detail:', error);
        Alert.alert(
          'Error Loading Bill',
          'Unable to load bill details. Please try again later.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBillDetail();
  }, [params.id]);

  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Passed':
      case 'Chaptered':
        return '#adc323';
      case 'Introduced':
      case 'Engrossed':
        return '#a9cd34';
      case 'Enrolled':
        return '#0097b2';
      case 'Vetoed':
      case 'Failed':
        return '#fa3332';
      default:
        return mutedText;
    }
  };

  if (loading || !bill) {
    return (
      <ThemedView style={styles.container}>
        <ContentContainer>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={tint} />
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              Bill Details
            </ThemedText>
            <View style={styles.headerSpacer} />
          </View>
        </ContentContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={{ color: mutedText, fontSize: 16 }}>
            Loading bill details...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const primarySponsor = bill.sponsors.find(s => s.type === 'Primary Sponsor');
  const coSponsors = bill.sponsors.filter(s => s.type === 'Co-Sponsor');

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tint} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Bill Details
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </ContentContainer>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ContentContainer style={styles.contentPadding}>
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <View style={styles.billHeader}>
              <ThemedText type="title" style={{ color: tint }}>
                {bill.billNumber}
              </ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) + '14' }]}>
                <ThemedText style={[styles.statusText, { color: getStatusColor(bill.status) }]}>
                  {bill.status}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="subtitle" style={styles.billTitle}>
              {bill.title}
            </ThemedText>

            <ThemedText style={[styles.description, { color: mutedText }]}>
              {bill.description}
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Information
            </ThemedText>

            <View style={styles.infoRow}>
              <ThemedText type="caption" style={[styles.infoLabel, { color: mutedText }]}>Chamber</ThemedText>
              <ThemedText style={styles.infoValue}>{bill.chamber}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText type="caption" style={[styles.infoLabel, { color: mutedText }]}>Session</ThemedText>
              <ThemedText style={styles.infoValue}>{bill.sessionName}</ThemedText>
            </View>

            {primarySponsor && (
              <View style={styles.infoRow}>
                <ThemedText type="caption" style={[styles.infoLabel, { color: mutedText }]}>Sponsor</ThemedText>
                <ThemedText style={styles.infoValue}>{primarySponsor.name}</ThemedText>
              </View>
            )}

            {coSponsors.length > 0 && (
              <View style={styles.infoRow}>
                <ThemedText type="caption" style={[styles.infoLabel, { color: mutedText }]}>Co-Sponsors</ThemedText>
                <ThemedText style={[styles.infoValue, styles.infoValueMultiline]}>
                  {coSponsors.map(s => s.name).join(', ')}
                </ThemedText>
              </View>
            )}

            {bill.committee && (
              <View style={styles.infoRow}>
                <ThemedText type="caption" style={[styles.infoLabel, { color: mutedText }]}>Committee</ThemedText>
                <ThemedText style={styles.infoValue}>{bill.committee}</ThemedText>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Legislative History
            </ThemedText>
            {bill.history.length > 0 ? (
              bill.history.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyDot}>
                    <View style={[styles.dot, { backgroundColor: tint }]} />
                    {index < bill.history.length - 1 && (
                      <View style={[styles.line, { backgroundColor: border }]} />
                    )}
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyHeader}>
                      <ThemedText type="caption" style={{ color: mutedText }}>
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </ThemedText>
                      {item.chamber && (
                        <ThemedText type="caption" style={{ color: mutedText, fontWeight: '600' }}>
                          {item.chamber}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={styles.historyAction}>{item.action}</ThemedText>
                  </View>
                </View>
              ))
            ) : (
              <ThemedText style={{ color: mutedText }}>No history available</ThemedText>
            )}
          </View>

          {bill.texts.length > 0 && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Bill Documents
              </ThemedText>
              {bill.texts.map((text, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.documentRow,
                    { borderBottomColor: index < bill.texts.length - 1 ? border : 'transparent' },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => WebBrowser.openBrowserAsync(text.url)}>
                  <View style={styles.documentInfo}>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>{text.type}</ThemedText>
                    <ThemedText type="caption" style={{ color: mutedText }}>
                      {new Date(text.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </ThemedText>
                  </View>
                  <IconSymbol name="arrow.up.right" size={16} color={tint} />
                </Pressable>
              ))}
            </View>
          )}

          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Official Links
            </ThemedText>
            <Pressable
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              onPress={() => WebBrowser.openBrowserAsync(bill.stateLink)}>
              <ThemedText style={[styles.linkText, { color: tint }]}>
                View on Kansas Legislature Website
              </ThemedText>
              <IconSymbol name="arrow.up.right" size={16} color={tint} />
            </Pressable>
            <View style={[styles.linkDivider, { backgroundColor: border }]} />
            <Pressable
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              onPress={() => WebBrowser.openBrowserAsync(bill.url)}>
              <ThemedText style={[styles.linkText, { color: tint }]}>
                View on LegiScan
              </ThemedText>
              <IconSymbol name="arrow.up.right" size={16} color={tint} />
            </Pressable>
          </View>

          {profile.role === 'admin' && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
              <View style={styles.adminRow}>
                <View style={styles.adminLabelGroup}>
                  <MaterialIcons name="admin-panel-settings" size={20} color={tint} />
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
                    Testimony {testimonyOpen ? 'Open' : 'Closed'}
                  </ThemedText>
                </View>
                <Switch
                  value={testimonyOpen}
                  onValueChange={toggleOpen}
                  trackColor={{ false: border, true: tint + '66' }}
                  thumbColor={testimonyOpen ? tint : '#ccc'}
                  disabled={testimonyStatusLoading}
                />
              </View>
              <ThemedText type="caption" style={{ color: mutedText, marginTop: Spacing.xs }}>
                {testimonyOpen
                  ? 'Users can draft and submit testimony for this bill.'
                  : 'Toggle on to allow users to submit testimony.'}
              </ThemedText>
            </View>
          )}

          {!testimonyStatusLoading && testimonyOpen && (
            <>
              {testimonyExpanded ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.testimonyCollapseButton,
                      { borderColor: border },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setTestimonyExpanded(false)}
                  >
                    <MaterialIcons name="expand-less" size={20} color={mutedText} />
                    <ThemedText style={[styles.testimonyCollapseText, { color: mutedText }]}>
                      Collapse Testimony Form
                    </ThemedText>
                  </Pressable>

                  <TestimonyForm
                    billNumber={bill.billNumber}
                    billTitle={bill.title}
                    committee={bill.committee || ''}
                  />
                </>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.testimonyButton,
                    { backgroundColor: tint },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setTestimonyExpanded(true)}
                >
                  <MaterialIcons name="edit-note" size={22} color="#fff" />
                  <ThemedText style={styles.testimonyButtonText}>
                    Draft Testimony for {bill.billNumber}
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}

          {!testimonyStatusLoading && !testimonyOpen && profile.role !== 'admin' && (
            <View style={[styles.closedBanner, { backgroundColor: inputBackground, borderColor: border }]}>
              <MaterialIcons name="lock" size={20} color={mutedText} />
              <ThemedText style={[styles.closedBannerText, { color: mutedText }]}>
                Testimony is not currently open for this bill.
              </ThemedText>
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
  headerTitle: {
    fontSize: 17,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    paddingBottom: Spacing['4xl'],
    gap: Spacing.lg,
  },
  contentPadding: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  billTitle: {
    marginBottom: Spacing.sm,
    lineHeight: 26,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  infoLabel: {
    width: 100,
    flexShrink: 0,
    fontWeight: '600',
    paddingTop: 2,
  },
  infoValue: {
    fontSize: 15,
    flex: 1,
  },
  infoValueMultiline: {
    lineHeight: 22,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  historyDot: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: Spacing.xs,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  historyAction: {
    fontSize: 15,
    lineHeight: 20,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  documentInfo: {
    flex: 1,
    gap: 2,
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
    flex: 1,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  testimonyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  testimonyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  testimonyCollapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  testimonyCollapseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  closedBannerText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
