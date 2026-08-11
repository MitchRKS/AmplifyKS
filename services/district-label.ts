/**
 * Shared "District N" label for elected cards, so every screen renders
 * districts the same way (dashboard, both lookup screens, state/federal
 * tabs — they each used to interpolate the raw value).
 */
export function districtLabel(district?: string | null): string {
  const trimmed = (district ?? '').trim();
  if (!trimmed) return '';
  // Already a label, don't double up.
  if (/district/i.test(trimmed)) return trimmed;
  // U.S. Senators are statewide — their "district" is the state name.
  if (/^kansas$/i.test(trimmed)) return trimmed;
  return `District ${trimmed}`;
}
