import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  CATEGORY_ICONS,
  ISSUE_CATEGORIES,
  RESPONSE_LEVELS,
  type IssueCategory,
  type ResponseValue,
} from '@/constants/quiz-questions';
import { scoreColor } from '@/components/legislator-match-detail';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useGamification } from '@/contexts/gamification-context';
import { useLegislatorMatch } from '@/hooks/use-legislator-match';
import { useQuiz } from '@/hooks/use-quiz';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { positionText } from '@/services/legislator-match-engine';
import { useThemeColor } from '@/hooks/use-theme-color';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function QuizScreen() {
  const router = useRouter();
  const quiz = useQuiz();
  const { recordAction } = useGamification();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');

  const question = quiz.questions[currentIndex];
  const selectedResponse = quiz.getResponse(question?.id ?? '');
  const isLastQuestion = currentIndex === quiz.questions.length - 1;

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      if (!selectedResponse && !quiz.responses[question.id]) {
        quiz.skipQuestion(question.id);
      }
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleSubmit = async () => {
    await quiz.submitQuiz();
    // Show results first — recording the action can unlock achievement
    // modals that would otherwise pop up in front of the results the user
    // is expecting to see immediately after submitting.
    setShowResults(true);
    setTimeout(() => {
      recordAction('Quiz Completed', 'Completed the political alignment quiz');
    }, 700);
  };

  const handleRetake = () => {
    quiz.resetQuiz();
    setCurrentIndex(0);
    setShowResults(false);
    setShowIntro(true);
  };

  if (quiz.isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      </ThemedView>
    );
  }

  if (showResults || (quiz.hasTakenQuiz && quiz.result)) {
    return (
      <ResultsView
        result={quiz.result}
        questions={quiz.questions}
        getResponse={quiz.getResponse}
        editResponse={quiz.editResponse}
        onDone={() => router.back()}
        onRetake={handleRetake}
        onViewLegislators={() => {
          router.back();
          setTimeout(() => router.push('/(tabs)/officials'), 100);
        }}
        tint={tint}
        mutedText={mutedText}
        surface={surface}
        border={border}
      />
    );
  }

  if (showIntro) {
    return (
      <IntroView
        totalQuestions={quiz.questions.length}
        onStart={() => setShowIntro(false)}
        onBack={() => router.back()}
        tint={tint}
        mutedText={mutedText}
        surface={surface}
        border={border}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tint} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Quiz
          </ThemedText>
          <ThemedText type="caption" style={{ color: mutedText }}>
            {currentIndex + 1}/{quiz.questions.length}
          </ThemedText>
        </View>
      </ContentContainer>

      <ContentContainer>
        <View style={styles.progressBarOuter}>
          <View
            style={[
              styles.progressBarInner,
              { backgroundColor: tint, width: `${Math.round(quiz.completionPercentage * 100)}%` },
            ]}
          />
        </View>
      </ContentContainer>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ContentContainer style={styles.contentPadding}>
          <View style={[styles.categoryBadge, { backgroundColor: border }]}>
            <MaterialIcons
              name={CATEGORY_ICONS[question.category] as IconName}
              size={16}
              color={mutedText}
            />
            <ThemedText type="caption" style={{ fontWeight: '600' }}>
              {question.category}
            </ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.questionText}>
            {question.text}
          </ThemedText>

          <View style={styles.optionsContainer}>
            {RESPONSE_LEVELS.map((level) => {
              const isSelected = selectedResponse === level.value;
              return (
                <Pressable
                  key={level.value}
                  style={({ pressed }) => [
                    styles.optionButton,
                    {
                      backgroundColor: isSelected ? tint + '20' : inputBackground,
                      borderColor: isSelected ? tint : border,
                    },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => quiz.submitResponse(question.id, level.value as ResponseValue)}
                >
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      isSelected && { fontWeight: '700', color: tint },
                    ]}
                  >
                    {level.label}
                  </ThemedText>
                  {isSelected && <MaterialIcons name="check-circle" size={20} color={tint} />}
                </Pressable>
              );
            })}
          </View>
        </ContentContainer>
      </ScrollView>

      <ContentContainer>
        <View style={styles.navRow}>
          {currentIndex > 0 ? (
            <Pressable
              style={({ pressed }) => [
                styles.navButton,
                { backgroundColor: border },
                pressed && styles.pressed,
              ]}
              onPress={handlePrev}
            >
              <MaterialIcons name="chevron-left" size={20} color={mutedText} />
              <ThemedText style={[styles.navButtonText, { color: mutedText }]}>Prev</ThemedText>
            </Pressable>
          ) : (
            <View style={styles.navSpacer} />
          )}

          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: isLastQuestion ? tint : border },
              pressed && styles.pressed,
              quiz.isSubmitting && styles.disabled,
            ]}
            onPress={handleNext}
            disabled={quiz.isSubmitting}
          >
            {quiz.isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <ThemedText
                  style={[styles.navButtonText, { color: isLastQuestion ? '#fff' : mutedText }]}
                >
                  {isLastQuestion ? 'Submit' : 'Next'}
                </ThemedText>
                <MaterialIcons
                  name={isLastQuestion ? 'check-circle' : 'chevron-right'}
                  size={20}
                  color={isLastQuestion ? '#fff' : mutedText}
                />
              </>
            )}
          </Pressable>
        </View>
      </ContentContainer>
    </ThemedView>
  );
}

