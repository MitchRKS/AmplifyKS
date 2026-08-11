import { getOfficialsByLocation, type Official } from '@/services/openstates';

/**
 * Shared address → elected-officials lookup. Both lookup screens and the
 * profile's save-address flow use this so they can never disagree about how
 * an address is geocoded or when a result counts as "in Kansas".
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  inKansas: boolean;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=us&addressdetails=1`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Amplify/1.0' },
  });
  const data = await response.json();
  if (!data || data.length === 0) return null;
  const top = data[0];
  const state = (top.address?.state ?? '') as string;
  // Only treat a result as out-of-state when Nominatim actually reports a
  // non-Kansas state — a missing state field shouldn't block a valid lookup.
  return {
    lat: parseFloat(top.lat),
    lng: parseFloat(top.lon),
    inKansas: state === '' || /kansas/i.test(state),
  };
}

export type ElectedLookupResult =
  | { status: 'ok'; officials: Official[] }
  | { status: 'address-not-found' }
  | { status: 'out-of-state' }
  | { status: 'no-results' };

/**
 * Geocode a free-form address and fetch the electeds for it. Network and API
 * failures throw (callers show their own error UI); the returned statuses
 * cover the expected "no dice" outcomes.
 */
export async function lookupElectedsForAddress(address: string): Promise<ElectedLookupResult> {
  const coords = await geocodeAddress(address);
  if (!coords) return { status: 'address-not-found' };
  if (!coords.inKansas) return { status: 'out-of-state' };
  const officials = await getOfficialsByLocation(coords.lat, coords.lng);
  if (officials.length === 0) return { status: 'no-results' };
  return { status: 'ok', officials };
}

export interface AddressParts {
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
}

/** Single-line geocodable form of the profile's address fields. */
export function composeAddress({ streetAddress, city, state, zip }: AddressParts): string {
  const cityStateZip = [city.trim(), [state.trim(), zip.trim()].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [streetAddress.trim(), cityStateZip].filter(Boolean).join(', ');
}

/**
 * Whether the address is complete enough to geocode confidently. Street and
 * city are required — ZIP alone resolves to a broad area and could save the
 * wrong electeds.
 */
export function hasGeocodableAddress({ streetAddress, city }: AddressParts): boolean {
  return Boolean(streetAddress.trim() && city.trim());
}
