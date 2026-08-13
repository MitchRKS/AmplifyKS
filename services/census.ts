import { Platform } from 'react-native';

/**
 * Census Bureau geocoder client. The upstream API is free and keyless but
 * sends no CORS headers, so the web build must go through the Netlify proxy
 * (netlify/functions/census.mts); native builds call it directly.
 */

const CENSUS_BASE_URL = 'https://geocoding.geo.census.gov/geocoder';

const onelineUrl = (address: string): string =>
  Platform.OS === 'web'
    ? `/.netlify/functions/census?op=oneline&address=${encodeURIComponent(address)}`
    : `${CENSUS_BASE_URL}/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;

const districtUrl = (lat: number, lng: number): string =>
  Platform.OS === 'web'
    ? `/.netlify/functions/census?op=district&lat=${lat}&lng=${lng}`
    : `${CENSUS_BASE_URL}/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=54&format=json`;

export interface CensusAddressMatch {
  matchedAddress: string;
  coordinates: { x: number; y: number };
}

/** Standardized TIGER matches for a one-line address; [] on any failure. */
export async function censusOnelineMatches(
  address: string,
  signal?: AbortSignal,
): Promise<CensusAddressMatch[]> {
  try {
    const response = await fetch(onelineUrl(address), { signal });
    if (!response.ok) return [];
    const data = await response.json();
    return data?.result?.addressMatches ?? [];
  } catch {
    return [];
  }
}

/**
 * Congressional district number for a point (e.g. "2" for Topeka), or null
 * on any failure — callers use this as a best-effort backup, never a
 * hard dependency.
 */
export async function censusDistrictForPoint(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(districtUrl(lat, lng));
    if (!response.ok) return null;
    const data = await response.json();
    const groups: Record<string, { BASENAME?: string }[]> = data?.result?.geographies ?? {};
    for (const [name, entries] of Object.entries(groups)) {
      // Group name carries the congress number ("119th Congressional
      // Districts") — match loosely so a new congress doesn't break this.
      if (/congressional districts/i.test(name) && entries?.[0]?.BASENAME) {
        return String(entries[0].BASENAME);
      }
    }
    return null;
  } catch {
    return null;
  }
}