function IntroView({
  totalQuestions,
  onStart,
  onBack,
  tint,
  mutedText,
  surface,
  border,
}: {
  totalQuestions: number;
  onStart: () => void;
  onBack: () => void;
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
}) {
  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tint} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Quiz
          </ThemedText>
          <View style={styles.backButton} />
        </View>
      </ContentContainer>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ContentContainer style={styles.contentPadding}>
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <MaterialIcons name="quiz" size={44} color={tint} style={styles.resultIcon} />
            <ThemedText type="title" style={styles.resultTitle}>
              Find Your Match
            </ThemedText>
            <ThemedText style={[styles.introBody, { color: mutedText }]}>
              Answer {totalQuestions} questions about where you stand on issues before the Kansas
              Legislature — education, healthcare, religious freedom, LGBTQ+ rights, and
              reproductive rights. We compare your answers to how legislators have actually voted,
              so you can see who aligns with you.
            </ThemedText>
            <ThemedText style={[styles.introBody, { color: mutedText }]}>
              Your answers are saved to your account and are never shown to anyone else. If
              you&apos;d rather not answer a question, choose &quot;Not Sure&quot; — that topic
              will simply be left out of your results instead of guessing for you.
            </ThemedText>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.resultButton,
              { backgroundColor: tint },
              pressed && styles.pressed,
            ]}
            onPress={onStart}
          >
            <ThemedText style={styles.resultButtonText}>Start Quiz</ThemedText>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

function ResultsView({
  result,
  questions,
  getResponse,
  editResponse,
  onDone,
  onRetake,
  onViewLegislators,
  tint,
  mutedText,
  surface,
  border,
}: {
  result: ReturnType<typeof useQuiz>['result'];
  questions: ReturnType<typeof useQuiz>['questions'];
  getResponse: ReturnType<typeof useQuiz>['getResponse'];
  editResponse: ReturnType<typeof useQuiz>['editResponse'];
  onDone: () => void;
  onRetake: () => void;
  onViewLegislators: () => void;
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
}) {
  if (!result) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: mutedText }}>No results available</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.header}>
          <Pressable onPress={onDone} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tint} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Your Results
          </ThemedText>
          <Pressable onPress={onRetake} style={styles.backButton}>
            <MaterialIcons name="refresh" size={22} color={tint} />
          </Pressable>
        </View>
      </ContentContainer>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ContentContainer style={styles.contentPadding}>
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <MaterialIcons name="check-circle" size={52} color="#4CAF50" style={styles.resultIcon} />
            <ThemedText type="title" style={styles.resultTitle}>
              Quiz Complete!
            </ThemedText>
            <ThemedText type="caption" style={[styles.resultSubtitle, { color: mutedText }]}>
              Your positions have been recorded. Visit a legislator&apos;s profile to see how you match.
            </ThemedText>
          </View>

          <ElectedsByIssueCard
            result={result}
            tint={tint}
            mutedText={mutedText}
            surface={surface}
            border={border}
          />

          <EditAnswersCard
            questions={questions}
            getResponse={getResponse}
            editResponse={editResponse}
            tint={tint}
            mutedText={mutedText}
            surface={surface}
            border={border}
          />

          <View style={styles.resultActions}>
            <Pressable
              style={({ pressed }) => [
                styles.resultButton,
                { backgroundColor: tint },
                pressed && styles.pressed,
              ]}
              onPress={onViewLegislators}
            >
              <MaterialIcons name="people" size={20} color="#fff" />
              <ThemedText style={styles.resultButtonText}>See Legislator Matches</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.resultButton,
                styles.secondaryButton,
                { borderColor: border },
                pressed && styles.pressed,
              ]}
              onPress={onRetake}
            >
              <MaterialIcons name="refresh" size={18} color={mutedText} />
              <ThemedText style={[styles.resultButtonTextSecondary, { color: mutedText }]}>
                Retake Quiz
              </ThemedText>
            </Pressable>
          </View>
        </ContentContainer>
      </ScrollView>
    </ThemedView>
  );
}

