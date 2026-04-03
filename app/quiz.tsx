import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useGamification } from '@/contexts/gamification-context';
import { useQuiz } from '@/hooks/use-quiz';
import { positionText } from '@/services/legislator-match-engine';
import { useThemeColor } from '@/hooks/use-theme-color';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function QuizScreen() {
  const router = useRouter();
  const quiz = useQuiz();
  const { recordAction } = useGamification();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

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
    recordAction('Quiz Completed', 'Completed the political alignment quiz');
    setShowResults(true);
  };

  const handleRetake = () => {
    quiz.resetQuiz();
    setCurrentIndex(0);
    setShowResults(false);
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

function ResultsView({
  result,
  onDone,
  onRetake,
  onViewLegislators,
  tint,
  mutedText,
  surface,
  border,
}: {
  result: ReturnType<typeof useQuiz>['result'];
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
              Your positions have been recorded. Visit a legislator's profile to see how you match.
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Your Positions
            </ThemedText>

            {ISSUE_CATEGORIES.map((cat) => {
              const score = result.categoryScores[cat];
              if (score == null) return null;
              const label = positionText(score);
              return (
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
                    <ThemedText style={[styles.categoryPct, { color: tint }]}>
                      {label}
                    </ThemedText>
                  </View>
                  <View style={[styles.barOuter, { backgroundColor: border + '40' }]}>
                    <View
                      style={[
                        styles.barInner,
                        { backgroundColor: tint, width: `${Math.round(((score - 1) / 4) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

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
    padding: Spacing.xs,
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
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  scoreText: {
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '800',
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
