import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { useThemeColor } from '@/hooks/use-theme-color';
import * as LegiscanAPI from '@/services/legiscan';

type ChamberFilter = 'All' | 'House' | 'Senate';
type SortOption = 'dateDesc' | 'dateAsc' | 'numberAsc' | 'numberDesc' | 'titleAsc' | 'statusAsc';

interface Bill {
  id: number;
  billNumber: string;
  committee: string;
  title: string;
  description: string;
  status: string;
  chamber: 'House' | 'Senate' | 'Unknown';
  lastAction: string;
  lastActionDate: string;
  url: string;
}

const BILL_DETAIL_FETCH_CONCURRENCY = 4;
const committeeNameCache = new Map<number, string>();

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'dateDesc', label: 'Last action (newest)' },
  { value: 'dateAsc', label: 'Last action (oldest)' },
  { value: 'numberAsc', label: 'Bill number (A–Z)' },
  { value: 'numberDesc', label: 'Bill number (Z–A)' },
  { value: 'titleAsc', label: 'Title (A–Z)' },
  { value: 'statusAsc', label: 'Status (A–Z)' },
];

const STATUS_OPTIONS = [
  'All',
  'Introduced',
  'Engrossed',
  'Enrolled',
  'Passed',
  'Vetoed',
  'Failed',
  'Override',
  'Chaptered',
  'In Progress',
];

function parseBillNumber(billNumber: string): { prefix: string; num: number } {
  const match = billNumber.trim().match(/^([A-Za-z]+)\s*(\d+)$/);
  if (match) {
    return { prefix: match[1].toUpperCase(), num: parseInt(match[2], 10) };
  }
  return { prefix: billNumber, num: 0 };
}

function compareBillNumbers(a: string, b: string): number {
  const pa = parseBillNumber(a);
  const pb = parseBillNumber(b);
  if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
  return pa.num - pb.num;
}

function sortBills(bills: Bill[], sortBy: SortOption): Bill[] {
  const sorted = [...bills];
  switch (sortBy) {
    case 'dateDesc':
      return sorted.sort(
        (a, b) => new Date(b.lastActionDate).getTime() - new Date(a.lastActionDate).getTime()
      );
    case 'dateAsc':
      return sorted.sort(
        (a, b) => new Date(a.lastActionDate).getTime() - new Date(b.lastActionDate).getTime()
      );
    case 'numberAsc':
      return sorted.sort((a, b) => compareBillNumbers(a.billNumber, b.billNumber));
    case 'numberDesc':
      return sorted.sort((a, b) => compareBillNumbers(b.billNumber, a.billNumber));
    case 'titleAsc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'statusAsc':
      return sorted.sort((a, b) => a.status.localeCompare(b.status));
    default:
      return sorted;
  }
}

