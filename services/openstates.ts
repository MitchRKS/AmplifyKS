const OPENSTATES_BASE_URL = 'https://v3.openstates.org';
const OPENSTATES_API_KEY = process.env.EXPO_PUBLIC_OPENSTATES_API_KEY ?? '';

interface OpenStatesRole {
  type: string;
  district: string;
  jurisdiction: {
    id: string;
    name: string;
    classification: string;
  };
}

interface OpenStatesParty {
  name: string;
}

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
  party: OpenStatesParty[];
  current_role?: OpenStatesRole;
  contact_details?: OpenStatesContactDetail[];
  links?: OpenStatesLink[];
  openstates_url?: string;
}

interface PeopleGeoResponse {
  results: OpenStatesPerson[];
}

const chamberLabel = (roleType: string): string => {
  switch (roleType) {
    case 'upper':
      return 'Senate';
    case 'lower':
      return 'House';
    case 'governor':
      return 'Governor';
    case 'lt_governor':
      return 'Lt. Governor';
    default:
      return roleType;
  }
};

const transformPerson = (person: OpenStatesPerson): Official => ({
  id: person.id,
  name: person.name,
  givenName: person.given_name ?? '',
  familyName: person.family_name ?? '',
  image: person.image ?? '',
  email: person.email ?? '',
  party: person.party?.[0]?.name ?? '',
  chamber: person.current_role ? chamberLabel(person.current_role.type) : '',
  district: person.current_role?.district ?? '',
  jurisdiction: person.current_role?.jurisdiction?.name ?? '',
  contactDetails: person.contact_details ?? [],
  links: person.links ?? [],
  openstatesUrl: person.openstates_url ?? '',
});

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

  const data: PeopleGeoResponse = await response.json();
  return data.results.map(transformPerson);
};

export const getKansasLegislators = async (): Promise<Official[]> => {
  const url = `${OPENSTATES_BASE_URL}/people?jurisdiction=Kansas&per_page=100`;
  const response = await fetch(url, {
    headers: { 'X-API-KEY': OPENSTATES_API_KEY },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenStates API error (${response.status}): ${text}`);
  }

  const data: PeopleGeoResponse = await response.json();
  return data.results.map(transformPerson);
};
