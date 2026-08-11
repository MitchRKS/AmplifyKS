jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Serve the federal delegation from a fresh persistent cache so the senator
// backfill never needs its own network round-trips in these tests.
jest.mock('@/services/persistent-cache', () => ({
  readPersistentCache: jest.fn(),
  readFreshPersistentCache: jest.fn().mockResolvedValue(null),
  writePersistentCache: jest.fn().mockResolvedValue(undefined),
}));

import { readPersistentCache } from '@/services/persistent-cache';
import { getOfficialsByLocation } from '@/services/openstates';

const geoPerson = (
  id: string,
  name: string,
  jurisdiction: string,
  orgClassification: 'upper' | 'lower',
  district: string,
) => ({
  id,
  name,
  jurisdiction: { name: jurisdiction },
  current_role: { org_classification: orgClassification, district },
});

const CACHED_DELEGATION = [
  { id: 'ocd-person/moran', name: 'Jerry Moran', chamber: 'U.S. Senate', district: 'Kansas' },
  { id: 'ocd-person/marshall', name: 'Roger Marshall', chamber: 'U.S. Senate', district: 'Kansas' },
  { id: 'ocd-person/schmidt', name: 'Derek Schmidt', chamber: 'U.S. House', district: 'KS-2' },
];

// Route fetches by URL: OpenStates people.geo vs the Census CD geocoder.
const mockGeoResponse = (results: unknown[], censusDistrict: string | null = null) => {
  global.fetch = jest.fn((url: string) => {
    if (String(url).includes('geocoding.geo.census.gov')) {
      if (censusDistrict === null) return Promise.resolve({ ok: false });
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              geographies: {
                '119th Congressional Districts': [{ BASENAME: censusDistrict }],
              },
            },
          }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ results }) });
  }) as unknown as typeof fetch;
};

beforeEach(() => {
  (readPersistentCache as jest.Mock).mockResolvedValue({
    data: CACHED_DELEGATION,
    isFresh: true,
  });
});

describe('getOfficialsByLocation federal backfill', () => {
  it('backfills senators AND the district-resolved House rep when people.geo returns no federal', async () => {
    mockGeoResponse(
      [
        geoPerson('ocd-person/state-rep', 'State Rep', 'Kansas', 'lower', '57'),
        geoPerson('ocd-person/state-sen', 'State Sen', 'Kansas', 'upper', '19'),
      ],
      '2', // Census says this point is in KS-2
    );

    const officials = await getOfficialsByLocation(39.0473, -95.6752);
    const names = officials.map((o) => o.name);

    expect(names).toContain('Jerry Moran');
    expect(names).toContain('Roger Marshall');
    expect(names).toContain('Derek Schmidt'); // KS-2 in the cached delegation
    expect(officials).toHaveLength(5);
  });

  it('skips the House rep (keeps senators) when the Census lookup fails', async () => {
    mockGeoResponse(
      [geoPerson('ocd-person/state-rep', 'State Rep', 'Kansas', 'lower', '57')],
      null, // census unavailable
    );

    const officials = await getOfficialsByLocation(39.0473, -95.6752);
    const names = officials.map((o) => o.name);

    expect(names).toContain('Jerry Moran');
    expect(names).toContain('Roger Marshall');
    // Without a resolved district the rep must not be guessed.
    expect(names).not.toContain('Derek Schmidt');
  });

  it('leaves results alone when people.geo already includes federal senators', async () => {
    mockGeoResponse([
      geoPerson('ocd-person/state-rep', 'State Rep', 'Kansas', 'lower', '57'),
      geoPerson('ocd-person/live-moran', 'Jerry Moran', 'United States', 'upper', 'Kansas'),
    ]);

    const officials = await getOfficialsByLocation(39.0473, -95.6752);

    expect(officials).toHaveLength(2);
    expect(officials.filter((o) => o.chamber === 'U.S. Senate')).toHaveLength(1);
    // Not merged from cache: the live result's id is kept as-is.
    expect(officials.some((o) => o.id === 'ocd-person/marshall')).toBe(false);
  });
});
