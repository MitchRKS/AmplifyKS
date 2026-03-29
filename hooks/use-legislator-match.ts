import { useCallback, useEffect, useRef, useState } from 'react';

import type { IssueCategory } from '@/constants/quiz-questions';
import { fetchOverrides } from '@/services/bill-category-tagger';
import {
  fetchScorecardData,
  matchLegislatorToScore,
  parseVoteIndex,
  type BT50LegislatorScore,
  type BT50Scorecard,
} from '@/services/billtrack50';
import { fetchVotingRecord } from '@/services/legiscan';
import {
  calculateMatch,
  type LegislatorMatchScore,
  type VoteRecord,
} from '@/services/legislator-match-engine';
import type { Official } from '@/services/openstates';
import { useQuiz } from '@/hooks/use-quiz';

export interface ResolvedMatchResult {
  compositePercent: number;
  source: 'bt50' | 'voting-record';
  bt50Score: BT50LegislatorScore | null;
  votingRecordMatch: LegislatorMatchScore | null;
  userAlignmentScore: number | null;
}

const computeAlignmentScore = (
  categoryScores: Partial<Record<IssueCategory, number>>,
): number => {
  const values = Object.values(categoryScores).filter(
    (v): v is number => v != null && v > 0,
  );
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(((avg - 1) / 4) * 100);
};

interface MatchState {
  bt50Scorecard: BT50Scorecard | null;
  bt50Scores: BT50LegislatorScore[];
  bt50Loaded: boolean;
  votingRecordMatches: Record<string, LegislatorMatchScore>;
  computing: Set<string>;
}

export function useLegislatorMatch() {
  const { result } = useQuiz();
  const [state, setState] = useState<MatchState>({
    bt50Scorecard: null,
    bt50Scores: [],
    bt50Loaded: false,
    votingRecordMatches: {},
    computing: new Set(),
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const isMatchAvailable =
    result != null && Object.keys(result.categoryScores).length > 0;

  useEffect(() => {
    if (stateRef.current.bt50Loaded) return;
    const load = async () => {
      const { scorecard, scores } = await fetchScorecardData();
      setState((s) => ({
        ...s,
        bt50Scorecard: scorecard,
        bt50Scores: scores,
        bt50Loaded: true,
      }));
    };
    load();
  }, []);

  const getMatch = useCallback(
    (official: Official): ResolvedMatchResult | null => {
      if (!result || Object.keys(result.categoryScores).length === 0) return null;

      const userAlignment = computeAlignmentScore(result.categoryScores);

      const bt50 = matchLegislatorToScore(
        official.name,
        official.district,
        official.chamber,
        stateRef.current.bt50Scores,
      );

      if (bt50) {
        const { voteIndexPercent } = parseVoteIndex(bt50);
        const matchPct = Math.max(0, 100 - Math.abs(voteIndexPercent - userAlignment));
        return {
          compositePercent: matchPct,
          source: 'bt50',
          bt50Score: bt50,
          votingRecordMatch: null,
          userAlignmentScore: userAlignment,
        };
      }

      const vrMatch = stateRef.current.votingRecordMatches[official.id] ?? null;
      if (vrMatch) {
        return {
          compositePercent: vrMatch.compositePercent,
          source: 'voting-record',
          bt50Score: null,
          votingRecordMatch: vrMatch,
          userAlignmentScore: userAlignment,
        };
      }

      return null;
    },
    [result],
  );

  const isComputing = useCallback(
    (legislatorId: string): boolean =>
      stateRef.current.computing.has(legislatorId),
    [],
  );

  const computeScore = useCallback(
    async (official: Official) => {
      if (!result || Object.keys(result.categoryScores).length === 0) return;

      const bt50 = matchLegislatorToScore(
        official.name,
        official.district,
        official.chamber,
        stateRef.current.bt50Scores,
      );
      if (bt50) return;

      if (stateRef.current.votingRecordMatches[official.id]) return;
      if (stateRef.current.computing.has(official.id)) return;

      setState((s) => ({
        ...s,
        computing: new Set(s.computing).add(official.id),
      }));

      try {
        await fetchOverrides();

        const voteRecords = await fetchVotingRecord(
          official.name,
          official.district,
          official.chamber,
        );

        const mapped: VoteRecord[] = voteRecords.map((r) => ({
          billNumber: r.billNumber,
          billTitle: r.billTitle,
          voteText: r.voteText,
        }));

        const matchScore = calculateMatch(
          official.id,
          result.categoryScores as Partial<Record<IssueCategory, number>>,
          mapped,
        );

        if (matchScore) {
          setState((s) => ({
            ...s,
            votingRecordMatches: {
              ...s.votingRecordMatches,
              [official.id]: matchScore,
            },
          }));
        }
      } catch {
        // Supplementary — fail silently
      } finally {
        setState((s) => {
          const next = new Set(s.computing);
          next.delete(official.id);
          return { ...s, computing: next };
        });
      }
    },
    [result],
  );

  return {
    isMatchAvailable,
    bt50Loaded: state.bt50Loaded,
    bt50Scorecard: state.bt50Scorecard,
    getMatch,
    isComputing,
    computeScore,
  };
}
