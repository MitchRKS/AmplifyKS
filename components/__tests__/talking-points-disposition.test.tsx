/**
 * Functional harness for the admin talking-points + admin-set disposition
 * changes: renders the REAL TalkingPointsCard (with the real
 * useBillTalkingPoints hook) and the REAL TestimonyForm against mocked
 * Firestore, exercising admin CRUD, the iOS ordering contract, and the
 * locked position chip.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

let mockPointDocs: Record<string, unknown>[] = [];
const mockSetDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn((...segments: unknown[]) => ({ id: 'generated-id', path: segments.slice(1).join('/') })),
  onSnapshot: jest.fn((_ref: unknown, onNext: (snap: unknown) => void) => {
    onNext({ docs: mockPointDocs.map((d) => ({ id: (d as { id: string }).id, data: () => d })) });
    return () => {};
  }),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [])),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...(args as [])),
  deleteDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve({ id: 'x' })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  writeBatch: jest.fn(() => ({
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
  Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }), fromDate: () => ({ seconds: 0, nanoseconds: 0 }) },
}));

jest.mock('@/services/firebase', () => ({
  getFirestoreDb: jest.fn(() => ({})),
  getAuth: jest.fn(() => ({})),
}));

const mockAuthValue = {
  user: { uid: 'admin-uid', email: 'admin@example.com', firstName: 'Ada', lastName: 'Admin' },
  isLoading: false,
};
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthValue,
}));

const mockProfileValue = {
  profile: { firstName: 'Ada', lastName: 'Admin', phone: '', streetAddress: '', city: 'Topeka', state: 'KS', zip: '', role: 'admin' },
  isLoaded: true,
  isSaving: false,
  updateProfile: jest.fn(),
};
jest.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: () => mockProfileValue,
}));

const mockGamificationValue = { recordAction: jest.fn() };
jest.mock('@/contexts/gamification-context', () => ({
  useGamification: () => mockGamificationValue,
}));

jest.mock('expo-mail-composer', () => ({ composeAsync: jest.fn(), isAvailableAsync: jest.fn() }));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(), isAvailableAsync: jest.fn() }));

// eslint-disable-next-line import/first -- must come after the jest.mock calls above
import { TalkingPointsCard } from '../talking-points-card';
// eslint-disable-next-line import/first
import { TestimonyForm } from '../testimony-form';

const pointDoc = (id: string, title: string, order: number, extra: Record<string, unknown> = {}) => ({
  id,
  billId: 1911658,
  title,
  content: `${title} content`,
  order,
  ...extra,
});

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

const renderedText = (renderer: ReactTestRenderer): string => {
  const out: string[] = [];
  collectText(renderer.toJSON(), out);
  return out.join('\n');
};

const findByLabel = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll((n) => n.props?.accessibilityLabel === label)[0];

const render = async (element: React.ReactElement): Promise<ReactTestRenderer> => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPointDocs = [];
});

describe('TalkingPointsCard', () => {
  it('renders points in order for non-admins with no add/edit affordances', async () => {
    mockPointDocs = [pointDoc('b', 'Second point', 1), pointDoc('a', 'First point', 0)];
    const r = await render(<TalkingPointsCard billId={1911658} isAdmin={false} />);
    const text = renderedText(r);
    expect(text.indexOf('First point')).toBeLessThan(text.indexOf('Second point'));
    expect(text).not.toContain('Add Talking Point');
    expect(findByLabel(r, 'Edit First point')).toBeUndefined();
  });

  it('renders nothing at all for non-admins when no points exist', async () => {
    const r = await render(<TalkingPointsCard billId={1911658} isAdmin={false} />);
    expect(r.toJSON()).toBeNull();
  });

  it('lets an admin add a point with the iOS doc shape and next compact order', async () => {
    mockPointDocs = [pointDoc('a', 'Existing', 0)];
    const r = await render(<TalkingPointsCard billId={1911658} isAdmin />);

    await act(async () => {
      r.root.findAll((n) => n.props?.accessibilityRole === 'button' && renderedTextOf(n).includes('Add Talking Point'))[0].props.onPress();
    });
    const inputs = r.root.findAll((n) => n.props?.placeholder?.startsWith('Title'));
    await act(async () => {
      inputs[0].props.onChangeText('Local impact');
      r.root.findAll((n) => n.props?.placeholder?.startsWith('Talking point'))[0].props.onChangeText('Details here');
    });
    const saveButton = r.root.findAll(
      (n) => n.props?.accessibilityRole === 'button' && renderedTextOf(n) === 'Add',
    )[0];
    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const written = (mockSetDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(written).toMatchObject({
      id: 'generated-id',
      billId: 1911658,
      title: 'Local impact',
      content: 'Details here',
      order: 1, // maxOrder(0) + 1 — iOS count-compatible
    });
    expect(written.createdAt).toBeDefined();
    expect(written.updatedAt).toBeDefined();
  });

  it('edits via updateDoc (never merge-set) so deleted points are not resurrected', async () => {
    mockPointDocs = [pointDoc('a', 'Existing', 0)];
    const r = await render(<TalkingPointsCard billId={1911658} isAdmin />);
    await act(async () => {
      findByLabel(r, 'Edit Existing').props.onPress();
    });
    const saveButton = r.root.findAll(
      (n) => n.props?.accessibilityRole === 'button' && renderedTextOf(n) === 'Save',
    )[0];
    await act(async () => {
      await saveButton.props.onPress();
    });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('renumbers surviving points on delete to keep the iOS 0..n-1 invariant', async () => {
    mockPointDocs = [pointDoc('a', 'P0', 0), pointDoc('b', 'P1', 1), pointDoc('c', 'P2', 2)];
    const r = await render(<TalkingPointsCard billId={1911658} isAdmin />);

    // AppAlert on native delegates to Alert.alert — spy so the confirm
    // dialog's destructive button can be pressed programmatically.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- runtime spy target
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Deleting the middle point (order 1) must renumber c: 2 -> 1.
    await act(async () => {
      findByLabel(r, 'Delete P1').props.onPress();
    });
    const buttons = (alertSpy.mock.calls.at(-1)?.[2] ?? []) as {
      style?: string;
      onPress?: () => void;
    }[];
    const deleteButton = buttons.find((b) => b.style === 'destructive');
    await act(async () => {
      deleteButton?.onPress?.();
    });

    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    const [ref, update] = mockBatchUpdate.mock.calls[0] as [{ path: string }, { order: number }];
    expect(ref.path).toContain('/c');
    expect(update.order).toBe(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('disables other edit/add affordances while an editor is open', async () => {
    mockPointDocs = [pointDoc('a', 'P0', 0), pointDoc('b', 'P1', 1)];
    const r = await render(<TalkingPointsCard billId={1911658} isAdmin />);
    await act(async () => {
      findByLabel(r, 'Edit P0').props.onPress();
    });
    expect(findByLabel(r, 'Edit P1').props.disabled).toBe(true);
    expect(findByLabel(r, 'Delete P1').props.disabled).toBe(true);
  });
});

// Helper: flattened text of a subtree (used to find labeled buttons).
function renderedTextOf(node: unknown): string {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (n == null) return;
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    const children = (n as { children?: unknown[] }).children;
    if (Array.isArray(children)) children.forEach(walk);
  };
  walk(node);
  return out.join('');
}

describe('TestimonyForm position lock', () => {
  it('shows the admin-set stance as a locked chip with no picker', async () => {
    const r = await render(
      <TestimonyForm billNumber="HB2004" billTitle="Test bill" committee="Senate Committee on Ways and Means" disposition="oppose" />,
    );
    const text = renderedText(r);
    expect(text).toContain('Opponent');
    expect(text).toContain('Set for this bill by Mainstream Coalition');
    // The old picker offered all three choices as buttons — Proponent must
    // no longer be present anywhere.
    expect(text).not.toContain('Proponent');
  });

  it('defaults to Neutral with an honest hint when no stance is set', async () => {
    const r = await render(
      <TestimonyForm billNumber="HB2004" billTitle="Test bill" committee="Senate Committee on Ways and Means" disposition={null} />,
    );
    const text = renderedText(r);
    expect(text).toContain('Neutral');
    expect(text).toContain('Default position — no stance has been set for this bill');
    expect(text).not.toContain('Set for this bill by Mainstream Coalition');
  });
});
