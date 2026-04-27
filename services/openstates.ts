import { Platform } from 'react-native';

const OPENSTATES_BASE_URL = 'https://v3.openstates.org';
const OPENSTATES_API_KEY = process.env.EXPO_PUBLIC_OPENSTATES_API_KEY ?? '';

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
  const response = await fetch(url, {
    headers: { 'X-API-KEY': OPENSTATES_API_KEY },
  });

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

export const getOfficialDetail = async (id: string): Promise<OfficialDetail> => {
  const url = `${OPENSTATES_BASE_URL}/people?id=${encodeURIComponent(id)}&include=links&include=sources&include=offices`;
  const response = await fetch(url, {
    headers: { 'X-API-KEY': OPENSTATES_API_KEY },
  });

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

export interface CommitteeAssignment {
  name: string;
  day: string;
  time: string;
  room: string;
  url: string;
}

const parseCommitteesFromHtml = (html: string): CommitteeAssignment[] => {
  const startMarker = '<!-- begin committee memberships -->';
  const endMarker = '<!-- end committee memberships -->';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start < 0 || end < 0) return [];

  const section = html.slice(start, end);
  const linkPattern =
    /<a[^>]*href="(\/li\/[^"]*committees\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
  const assignments: CommitteeAssignment[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(section)) !== null) {
    const url = `https://www.kslegislature.gov${match[1]}`;
    const raw = match[2].trim();

    const parts = raw.match(
      /^(.+?)\s*-\s*Day:\s*(.+?)\s*-\s*Time:\s*(.+?)\s*-\s*Room:\s*(.+)$/,
    );
    if (parts) {
      assignments.push({
        name: parts[1].trim(),
        day: parts[2].trim(),
        time: parts[3].trim(),
        room: parts[4].trim(),
        url,
      });
    } else {
      assignments.push({ name: raw, day: '', time: '', room: '', url });
    }
  }

  return assignments;
};

export const getCommitteeAssignments = async (
  legislatureUrl: string,
): Promise<CommitteeAssignment[]> => {
  try {
    if (Platform.OS === 'web') {
      const fnUrl = `/.netlify/functions/ksleg-committees?url=${encodeURIComponent(legislatureUrl)}`;
      const response = await fetch(fnUrl);
      if (!response.ok) return [];
      const data = await response.json();
      return data.committees ?? [];
    }

    const response = await fetch(legislatureUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    if (!response.ok) return [];
    return parseCommitteesFromHtml(await response.text());
  } catch {
    return [];
  }
};

interface PeopleListResponse {
  results: OpenStatesPerson[];
  pagination: { max_page: number; page: number };
}

const isKansasLegislator = (person: OpenStatesPerson): boolean => {
  if (person.jurisdiction?.name !== 'Kansas') return false;
  const roleClass = person.current_role?.org_classification;
  return roleClass === 'upper' || roleClass === 'lower';
};

export const getKansasLegislators = async (): Promise<Official[]> => {
  const all: Official[] = [];
  let page = 1;

  while (true) {
    const url = `${OPENSTATES_BASE_URL}/people?jurisdiction=Kansas&per_page=50&page=${page}`;
    const response = await fetch(url, {
      headers: { 'X-API-KEY': OPENSTATES_API_KEY },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenStates API error (${response.status}): ${text}`);
    }

    const data: PeopleListResponse = await response.json();
    all.push(...data.results.filter(isKansasLegislator).map(transformPerson));

    if (page >= data.pagination.max_page) break;
    page++;
  }

  return all;
};

const KS_CONGRESSIONAL_COORDS = [
  { lat: 38.84, lng: -99.33 },
  { lat: 39.05, lng: -95.68 },
  { lat: 39.01, lng: -94.68 },
  { lat: 37.69, lng: -97.34 },
];

export const getKansasFederalDelegation = async (): Promise<Official[]> => {
  const calls = KS_CONGRESSIONAL_COORDS.map(async ({ lat, lng }) => {
    try {
      const url = `${OPENSTATES_BASE_URL}/people.geo?lat=${lat}&lng=${lng}`;
      const response = await fetch(url, {
        headers: { 'X-API-KEY': OPENSTATES_API_KEY },
      });
      if (!response.ok) return [];
      const data: PeopleResponse = await response.json();
      return data.results
        .filter((p) => p.jurisdiction?.name === 'United States')
        .map(transformPerson);
    } catch {
      return [];
    }
  });

  const results = await Promise.all(calls);
  const seen = new Set<string>();
  return results.flat().filter((official) => {
    if (seen.has(official.id)) return false;
    seen.add(official.id);
    return true;
  });
};
