// LegiScan API Service
// API Documentation: https://legiscan.com/gaits/documentation/legiscan

import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGISCAN_API_KEY = '18cf0e63a5cb8e7b5cd0e5102f664e2a';
const LEGISCAN_BASE_URL = 'https://api.legiscan.com';
const SPONSORED_BILLS_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const VOTING_RECORD_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface LegiscanResponse {
  status: string;
  [key: string]: any;
}

interface PersistentCacheEntry<T> {
  timestamp: number;
  data: T;
}

interface SessionListResponse extends LegiscanResponse {
  sessions: Array<{
    session_id: number;
    state_id: number;
    year_start: number;
    year_end: number;
    session_name: string;
    special: number;
  }>;
}

interface BillSummary {
  bill_id: number;
  number: string;
  title: string;
  description: string;
  status: number;
  status_date: string;
  last_action_date: string;
  last_action: string;
  url: string;
  state_link: string;
  change_hash: string;
}

interface MasterListResponse extends LegiscanResponse {
  masterlist: {
    [key: string]: BillSummary;
  };
}

interface BillDetailResponse extends LegiscanResponse {
  bill: {
    bill_id: number;
    bill_number: string;
    title: string;
    description: string;
    state: string;
    session: {
      session_id: number;
      session_name: string;
      year_start: number;
      year_end: number;
    };
    status: number;
    status_date: string;
    url: string;
    state_link: string;
    sponsors: Array<{
      people_id: number;
      person_hash: string;
      party_id: number;
      party: string;
      role_id: number;
      role: string;
      name: string;
      first_name: string;
      middle_name: string;
      last_name: string;
      suffix: string;
      nickname: string;
      district: string;
      sponsor_type_id: number;
      sponsor_order: number;
    }>;
    history: Array<{
      date: string;
      action: string;
      chamber: string;
      chamber_id: number;
      importance: number;
    }>;
    committee?: {
      committee_id: number;
      chamber: string;
      chamber_id: number;
      name: string;
    };
    texts: Array<{
      doc_id: number;
      date: string;
      type: string;
      type_id: number;
      mime: string;
      mime_id: number;
      url: string;
      state_link: string;
    }>;
    votes: Array<{
      roll_call_id: number;
      date?: string;
      desc?: string;
      chamber?: string;
    }>;
    amendments: Array<any>;
    supplements: Array<any>;
    calendar: Array<any>;
  };
}

/**
 * Make a request to the LegiScan API
 */
