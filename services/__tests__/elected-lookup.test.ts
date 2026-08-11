import {
  composeAddress,
  geocodeAddress,
  hasGeocodableAddress,
  lookupElectedsForAddress,
} from '../elected-lookup';
import { getOfficialsByLocation } from '../openstates';

jest.mock('../openstates', () => ({
  getOfficialsByLocation: jest.fn(),
}));

const mockGetOfficials = getOfficialsByLocation as jest.Mock;

const mockFetchJson = (payload: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve(payload),
  }) as unknown as typeof fetch;
};

const nominatimHit = (overrides: Record<string, unknown> = {}) => [
  {
    lat: '39.0473',
    lon: '-95.6752',
    address: { state: 'Kansas' },
    ...overrides,
  },
];

afterEach(() => {
  jest.resetAllMocks();
});

describe('geocodeAddress', () => {
  it('parses coordinates and recognizes Kansas', async () => {
    mockFetchJson(nominatimHit());
    const result = await geocodeAddress('123 Main St, Topeka');
    expect(result).toEqual({ lat: 39.0473, lng: -95.6752, inKansas: true });
  });

  it('flags a non-Kansas state', async () => {
    mockFetchJson(nominatimHit({ address: { state: 'Missouri' } }));
    const result = await geocodeAddress('123 Main St, Kansas City, MO');
    expect(result?.inKansas).toBe(false);
  });

  it('treats a missing state field as in-Kansas (do not block valid lookups)', async () => {
    mockFetchJson(nominatimHit({ address: {} }));
    const result = await geocodeAddress('somewhere vague');
    expect(result?.inKansas).toBe(true);
  });

  it('returns null when nothing matches', async () => {
    mockFetchJson([]);
    expect(await geocodeAddress('gibberish')).toBeNull();
  });
});

describe('lookupElectedsForAddress', () => {
  it('returns officials for an in-Kansas address', async () => {
    mockFetchJson(nominatimHit());
    const officials = [{ id: 'ks-state-house-58' }, { id: 'ks-state-senate-19' }];
    mockGetOfficials.mockResolvedValue(officials);

    const result = await lookupElectedsForAddress('123 Main St, Topeka, KS 66612');
    expect(result).toEqual({ status: 'ok', officials });
    expect(mockGetOfficials).toHaveBeenCalledWith(39.0473, -95.6752);
  });

  it('reports an unresolvable address without calling the officials API', async () => {
    mockFetchJson([]);
    const result = await lookupElectedsForAddress('gibberish');
    expect(result).toEqual({ status: 'address-not-found' });
    expect(mockGetOfficials).not.toHaveBeenCalled();
  });

  it('reports an out-of-state address without calling the officials API', async () => {
    mockFetchJson(nominatimHit({ address: { state: 'Missouri' } }));
    const result = await lookupElectedsForAddress('123 Main St, Kansas City, MO');
    expect(result).toEqual({ status: 'out-of-state' });
    expect(mockGetOfficials).not.toHaveBeenCalled();
  });

  it('reports when the location has no electeds', async () => {
    mockFetchJson(nominatimHit());
    mockGetOfficials.mockResolvedValue([]);
    const result = await lookupElectedsForAddress('123 Main St, Topeka');
    expect(result).toEqual({ status: 'no-results' });
  });

  it('propagates lookup failures to the caller', async () => {
    mockFetchJson(nominatimHit());
    mockGetOfficials.mockRejectedValue(new Error('rate limited'));
    await expect(lookupElectedsForAddress('123 Main St, Topeka')).rejects.toThrow('rate limited');
  });
});

describe('composeAddress', () => {
  it('joins all parts', () => {
    expect(
      composeAddress({ streetAddress: '123 Main St', city: 'Topeka', state: 'KS', zip: '66612' }),
    ).toBe('123 Main St, Topeka, KS 66612');
  });

  it('skips blank parts without dangling separators', () => {
    expect(composeAddress({ streetAddress: '123 Main St', city: 'Topeka', state: '', zip: '' })).toBe(
      '123 Main St, Topeka',
    );
    expect(composeAddress({ streetAddress: '', city: 'Topeka', state: 'KS', zip: '' })).toBe(
      'Topeka, KS',
    );
  });
});

describe('hasGeocodableAddress', () => {
  it('requires both street and city', () => {
    expect(
      hasGeocodableAddress({ streetAddress: '123 Main St', city: 'Topeka', state: 'KS', zip: '' }),
    ).toBe(true);
    expect(hasGeocodableAddress({ streetAddress: '123 Main St', city: ' ', state: 'KS', zip: '66612' })).toBe(false);
    expect(hasGeocodableAddress({ streetAddress: '', city: 'Topeka', state: 'KS', zip: '66612' })).toBe(false);
  });
});
