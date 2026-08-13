/**
 * Kansas address suggestions for the lookup screens' search-as-you-type.
 *
 * Two complementary sources, merged:
 * - Photon (photon.komoot.io): OSM geocoder built for autocomplete — good at
 *   prefixes ("1200 SW Harr…"), but OSM's residential coverage is patchy and
 *   labels aren't postal-standard. Keyless, open CORS. Nominatim (used for
 *   one-shot geocoding in elected-lookup.ts) explicitly forbids autocomplete
 *   traffic, so it must NOT be used here.
 * - Census Bureau geocoder: authoritative TIGER address data returning
 *   standardized postal addresses ("1200 SW HARRISON ST, TOPEKA, KS, 66612")
 *   with coordinates — but it's a completer, not a typeahead: it needs a
 *   house number plus a full street name and city/ZIP, and does no prefix or
 *   fuzzy matching. Its matches rank first, marked `verified`, and nearby
 *   Photon duplicates are dropped.
 *
 * A selected suggestion carries its own coordinates, letting callers skip
 * the geocoding round-trip entirely and go straight to the electeds lookup.
 */

import { censusOnelineMatches } from '@/services/census';

// West, south, east, north — Photon bbox is minLon,minLat,maxLon,maxLat.
const KANSAS_BBOX = '-102.051,36.993,-94.588,40.003';
const PHOTON_URL = 'https://photon.komoot.io/api';

/** Minimum input length before suggestions are requested. */
export const MIN_QUERY_LENGTH = 4;

export interface AddressSuggestion {
  id: string;
  /** Full display label, e.g. "300 Southwest 10th Avenue, Topeka, KS 66612". */
  label: string;
  lat: number;
  lng: number;
  /** Standardized match from the Census Bureau's authoritative address data. */
  verified?: boolean;
}

interface PhotonProperties {
  osm_type?: string;
  osm_id?: number;
  osm_key?: string;
  osm_value?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  countrycode?: string;
}

interface PhotonFeature {
  properties: PhotonProperties;
  geometry: { coordinates: [number, number] };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

// OSM points that share an address but aren't one (transit stops etc.) —
// noise in an address picker.
const EXCLUDED_OSM_VALUES = new Set(['bus_stop', 'bus_station', 'platform', 'stop_position']);

const isKansas = (props: PhotonProperties): boolean =>
  !props.state || props.state === 'KS' || /kansas/i.test(props.state);

export const buildSuggestionLabel = (props: PhotonProperties): string | null => {
  const streetLine =
    props.housenumber && props.street
      ? `${props.housenumber} ${props.street}`
      : props.street ?? props.name;
  if (!streetLine) return null;

  const cityLine = [props.city, [props.state ?? 'KS', props.postcode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [streetLine, cityLine].filter(Boolean).join(', ');
};

async function suggestPhotonAddresses(
  trimmed: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = `${PHOTON_URL}?q=${encodeURIComponent(trimmed)}&limit=8&bbox=${KANSAS_BBOX}`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return [];
    const data: PhotonResponse = await response.json();

    const suggestions: AddressSuggestion[] = [];
    const seenLabels = new Set<string>();
    for (const feature of data.features ?? []) {
      const props = feature.properties ?? {};
      if (!isKansas(props)) continue;
      if (props.osm_value && EXCLUDED_OSM_VALUES.has(props.osm_value)) continue;

      const label = buildSuggestionLabel(props);
      if (!label || seenLabels.has(label)) continue;

      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;

      seenLabels.add(label);
      suggestions.push({
        id: `${props.osm_type ?? 'x'}-${props.osm_id ?? label}`,
        label,
        lat,
        lng,
      });
      if (suggestions.length >= 5) break;
    }
    return suggestions;
  } catch {
    // Aborted or network failure — either way, no suggestions.
    return [];
  }
}

/**
 * The Census geocoder only matches once the input has a house number plus at
 * least a street word and a locality word — anything shorter is guaranteed
 * to miss, so don't spend the request.
 */
export const looksCompleteEnoughForCensus = (query: string): boolean =>
  /^\d+\s+\S+.*\s+\S+/.test(query.trim()) && query.trim().split(/\s+/).length >= 4;

/** "1200 SW HARRISON ST, TOPEKA, KS, 66612" → "1200 SW Harrison St, Topeka, KS 66612" */
export const formatCensusAddress = (matched: string): string => {
  const KEEP_UPPER = new Set(['KS', 'NE', 'NW', 'SE', 'SW', 'N', 'S', 'E', 'W', 'US']);
  const titled = matched
    .split(/\s+/)
    .map((word) => {
      const bare = word.replace(/,/g, '');
      if (KEEP_UPPER.has(bare) || /^\d/.test(bare)) return word;
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(' ');
  // Census renders "..., KS, 66612" — drop the comma before the ZIP.
  return titled.replace(/, (\d{5}(?:-\d{4})?)$/, ' $1');
};

async function suggestCensusAddresses(
  trimmed: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  if (!looksCompleteEnoughForCensus(trimmed)) return [];
  // Constrain the match to Kansas when the user hasn't typed the state.
  const query = /\bks\b|kansas/i.test(trimmed) ? trimmed : `${trimmed} KS`;
  const matches = await censusOnelineMatches(query, signal);
  return matches
    .filter((m) => /, KS, \d{5}/.test(m.matchedAddress))
    .slice(0, 3)
    .map((m) => ({
      id: `census-${m.matchedAddress}`,
      label: formatCensusAddress(m.matchedAddress),
      lat: m.coordinates.y,
      lng: m.coordinates.x,
      verified: true,
    }));
}

// ~70m — close enough that an OSM point and a TIGER point are the same door.
const DEDUPE_DEGREES = 0.0007;

/**
 * Fetch Kansas address suggestions for a partial query: verified Census
 * matches first, Photon prefix suggestions below (minus near-duplicates of a
 * verified match). Failures resolve to an empty list — suggestions are a
 * progressive enhancement, never an error the user has to deal with. Pass an
 * AbortSignal to cancel stale requests.
 */
export async function suggestKansasAddresses(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const [census, photon] = await Promise.all([
    suggestCensusAddresses(trimmed, options.signal),
    suggestPhotonAddresses(trimmed, options.signal),
  ]);

  const merged = [...census];
  for (const suggestion of photon) {
    const nearVerified = census.some(
      (c) =>
        Math.abs(c.lat - suggestion.lat) < DEDUPE_DEGREES &&
        Math.abs(c.lng - suggestion.lng) < DEDUPE_DEGREES,
    );
    if (!nearVerified) merged.push(suggestion);
    if (merged.length >= 5) break;
  }
  return merged.slice(0, 5);
}
