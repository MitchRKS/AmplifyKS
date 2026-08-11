import {
  buildSuggestionLabel,
  MIN_QUERY_LENGTH,
  suggestKansasAddresses,
} from '../address-autocomplete';

const feature = (
  properties: Record<string, unknown>,
  coordinates: [number, number] = [-95.678, 39.048],
) => ({ properties, geometry: { coordinates } });

const mockPhoton = (features: unknown[]) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ features }),
  }) as unknown as typeof fetch;
};

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
});
