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

const mockGeoResponse = (results: unknown[]) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ results }),
  }) as unknown as typeof fetch;
};

beforeEach(() => {
  (readPersistentCache as jest.Mock).mockResolvedValue({
    data: CACHED_DELEGATION,
    isFresh: true,
  });
});

describe('getOfficialsByLocation federal backfill', () => {
  it('backfills the statewide U.S. Senators when people.geo returns none', async () => {
    mockGeoResponse([
      geoPerson('ocd-person/state-rep', 'State Rep', 'Kansas', 'lower', '57'),
      geoPerson('ocd-person/state-sen', 'State Sen', 'Kansas', 'upper', '19'),
    ]);

    const officials = await getOfficialsByLocation(39.0473, -95.6752);
    const names = officials.map((o) => o.name);

    expect(names).toContain('Jerry Moran');
    expect(names).toContain('Roger Marshall');
    // The right U.S. House rep depends on the point's district — it must NOT
    // be guessed from the statewide delegation.
    expect(names).not.toContain('Derek Schmidt');
    expect(officials).toHaveLength(4);
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