/* ── Electeds-by-Issue Breakdown ──
   Replaces the old "Your Positions" list: for each issue category, how the
   user aligns with each of their My Electeds. Per-issue rows exist only for
   voting-record-scored legislators; BT50 scorecard matches are composite-only
   by design (the API has no category data — never fabricate it), so those
   electeds appear under a single "Overall Match" group instead. */

function ElectedsByIssueCard({
  result,
  tint,
  mutedText,
  surface,
  border,
}: {
  result: NonNullable<ReturnType<typeof useQuiz>['result']>;
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
}) {
  const { myElecteds, isLoaded } = useSavedOfficials();
  // Pass the rendered result in so matching uses exactly what's on screen,
  // not the hook's own (possibly lagging) Firestore re-read.
  const { getMatch, computeScore, isComputing } = useLegislatorMatch(result);

  // Kick off voting-record analysis for each state elected. evenIfBt50Covered
  // because BT50 covers essentially the whole KS Legislature and only has
  // composite scores — the per-issue rows here need real vote data. The hook
  // dedupes in-flight work, skips non-state chambers, and the underlying
  // bill/roll-call fetches are cached and shared.
  useEffect(() => {
    myElecteds.forEach((official) => void computeScore(official, { evenIfBt50Covered: true }));
  }, [myElecteds, computeScore]);

  const matches = myElecteds.map((official) => ({ official, match: getMatch(official) }));
  const vrMatches = matches.filter((m) => m.match?.votingRecordMatch != null);
  const bt50Matches = matches.filter((m) => m.match != null && m.match.votingRecordMatch == null);
  // Electeds with no scoreable data at all (federal delegation, governor —
  // no KS session votes and no numeric-district BT50 row).
  const unmatched = matches.filter((m) => m.match == null);
  const anyComputing = myElecteds.some((official) => isComputing(official.id));

  const categoryBlocks = ISSUE_CATEGORIES.map((cat) => {
    const userScore = result.categoryScores[cat];
    const rows = vrMatches.flatMap(({ official, match }) => {
      const catScore = match?.votingRecordMatch?.categoryScores.find((s) => s.category === cat);
      return catScore ? [{ official, percent: catScore.alignmentPercent }] : [];
    });
    return { cat, userScore, rows };
  }).filter((block) => block.userScore != null && block.rows.length > 0);

  const hasAnyContent = categoryBlocks.length > 0 || bt50Matches.length > 0;

  const matchRow = (key: string, name: string, percent: number) => (
    <View key={key} style={styles.electedMatchRow}>
      <ThemedText type="caption" style={styles.electedMatchName} numberOfLines={1}>
        {name}
      </ThemedText>
      <View style={[styles.barOuter, styles.electedMatchBar, { backgroundColor: border + '40' }]}>
        <View
          style={[styles.barInner, { backgroundColor: scoreColor(percent), width: `${percent}%` }]}
        />
      </View>
      <ThemedText style={[styles.electedMatchPct, { color: scoreColor(percent) }]}>
        {percent}%
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        How You Match Your Electeds
      </ThemedText>

      {!isLoaded ? (
        <View style={styles.computingRow}>
          <ActivityIndicator size="small" color={tint} />
        </View>
      ) : myElecteds.length === 0 ? (
        <ThemedText type="caption" style={[styles.byIssueNote, { color: mutedText }]}>
          Set your electeds with the address lookup on the Electeds tab, then come back to see how
          you align with them on each issue.
        </ThemedText>
      ) : (
        <>
          {categoryBlocks.map(({ cat, userScore, rows }) => (
            <View key={cat} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryLabelGroup}>
                  <MaterialIcons
                    name={CATEGORY_ICONS[cat as IssueCategory] as IconName}
                    size={16}
                    color={mutedText}
                  />
                  <ThemedText style={styles.categoryLabel}>{cat}</ThemedText>
                </View>
                <ThemedText type="caption" style={{ color: mutedText }}>
                  You: {positionText(userScore!)}
                </ThemedText>
              </View>
              {rows.map(({ official, percent }) => matchRow(official.id, official.name, percent))}
            </View>
          ))}

          {bt50Matches.length > 0 && (
            <View style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryLabelGroup}>
                  <MaterialIcons name="assessment" size={16} color={mutedText} />
                  <ThemedText style={styles.categoryLabel}>Overall Match</ThemedText>
                </View>
              </View>
              {bt50Matches.map(({ official, match }) =>
                matchRow(official.id, official.name, match!.compositePercent),
              )}
              <ThemedText type="caption" style={[styles.byIssueNote, { color: mutedText }]}>
                Scorecard-based matches don&apos;t include per-issue detail.
              </ThemedText>
            </View>
          )}

          {unmatched.length > 0 && !anyComputing && (
            <ThemedText type="caption" style={[styles.byIssueNote, { color: mutedText }]}>
              No scored voting record for{' '}
              {unmatched.map((m) => m.official.name).join(', ')} — issue-level matching covers
              Kansas state legislators.
            </ThemedText>
          )}

          {anyComputing && (
            <View style={styles.computingRow}>
              <ActivityIndicator size="small" color={tint} />
              <ThemedText type="caption" style={{ color: mutedText }}>
                Analyzing voting records…
              </ThemedText>
            </View>
          )}

          {!hasAnyContent && !anyComputing && unmatched.length === 0 && (
            <ThemedText type="caption" style={[styles.byIssueNote, { color: mutedText }]}>
              No match data is available for your electeds yet.
            </ThemedText>
          )}
        </>
      )}
    </View>
  );
}

