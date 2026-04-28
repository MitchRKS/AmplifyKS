import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { CommitteeMemberRow } from '@/components/committee-member-row';
import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getCommitteeById,
  type KansasCommittee,
  type KansasCommitteeMember,
} from '@/services/openstates';

interface MemberSection {
  key: string;
  label: string;
  members: KansasCommitteeMember[];
}

const groupMembersByRole = (members: KansasCommitteeMember[]): MemberSection[] => {
  const buckets: Record<string, KansasCommitteeMember[]> = {
    chair: [],
    vice: [],
    ranking: [],
    member: [],
  };

  for (const m of members) {
    const lower = m.role.toLowerCase();
    if (lower.includes('vice')) buckets.vice.push(m);
    else if (lower.includes('chair')) buckets.chair.push(m);
    else if (lower.includes('ranking')) buckets.ranking.push(m);
    else buckets.member.push(m);
  }

  const sections: MemberSection[] = [
    { key: 'chair', label: 'Chair', members: buckets.chair },
    { key: 'vice', label: 'Vice Chair', members: buckets.vice },
    { key: 'ranking', label: 'Ranking Member', members: buckets.ranking },
    { key: 'member', label: 'Members', members: buckets.member },
  ];

  return sections.filter((s) => s.members.length > 0);
};

export default function CommitteeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();

  const [committee, setCommittee] = useState<KansasCommittee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputBackground = useThemeColor(
    { light: '#F0F2F5', dark: '#252830' },
    'background',
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!params.id) throw new Error('Missing committee ID');
        const result = await getCommitteeById(params.id);
        if (!result) throw new Error('Committee not found');
        setCommittee(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  const sections = useMemo(
    () => (committee ? groupMembersByRole(committee.members) : []),
    [committee],
  );

  const openMember = (member: KansasCommitteeMember) => {
    router.push({
      pathname: '/legislator-detail',
      params: { id: member.personId },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.navHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tint} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.navTitle}>
            Committee
          </ThemedText>
          <View style={styles.navSpacer} />
        </View>
      </ContentContainer>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={{ color: mutedText, fontSize: 16 }}>
            Loading committee...
          </ThemedText>
        </View>
      ) : error || !committee ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: mutedText, fontSize: 16 }}>
            {error ?? 'Committee not found'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ContentContainer style={styles.contentPadding}>
            <View
              style={[
                styles.headerCard,
                { backgroundColor: surface, borderColor: border },
                Shadows.sm,
              ]}
            >
              <ThemedText type="title" style={styles.title}>
                {committee.name}
              </ThemedText>
              <View style={styles.badgeRow}>
                {committee.chamber ? (
                  <View style={[styles.badge, { backgroundColor: inputBackground }]}>
                    <ThemedText style={[styles.badgeText, { color: mutedText }]}>
                      {committee.chamber}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={[styles.badge, { backgroundColor: tint + '14' }]}>
                  <ThemedText style={[styles.badgeText, { color: tint }]}>
                    {committee.members.length} member
                    {committee.members.length !== 1 ? 's' : ''}
                  </ThemedText>
                </View>
              </View>
            </View>

            {sections.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: surface, borderColor: border },
                  Shadows.sm,
                ]}
              >
                <ThemedText type="defaultSemiBold" style={{ color: mutedText }}>
                  No members listed for this committee
                </ThemedText>
              </View>
            ) : (
              sections.map((section) => (
                <View key={section.key} style={styles.section}>
                  <ThemedText
                    type="sectionHeader"
                    style={[styles.sectionHeader, { color: mutedText }]}
                  >
                    {section.label}
                  </ThemedText>
                  <View style={styles.sectionItems}>
                    {section.members.map((member) => (
                      <CommitteeMemberRow
                        key={`${member.personId}-${member.role}`}
                        member={member}
                        onPress={() => openMember(member)}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </ContentContainer>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  navTitle: { fontSize: 17 },
  navSpacer: { width: 32 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  contentPadding: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
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
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 12,
    paddingHorizontal: Spacing.xs,
  },
  sectionItems: {
    gap: Spacing.sm,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
});
