import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useOpenTestimonyBillIds } from '@/hooks/use-open-testimony-bills';
import { alignmentLabel, useQuiz } from '@/hooks/use-quiz';
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
}

export default function ActionsScreen() {
  const router = useRouter();
  const { billIds: openBillIds, isLoading: idsLoading } = useOpenTestimonyBillIds();
  const quiz = useQuiz();
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      const billData = await LegiscanAPI.getKansasBills();
      const transformed: Bill[] = billData
        .map((bill) => {
          if (!bill.bill_id || !bill.number) return null;
          return {
            id: bill.bill_id,
            billNumber: bill.number,
            title: bill.title || 'Untitled',
            description: bill.description || '',
            status: LegiscanAPI.getStatusLabel(bill.status),
            chamber: LegiscanAPI.getChamber(bill.number),
            lastAction: bill.last_action || 'No action recorded',
            lastActionDate: bill.last_action_date || bill.status_date || new Date().toISOString(),
          };
        })
        .filter((b): b is Bill => b !== null);
      setAllBills(transformed);
    } catch {
      setAllBills([]);
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const openBills = useMemo(() => {
    const idSet = new Set(openBillIds);
    return allBills.filter((bill) => idSet.has(String(bill.id)));
  }, [allBills, openBillIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const loading = idsLoading || billsLoading;

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

  const renderBillItem = ({ item }: { item: Bill }) => (
    <ContentContainer style={styles.listItemContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.billCard,
          { backgroundColor: surface, borderColor: border },
          Shadows.sm,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push({ pathname: '/bill-detail', params: { id: item.id } })}
      >
        <View style={styles.billHeader}>
          <View style={styles.billNumberContainer}>
            <ThemedText type="defaultSemiBold" style={[styles.billNumber, { color: tint }]}>
              {item.billNumber}
            </ThemedText>
            <View style={[styles.chamberChip, { backgroundColor: border }]}>
              <ThemedText type="caption" style={{ color: mutedText }}>{item.chamber}</ThemedText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '14' }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.billTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>

        {item.description ? (
          <ThemedText style={[styles.billDescription, { color: mutedText }]} numberOfLines={2}>
            {item.description}
          </ThemedText>
        ) : null}

        <View style={[styles.cardDivider, { backgroundColor: border }]} />

        <View style={styles.testimonyRow}>
          <MaterialIcons name="edit-note" size={16} color={tint} />
          <ThemedText type="caption" style={{ color: tint, fontWeight: '600' }}>
            Open for testimony
          </ThemedText>
        </View>
      </Pressable>
    </ContentContainer>
  );

  if (loading && allBills.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ContentContainer>
          <View style={styles.header}>
            <ThemedText type="title">Actions</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              Bills open for testimony
            </ThemedText>
          </View>
        </ContentContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={[styles.loadingText, { color: mutedText }]}>
            Loading actions...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.header}>
          <ThemedText type="title">Actions</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            Bills open for testimony
          </ThemedText>
        </View>
      </ContentContainer>

      <FlatList
        data={openBills}
        renderItem={renderBillItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tint} />
        }
        ListHeaderComponent={
          <ContentContainer style={styles.listItemContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.quizCard,
                { backgroundColor: surface, borderColor: border },
                Shadows.sm,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/quiz')}
            >
              <View style={[styles.quizIconCircle, { backgroundColor: tint + '15' }]}>
                <MaterialIcons name="quiz" size={28} color={tint} />
              </View>
              <View style={styles.quizCardContent}>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                  {quiz.hasTakenQuiz ? 'Your Quiz Results' : 'Take the Quiz'}
                </ThemedText>
                <ThemedText type="caption" style={{ color: mutedText, lineHeight: 18 }}>
                  {quiz.hasTakenQuiz && quiz.result
                    ? `${alignmentLabel(quiz.result.mainstreamAlignmentScore)} — ${quiz.result.mainstreamAlignmentScore}%`
                    : 'Answer 10 questions to see where you stand on Kansas issues.'}
                </ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={mutedText} />
            </Pressable>

            {openBills.length > 0 && (
              <ThemedText type="defaultSemiBold" style={styles.testimonyHeading}>
                Open for Testimony
              </ThemedText>
            )}
          </ContentContainer>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="gavel" size={48} color={border} />
            <ThemedText style={[styles.emptyTitle, { color: mutedText }]}>
              No bills open for testimony
            </ThemedText>
            <ThemedText type="caption" style={[styles.emptySubtitle, { color: mutedText }]}>
              Check back later — bills will appear here when they are opened for public testimony.
            </ThemedText>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
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
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
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
    fontSize: 16,
    marginBottom: Spacing.xs,
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
  testimonyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quizIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizCardContent: {
    flex: 1,
    gap: 2,
  },
  testimonyHeading: {
    fontSize: 17,
    marginBottom: Spacing.md,
  },
});
