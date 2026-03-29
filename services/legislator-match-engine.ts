import type { IssueCategory } from '@/constants/quiz-questions';
import { tagBill, type BillTag } from '@/services/bill-category-tagger';

export interface CategoryMatchScore {
  category: IssueCategory;
  userScore: number;
  legislatorScore: number;
  alignmentScore: number;
  votesAnalyzed: number;
  alignmentPercent: number;
}

export interface LegislatorMatchScore {
  legislatorId: string;
  categoryScores: CategoryMatchScore[];
  compositeScore: number;
  totalVotesAnalyzed: number;
  categoriesMatched: number;
  compositePercent: number;
}

export interface VoteRecord {
  billNumber: string;
  billTitle: string;
  voteText: string;
}

const legislatorPositionScore = (
  voteText: string,
  isProgressiveIfYea: boolean,
): number | null => {
  switch (voteText.toLowerCase()) {
    case 'yea':
      return isProgressiveIfYea ? 5.0 : 1.0;
    case 'nay':
      return isProgressiveIfYea ? 1.0 : 5.0;
    default:
      return null;
  }
};

const alignmentScore = (userScore: number, legislatorScore: number): number => {
  const maxDifference = 4.0;
  return Math.max(0.0, 1.0 - Math.abs(userScore - legislatorScore) / maxDifference);
};

export const calculateMatch = (
  legislatorId: string,
  categoryScoresMap: Partial<Record<IssueCategory, number>>,
  voteRecords: VoteRecord[],
): LegislatorMatchScore | null => {
  if (Object.keys(categoryScoresMap).length === 0 || voteRecords.length === 0) {
    return null;
  }

  const votesByCategory: Partial<Record<IssueCategory, number[]>> = {};

  for (const record of voteRecords) {
    const tag: BillTag | null = tagBill(record.billNumber, record.billTitle);
    if (!tag) continue;

    const score = legislatorPositionScore(record.voteText, tag.isProgressiveIfYea);
    if (score == null) continue;

    if (!votesByCategory[tag.category]) votesByCategory[tag.category] = [];
    votesByCategory[tag.category]!.push(score);
  }

  const scores: CategoryMatchScore[] = [];

  for (const [category, votes] of Object.entries(votesByCategory) as [IssueCategory, number[]][]) {
    const userScore = categoryScoresMap[category];
    if (userScore == null || votes.length === 0) continue;

    const legislatorAvg = votes.reduce((a, b) => a + b, 0) / votes.length;
    const alignment = alignmentScore(userScore, legislatorAvg);

    scores.push({
      category,
      userScore,
      legislatorScore: legislatorAvg,
      alignmentScore: alignment,
      votesAnalyzed: votes.length,
      alignmentPercent: Math.round(alignment * 100),
    });
  }

  if (scores.length === 0) return null;

  scores.sort((a, b) => a.category.localeCompare(b.category));

  const composite = scores.reduce((sum, s) => sum + s.alignmentScore, 0) / scores.length;

  return {
    legislatorId,
    categoryScores: scores,
    compositeScore: composite,
    totalVotesAnalyzed: scores.reduce((sum, s) => sum + s.votesAnalyzed, 0),
    categoriesMatched: scores.length,
    compositePercent: Math.round(composite * 100),
  };
};

export const matchLabel = (compositePercent: number): string => {
  if (compositePercent >= 80) return 'Strong Alignment';
  if (compositePercent >= 60) return 'Moderate Alignment';
  if (compositePercent >= 40) return 'Mixed Alignment';
  return 'Low Alignment';
};

export const positionText = (score: number): string => {
  if (score < 1.5) return 'Very Conservative';
  if (score < 2.5) return 'Conservative';
  if (score < 3.5) return 'Moderate';
  if (score < 4.5) return 'Progressive';
  return 'Very Progressive';
};
