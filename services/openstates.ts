import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getCommitteeAssignmentsLocal,
  getCommitteeByIdLocal,
  getKansasCommitteesLocal,
  getKansasLegislatorsLocal,
  getOfficialDetailLocal,
  isLocalLegislatorId,
} from './kansas-legislators';

const OPENSTATES_BASE_URL = 'https://v3.openstates.org';
const OPENSTATES_API_KEY = process.env.EXPO_PUBLIC_OPENSTATES_API_KEY ?? '';

const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const MIN_REQUEST_SPACING_MS = 1100;

interface PersistentCacheEntry<T> {
  timestamp: number;
  data: T;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const queuedFetch = (input: string, init?: RequestInit): Promise<Response> => {
  const run = async (): Promise<Response> => {
    const wait = MIN_REQUEST_SPACING_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return fetch(input, init);
  };
  const next = queueTail.then(run, run);
  queueTail = next.catch(() => undefined);
  return next;
};

const openStatesHeaders = (): Record<string, string> => ({
  'X-API-KEY': OPENSTATES_API_KEY,
});

const readPersistentCache = async <T>(
  key: string,
  ttlMs: number,
): Promise<{ data: T; isFresh: boolean } | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistentCacheEntry<T>;
    const age = Date.now() - parsed.timestamp;
    return { data: parsed.data, isFresh: age <= ttlMs };
  } catch {
    return null;
  }
};

const writePersistentCache = async <T>(key: string, data: T): Promise<void> => {
  try {
    const payload: PersistentCacheEntry<T> = { timestamp: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* network path still works */
  }
};

interface OpenStatesContactDetail {
  note: string;
  address?: string;
  voice?: string;
  fax?: string;
}

interface OpenStatesLink {
  note?: string;
  url: string;
}

export interface Official {
  id: string;
  name: string;
  givenName: string;
  familyName: string;
  image: string;
  email: string;
  party: string;
  chamber: string;
  district: string;
  jurisdiction: string;
  contactDetails: OpenStatesContactDetail[];
  links: OpenStatesLink[];
  openstatesUrl: string;
}

interface OpenStatesPerson {
  id: string;
  name: string;
  given_name?: string;
  family_name?: string;
  image?: string;
  email?: string;
  party?: string;
  current_role?: {
    title?: string;
    org_classification?: string;
    district?: string;
    division_id?: string;
  };
  jurisdiction?: {
    id: string;
    name: string;
    classification: string;
  };
  contact_details?: OpenStatesContactDetail[];
  links?: OpenStatesLink[];
  openstates_url?: string;
}

interface PeopleResponse {
  results: OpenStatesPerson[];
}

const chamberLabel = (orgClassification: string): string => {
  switch (orgClassification) {
    case 'upper':
      return 'Senate';
    case 'lower':
      return 'House';
    case 'government':
      return 'Governor';
    default:
      return orgClassification;
  }
};

const transformPerson = (person: OpenStatesPerson): Official => {
  const isFederal = person.jurisdiction?.name === 'United States';
  const orgClass = person.current_role?.org_classification;
  let chamber = orgClass ? chamberLabel(orgClass) : '';
  if (isFederal && (chamber === 'Senate' || chamber === 'House')) {
    chamber = `U.S. ${chamber}`;
  }

  return {
    id: person.id,
    name: person.name,
    givenName: person.given_name ?? '',
    familyName: person.family_name ?? '',
    image: person.image ?? '',
    email: person.email ?? '',
    party: person.party ?? '',
    chamber,
    district: person.current_role?.district ?? '',
    jurisdiction: person.jurisdiction?.name ?? '',
    contactDetails: person.contact_details ?? [],
    links: person.links ?? [],
    openstatesUrl: person.openstates_url ?? '',
  };
};

export const getOfficialsByLocation = async (
  lat: number,
  lng: number,
): Promise<Official[]> => {
  const url = `${OPENSTATES_BASE_URL}/people.geo?lat=${lat}&lng=${lng}`;
  const response = await queuedFetch(url, { headers: openStatesHeaders() });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenStates API error (${response.status}): ${text}`);
  }

  const data: PeopleResponse = await response.json();
  return data.results.map(transformPerson);
};

interface OpenStatesOffice {
  name: string;
  address?: string;
  voice?: string;
  fax?: string;
  classification?: string;
}

interface OpenStatesSource {
  url: string;
  note?: string;
}

export interface OfficialDetail extends Official {
  title: string;
  offices: OpenStatesOffice[];
  sources: OpenStatesSource[];
  legislatureLinks: OpenStatesLink[];
}

const fetchOfficialDetailRemote = async (id: string): Promise<OfficialDetail> => {
  const url = `${OPENSTATES_BASE_URL}/people?id=${encodeURIComponent(id)}&include=links&include=sources&include=offices`;
  const response = await queuedFetch(url, { headers: openStatesHeaders() });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenStates API error (${response.status}): ${text}`);
  }

  const data: PeopleResponse = await response.json();
  if (!data.results.length) {
    throw new Error('Legislator not found');
  }

  const person = data.results[0] as OpenStatesPerson & {
    offices?: OpenStatesOffice[];
    sources?: OpenStatesSource[];
  };

  return {
    ...transformPerson(person),
    title: person.current_role?.title ?? '',
    offices: person.offices ?? [],
    sources: person.sources ?? [],
    legislatureLinks: (person.links as OpenStatesLink[]) ?? [],
  };
};

