// fetchOverrides is intentionally not called: these tests exercise the pure
// keyword fallback with an empty override cache. Firebase is mocked out so
// jest never has to load its mixed CJS/ESM distribution.
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), getDocs: jest.fn() }));
jest.mock('@/services/firebase', () => ({ getFirestoreDb: jest.fn() }));

import { tagBill } from '@/services/bill-category-tagger';
describe('tagBill', () => {
  it('tags healthcare bills', () => {
    expect(tagBill('HB 2001', 'Expanding medicaid work requirements')).toEqual({
      category: 'Healthcare',
      isProgressiveIfYea: true,
    });
  });

  it('tags education bills', () => {
    expect(
      tagBill('SB 55', 'Establishing a charter school oversight board'),
    ).toMatchObject({ category: 'Education' });
  });

  it('tags reproductive rights bills', () => {
    expect(
      tagBill('HB 100', 'Restrictions concerning abortion providers'),
    ).toMatchObject({ category: 'Abortion & Reproductive Rights' });
  });

  it('is case-insensitive', () => {
    expect(tagBill('HB 1', 'MEDICAID Expansion Act')).toMatchObject({
      category: 'Healthcare',
    });
  });

  it('uses the first matching rule when keywords from multiple categories appear', () => {
    // "abortion" (rule 1) should win over "school" (rule 5).
    expect(
      tagBill('HB 2', 'Requiring school instruction about abortion'),
    ).toMatchObject({ category: 'Abortion & Reproductive Rights' });
  });

  it('returns null for bills matching no keyword rule', () => {
    expect(tagBill('HB 3', 'Designating the official state reptile')).toBeNull();
    expect(tagBill('HB 4', '')).toBeNull();
  });
});
