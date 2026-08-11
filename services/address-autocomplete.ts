/**
 * Kansas address suggestions for the lookup screens' search-as-you-type.
 *
 * Uses Photon (photon.komoot.io) — an OSM geocoder built for autocomplete
 * with no API key and open CORS. Nominatim (used for one-shot geocoding in
 * elected-lookup.ts) explicitly forbids autocomplete traffic on its public
 * instance, so it must NOT be used here.
 *
 * A selected suggestion carries its own coordinates, letting callers skip
 * the geocoding round-trip entirely and go straight to the electeds lookup.
 */

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

/**
 * Fetch Kansas address suggestions for a partial query. Failures resolve to
 * an empty list — suggestions are a progressive enhancement, never an error
 * the user has to deal with. Pass an AbortSignal to cancel stale requests.
 */
export async function suggestKansasAddresses(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const url = `${PHOTON_URL}?q=${encodeURIComponent(trimmed)}&limit=8&bbox=${KANSAS_BBOX}`;
  try {
    const response = await fetch(url, { signal: options.signal });
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
