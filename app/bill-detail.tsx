import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
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

  useEffect(() => {
    const fetchBillDetail = async () => {
      try {
        setLoading(true);
        const billId = Number(params.id);
        
        if (!billId) {
          throw new Error('Invalid bill ID');
        }

        const billData = await LegiscanAPI.getBillDetail(billId);
        
        // Transform API data to our BillDetail interface
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
          committee: billData.committee?.name,
          url: billData.url,
          stateLink: billData.state_link,
          history: billData.history.map(h => ({
            date: h.date,
            action: h.action,
            chamber: h.chamber,
          })).reverse(), // Reverse to show most recent first
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

  const tint = useThemeColor({ light: '#0a7ea4', dark: '#0a7ea4' }, 'tint');
  const mutedText = useThemeColor({ light: '#6C6C70', dark: '#A1A1A6' }, 'text');
  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const separator = useThemeColor({ light: '#E5E5EA', dark: '#38383A' }, 'background');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Passed':
      case 'Chaptered':
        return '#34C759';
      case 'Introduced':
      case 'Engrossed':
        return '#FF9500';
      case 'Enrolled':
        return '#007AFF';
      case 'Vetoed':
      case 'Failed':
        return '#FF3B30';
      default:
        return mutedText;
    }
  };

  if (loading || !bill) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tint} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Bill Details
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={[styles.loadingText, { color: mutedText }]}>
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={tint} />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          Bill Details
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor: separator }]}>
          <View style={styles.billHeader}>
            <ThemedText type="title" style={{ color: tint }}>
              {bill.billNumber}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) + '20' }]}>
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

        <View style={[styles.card, { backgroundColor: cardBackground, borderColor: separator }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Information
          </ThemedText>

          <View style={styles.infoRow}>
            <ThemedText style={[styles.infoLabel, { color: mutedText }]}>Chamber</ThemedText>
            <ThemedText style={styles.infoValue}>{bill.chamber}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText style={[styles.infoLabel, { color: mutedText }]}>Session</ThemedText>
            <ThemedText style={styles.infoValue}>{bill.sessionName}</ThemedText>
          </View>

          {primarySponsor && (
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: mutedText }]}>Sponsor</ThemedText>
              <ThemedText style={styles.infoValue}>{primarySponsor.name}</ThemedText>
            </View>
          )}

          {coSponsors.length > 0 && (
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: mutedText }]}>Co-Sponsors</ThemedText>
              <ThemedText style={[styles.infoValue, styles.infoValueMultiline]}>
                {coSponsors.map(s => s.name).join(', ')}
              </ThemedText>
            </View>
          )}

          {bill.committee && (
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: mutedText }]}>Committee</ThemedText>
              <ThemedText style={styles.infoValue}>{bill.committee}</ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBackground, borderColor: separator }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Legislative History
          </ThemedText>
          {bill.history.length > 0 ? (
            bill.history.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyDot}>
                  <View style={[styles.dot, { backgroundColor: tint }]} />
                  {index < bill.history.length - 1 && (
                    <View style={[styles.line, { backgroundColor: separator }]} />
                  )}
                </View>
                <View style={styles.historyContent}>
                  <View style={styles.historyHeader}>
                    <ThemedText style={[styles.historyDate, { color: mutedText }]}>
                      {new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </ThemedText>
                    {item.chamber && (
                      <ThemedText style={[styles.historyChamber, { color: mutedText }]}>
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
          <View style={[styles.card, { backgroundColor: cardBackground, borderColor: separator }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Bill Documents
            </ThemedText>
            {bill.texts.map((text, index) => (
              <Pressable
                key={index}
                style={styles.documentRow}
                onPress={() => WebBrowser.openBrowserAsync(text.url)}>
                <View style={styles.documentInfo}>
                  <ThemedText style={styles.documentType}>{text.type}</ThemedText>
                  <ThemedText style={[styles.documentDate, { color: mutedText }]}>
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

        <View style={[styles.card, { backgroundColor: cardBackground, borderColor: separator }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Official Links
          </ThemedText>
          <Pressable
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync(bill.stateLink)}>
            <ThemedText style={[styles.linkText, { color: tint }]}>
              View on Kansas Legislature Website
            </ThemedText>
            <IconSymbol name="arrow.up.right" size={16} color={tint} />
          </Pressable>
          <Pressable
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync(bill.url)}>
            <ThemedText style={[styles.linkText, { color: tint }]}>
              View on LegiScan
            </ThemedText>
            <IconSymbol name="arrow.up.right" size={16} color={tint} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.testimonyButton, { backgroundColor: tint }]}
          onPress={() => {
            router.push({
              pathname: '/(tabs)/testimony',
              params: {
                billNumber: bill.billNumber,
                billTitle: bill.title,
                committee: bill.committee || '',
              },
            });
          }}>
          <IconSymbol name="doc.text.fill" size={20} color="#fff" />
          <ThemedText style={styles.testimonyButtonText}>
            Submit Testimony for {bill.billNumber}
          </ThemedText>
        </Pressable>

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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  billTitle: {
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 15,
    width: 110,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 15,
    flex: 1,
  },
  infoValueMultiline: {
    lineHeight: 20,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  historyDot: {
    alignItems: 'center',
    marginRight: 12,
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
    marginTop: 4,
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
  historyDate: {
    fontSize: 13,
  },
  historyChamber: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyAction: {
    fontSize: 15,
    lineHeight: 20,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 15,
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 13,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 15,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  testimonyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  testimonyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
