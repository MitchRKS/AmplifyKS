export type AdvocacyAction =
  | 'Contact Legislator'
  | 'Share Content'
  | 'View Legislation'
  | 'Quiz Completed'
  | 'Rate Legislator';

export const ACTION_POINTS: Record<AdvocacyAction, number> = {
  'Contact Legislator': 50,
  'Share Content': 25,
  'View Legislation': 10,
  'Quiz Completed': 200,
  'Rate Legislator': 15,
};

export const ALL_ACTIONS: AdvocacyAction[] = [
  'Contact Legislator',
  'Share Content',
  'View Legislation',
  'Quiz Completed',
  'Rate Legislator',
];

export interface ActionRecord {
  id: string;
  action: AdvocacyAction;
  points: number;
  timestamp: number;
  description: string;
}

export type RequirementType =
  | 'totalPoints'
  | 'contactLegislator'
  | 'quizCompleted'
  | 'viewLegislation'
  | 'shareContent'
  | 'daysActive';

export type AchievementColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'yellow'
  | 'gray';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  iconColor: AchievementColor;
  requirement: number;
  requirementType: RequirementType;
}

export const ACHIEVEMENT_COLORS: Record<AchievementColor, string> = {
  blue: '#0097b2',
  green: '#4CAF50',
  orange: '#FF9800',
  purple: '#9C27B0',
  red: '#fa3332',
  yellow: '#ffc629',
  gray: '#9CA3AF',
};

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Point-based
  { id: 'points_100', name: 'First Steps', description: 'Earn 100 total points', iconName: 'directions-walk', iconColor: 'blue', requirement: 100, requirementType: 'totalPoints' },
  { id: 'points_500', name: 'Rising Star', description: 'Earn 500 total points', iconName: 'star', iconColor: 'orange', requirement: 500, requirementType: 'totalPoints' },
  { id: 'points_1000', name: 'Point Collector', description: 'Earn 1,000 total points', iconName: 'workspace-premium', iconColor: 'purple', requirement: 1000, requirementType: 'totalPoints' },
  { id: 'points_2500', name: 'Champion', description: 'Earn 2,500 total points', iconName: 'emoji-events', iconColor: 'yellow', requirement: 2500, requirementType: 'totalPoints' },

  // Contact legislator
  { id: 'contact_1', name: 'Voice Heard', description: 'Contact a legislator for the first time', iconName: 'phone', iconColor: 'green', requirement: 1, requirementType: 'contactLegislator' },
  { id: 'contact_10', name: 'Persistent Advocate', description: 'Contact legislators 10 times', iconName: 'phone-in-talk', iconColor: 'blue', requirement: 10, requirementType: 'contactLegislator' },
  { id: 'contact_50', name: 'Advocacy Expert', description: 'Contact legislators 50 times', iconName: 'campaign', iconColor: 'purple', requirement: 50, requirementType: 'contactLegislator' },

  // Quiz
  { id: 'quiz_1', name: 'Self-Aware', description: 'Complete the political quiz', iconName: 'description', iconColor: 'blue', requirement: 1, requirementType: 'quizCompleted' },

  // View legislation
  { id: 'view_25', name: 'Well Informed', description: 'View 25 pieces of legislation', iconName: 'menu-book', iconColor: 'green', requirement: 25, requirementType: 'viewLegislation' },
  { id: 'view_100', name: 'Policy Expert', description: 'View 100 pieces of legislation', iconName: 'local-library', iconColor: 'orange', requirement: 100, requirementType: 'viewLegislation' },

  // Share content
  { id: 'share_5', name: 'Influencer', description: 'Share content 5 times', iconName: 'share', iconColor: 'blue', requirement: 5, requirementType: 'shareContent' },
  { id: 'share_25', name: 'Community Builder', description: 'Share content 25 times', iconName: 'groups', iconColor: 'purple', requirement: 25, requirementType: 'shareContent' },

  // Streak-based
  { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day streak', iconName: 'local-fire-department', iconColor: 'orange', requirement: 3, requirementType: 'daysActive' },
  { id: 'streak_7', name: 'Committed', description: 'Maintain a 7-day streak', iconName: 'whatshot', iconColor: 'red', requirement: 7, requirementType: 'daysActive' },
  { id: 'streak_30', name: 'Dedicated Activist', description: 'Maintain a 30-day streak', iconName: 'whatshot', iconColor: 'purple', requirement: 30, requirementType: 'daysActive' },
];

export interface Level {
  id: number;
  name: string;
  pointsRequired: number;
  iconName: string;
  iconColor: string;
}

export const ALL_LEVELS: Level[] = [
  { id: 1, name: 'Newcomer', pointsRequired: 0, iconName: 'star-outline', iconColor: '#9CA3AF' },
  { id: 2, name: 'Informed Citizen', pointsRequired: 100, iconName: 'star', iconColor: '#0097b2' },
  { id: 3, name: 'Active Participant', pointsRequired: 250, iconName: 'star-half', iconColor: '#4CAF50' },
  { id: 4, name: 'Community Leader', pointsRequired: 500, iconName: 'stars', iconColor: '#FF9800' },
  { id: 5, name: 'Civic Champion', pointsRequired: 1000, iconName: 'workspace-premium', iconColor: '#9C27B0' },
  { id: 6, name: 'Democracy Hero', pointsRequired: 2500, iconName: 'military-tech', iconColor: '#fa3332' },
  { id: 7, name: 'Legendary Advocate', pointsRequired: 5000, iconName: 'auto-awesome', iconColor: '#ffc629' },
];

export function levelForPoints(points: number): Level {
  for (let i = ALL_LEVELS.length - 1; i >= 0; i--) {
    if (points >= ALL_LEVELS[i].pointsRequired) return ALL_LEVELS[i];
  }
  return ALL_LEVELS[0];
}

export function nextLevel(current: Level): Level | null {
  return ALL_LEVELS.find((l) => l.pointsRequired > current.pointsRequired) ?? null;
}

export function progressToNextLevel(current: Level, points: number): number {
  const next = nextLevel(current);
  if (!next) return 1;
  const earned = points - current.pointsRequired;
  const needed = next.pointsRequired - current.pointsRequired;
  return Math.min(earned / needed, 1);
}

export function pointsToNextLevel(current: Level, points: number): number {
  const next = nextLevel(current);
  if (!next) return 0;
  return Math.max(next.pointsRequired - points, 0);
}

export function getUnlockedAchievements(stats: {
  totalPoints: number;
  contactCount: number;
  quizCount: number;
  viewCount: number;
  shareCount: number;
  maxStreak: number;
}): Achievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => {
    switch (a.requirementType) {
      case 'totalPoints':
        return stats.totalPoints >= a.requirement;
      case 'contactLegislator':
        return stats.contactCount >= a.requirement;
      case 'quizCompleted':
        return stats.quizCount >= a.requirement;
      case 'viewLegislation':
        return stats.viewCount >= a.requirement;
      case 'shareContent':
        return stats.shareCount >= a.requirement;
      case 'daysActive':
        return stats.maxStreak >= a.requirement;
    }
  });
}