async function makeApiRequest(operation: string, params: Record<string, string | number> = {}): Promise<any> {
  const queryParams = new URLSearchParams({
    key: LEGISCAN_API_KEY,
    op: operation,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const url = `${LEGISCAN_BASE_URL}/?${queryParams.toString()}`;

  console.log('LegiScan API Request:', operation, params);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LegiscanResponse = await response.json();
    console.log('LegiScan API Response:', operation, data);

    if (data.status !== 'OK') {
      console.error('API Error Status:', data);
      throw new Error(data.status || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('LegiScan API Error:', error);
    throw error;
  }
}

/**
 * Get list of sessions for a state
 * @param state - Two letter state abbreviation (e.g., 'KS' for Kansas)
 */
export async function getSessionList(state: string = 'KS'): Promise<SessionListResponse['sessions']> {
  const data: SessionListResponse = await makeApiRequest('getSessionList', { state });
  return data.sessions || [];
}

/**
 * Get the most recent session for Kansas
 */
export async function getCurrentSession(): Promise<number> {
  const sessions = await getSessionList('KS');
  
  console.log('Available sessions:', sessions);
  
  if (!sessions || sessions.length === 0) {
    throw new Error('No sessions found for Kansas');
  }

  // The API returns sessions in order with most recent first, so just take the first one
  const currentSession = sessions[0];
  console.log('Current session selected:', currentSession);
  return currentSession.session_id;
}

/**
 * Get master list of bills for a session
 * @param sessionId - Session ID from getSessionList
 */
export async function getMasterList(sessionId: number): Promise<BillSummary[]> {
  const data: MasterListResponse = await makeApiRequest('getMasterList', { id: sessionId });
  
  console.log('Master list data:', data);
  
  if (!data.masterlist) {
    console.log('No masterlist in response');
    return [];
  }

  // Convert object to array
  const bills = Object.values(data.masterlist);
  console.log(`Fetched ${bills.length} bills`);
  return bills;
}

/**
 * Get bills for the current Kansas session
 */
export async function getKansasBills(): Promise<BillSummary[]> {
  const sessionId = await getCurrentSession();
  return getMasterList(sessionId);
}

/**
 * Get detailed information about a specific bill
 * @param billId - Bill ID from master list
 */
export async function getBillDetail(billId: number): Promise<BillDetailResponse['bill']> {
  const data: BillDetailResponse = await makeApiRequest('getBill', { id: billId });
  return data.bill;
}

/**
 * Get bill text document
 * @param docId - Document ID from bill texts array
 */
export async function getBillText(docId: number): Promise<any> {
  const data = await makeApiRequest('getBillText', { id: docId });
  return data.text;
}

/**
 * Search bills by query
 * @param query - Search query string
 * @param state - State abbreviation (default: KS)
 * @param year - Year to search (default: current year)
 */
export async function searchBills(query: string, state: string = 'KS', year?: number): Promise<any> {
  const params: Record<string, string | number> = {
    state,
    query,
  };

  if (year) {
    params.year = year;
  }

  const data = await makeApiRequest('search', params);
  return data.searchresult || [];
}

export interface SponsoredBillSummary {
  billId: number;
  billNumber: string;
  title: string;
  lastAction: string;
  lastActionDate: string;
  url: string;
}

// ── Voting Record Types & Functions ──

interface SessionPerson {
  people_id: number;
  name: string;
  first_name: string;
  last_name: string;
  district: string;
  role: string;
}

interface RollCallVote {
  people_id: number;
  vote_id: number;
  vote_text: string;
}

interface RollCall {
  roll_call_id: number;
  bill_id: number;
  date: string | null;
  desc: string | null;
  chamber: string | null;
  votes: RollCallVote[];
}

export interface LegislatorVoteRecord {
  billNumber: string;
  billTitle: string;
  voteText: string;
  voteDate: string | null;
}

const sessionPeopleCache = new Map<number, SessionPerson[]>();
const rollCallCache = new Map<number, RollCall>();
const votingRecordCache = new Map<string, LegislatorVoteRecord[]>();
const sponsoredBillsCache = new Map<string, SponsoredBillSummary[]>();

const readPersistentCache = async <T>(
  key: string,
  ttlMs: number,
): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistentCacheEntry<T>;
    if (Date.now() - parsed.timestamp > ttlMs) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const writePersistentCache = async <T>(key: string, data: T): Promise<void> => {
  try {
    const payload: PersistentCacheEntry<T> = { timestamp: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures; network path still works.
  }
};

async function getSessionPeople(sessionId: number): Promise<SessionPerson[]> {
  if (sessionPeopleCache.has(sessionId)) return sessionPeopleCache.get(sessionId)!;

  const data = await makeApiRequest('getSessionPeople', { id: sessionId });
  const people: SessionPerson[] = data.sessionpeople?.people ?? [];
  sessionPeopleCache.set(sessionId, people);
  return people;
}

async function getRollCall(rollCallId: number): Promise<RollCall> {
  if (rollCallCache.has(rollCallId)) return rollCallCache.get(rollCallId)!;

  const data = await makeApiRequest('getRollCall', { id: rollCallId });
  const rollCall: RollCall = data.roll_call;
  rollCallCache.set(rollCallId, rollCall);
  return rollCall;
}

const matchesLegislatorName = (apiName: string, targetName: string): boolean => {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').trim();
  const api = normalize(apiName);
  const target = normalize(targetName);
  if (api === target) return true;

  const apiParts = api.split(/\s+/);
  const targetParts = target.split(/\s+/);
  const apiLast = apiParts[apiParts.length - 1];
  const targetLast = targetParts[targetParts.length - 1];
  return apiLast === targetLast && apiParts[0][0] === targetParts[0][0];
};

async function resolvePeopleId(
  legislatorName: string,
  district: string,
  chamber: string,
  sessionId: number,
): Promise<number | null> {
  const people = await getSessionPeople(sessionId);
  const districtNum = parseInt(district, 10);
  const chamberRole = chamber.toLowerCase().includes('senate') ? 'Sen' : 'Rep';

  const candidates = people.filter((p) => {
    const pDistrict = parseInt(p.district, 10);
    if (!isNaN(districtNum) && !isNaN(pDistrict) && pDistrict === districtNum) {
      if (p.role?.startsWith(chamberRole)) return true;
    }
    return false;
  });

  const byName = candidates.find((p) => matchesLegislatorName(p.name, legislatorName));
  if (byName) return byName.people_id;
  if (candidates.length === 1) return candidates[0].people_id;

  const fallback = people.find((p) => matchesLegislatorName(p.name, legislatorName));
  return fallback?.people_id ?? null;
}

export async function fetchVotingRecord(
  legislatorName: string,
  district: string,
  chamber: string,
  maxBillScans: number = 200,
): Promise<LegislatorVoteRecord[]> {
  const sessionId = await getCurrentSession();
  const cacheKey = `${legislatorName}_${district}_${chamber}_${sessionId}`;
  const persistentKey = `legiscan:voting-record:${cacheKey}`;

  if (votingRecordCache.has(cacheKey)) return votingRecordCache.get(cacheKey)!;
  const persisted = await readPersistentCache<LegislatorVoteRecord[]>(
    persistentKey,
    VOTING_RECORD_CACHE_TTL_MS,
  );
  if (persisted) {
    votingRecordCache.set(cacheKey, persisted);
    return persisted;
  }

  const peopleId = await resolvePeopleId(legislatorName, district, chamber, sessionId);
  if (peopleId == null) return [];

  const allBills = await getMasterList(sessionId);
  const sorted = [...allBills]
    .sort((a, b) => (b.last_action_date ?? '').localeCompare(a.last_action_date ?? ''))
    .slice(0, maxBillScans);

  const records: LegislatorVoteRecord[] = [];
  const seenRollCalls = new Set<number>();

  for (const bill of sorted) {
    try {
      const detail = await getBillDetail(bill.bill_id);
      if (!detail.votes || detail.votes.length === 0) continue;

      for (const voteSummary of detail.votes) {
        const rollCallId = voteSummary.roll_call_id;
        if (!rollCallId || seenRollCalls.has(rollCallId)) continue;

        const rollCall = await getRollCall(rollCallId);
        const legislatorVote = rollCall.votes.find((v) => v.people_id === peopleId);
        if (!legislatorVote) continue;

        seenRollCalls.add(rollCallId);
        records.push({
          billNumber: detail.bill_number ?? bill.number,
          billTitle: detail.title ?? bill.title,
          voteText: legislatorVote.vote_text,
          voteDate: rollCall.date ?? voteSummary.date ?? null,
        });
      }
    } catch {
      continue;
    }
  }

  records.sort((a, b) => (b.voteDate ?? '').localeCompare(a.voteDate ?? ''));
  votingRecordCache.set(cacheKey, records);
  await writePersistentCache(persistentKey, records);
  return records;
}

export async function searchSponsoredBills(
  lastName: string,
): Promise<SponsoredBillSummary[]> {
  const normalizedLastName = lastName.trim().toLowerCase();
  const cacheKey = `legiscan:sponsored-bills:${normalizedLastName}`;
  if (sponsoredBillsCache.has(cacheKey)) {
    return sponsoredBillsCache.get(cacheKey)!;
  }
  const persisted = await readPersistentCache<SponsoredBillSummary[]>(
    cacheKey,
    SPONSORED_BILLS_CACHE_TTL_MS,
  );
  if (persisted) {
    sponsoredBillsCache.set(cacheKey, persisted);
    return persisted;
  }

  const data = await makeApiRequest('search', {
    state: 'KS',
    query: `sponsor:${lastName}`,
  });

  const searchResult = data.searchresult ?? {};
  const bills: SponsoredBillSummary[] = [];

  for (const [key, value] of Object.entries(searchResult)) {
    if (!/^\d+$/.test(key)) continue;
    const item = value as Record<string, any>;
    bills.push({
      billId: item.bill_id,
      billNumber: item.bill_number,
      title: item.title ?? '',
      lastAction: item.last_action ?? '',
      lastActionDate: item.last_action_date ?? '',
      url: item.url ?? '',
    });
  }

  sponsoredBillsCache.set(cacheKey, bills);
  await writePersistentCache(cacheKey, bills);
  return bills;
}

/**
 * Map LegiScan status codes to readable status strings
 */
export function getStatusLabel(statusCode: number): string {
  // Common status codes (these may vary by state)
  const statusMap: Record<number, string> = {
    1: 'Introduced',
    2: 'Engrossed',
    3: 'Enrolled',
    4: 'Passed',
    5: 'Vetoed',
    6: 'Failed',
    7: 'Override',
    8: 'Chaptered',
  };

  return statusMap[statusCode] || 'In Progress';
}

/**
 * Get chamber from bill number
 */
export function getChamber(billNumber?: string): 'House' | 'Senate' | 'Unknown' {
  if (!billNumber || typeof billNumber !== 'string') {
    console.warn('Invalid bill number:', billNumber);
    return 'Unknown';
  }
  
  const prefix = billNumber.toUpperCase().substring(0, 2);
  
  if (prefix === 'HB' || prefix === 'HR' || prefix === 'HJ' || prefix === 'HC') {
    return 'House';
  } else if (prefix === 'SB' || prefix === 'SR' || prefix === 'SJ' || prefix === 'SC') {
    return 'Senate';
  }
  
  return 'Unknown';
}

/**
 * Get full chamber name from chamber code
 */
export function getFullChamberName(chamberCode: string): string {
  const code = chamberCode.toUpperCase();
  if (code === 'H') {
    return 'House';
  } else if (code === 'S') {
    return 'Senate';
  }
  return chamberCode; // Return as-is if unknown
}

/**
 * Format committee name with chamber prefix
 * Converts API committee data to full format like "House Committee on Education"
 */
export function formatCommitteeName(chamber: string, name: string): string {
  const fullChamber = getFullChamberName(chamber);
  return `${fullChamber} Committee on ${name}`;
}