/* ── Edit Answers ──
   Per-question editing on the results screen: tap a question to reveal the
   response options and change it without retaking the quiz. Edits recompute
   the result (and the electeds breakdown above) immediately and persist. */

function EditAnswersCard({
  questions,
  getResponse,
  editResponse,
  tint,
  mutedText,
  surface,
  border,
}: {
  questions: ReturnType<typeof useQuiz>['questions'];
  getResponse: ReturnType<typeof useQuiz>['getResponse'];
  editResponse: ReturnType<typeof useQuiz>['editResponse'];
  tint: string;
  mutedText: string;
  surface: string;
  border: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const responseLabel = (questionId: string): string => {
    const value = getResponse(questionId);
    if (value == null) return 'Skipped';
    return RESPONSE_LEVELS.find((level) => level.value === value)?.label ?? 'Skipped';
  };

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Review Your Answers
      </ThemedText>
      <ThemedText type="caption" style={[styles.editAnswersHint, { color: mutedText }]}>
        Tap a question to change your answer — your matches update instantly.
      </ThemedText>

      {questions.map((question) => {
        const expanded = expandedId === question.id;
        const current = getResponse(question.id);
        const answered = current != null;
        return (
          <View key={question.id} style={[styles.editQuestionBlock, { borderTopColor: border + '60' }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit answer for: ${question.text}`}
              style={({ pressed }) => [styles.editQuestionRow, pressed && styles.pressed]}
              onPress={() => setExpandedId(expanded ? null : question.id)}
            >
              <View style={styles.editQuestionText}>
                <ThemedText type="caption" numberOfLines={expanded ? undefined : 2}>
                  {question.text}
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: answered ? tint : mutedText, fontWeight: '600' }}
                >
                  {responseLabel(question.id)}
                </ThemedText>
              </View>
              <MaterialIcons
                name={expanded ? 'expand-less' : 'expand-more'}
                size={20}
                color={mutedText}
              />
            </Pressable>

            {expanded && (
              <View style={styles.editOptions}>
                {RESPONSE_LEVELS.map((level) => {
                  const selected = current === level.value;
                  return (
                    <Pressable
                      key={level.value}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.editOption,
                        { borderColor: selected ? tint : border },
                        selected && { backgroundColor: tint + '15' },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        setExpandedId(null);
                        void editResponse(question.id, level.value);
                      }}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: selected ? tint : mutedText, fontWeight: selected ? '700' : '400' }}
                      >
                        {level.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: Spacing.md,
  },
  headerTitle: {
    fontSize: 17,
  },
  progressBarOuter: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  contentPadding: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  questionText: {
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: Spacing.md,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  optionLabel: {
    fontSize: 16,
  },
  navRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navSpacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  resultIcon: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  resultTitle: {
    textAlign: 'center',
  },
  resultSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  introBody: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  scoreText: {
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '800',
  },
  electedMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  electedMatchName: {
    flexBasis: 110,
    flexShrink: 0,
  },
  electedMatchBar: {
    flex: 1,
  },
  electedMatchPct: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  computingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  byIssueNote: {
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  editAnswersHint: {
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  editQuestionBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  editQuestionText: {
    flex: 1,
    gap: 2,
  },
  editOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  editOption: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  categoryRow: {
    marginBottom: Spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  categoryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryPct: {
    fontSize: 14,
    fontWeight: '700',
  },
  barOuter: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barInner: {
    height: 8,
    borderRadius: 4,
  },
  resultActions: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  resultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 15,
    borderRadius: Radius.md,
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  resultButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
});
