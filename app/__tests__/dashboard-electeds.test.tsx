/**
 * Headless reproduction harness for the reported "My Electeds shows only
 * federal OR state" dashboard bug: renders the REAL DashboardScreen with the
 * REAL useSavedOfficials hook against controlled Firestore snapshots, across
 * every savedOfficials doc shape that could exist in production.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

// ── Mocks ──────────────────────────────────────────────────────────────
let mockSnapshotDocs: Record<string, unknown>[] = [];

// Hook mocks MUST return referentially stable values: useSavedOfficials'
// snapshot effect depends on the `user` object, so a fresh identity per
// render means resubscribe -> setState -> render -> infinite loop.
const mockUser = { uid: 'test-uid', email: 't@example.com', firstName: 'Test', lastName: 'User' };
const mockAuthValue = { user: mockUser, isLoading: false };
const mockProfileValue = {
  profile: { firstName: 'Test', lastName: 'User', phone: '', streetAddress: '', city: '', state: 'KS', zip: '', role: 'user' },
  isLoaded: true,
  isSaving: false,
  updateProfile: jest.fn(),
};
const mockMatchValue = { getMatch: () => null };
const mockOpenBillsValue = { billIds: [] as string[], isLoading: false };
const mockRouterValue = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() };

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  writeBatch: jest.fn(() => ({ set: jest.fn(), delete: jest.fn(), commit: jest.fn(() => Promise.resolve()) })),
  onSnapshot: jest.fn((_ref: unknown, onNext: (snap: unknown) => void) => {
    onNext({ docs: mockSnapshotDocs.map((d) => ({ data: () => d })) });
    return () => {};
  }),
}));

jest.mock('@/services/firebase', () => ({
  getFirestoreDb: jest.fn(() => ({})),
  getAuth: jest.fn(() => ({})),
}));

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthValue,
}));

jest.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: () => mockProfileValue,
}));

jest.mock('@/hooks/use-legislator-match', () => ({
  useLegislatorMatch: () => mockMatchValue,
}));

jest.mock('@/hooks/use-open-testimony-bills', () => ({
  useOpenTestimonyBillIds: () => mockOpenBillsValue,
}));

jest.mock('@/services/legiscan', () => ({
  getKansasBills: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockRouterValue,
}));

jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't use ES imports
  const { View } = require('react-native');
  return { Image: View };
});

// eslint-disable-next-line import/first -- must come after the jest.mock calls above
import DashboardScreen from '../(tabs)/dashboard';

// ── Helpers ────────────────────────────────────────────────────────────
const officialDoc = (
  id: string,
  name: string,
  chamber: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  name,
  givenName: name.split(' ')[0],
  familyName: name.split(' ')[1] ?? '',
  image: '',
  email: '',
  party: 'Republican',
  chamber,
  district: chamber === 'U.S. Senate' ? 'Kansas' : '1',
  jurisdiction: chamber.startsWith('U.S.') ? 'United States' : 'Kansas',
  contactDetails: [],
  links: [],
  openstatesUrl: '',
  ...extra,
});

const MIXED_NAMES = ['Debbie Staterep', 'Sam Statesen', 'Fred Fedrep', 'Mona Fedsen', 'Rita Fedsen'];

const mixedSet = (extra: Record<string, unknown> = {}) => [
  officialDoc('ocd-person/s1', 'Debbie Staterep', 'House', extra),
  officialDoc('ocd-person/s2', 'Sam Statesen', 'Senate', extra),
  officialDoc('ocd-person/f1', 'Fred Fedrep', 'U.S. House', extra),
  officialDoc('ocd-person/f2', 'Mona Fedsen', 'U.S. Senate', extra),
  officialDoc('ocd-person/f3', 'Rita Fedsen', 'U.S. Senate', extra),
];

// Flatten rendered text in document order, walking only children (props can
// hold circular React elements, e.g. ScrollView's refreshControl).
const collectText = (node: unknown, out: string[]): void => {
  if (node == null) return;
  if (typeof node === 'string') {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, out));
    return;
  }
  collectText((node as { children?: unknown }).children, out);
};

const SECTION_HEADINGS = ['My Alerts', 'Open for Testimony', 'My Electeds', 'Saved Electeds'];

/** All text rendered under the section heading, up to the next heading. */
const sectionText = (renderer: ReactTestRenderer, heading: string): string => {
  const texts: string[] = [];
  collectText(renderer.toJSON(), texts);
  const start = texts.indexOf(heading);
  if (start === -1) return '';
  let end = texts.length;
  for (let i = start + 1; i < texts.length; i++) {
    if (SECTION_HEADINGS.includes(texts[i])) {
      end = i;
      break;
    }
  }
  return texts.slice(start, end).join('\n');
};

