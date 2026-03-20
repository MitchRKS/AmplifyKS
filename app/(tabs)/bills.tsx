import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as LegiscanAPI from '@/services/legiscan';

type ChamberFilter = 'All' | 'House' | 'Senate';
type SortOption = 'dateDesc' | 'dateAsc' | 'numberAsc' | 'numberDesc' | 'titleAsc' | 'statusAsc';

interface Bill {
  id: number;
  billNumber: string;
  title: string;
  description: string;
  status: string;
  chamber: 'House' | 'Senate' | 'Unknown';
  lastAction: string;
  lastActionDate: string;
  url: string;
}

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

  const inputBackground = useThemeColor({ light: '#F2F2F7', dark: '#1C1C1E' }, 'background');
  const inputBorder = useThemeColor({ light: '#D1D1D6', dark: '#2C2C2E' }, 'background');
  const placeholder = useThemeColor({ light: '#8E8E93', dark: '#8E8E93' }, 'text');
  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const tint = useThemeColor({ light: '#0a7ea4', dark: '#0a7ea4' }, 'tint');
  const mutedText = useThemeColor({ light: '#6C6C70', dark: '#A1A1A6' }, 'text');
  const separator = useThemeColor({ light: '#E5E5EA', dark: '#38383A' }, 'background');

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
        .map((bill, index) => {
          try {
            if (!bill.bill_id || !bill.number) {
              return null;
            }
            return {
              id: bill.bill_id,
              billNumber: bill.number,
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

  const renderBillItem = ({ item }: { item: Bill }) => (
    <Pressable
      style={({ pressed }) => [
        styles.billCard,
        { backgroundColor: cardBackground, borderColor: separator },
        pressed && styles.billCardPressed,
      ]}
      onPress={() => handleBillPress(item)}
    >
      <View style={styles.billHeader}>
        <View style={styles.billNumberContainer}>
          <ThemedText type="defaultSemiBold" style={[styles.billNumber, { color: tint }]}>
            {item.billNumber}
          </ThemedText>
          <ThemedText style={[styles.chamber, { color: mutedText }]}>
            {item.chamber}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="defaultSemiBold" style={styles.billTitle} numberOfLines={2}>
        {item.title}
      </ThemedText>

      {item.description && (
        <ThemedText style={[styles.billDescription, { color: mutedText }]} numberOfLines={2}>
          {item.description}
        </ThemedText>
      )}

      <View style={[styles.separator, { backgroundColor: separator }]} />

      <ThemedText style={[styles.lastAction, { color: mutedText }]} numberOfLines={2}>
        {item.lastAction} •{' '}
        {new Date(item.lastActionDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </ThemedText>
    </Pressable>
  );

  if (loading && bills.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Bills</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            {sessionName}
          </ThemedText>
        </View>
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
      <View style={styles.header}>
        <ThemedText type="title">Bills</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedText }]}>
          {sessionName}
        </ThemedText>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: inputBackground, borderColor: inputBorder },
          ]}
          placeholder="Search bills..."
          placeholderTextColor={placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            { backgroundColor: inputBackground, borderColor: inputBorder },
            pressed && styles.filterButtonPressed,
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="tune" size={22} color={tint} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: tint }]}>
              <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: separator }]}>
            <ThemedText type="subtitle">Filter & Sort</ThemedText>
            <Pressable
              onPress={() => setFilterModalVisible(false)}
              style={({ pressed }) => [styles.modalClose, pressed && styles.filterButtonPressed]}
            >
              <ThemedText style={{ color: tint, fontWeight: '600' }}>Done</ThemedText>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalSection}>
              <ThemedText style={[styles.modalLabel, { color: mutedText }]}>Chamber</ThemedText>
              <View style={styles.modalOptions}>
                {(['All', 'House', 'Senate'] as ChamberFilter[]).map((chamber) => (
                  <Pressable
                    key={chamber}
                    style={({ pressed }) => [
                      styles.modalOption,
                      { borderColor: separator },
                      chamberFilter === chamber && { backgroundColor: tint + '15', borderColor: tint },
                      pressed && styles.filterButtonPressed,
                    ]}
                    onPress={() => setChamberFilter(chamber)}
                  >
                    <ThemedText
                      style={[
                        styles.modalOptionText,
                        chamberFilter === chamber && { color: tint, fontWeight: '600' },
                      ]}
                    >
                      {chamber}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.modalSection, { borderTopWidth: 1, borderTopColor: separator }]}>
              <ThemedText style={[styles.modalLabel, { color: mutedText }]}>Status</ThemedText>
              <View style={styles.modalOptionsWrap}>
                {STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    style={({ pressed }) => [
                      styles.modalOption,
                      { borderColor: separator },
                      statusFilter === status && { backgroundColor: tint + '15', borderColor: tint },
                      pressed && styles.filterButtonPressed,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <ThemedText
                      style={[
                        styles.modalOptionText,
                        statusFilter === status && { color: tint, fontWeight: '600' },
                      ]}
                    >
                      {status}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.modalSection, { borderTopWidth: 1, borderTopColor: separator }]}>
              <ThemedText style={[styles.modalLabel, { color: mutedText }]}>Sort by</ThemedText>
              <View style={styles.modalSortOptions}>
                {SORT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.modalOptionFull,
                      { borderColor: separator },
                      sortBy === opt.value && { backgroundColor: tint + '15', borderColor: tint },
                      pressed && styles.filterButtonPressed,
                    ]}
                    onPress={() => setSortBy(opt.value)}
                  >
                    <ThemedText
                      style={[
                        styles.modalOptionText,
                        sortBy === opt.value && { color: tint, fontWeight: '600' },
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
                { borderColor: separator },
                pressed && styles.filterButtonPressed,
              ]}
              onPress={() => {
                setChamberFilter('All');
                setStatusFilter('All');
              }}
            >
              <ThemedText style={{ color: mutedText }}>Clear filters</ThemedText>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalClose: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  modalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalOption: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalSortOptions: {
    gap: 8,
  },
  modalOptionFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalOptionText: {
    fontSize: 15,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  billCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  billNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billNumber: {
    fontSize: 17,
  },
  chamber: {
    fontSize: 13,
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
    fontSize: 17,
    marginBottom: 6,
    lineHeight: 22,
  },
  billDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    marginBottom: 8,
  },
  lastAction: {
    fontSize: 13,
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
