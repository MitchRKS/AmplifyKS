import {
  buildSuggestionLabel,
  formatCensusAddress,
  looksCompleteEnoughForCensus,
  MIN_QUERY_LENGTH,
  suggestKansasAddresses,
} from '../address-autocomplete';

const feature = (
  properties: Record<string, unknown>,
  coordinates: [number, number] = [-95.678, 39.048],
) => ({ properties, geometry: { coordinates } });

// Routes by URL: Photon gets `features`, the Census geocoder gets `censusMatches`
// (or a failure when null).
const mockPhoton = (features: unknown[], censusMatches: unknown[] | null = []) => {
  global.fetch = jest.fn((url: string) => {
    if (String(url).includes('geocoding.geo.census.gov')) {
      if (censusMatches === null) return Promise.resolve({ ok: false });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ result: { addressMatches: censusMatches } }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ features }) });
  }) as unknown as typeof fetch;
};

const censusMatch = (matchedAddress: string, lat: number, lng: number) => ({
  matchedAddress,
  coordinates: { x: lng, y: lat },
});

describe('buildSuggestionLabel', () => {
  it('prefers housenumber + street over the place name', () => {
    expect(
      buildSuggestionLabel({
        name: 'Kansas State Capitol',
        housenumber: '300',
        street: 'Southwest 10th Avenue',
        city: 'Topeka',
        state: 'KS',
        postcode: '66612',
      }),
    ).toBe('300 Southwest 10th Avenue, Topeka, KS 66612');
  });

  it('falls back to the name for unnumbered places', () => {
    expect(buildSuggestionLabel({ name: 'Gage Park', city: 'Topeka', state: 'KS' })).toBe(
      'Gage Park, Topeka, KS',
    );
  });

  it('returns null with nothing usable', () => {
    expect(buildSuggestionLabel({ city: 'Topeka' })).toBeNull();
  });
});

describe('suggestKansasAddresses', () => {
  it('returns nothing for short queries without fetching', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    expect(await suggestKansasAddresses('12')).toEqual([]);
    expect('12'.length).toBeLessThan(MIN_QUERY_LENGTH);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps features to labeled suggestions with coordinates', async () => {
    mockPhoton([
      feature(
        { osm_type: 'W', osm_id: 1, housenumber: '300', street: 'SW 10th Ave', city: 'Topeka', state: 'KS' },
        [-95.678, 39.048],
      ),
    ]);
    const results = await suggestKansasAddresses('300 SW 10th');
    expect(results).toEqual([
      { id: 'W-1', label: '300 SW 10th Ave, Topeka, KS', lat: 39.048, lng: -95.678 },
    ]);
  });

  it('filters transit stops, non-Kansas results, and duplicate labels', async () => {
    mockPhoton([
      feature({ osm_id: 1, housenumber: '300', street: 'SW 10th Ave', city: 'Topeka', state: 'KS' }),
      // Same address as an OSM bus stop — noise.
      feature({ osm_id: 2, housenumber: '300', street: 'SW 10th Ave', city: 'Topeka', state: 'KS', osm_value: 'bus_stop' }),
      // Duplicate label from a second OSM object.
      feature({ osm_id: 3, housenumber: '300', street: 'SW 10th Ave', city: 'Topeka', state: 'KS' }),
      feature({ osm_id: 4, housenumber: '1', street: 'Main St', city: 'Kansas City', state: 'Missouri' }),
    ]);
    const results = await suggestKansasAddresses('300 SW 10th');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('300 SW 10th Ave, Topeka, KS');
  });

  it('caps the list at five suggestions', async () => {
    mockPhoton(
      Array.from({ length: 8 }, (_, i) =>
        feature({ osm_id: i, housenumber: String(i), street: 'Main St', city: 'Topeka', state: 'KS' }),
      ),
    );
    expect(await suggestKansasAddresses('Main St Topeka')).toHaveLength(5);
  });

  it('resolves to an empty list on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await suggestKansasAddresses('300 SW 10th')).toEqual([]);
  });

  it('ranks verified Census matches first, formatted, above Photon results', async () => {
    mockPhoton(
      [feature({ osm_id: 1, housenumber: '9', street: 'Elm St', city: 'Salina', state: 'KS' }, [-97.6, 38.8])],
      [censusMatch('1200 SW HARRISON ST, TOPEKA, KS, 66612', 39.0441, -95.6812)],
    );
    const results = await suggestKansasAddresses('1200 SW Harrison St Topeka');
    expect(results[0]).toEqual({
      id: 'census-1200 SW HARRISON ST, TOPEKA, KS, 66612',
      label: '1200 SW Harrison St, Topeka, KS 66612',
      lat: 39.0441,
      lng: -95.6812,
      verified: true,
    });
    expect(results[1].label).toBe('9 Elm St, Salina, KS');
    expect(results[1].verified).toBeUndefined();
  });

  it('drops Photon suggestions that duplicate a verified match by proximity', async () => {
    mockPhoton(
      [feature({ osm_id: 1, housenumber: '1200', street: 'Southwest Harrison Street', city: 'Topeka', state: 'KS' }, [-95.6813, 39.0442])],
      [censusMatch('1200 SW HARRISON ST, TOPEKA, KS, 66612', 39.0441, -95.6812)],
    );
    const results = await suggestKansasAddresses('1200 SW Harrison St Topeka');
    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(true);
  });

  it('skips the Census call for incomplete input', async () => {
    mockPhoton([feature({ osm_id: 1, housenumber: '300', street: 'SW 10th Ave', city: 'Topeka', state: 'KS' })]);
    await suggestKansasAddresses('300 SW 10th');
    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('census'))).toBe(false);
  });

  it('falls back to Photon-only when the Census request fails', async () => {
    mockPhoton(
      [feature({ osm_id: 1, housenumber: '1200', street: 'SW Harrison St', city: 'Topeka', state: 'KS' })],
      null,
    );
    const results = await suggestKansasAddresses('1200 SW Harrison St Topeka');
    expect(results).toHaveLength(1);
    expect(results[0].verified).toBeUndefined();
  });
});

describe('looksCompleteEnoughForCensus', () => {
  it('requires a house number plus at least three more words', () => {
    expect(looksCompleteEnoughForCensus('1200 SW Harrison St Topeka')).toBe(true);
    expect(looksCompleteEnoughForCensus('1200 SW Harrison St')).toBe(true);
    expect(looksCompleteEnoughForCensus('1200 SW Harrison')).toBe(false);
    expect(looksCompleteEnoughForCensus('Main St Topeka Kansas')).toBe(false);
  });
});

describe('formatCensusAddress', () => {
  it('title-cases while preserving directionals, state, and the ZIP', () => {
    expect(formatCensusAddress('1200 SW HARRISON ST, TOPEKA, KS, 66612')).toBe(
      '1200 SW Harrison St, Topeka, KS 66612',
    );
  });
});