const renderDashboard = async (docs: Record<string, unknown>[]): Promise<ReactTestRenderer> => {
  mockSnapshotDocs = docs;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<DashboardScreen />);
  });
  return renderer;
};

// ── Scenarios ──────────────────────────────────────────────────────────
describe('Dashboard My Electeds displays both state and federal', () => {
  it('current shape: all docs source=address', async () => {
    const r = await renderDashboard(mixedSet({ source: 'address' }));
    const my = sectionText(r, 'My Electeds');
    for (const name of MIXED_NAMES) expect(my).toContain(name);
    expect(sectionText(r, 'Saved Electeds')).toBe('');
  });

  it('legacy shape: docs with no source field', async () => {
    const r = await renderDashboard(mixedSet());
    const my = sectionText(r, 'My Electeds');
    for (const name of MIXED_NAMES) expect(my).toContain(name);
  });

  it('mixed provenance: federal docs saved as manual bookmarks', async () => {
    const docs = mixedSet();
    for (const d of docs) {
      if ((d.chamber as string).startsWith('U.S.')) d.source = 'manual';
      else d.source = 'address';
    }
    const r = await renderDashboard(docs);
    const my = sectionText(r, 'My Electeds');
    const saved = sectionText(r, 'Saved Electeds');
    // This is the "wrong bucket" presentation: everything renders, but the
    // federal group appears under Saved Electeds instead of My Electeds.
    expect(my).toContain('Debbie Staterep');
    expect(my).not.toContain('Fred Fedrep');
    expect(saved).toContain('Fred Fedrep');
    expect(saved).toContain('Mona Fedsen');
  });

  it('docs missing the id field are filtered out instead of crashing the screen', async () => {
    // Regression guard: one id-less doc used to throw in
    // getLegislatorImageAssetLocal (id.startsWith on undefined) and take the
    // whole dashboard down. The hook now drops malformed docs; valid ones
    // still render.
    const docs = mixedSet({ source: 'address' });
    const { id: _drop, ...idless } = officialDoc('x', 'Broken Doc', 'House', { source: 'address' });
    const r = await renderDashboard([idless, ...docs]);
    const my = sectionText(r, 'My Electeds');
    for (const name of MIXED_NAMES) expect(my).toContain(name);
    expect(my).not.toContain('Broken Doc');
  });

  it('iOS-era shape: unprefixed federal chambers (House/Senate for congress)', async () => {
    // If federal docs were saved before the "U.S." chamber prefix existed
    // they sort/label as state — but they must still all render.
    const docs = [
      officialDoc('ocd-person/s1', 'Debbie Staterep', 'House'),
      officialDoc('ocd-person/f1', 'Fred Fedrep', 'House', { jurisdiction: 'United States' }),
      officialDoc('ocd-person/f2', 'Mona Fedsen', 'Senate', { jurisdiction: 'United States' }),
    ];
    const r = await renderDashboard(docs);
    const my = sectionText(r, 'My Electeds');
    expect(my).toContain('Debbie Staterep');
    expect(my).toContain('Fred Fedrep');
    expect(my).toContain('Mona Fedsen');
  });
});