function extractCommitteeFromAction(action?: string): string | null {
  if (!action?.trim()) {
    return null;
  }

  const patterns = [
    /(?:Referred|Rereferred)\s+to\s+Committee\s+on\s+([^;,.]+)/i,
    /Withdrawn\s+from\s+Committee\s+on\s+([^;,.]+)/i,
    /by\s+Committee\s+on\s+([^;,.]+)/i,
    /Committee\s+on\s+([^;,.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = action.match(pattern);
    const committeeName = match?.[1]?.trim();
    if (committeeName) {
      return committeeName;
    }
  }

  return null;
}

function getCommitteeName(
  committee?: { chamber?: string; name?: string } | null,
  fallbackAction?: string,
  fallbackChamber?: string
): string {
  const committeeName = committee?.name?.trim();
  if (!committeeName) {
    const parsedFromAction = extractCommitteeFromAction(fallbackAction);
    if (!parsedFromAction) {
      return 'Committee unavailable';
    }
    return LegiscanAPI.formatCommitteeName(fallbackChamber || 'Unknown', parsedFromAction);
  }
  if (committee?.chamber?.trim()) {
    return LegiscanAPI.formatCommitteeName(committee.chamber, committeeName);
  }
  return committeeName;
}

function extractCommitteeName(rawBill: Record<string, unknown>): string {
  const committee = rawBill.committee;
  const fallbackAction = typeof rawBill.last_action === 'string' ? rawBill.last_action : undefined;
  const fallbackBillNumber = typeof rawBill.number === 'string' ? rawBill.number : undefined;
  const fallbackChamber = LegiscanAPI.getChamber(fallbackBillNumber);
  if (committee && typeof committee === 'object') {
    const committeeObj = committee as { chamber?: string; name?: string };
    return getCommitteeName(committeeObj, fallbackAction, fallbackChamber);
  }
  return getCommitteeName(undefined, fallbackAction, fallbackChamber);
}

function formatLastActionForCard(lastAction: string): string {
  // Remove leading chamber label for a cleaner card preview.
  return lastAction.replace(/^(House|Senate)\s+/i, '');
}

export default function BillsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('dateDesc');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sessionName, setSessionName] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);
  const committeeHydrationRequestId = useRef(0);
  const isMountedRef = useRef(true);

  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      committeeHydrationRequestId.current += 1;
    };
  }, []);

  const hydrateBillCommittees = async (billList: Bill[], requestId: number): Promise<void> => {
    const missingCommitteeBillIds = billList
      .filter((bill) => bill.committee === 'Committee unavailable' && !committeeNameCache.has(bill.id))
      .map((bill) => bill.id);

    if (missingCommitteeBillIds.length > 0) {
      let cursor = 0;
      const worker = async () => {
        while (cursor < missingCommitteeBillIds.length) {
          const currentIndex = cursor;
          cursor += 1;
          const billId = missingCommitteeBillIds[currentIndex];

          try {
            const billDetail = await LegiscanAPI.getBillDetail(billId);
            const historyCommitteeAction =
              billDetail.history?.find((entry) => extractCommitteeFromAction(entry.action))?.action;
            const fallbackAction = historyCommitteeAction || billList.find((bill) => bill.id === billId)?.lastAction;
            const fallbackChamber = billDetail.committee?.chamber || LegiscanAPI.getChamber(billDetail.bill_number);
            const committeeName = getCommitteeName(
              billDetail.committee,
              fallbackAction,
              fallbackChamber
            );
            if (committeeName !== 'Committee unavailable') {
              committeeNameCache.set(billId, committeeName);
            }
          } catch {
            // Network/API failures should not poison the cache.
            continue;
          }
        }
      };

      const workerCount = Math.min(BILL_DETAIL_FETCH_CONCURRENCY, missingCommitteeBillIds.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }

    if (!isMountedRef.current || requestId !== committeeHydrationRequestId.current) {
      return;
    }

    setBills((previousBills) =>
      previousBills.map((bill) => ({
        ...bill,
        committee: committeeNameCache.get(bill.id) ?? bill.committee,
      }))
    );
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const sessions = await LegiscanAPI.getSessionList('KS');
      if (!sessions || sessions.length === 0) {
        throw new Error('No sessions available for Kansas');
      }

      const currentSession = sessions[0];
      setSessionName(currentSession.session_name);

      const billData = await LegiscanAPI.getKansasBills();
      if (!billData || billData.length === 0) {
        setError('No bills available for the current session');
        setBills([]);
        return;
      }

      const transformedBills: Bill[] = billData
        .map((bill) => {
          try {
            if (!bill.bill_id || !bill.number) {
              return null;
            }
            return {
              id: bill.bill_id,
              billNumber: bill.number,
              committee: extractCommitteeName(bill as unknown as Record<string, unknown>),
              title: bill.title || 'Untitled',
              description: bill.description || '',
              status: LegiscanAPI.getStatusLabel(bill.status),
              chamber: LegiscanAPI.getChamber(bill.number),
              lastAction: bill.last_action || 'No action recorded',
              lastActionDate: bill.last_action_date || bill.status_date || new Date().toISOString(),
              url: bill.url || '',
            };
          } catch {
            return null;
          }
        })
        .filter((bill): bill is Bill => bill !== null);

      setBills(transformedBills);
      const requestId = ++committeeHydrationRequestId.current;
      void hydrateBillCommittees(transformedBills, requestId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      Alert.alert(
        'Error Loading Bills',
        `Unable to load bills from the Kansas Legislature.\n\nError: ${errorMessage}\n\nPlease check your internet connection and try again.`,
        [{ text: 'OK' }]
      );
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const filteredAndSortedBills = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    let result = bills.filter((bill) => {
      const matchesSearch =
        !searchQuery ||
        bill.billNumber.toLowerCase().includes(searchLower) ||
        bill.committee.toLowerCase().includes(searchLower) ||
        bill.title.toLowerCase().includes(searchLower) ||
        bill.description.toLowerCase().includes(searchLower);

      const matchesChamber =
        chamberFilter === 'All' || bill.chamber === chamberFilter;

      const matchesStatus =
        statusFilter === 'All' || bill.status === statusFilter;

      return matchesSearch && matchesChamber && matchesStatus;
    });
    return sortBills(result, sortBy);
  }, [bills, searchQuery, chamberFilter, statusFilter, sortBy]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const activeFilterCount =
    (chamberFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0);

  const handleBillPress = (bill: Bill) => {
    router.push({
      pathname: '/bill-detail',
      params: { id: bill.id },
    });
  };

  const renderBillItem = ({ item }: { item: Bill }) => (
    <ContentContainer style={styles.listItemContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.billCard,
          { backgroundColor: surface, borderColor: border },
          Shadows.sm,
          pressed && styles.pressed,
        ]}
        onPress={() => handleBillPress(item)}
      >
        <View style={styles.billHeader}>
          <ThemedText
            type="defaultSemiBold"
            style={[styles.billTitle, { color: tint }]}
            numberOfLines={1}
          >
            {`${item.billNumber} • ${item.committee}`}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: border }]}>
            <ThemedText style={[styles.statusText, { color: mutedText }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={[styles.billDescription, { color: mutedText }]} numberOfLines={2}>
          {item.description || item.title}
        </ThemedText>

        <View style={[styles.cardDivider, { backgroundColor: border }]} />

        <View style={styles.lastActionRow}>
          <MaterialIcons name="history" size={14} color={mutedText} />
          <ThemedText type="caption" style={{ color: mutedText, flex: 1 }} numberOfLines={2}>
            {new Date(item.lastActionDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            {' • '}
            {formatLastActionForCard(item.lastAction)}
          </ThemedText>
        </View>
      </Pressable>
    </ContentContainer>
  );

  if (loading && bills.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ContentContainer>
          <View style={styles.header}>
            <ThemedText type="title">Bills</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              {sessionName}
            </ThemedText>
          </View>
        </ContentContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={[styles.loadingText, { color: mutedText }]}>
            Loading bills...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.header}>
          <ThemedText type="title">Bills</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            {sessionName}
          </ThemedText>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchInputWrapper, { backgroundColor: inputBackground, borderColor: inputBorder }]}>
            <MaterialIcons name="search" size={20} color={placeholder} />
            <TextInput
              style={[styles.searchInput, { color: inputText }]}
              placeholder="Search bills..."
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
      </ContentContainer>

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
                {(['All', 'House', 'Senate'] as ChamberFilter[]).map((chamber) => (
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
                Status
              </ThemedText>
              <View style={styles.modalOptionsWrap}>
                {STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    style={({ pressed }) => [
                      styles.modalOption,
                      { borderColor: border },
                      statusFilter === status && { backgroundColor: tint + '12', borderColor: tint },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <ThemedText
                      style={[
                        styles.modalOptionText,
                        statusFilter === status && { color: tint, fontWeight: '700' },
                      ]}
                    >
                      {status}
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
                    {sortBy === opt.value && (
                      <MaterialIcons name="check" size={20} color={tint} />
                    )}
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
                setStatusFilter('All');
              }}
            >
              <ThemedText style={{ color: mutedText, fontWeight: '600' }}>Clear filters</ThemedText>
            </Pressable>
          </ScrollView>
        </ThemedView>
      </Modal>

      <FlatList
        data={filteredAndSortedBills}
        renderItem={renderBillItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={[styles.emptyText, { color: mutedText }]}>
              {error
                ? `Error: ${error}`
                : searchQuery || chamberFilter !== 'All' || statusFilter !== 'All'
                  ? 'No bills match your filters'
                  : 'No bills available'}
            </ThemedText>
            {error && (
              <Pressable
                style={[styles.retryButton, { backgroundColor: tint }]}
                onPress={fetchBills}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </Pressable>
            )}
          </View>
        }
      />
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
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
  modalOptionsWrap: {
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
  listContent: {
    paddingBottom: Spacing.xl,
  },
  listItemContainer: {
    paddingHorizontal: Spacing.xl,
  },
  billCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  billNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  billNumber: {
    fontSize: 17,
  },
  chamberChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
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
    flex: 1,
    fontSize: 16,
    marginRight: Spacing.sm,
    marginBottom: 0,
    lineHeight: 22,
  },
  billDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  cardDivider: {
    height: 1,
    marginBottom: Spacing.sm,
  },
  lastActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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
