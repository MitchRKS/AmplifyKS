import { districtLabel } from '../district-label';

describe('districtLabel', () => {
  it('prefixes bare district numbers', () => {
    expect(districtLabel('57')).toBe('District 57');
    expect(districtLabel('1')).toBe('District 1');
  });

  it('prefixes federal house districts', () => {
    expect(districtLabel('KS-2')).toBe('District KS-2');
  });

  it('leaves the statewide U.S. Senate value alone', () => {
    expect(districtLabel('Kansas')).toBe('Kansas');
    expect(districtLabel('kansas')).toBe('kansas');
  });

  it('never double-prefixes', () => {
    expect(districtLabel('District 5')).toBe('District 5');
  });

  it('returns empty for missing values', () => {
    expect(districtLabel('')).toBe('');
    expect(districtLabel('   ')).toBe('');
    expect(districtLabel(undefined)).toBe('');
    expect(districtLabel(null)).toBe('');
  });
});
