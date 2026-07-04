import {
  ALL_ACHIEVEMENTS,
  ALL_LEVELS,
  getUnlockedAchievements,
  levelForPoints,
  nextLevel,
  pointsToNextLevel,
  progressToNextLevel,
} from '@/constants/gamification';

const NO_STATS = {
  totalPoints: 0,
  contactCount: 0,
  quizCount: 0,
  viewCount: 0,
  shareCount: 0,
  maxStreak: 0,
};

describe('levelForPoints', () => {
  it('returns the level whose threshold was reached, at exact boundaries', () => {
    expect(levelForPoints(0).name).toBe('Newcomer');
    expect(levelForPoints(99).name).toBe('Newcomer');
    expect(levelForPoints(100).name).toBe('Informed Citizen');
    expect(levelForPoints(249).name).toBe('Informed Citizen');
    expect(levelForPoints(250).name).toBe('Active Participant');
    expect(levelForPoints(5000).name).toBe('Legendary Advocate');
    expect(levelForPoints(999999).name).toBe('Legendary Advocate');
  });
});

describe('nextLevel', () => {
  it('returns the following level, or null at the top', () => {
    expect(nextLevel(ALL_LEVELS[0])?.name).toBe('Informed Citizen');
    expect(nextLevel(ALL_LEVELS[ALL_LEVELS.length - 1])).toBeNull();
  });
});

describe('progressToNextLevel', () => {
  it('reports fractional progress between thresholds', () => {
    // Newcomer (0) → Informed Citizen (100): 50 points = halfway.
    expect(progressToNextLevel(ALL_LEVELS[0], 50)).toBe(0.5);
    expect(progressToNextLevel(ALL_LEVELS[0], 0)).toBe(0);
  });

  it('caps at 1 and reports 1 at the top level', () => {
    expect(progressToNextLevel(ALL_LEVELS[0], 150)).toBe(1);
    expect(progressToNextLevel(ALL_LEVELS[ALL_LEVELS.length - 1], 9999)).toBe(1);
  });
});

describe('pointsToNextLevel', () => {
  it('reports remaining points, never negative, zero at the top', () => {
    expect(pointsToNextLevel(ALL_LEVELS[0], 40)).toBe(60);
    expect(pointsToNextLevel(ALL_LEVELS[0], 150)).toBe(0);
    expect(pointsToNextLevel(ALL_LEVELS[ALL_LEVELS.length - 1], 9999)).toBe(0);
  });
});

describe('getUnlockedAchievements', () => {
  it('unlocks nothing with zeroed stats', () => {
    expect(getUnlockedAchievements(NO_STATS)).toHaveLength(0);
  });

  it('unlocks each requirement type at its threshold', () => {
    const ids = (stats: Partial<typeof NO_STATS>) =>
      getUnlockedAchievements({ ...NO_STATS, ...stats }).map((a) => a.id);

    expect(ids({ totalPoints: 100 })).toEqual(['points_100']);
    expect(ids({ contactCount: 10 })).toEqual(
      expect.arrayContaining(['contact_1', 'contact_10']),
    );
    expect(ids({ quizCount: 1 })).toEqual(['quiz_1']);
    expect(ids({ viewCount: 25 })).toEqual(['view_25']);
    expect(ids({ shareCount: 5 })).toEqual(['share_5']);
    expect(ids({ maxStreak: 7 })).toEqual(
      expect.arrayContaining(['streak_3', 'streak_7']),
    );
  });

  it('unlocks everything when all requirements are exceeded', () => {
    const all = getUnlockedAchievements({
      totalPoints: 10000,
      contactCount: 100,
      quizCount: 5,
      viewCount: 500,
      shareCount: 100,
      maxStreak: 60,
    });
    expect(all).toHaveLength(ALL_ACHIEVEMENTS.length);
  });
});
