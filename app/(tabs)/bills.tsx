import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as LegiscanAPI from '@/services/legiscan';

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

export default function BillsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
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

  // Fetch bills from LegiScan API
  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== Starting to fetch bills ===');
      
      // Get current session info first
      console.log('Step 1: Fetching session list...');
      const sessions = await LegiscanAPI.getSessionList('KS');
      console.log('Sessions received:', sessions?.length || 0);
      
      if (!sessions || sessions.length === 0) {
        throw new Error('No sessions available for Kansas');
      }
      
      const currentSession = sessions[0];
      console.log('Current session:', currentSession.session_name, 'ID:', currentSession.session_id);
      setSessionName(currentSession.session_name);

      // Get bills for current Kansas session
      console.log('Step 2: Fetching bills for session', currentSession.session_id);
      const billData = await LegiscanAPI.getKansasBills();
      console.log('Bill data received:', billData?.length || 0);
      
      if (!billData || billData.length === 0) {
        console.warn('No bills returned from API');
        setError('No bills available for the current session');
        setBills([]);
        return;
      }
      
      // Transform API data to our Bill interface
      console.log('Step 3: Transforming', billData.length, 'bills');
      const transformedBills: Bill[] = billData
        .map((bill, index) => {
          try {
            // Validate required fields
            if (!bill.bill_id || !bill.number) {
              console.warn(`Skipping bill at index ${index}: missing required fields`, bill);
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
          } catch (err) {
            console.error(`Error transforming bill at index ${index}:`, err, bill);
            return null;
          }
        })
        .filter((bill): bill is Bill => bill !== null);

      console.log('Step 4: Setting bills state with', transformedBills.length, 'bills');
      console.log('First 3 bills:', transformedBills.slice(0, 3).map(b => b.billNumber));
      setBills(transformedBills);
      console.log('=== Fetch complete ===');
    } catch (error) {
      console.error('=== Error fetching bills ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Full error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

  const filteredBills = bills
    .filter((bill) => bill.chamber === 'House')
    .filter(
      (bill) =>
        bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

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
      onPress={() => handleBillPress(item)}>
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
        {item.lastAction} • {new Date(item.lastActionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </ThemedText>
    </Pressable>
  );

  if (loading && bills.length === 0) {
    return (
      <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">House Bills</ThemedText>
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
        <ThemedText type="title">House Bills</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedText }]}>
          {sessionName}
        </ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: inputBackground, borderColor: inputBorder }]}
          placeholder="Search bills..."
          placeholderTextColor={placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filteredBills}
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
              {error ? `Error: ${error}` : searchQuery ? 'No bills match your search' : 'No bills available'}
            </ThemedText>
            {error && (
              <Pressable
                style={[styles.retryButton, { backgroundColor: tint }]}
                onPress={fetchBills}>
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
    paddingTop: 60,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
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
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sponsor: {
    fontSize: 13,
    flex: 1,
  },
  committee: {
    fontSize: 13,
    fontWeight: '500',
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