export const getOfficialDetail = async (id: string): Promise<OfficialDetail> => {
  if (isLocalLegislatorId(id)) {
    const local = getOfficialDetailLocal(id);
    if (!local) throw new Error('Legislator not found');
    return local;
  }
  return fetchOfficialDetailRemote(id);
};

export interface CommitteeAssignment {
  id: string;
  name: string;
  role: string;
  chamber: string;
  url: string;
}

export interface KansasCommitteeMember {
  personId: string;
  name: string;
  role: string;
}

export interface KansasCommittee {
  id: string;
  name: string;
  chamber: string;
  classification: string;
  parentId: string | null;
  url: string;
  members: KansasCommitteeMember[];
}

let nextRetryAllowedAt = 0;

class RateLimitedError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(`OpenStates rate limit hit; retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitedError';
    this.retryAfterMs = retryAfterMs;
  }
}

const parseRetryAfter = (header: string | null): number => {
  if (!header) return RATE_LIMIT_COOLDOWN_MS;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    const diff = dateMs - Date.now();
    if (diff > 0) return diff;
  }
  return RATE_LIMIT_COOLDOWN_MS;
};

export const getKansasLegislators = (): Promise<Official[]> =>
  Promise.resolve(getKansasLegislatorsLocal());

export const getKansasCommittees = (): Promise<KansasCommittee[]> =>
  Promise.resolve(getKansasCommitteesLocal());

export const getCommitteeById = (id: string): Promise<KansasCommittee | null> =>
  Promise.resolve(getCommitteeByIdLocal(id));

export const getCommitteeAssignments = (
  personId: string,
): Promise<CommitteeAssignment[]> =>
  Promise.resolve(getCommitteeAssignmentsLocal(personId));

const KS_CONGRESSIONAL_COORDS = [
  { lat: 38.84, lng: -99.33 },
  { lat: 39.05, lng: -95.68 },
  { lat: 39.01, lng: -94.68 },
  { lat: 37.69, lng: -97.34 },
];

const KANSAS_FEDERAL_CACHE_KEY = 'openstates:kansas-federal:v1';
const KANSAS_FEDERAL_TTL_MS = 24 * 60 * 60 * 1000;

let kansasFederalPromise: Promise<Official[]> | null = null;
let kansasFederalMemoryCache: Official[] | null = null;

const fetchKansasFederalRaw = async (): Promise<Official[]> => {
  const all: Official[] = [];
  for (const { lat, lng } of KS_CONGRESSIONAL_COORDS) {
    const url = `${OPENSTATES_BASE_URL}/people.geo?lat=${lat}&lng=${lng}`;
    const response = await queuedFetch(url, { headers: openStatesHeaders() });

    if (response.status === 429) {
      throw new RateLimitedError(parseRetryAfter(response.headers.get('retry-after')));
    }
    if (!response.ok) continue;

    const data: PeopleResponse = await response.json();
    all.push(
      ...data.results
        .filter((p) => p.jurisdiction?.name === 'United States')
        .map(transformPerson),
    );
  }

  const seen = new Set<string>();
  return all.filter((official) => {
    if (seen.has(official.id)) return false;
    seen.add(official.id);
    return true;
  });
};

const fetchAndCacheKansasFederal = async (): Promise<Official[]> => {
  const cached = await readPersistentCache<Official[]>(
    KANSAS_FEDERAL_CACHE_KEY,
    KANSAS_FEDERAL_TTL_MS,
  );

  if (cached?.isFresh) {
    kansasFederalMemoryCache = cached.data;
    return cached.data;
  }

  if (Date.now() < nextRetryAllowedAt) {
    if (cached) {
      kansasFederalMemoryCache = cached.data;
      return cached.data;
    }
    const waitMs = nextRetryAllowedAt - Date.now();
    throw new Error(
      `OpenStates rate limit active; retry in ${Math.ceil(waitMs / 1000)}s`,
    );
  }

  try {
    const fresh = await fetchKansasFederalRaw();
    kansasFederalMemoryCache = fresh;
    nextRetryAllowedAt = 0;
    void writePersistentCache(KANSAS_FEDERAL_CACHE_KEY, fresh);
    return fresh;
  } catch (err) {
    if (err instanceof RateLimitedError) {
      nextRetryAllowedAt = Date.now() + err.retryAfterMs;
    }
    if (cached) {
      kansasFederalMemoryCache = cached.data;
      return cached.data;
    }
    throw err;
  }
};

export const getKansasFederalDelegation = (): Promise<Official[]> => {
  if (kansasFederalMemoryCache) return Promise.resolve(kansasFederalMemoryCache);
  if (!kansasFederalPromise) {
    kansasFederalPromise = fetchAndCacheKansasFederal().catch((err) => {
      kansasFederalPromise = null;
      throw err;
    });
  }
  return kansasFederalPromise;
};
