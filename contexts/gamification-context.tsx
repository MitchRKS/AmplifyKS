import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  ACTION_POINTS,
  ALL_ACHIEVEMENTS,
  getUnlockedAchievements,
  levelForPoints,
  nextLevel,
  pointsToNextLevel,
  progressToNextLevel,
  type Achievement,
  type ActionRecord,
  type AdvocacyAction,
  type Level,
} from '@/constants/gamification';
import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/services/firebase';

interface GamificationState {
  totalPoints: number;
  actionHistory: ActionRecord[];
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: number | null;
  unlockedAchievements: Set<string>;
  actionCounts: Record<string, number>;
}

interface GamificationContextValue extends GamificationState {
  isLoaded: boolean;
  currentLevel: Level;
  progress: number;
  remaining: number;
  next: Level | null;
  newlyUnlocked: Achievement[];
  recordAction: (action: AdvocacyAction, description: string) => void;
  clearNewlyUnlocked: () => void;
  countOfAction: (action: AdvocacyAction) => number;
  recentActions: (limit?: number) => ActionRecord[];
  getUnlocked: () => Achievement[];
  progressForAchievement: (achievement: Achievement) => number;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

const INITIAL_STATE: GamificationState = {
  totalPoints: 0,
  actionHistory: [],
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  unlockedAchievements: new Set(),
  actionCounts: {},
};

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysBetween(a: number, b: number): number {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<GamificationState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Firebase sync helpers ──

  const syncAggregateToFirebase = useCallback(
    async (s: GamificationState) => {
      if (!user) return;
      try {
        const db = getFirestoreDb();
        const updates: Record<string, unknown> = {
          totalPoints: s.totalPoints,
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak,
          unlockedAchievements: Array.from(s.unlockedAchievements),
          actionCounts: s.actionCounts,
        };
        if (s.lastActiveDate) {
          updates.lastActiveDate = Timestamp.fromMillis(s.lastActiveDate);
        }
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      } catch (e) {
        console.error('Error syncing gamification to Firebase:', e);
      }
    },
    [user],
  );

  const syncActionRecordToFirebase = useCallback(
    async (record: ActionRecord) => {
      if (!user) return;
      try {
        const db = getFirestoreDb();
        await setDoc(
          doc(db, 'users', user.uid, 'actionHistory', record.id),
          {
            id: record.id,
            action: record.action,
            points: record.points,
            timestamp: Timestamp.fromMillis(record.timestamp),
            description: record.description,
          },
        );
      } catch (e) {
        console.error('Error syncing action record:', e);
      }
    },
    [user],
  );

  // ── Load from Firebase on sign-in ──

  useEffect(() => {
    if (!user) {
      setState(INITIAL_STATE);
      setIsLoaded(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const db = getFirestoreDb();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const data = userDoc.data();

        if (cancelled) return;

        const loaded: GamificationState = { ...INITIAL_STATE, unlockedAchievements: new Set() };

        if (data) {
          if (typeof data.totalPoints === 'number') loaded.totalPoints = data.totalPoints;
          if (typeof data.currentStreak === 'number') loaded.currentStreak = data.currentStreak;
          if (typeof data.longestStreak === 'number') loaded.longestStreak = data.longestStreak;
          if (data.lastActiveDate instanceof Timestamp) {
            loaded.lastActiveDate = data.lastActiveDate.toMillis();
          }
          if (Array.isArray(data.unlockedAchievements)) {
            loaded.unlockedAchievements = new Set(data.unlockedAchievements as string[]);
          }
          if (data.actionCounts && typeof data.actionCounts === 'object') {
            loaded.actionCounts = data.actionCounts as Record<string, number>;
          }
        }

        const historySnap = await getDocs(
          query(
            collection(db, 'users', user.uid, 'actionHistory'),
            orderBy('timestamp', 'asc'),
          ),
        );

        if (cancelled) return;

        const history: ActionRecord[] = historySnap.docs
          .map((d) => {
            const r = d.data();
            if (!r.id || !r.action || typeof r.points !== 'number' || !r.timestamp) return null;
            return {
              id: r.id as string,
              action: r.action as AdvocacyAction,
              points: r.points as number,
              timestamp:
                r.timestamp instanceof Timestamp ? r.timestamp.toMillis() : (r.timestamp as number),
              description: (r.description as string) ?? '',
            };
          })
          .filter((r): r is ActionRecord => r !== null);

        if (history.length > 0) {
          loaded.actionHistory = history;
        }

        setState(loaded);
      } catch (e) {
        console.error('Error loading gamification from Firebase:', e);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Streak logic ──

  const computeStreak = useCallback(
    (s: GamificationState): Pick<GamificationState, 'currentStreak' | 'longestStreak' | 'lastActiveDate'> => {
      const todayStart = startOfDay(new Date());

      if (s.lastActiveDate) {
        const lastStart = startOfDay(new Date(s.lastActiveDate));
        const gap = daysBetween(lastStart, todayStart);

        if (gap === 0) {
          return {
            currentStreak: s.currentStreak,
            longestStreak: s.longestStreak,
            lastActiveDate: Date.now(),
          };
        }
        if (gap === 1) {
          const newStreak = s.currentStreak + 1;
          return {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, s.longestStreak),
            lastActiveDate: Date.now(),
          };
        }
        return { currentStreak: 1, longestStreak: s.longestStreak, lastActiveDate: Date.now() };
      }

      return { currentStreak: 1, longestStreak: Math.max(1, s.longestStreak), lastActiveDate: Date.now() };
    },
    [],
  );

  // ── Record action ──

  const recordAction = useCallback(
    (action: AdvocacyAction, description: string) => {
      const record: ActionRecord = {
        id: uuid(),
        action,
        points: ACTION_POINTS[action],
        timestamp: Date.now(),
        description,
      };

      setState((prev) => {
        const newPoints = prev.totalPoints + record.points;
        const newCounts = {
          ...prev.actionCounts,
          [action]: (prev.actionCounts[action] ?? 0) + 1,
        };
        const streak = computeStreak(prev);

        const stats = {
          totalPoints: newPoints,
          contactCount: newCounts['Contact Legislator'] ?? 0,
          quizCount: newCounts['Quiz Completed'] ?? 0,
          viewCount: newCounts['View Legislation'] ?? 0,
          shareCount: newCounts['Share Content'] ?? 0,
          maxStreak: streak.longestStreak,
        };

        const nowUnlocked = getUnlockedAchievements(stats);
        const nowUnlockedIds = new Set(nowUnlocked.map((a) => a.id));
        const justUnlocked = nowUnlocked.filter((a) => !prev.unlockedAchievements.has(a.id));

        if (justUnlocked.length > 0) {
          setNewlyUnlocked((n) => [...n, ...justUnlocked]);
        }

        const next: GamificationState = {
          totalPoints: newPoints,
          actionHistory: [...prev.actionHistory, record],
          actionCounts: newCounts,
          unlockedAchievements: nowUnlockedIds,
          ...streak,
        };

        syncActionRecordToFirebase(record);
        syncAggregateToFirebase(next);

        return next;
      });
    },
    [computeStreak, syncActionRecordToFirebase, syncAggregateToFirebase],
  );

  // ── Derived values ──

  const currentLevel = useMemo(() => levelForPoints(state.totalPoints), [state.totalPoints]);
  const next_ = useMemo(() => nextLevel(currentLevel), [currentLevel]);
  const progress = useMemo(
    () => progressToNextLevel(currentLevel, state.totalPoints),
    [currentLevel, state.totalPoints],
  );
  const remaining = useMemo(
    () => pointsToNextLevel(currentLevel, state.totalPoints),
    [currentLevel, state.totalPoints],
  );

  const countOfAction = useCallback(
    (action: AdvocacyAction) => state.actionCounts[action] ?? 0,
    [state.actionCounts],
  );

  const recentActions = useCallback(
    (limit = 5) => state.actionHistory.slice(-limit),
    [state.actionHistory],
  );

  const getUnlocked = useCallback(
    () => ALL_ACHIEVEMENTS.filter((a) => state.unlockedAchievements.has(a.id)),
    [state.unlockedAchievements],
  );

  const progressForAchievement = useCallback(
    (achievement: Achievement): number => {
      let current: number;
      switch (achievement.requirementType) {
        case 'totalPoints':
          current = state.totalPoints;
          break;
        case 'contactLegislator':
          current = state.actionCounts['Contact Legislator'] ?? 0;
          break;
        case 'quizCompleted':
          current = state.actionCounts['Quiz Completed'] ?? 0;
          break;
        case 'viewLegislation':
          current = state.actionCounts['View Legislation'] ?? 0;
          break;
        case 'shareContent':
          current = state.actionCounts['Share Content'] ?? 0;
          break;
        case 'daysActive':
          current = state.longestStreak;
          break;
      }
      return Math.min(current / achievement.requirement, 1);
    },
    [state.totalPoints, state.actionCounts, state.longestStreak],
  );

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  const value = useMemo<GamificationContextValue>(
    () => ({
      ...state,
      isLoaded,
      currentLevel,
      progress,
      remaining,
      next: next_,
      newlyUnlocked,
      recordAction,
      clearNewlyUnlocked,
      countOfAction,
      recentActions,
      getUnlocked,
      progressForAchievement,
    }),
    [
      state,
      isLoaded,
      currentLevel,
      progress,
      remaining,
      next_,
      newlyUnlocked,
      recordAction,
      clearNewlyUnlocked,
      countOfAction,
      recentActions,
      getUnlocked,
      progressForAchievement,
    ],
  );

  return (
    <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}
