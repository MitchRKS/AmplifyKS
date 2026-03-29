const BT50_BASE_URL = 'https://www.billtrack50.com/BT50Api/2.1/json';
const BT50_API_KEY = process.env.EXPO_PUBLIC_BILLTRACK50_API_KEY ?? '';
const SCORECARD_ID = 4579;
export const SCORECARD_NAME = '2026 KSLeg Scorecard';

export interface BT50LegislatorScore {
  legislatorID: number;
  firstName: string;
  lastName: string;
  party: string;
  chamber: string;
  district: string;
  districtName: string | null;
  voteIndex: string | null;
  totalScore: string | null;
  possibleScore: string | null;
}

export interface BT50Scorecard {
  scorecardID: number;
  scorecardName: string;
  stateCode: string;
  subtitle: string | null;
  ratedBills: number | null;
  categories: { categoryID: number; categoryName: string }[];
  publicFlag: boolean | null;
}

export const parseVoteIndex = (score: BT50LegislatorScore) => {
  const value = parseFloat(score.voteIndex ?? '') || 0;
  return {
    voteIndexValue: value,
    voteIndexPercent: Math.round(value),
    voteIndexFraction: value / 100,
    totalScoreValue: parseFloat(score.totalScore ?? '') || 0,
    possibleScoreValue: parseFloat(score.possibleScore ?? '') || 0,
  };
};

export const districtNumber = (district: string): number | null => {
  const digits = district.replace(/\D/g, '');
  const num = parseInt(digits, 10);
  return isNaN(num) ? null : num;
};

interface BT50Cache {
  scorecard: BT50Scorecard | null;
  scores: BT50LegislatorScore[];
  fetchedAt: number | null;
}

const cache: BT50Cache = {
  scorecard: null,
  scores: [],
  fetchedAt: null,
};

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const isCacheValid = (): boolean =>
  cache.fetchedAt != null && Date.now() - cache.fetchedAt < CACHE_DURATION_MS;

const bt50Request = async <T>(path: string): Promise<T> => {
  const url = `${BT50_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `apikey ${BT50_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid BillTrack50 API key');
    if (response.status === 429) throw new Error('BillTrack50 rate limited');
    throw new Error(`BillTrack50 server error (${response.status})`);
  }

  return response.json();
};

export const fetchScorecardData = async (): Promise<{
  scorecard: BT50Scorecard | null;
  scores: BT50LegislatorScore[];
}> => {
  if (isCacheValid() && cache.scores.length > 0) {
    return { scorecard: cache.scorecard, scores: cache.scores };
  }

  try {
    const [scorecardsRes, legislatorsRes] = await Promise.all([
      bt50Request<{ scorecards: BT50Scorecard[] }>('/scorecards'),
      bt50Request<{ legislators: BT50LegislatorScore[] }>(
        `/scorecards/${SCORECARD_ID}/legislators`,
      ),
    ]);

    const scorecard = scorecardsRes.scorecards.find(
      (sc) => sc.scorecardID === SCORECARD_ID,
    ) ?? null;

    cache.scorecard = scorecard;
    cache.scores = legislatorsRes.legislators;
    cache.fetchedAt = Date.now();

    return { scorecard, scores: legislatorsRes.legislators };
  } catch (err) {
    console.error('BT50 fetch failed:', err);
    return { scorecard: cache.scorecard, scores: cache.scores };
  }
};

export const matchLegislatorToScore = (
  name: string,
  district: string,
  chamber: string,
  scores: BT50LegislatorScore[],
): BT50LegislatorScore | null => {
  const targetLast = name.split(/\s+/).pop()?.toLowerCase() ?? '';
  const targetFirstInitial = name.charAt(0).toLowerCase();
  const targetDistrict = parseInt(district, 10);

  const normalizedChamber =
    chamber.toLowerCase().includes('senate') ? 'Senate' : 'House';

  return (
    scores.find((s) => {
      if (s.lastName.toLowerCase() !== targetLast) return false;
      if (!s.firstName.toLowerCase().startsWith(targetFirstInitial)) return false;
      if (districtNumber(s.district) !== targetDistrict) return false;
      if (s.chamber !== normalizedChamber) return false;
      return true;
    }) ?? null
  );
};
