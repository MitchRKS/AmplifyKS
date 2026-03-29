import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORY_ICONS, type IssueCategory } from '@/constants/quiz-questions';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import type { ResolvedMatchResult } from '@/hooks/use-legislator-match';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SCORECARD_NAME } from '@/services/billtrack50';
import {
  matchLabel,
  type CategoryMatchScore,
  type LegislatorMatchScore,
} from '@/services/legislator-match-engine';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const scoreColor = (percent: number): string => {
  if (percent >= 75) return '#4CAF50';
  if (percent >= 50) return '#ffc629';
  return '#fa3332';
};

// ── BT50 Scorecard View ──

function BT50MatchView({ match }: { match: ResolvedMatchResult }) {
  const color = scoreColor(match.compositePercent);
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
      <View style={styles.gaugeRow}>
        <View style={[styles.gaugeRing, { borderColor: color + '26' }]}>
          <ThemedText style={[styles.gaugePct, { color }]}>
            {match.compositePercent}%
          </ThemedText>
        </View>

        <View style={styles.gaugeInfo}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
            Overall Match
          </ThemedText>
          <ThemedText style={[styles.matchLabelText, { color }]}>
            {matchLabel(match.compositePercent)}
          </ThemedText>
          <ThemedText type="caption" style={{ color: mutedText }}>
            {SCORECARD_NAME}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.footerNote, { color: mutedText }]}>
        Based on how this legislator's voting record aligns with your quiz positions.
      </ThemedText>
    </View>
  );
}

// ── Voting Record Match View ──

function VotingRecordMatchView({ matchScore }: { matchScore: LegislatorMatchScore }) {
  const color = scoreColor(matchScore.compositePercent);
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
      <View style={styles.gaugeRow}>
        <View style={[styles.gaugeRing, { borderColor: color + '26' }]}>
          <ThemedText style={[styles.gaugePct, { color }]}>
            {matchScore.compositePercent}%
          </ThemedText>
        </View>

        <View style={styles.gaugeInfo}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
            Overall Match
          </ThemedText>
          <ThemedText style={[styles.matchLabelText, { color }]}>
            {matchLabel(matchScore.compositePercent)}
          </ThemedText>
          <ThemedText type="caption" style={{ color: mutedText }}>
            {matchScore.categoriesMatched} categories · {matchScore.totalVotesAnalyzed} votes analyzed
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      <View style={styles.categorySection}>
        <ThemedText type="defaultSemiBold" style={[styles.sectionLabel, { color: mutedText }]}>
          By Issue
        </ThemedText>
        {matchScore.categoryScores.map((score) => (
          <CategoryAlignmentRow key={score.category} score={score} />
        ))}
      </View>

      <ThemedText style={[styles.footerNote, { color: mutedText }]}>
        Scores are based on voting record analysis and may not capture every nuance of a legislator's position.
      </ThemedText>
    </View>
  );
}

function CategoryAlignmentRow({ score }: { score: CategoryMatchScore }) {
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const color = scoreColor(score.alignmentPercent);

  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryLabelGroup}>
          <MaterialIcons
            name={CATEGORY_ICONS[score.category as IssueCategory] as IconName}
            size={14}
            color={mutedText}
          />
          <ThemedText style={styles.categoryLabel}>{score.category}</ThemedText>
        </View>
        <ThemedText style={[styles.categoryPct, { color }]}>
          {score.alignmentPercent}%
        </ThemedText>
      </View>

      <View style={[styles.barOuter, { backgroundColor: border + '40' }]}>
        <View
          style={[
            styles.barInner,
            { backgroundColor: color, width: `${Math.round(score.alignmentScore * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

// ── Unified Entry Point ──

export function LegislatorMatchDetailView({
  match,
}: {
  match: ResolvedMatchResult;
}) {
  if (match.source === 'bt50' && match.bt50Score) {
    return <BT50MatchView match={match} />;
  }

  if (match.source === 'voting-record' && match.votingRecordMatch) {
    return <VotingRecordMatchView matchScore={match.votingRecordMatch} />;
  }

  return null;
}

export function LegislatorMatchLoadingView() {
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={tint} />
        <ThemedText style={{ color: mutedText }}>
          Calculating your match score…
        </ThemedText>
      </View>
    </View>
  );
}

export function LegislatorMatchQuizPromptView({
  onTakeQuiz,
}: {
  onTakeQuiz: () => void;
}) {
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.promptCard,
        { backgroundColor: surface, borderColor: border },
        Shadows.sm,
        pressed && styles.pressed,
      ]}
      onPress={onTakeQuiz}
    >
      <MaterialIcons name="quiz" size={28} color={tint} />
      <View style={styles.promptContent}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
          Take the quiz to see your match score
        </ThemedText>
        <ThemedText type="caption" style={{ color: mutedText }}>
          Answer 10 questions to compare your positions.
        </ThemedText>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={mutedText} />
    </Pressable>
  );
}

export function MatchScoreBadge({
  percent,
  compact = false,
}: {
  percent: number;
  compact?: boolean;
}) {
  const color = scoreColor(percent);

  return (
    <View style={styles.badgeRow}>
      <View style={[styles.badgeRing, { borderColor: color }]}>
        <ThemedText style={[styles.badgePct, { color }]}>{percent}</ThemedText>
      </View>
      {!compact && (
        <ThemedText style={[styles.badgeText, { color }]}>Match</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  gaugeRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePct: {
    fontSize: 20,
    fontWeight: '800',
  },
  gaugeInfo: {
    flex: 1,
    gap: 4,
  },
  matchLabelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  categorySection: {
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryRow: {
    marginBottom: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  categoryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  barOuter: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barInner: {
    height: 6,
    borderRadius: 3,
  },
  footerNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  promptContent: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePct: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
