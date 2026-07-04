// The match engine pulls in bill-category-tagger, which imports Firebase for
// override fetching (not used here). Mock it out so jest never has to load
// firebase's mixed CJS/ESM distribution.
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), getDocs: jest.fn() }));
jest.mock('@/services/firebase', () => ({ getFirestoreDb: jest.fn() }));

import {
  calculateMatch,
  matchLabel,
  positionText,
  type VoteRecord,
} from '@/services/legislator-match-engine';

// Bill titles chosen to hit specific keyword rules in bill-category-tagger.
const healthcareYea: VoteRecord = {
  billNumber: 'HB 2001',
  billTitle: 'Expanding medicaid coverage for rural communities',
  voteText: 'Yea',
};
const healthcareNay: VoteRecord = { ...healthcareYea, voteText: 'Nay' };
const educationYea: VoteRecord = {
  billNumber: 'SB 100',
  billTitle: 'Increasing teacher salaries in public school districts',
  voteText: 'Yea',
};
const untaggedBill: VoteRecord = {
  billNumber: 'HB 9999',
  billTitle: 'Designating the official state reptile',
  voteText: 'Yea',
};

describe('calculateMatch', () => {
  it('returns null when there are no quiz scores or no votes', () => {
    expect(calculateMatch('leg-1', {}, [healthcareYea])).toBeNull();
    expect(calculateMatch('leg-1', { Healthcare: 5 }, [])).toBeNull();
  });

  it('returns null when no votes match a scored category', () => {
    expect(calculateMatch('leg-1', { Healthcare: 5 }, [untaggedBill])).toBeNull();
    expect(calculateMatch('leg-1', { Education: 3 }, [healthcareYea])).toBeNull();
  });

  it('scores perfect alignment as 100%', () => {
    // Healthcare is progressive-if-yea; a Yea maps to 5.0, matching userScore 5.
    const match = calculateMatch('leg-1', { Healthcare: 5 }, [healthcareYea]);
    expect(match).not.toBeNull();
    expect(match!.compositePercent).toBe(100);
    expect(match!.categoryScores).toHaveLength(1);
    expect(match!.categoryScores[0]).toMatchObject({
      category: 'Healthcare',
      userScore: 5,
      legislatorScore: 5,
      alignmentPercent: 100,
      votesAnalyzed: 1,
    });
  });

  it('scores maximal disagreement as 0%', () => {
    // Nay maps to 1.0 vs userScore 5 → |diff| 4 / maxDifference 4 → alignment 0.
    const match = calculateMatch('leg-1', { Healthcare: 5 }, [healthcareNay]);
    expect(match!.compositePercent).toBe(0);
  });

  it('averages multiple votes within a category', () => {
    // One Yea (5.0) + one Nay (1.0) → legislator average 3.0 vs userScore 5
    // → alignment 1 - 2/4 = 0.5.
    const match = calculateMatch('leg-1', { Healthcare: 5 }, [
      healthcareYea,
      healthcareNay,
    ]);
    expect(match!.categoryScores[0].legislatorScore).toBe(3);
    expect(match!.categoryScores[0].alignmentPercent).toBe(50);
    expect(match!.totalVotesAnalyzed).toBe(2);
  });

  it('ignores non-Yea/Nay votes and untagged bills', () => {
    const abstain: VoteRecord = { ...healthcareYea, voteText: 'Absent' };
    const match = calculateMatch('leg-1', { Healthcare: 5 }, [
      healthcareYea,
      abstain,
      untaggedBill,
    ]);
    expect(match!.totalVotesAnalyzed).toBe(1);
  });

  it('averages alignment across categories into the composite', () => {
    const match = calculateMatch(
      'leg-1',
      { Healthcare: 5, Education: 1 },
      [healthcareYea, educationYea],
    );
    // Healthcare: perfect (1.0). Education: Yea=5 vs user 1 → 0.
    expect(match!.categoriesMatched).toBe(2);
    expect(match!.compositePercent).toBe(50);
    // Categories are sorted alphabetically.
    expect(match!.categoryScores.map((s) => s.category)).toEqual([
      'Education',
      'Healthcare',
    ]);
  });
});

describe('matchLabel', () => {
  it('maps composite percent to labels at the documented boundaries', () => {
    expect(matchLabel(80)).toBe('Strong Alignment');
    expect(matchLabel(79)).toBe('Moderate Alignment');
    expect(matchLabel(60)).toBe('Moderate Alignment');
    expect(matchLabel(59)).toBe('Mixed Alignment');
    expect(matchLabel(40)).toBe('Mixed Alignment');
    expect(matchLabel(39)).toBe('Low Alignment');
    expect(matchLabel(0)).toBe('Low Alignment');
  });
});

describe('positionText', () => {
  it('maps scores to position labels at the documented boundaries', () => {
    expect(positionText(1)).toBe('Very Conservative');
    expect(positionText(1.5)).toBe('Conservative');
    expect(positionText(2.5)).toBe('Moderate');
    expect(positionText(3.5)).toBe('Progressive');
    expect(positionText(4.5)).toBe('Very Progressive');
    expect(positionText(5)).toBe('Very Progressive');
  });
});
