import { collection, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ISSUE_CATEGORIES,
  QUIZ_QUESTIONS,
  type IssueCategory,
  type ResponseValue,
} from '@/constants/quiz-questions';
import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';

interface UserQuizResponse {
  questionId: string;
  response: ResponseValue | null;
  timestamp: Date;
  isSkipped: boolean;
}

export interface QuizResultSummary {
  completedDate: Date;
  categoryScores: Partial<Record<IssueCategory, number>>;
  totalQuestionsAnswered: number;
  mainstreamAlignmentScore: number;
  overallProgressiveness: number;
}

interface QuizState {
  responses: Record<string, UserQuizResponse>;
  result: QuizResultSummary | null;
  hasTakenQuiz: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
}

const computeResults = (responses: Record<string, UserQuizResponse>): QuizResultSummary => {
  const buckets: Partial<Record<IssueCategory, number[]>> = {};

  for (const resp of Object.values(responses)) {
    if (resp.isSkipped || resp.response == null || resp.response === 0) continue;
    const question = QUIZ_QUESTIONS.find((q) => q.id === resp.questionId);
    if (!question) continue;
    const cat = question.category;
    if (!buckets[cat]) buckets[cat] = [];
    buckets[cat]!.push(resp.response);
  }

  const categoryScores: Partial<Record<IssueCategory, number>> = {};
  for (const cat of ISSUE_CATEGORIES) {
    const scores = buckets[cat];
    if (scores && scores.length > 0) {
      categoryScores[cat] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  const answered = Object.values(responses).filter((r) => !r.isSkipped).length;
  const scoreValues = Object.values(categoryScores).filter((v): v is number => v != null && v > 0);
  const avg = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0;
  const alignment = scoreValues.length > 0 ? Math.round(((avg - 1) / 4) * 100) : 0;

  return {
    completedDate: new Date(),
    categoryScores,
    totalQuestionsAnswered: answered,
    mainstreamAlignmentScore: alignment,
    overallProgressiveness: avg,
  };
};

export function useQuiz() {
  const { user } = useAuth();
  const [state, setState] = useState<QuizState>({
    responses: {},
    result: null,
    hasTakenQuiz: false,
    isLoading: true,
    isSubmitting: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!user) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    const load = async () => {
      try {
        const db = getFirestoreDb();
        const ref = doc(collection(doc(db, 'users', user.uid), 'quizs'), 'latest');
        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }

        const data = snapshot.data();
        const responses: Record<string, UserQuizResponse> = {};

        if (Array.isArray(data.responses)) {
          for (const r of data.responses) {
            if (typeof r.questionId === 'string') {
              responses[r.questionId] = {
                questionId: r.questionId,
                response: typeof r.response === 'number' ? (r.response as ResponseValue) : null,
                timestamp: r.timestamp?.toDate?.() ?? new Date(),
                isSkipped: r.isSkipped === true,
              };
            }
          }
        }

        const categoryScores: Partial<Record<IssueCategory, number>> = {};
        if (data.categoryScores && typeof data.categoryScores === 'object') {
          for (const [key, val] of Object.entries(data.categoryScores)) {
            if (typeof val === 'number') {
              categoryScores[key as IssueCategory] = val;
            }
          }
        }

        const result: QuizResultSummary = {
          completedDate: data.completedDate?.toDate?.() ?? new Date(),
          categoryScores,
          totalQuestionsAnswered: data.totalQuestionsAnswered ?? 0,
          mainstreamAlignmentScore: data.mainstreamAlignmentScore ?? 0,
          overallProgressiveness: data.overallProgressiveness ?? 0,
        };

        setState({
          responses,
          result,
          hasTakenQuiz: true,
          isLoading: false,
          isSubmitting: false,
        });
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    };

    load();
  }, [user?.uid]);

  const submitResponse = useCallback((questionId: string, response: ResponseValue) => {
    setState((s) => ({
      ...s,
      responses: {
        ...s.responses,
        [questionId]: { questionId, response, timestamp: new Date(), isSkipped: false },
      },
    }));
  }, []);

  const skipQuestion = useCallback((questionId: string) => {
    setState((s) => {
      if (s.responses[questionId]) return s;
      return {
        ...s,
        responses: {
          ...s.responses,
          [questionId]: { questionId, response: null, timestamp: new Date(), isSkipped: true },
        },
      };
    });
  }, []);

  const getResponse = useCallback(
    (questionId: string): ResponseValue | null => {
      return state.responses[questionId]?.response ?? null;
    },
    [state.responses],
  );

  const completionPercentage =
    QUIZ_QUESTIONS.length > 0
      ? QUIZ_QUESTIONS.filter((q) => state.responses[q.id] != null).length / QUIZ_QUESTIONS.length
      : 0;

  const isComplete = QUIZ_QUESTIONS.every((q) => state.responses[q.id] != null);

  const submitQuiz = useCallback(async () => {
    const finalResponses = { ...stateRef.current.responses };
    for (const q of QUIZ_QUESTIONS) {
      if (!finalResponses[q.id]) {
        finalResponses[q.id] = { questionId: q.id, response: null, timestamp: new Date(), isSkipped: true };
      }
    }

    setState((s) => ({ ...s, responses: finalResponses, isSubmitting: true }));

    const result = computeResults(finalResponses);

    setState((s) => ({ ...s, result, hasTakenQuiz: true, isSubmitting: false }));

    if (!user) return;

    try {
      const db = getFirestoreDb();
      const ref = doc(collection(doc(db, 'users', user.uid), 'quizs'), 'latest');

      const responsesArray = Object.values(finalResponses).map((r) => {
        const entry: Record<string, unknown> = {
          questionId: r.questionId,
          timestamp: Timestamp.fromDate(r.timestamp),
          isSkipped: r.isSkipped,
        };
        if (r.response != null) entry.response = r.response;
        return entry;
      });

      const categoryScoresDict: Record<string, number> = {};
      for (const [key, val] of Object.entries(result.categoryScores)) {
        if (val != null) categoryScoresDict[key] = val;
      }

      await setDoc(ref, {
        completedDate: Timestamp.fromDate(result.completedDate),
        categoryScores: categoryScoresDict,
        totalQuestionsAnswered: result.totalQuestionsAnswered,
        responses: responsesArray,
        overallProgressiveness: result.overallProgressiveness,
        mainstreamAlignmentScore: result.mainstreamAlignmentScore,
      });
    } catch (err) {
      console.error('Quiz Firebase save failed:', err);
    }
  }, [user]);

  const resetQuiz = useCallback(() => {
    setState({
      responses: {},
      result: null,
      hasTakenQuiz: false,
      isLoading: false,
      isSubmitting: false,
    });
  }, []);

  return {
    questions: QUIZ_QUESTIONS,
    responses: state.responses,
    result: state.result,
    hasTakenQuiz: state.hasTakenQuiz,
    isLoading: state.isLoading,
    isSubmitting: state.isSubmitting,
    completionPercentage,
    isComplete,
    submitResponse,
    skipQuestion,
    getResponse,
    submitQuiz,
    resetQuiz,
  };
}

export const alignmentLabel = (score: number): string => {
  if (score >= 80) return 'Strong Alignment';
  if (score >= 60) return 'Moderate Alignment';
  if (score >= 40) return 'Some Alignment';
  return 'Low Alignment';
};

export const categoryAlignmentPercent = (score: number): number => {
  if (score <= 0) return 0;
  return Math.round(((score - 1) / 4) * 100);
};
