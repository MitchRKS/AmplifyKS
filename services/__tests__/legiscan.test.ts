jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  formatCommitteeName,
  getChamber,
  getFullChamberName,
  getStatusLabel,
} from '@/services/legiscan';

describe('getStatusLabel', () => {
  it('maps known status codes', () => {
    expect(getStatusLabel(1)).toBe('Introduced');
    expect(getStatusLabel(4)).toBe('Passed');
    expect(getStatusLabel(5)).toBe('Vetoed');
    expect(getStatusLabel(6)).toBe('Failed');
  });

  it('falls back for unknown codes', () => {
    expect(getStatusLabel(0)).toBe('In Progress');
    expect(getStatusLabel(99)).toBe('In Progress');
  });
});

describe('getChamber', () => {
  it('detects House and Senate prefixes case-insensitively', () => {
    expect(getChamber('HB2001')).toBe('House');
    expect(getChamber('hr6047')).toBe('House');
    expect(getChamber('HCR5008')).toBe('House');
    expect(getChamber('SB51')).toBe('Senate');
    expect(getChamber('SCR1601')).toBe('Senate');
  });

  it('returns Unknown for missing or unrecognized numbers', () => {
    expect(getChamber(undefined)).toBe('Unknown');
    expect(getChamber('XB123')).toBe('Unknown');
  });
});

describe('getFullChamberName / formatCommitteeName', () => {
  it('expands chamber codes and passes unknown codes through', () => {
    expect(getFullChamberName('H')).toBe('House');
    expect(getFullChamberName('s')).toBe('Senate');
    expect(getFullChamberName('Joint')).toBe('Joint');
  });

  it('formats full committee names', () => {
    expect(formatCommitteeName('S', 'Judiciary')).toBe(
      'Senate Committee on Judiciary',
    );
  });
});
