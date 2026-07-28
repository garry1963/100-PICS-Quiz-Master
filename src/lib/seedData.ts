import { QuizCategory, QuizPack, Question, Achievement, UserProfile } from '../types';

export const DEFAULT_MASTER_ADMIN: UserProfile = {
  id: 'master-admin-001',
  username: 'MasterAdmin',
  email: 'garrydavies1963@gmail.com',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  coins: 0,
  xp: 0,
  level: 1,
  title: 'Master Administrator',
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  approvalStatus: 'approved'
};

export const DEFAULT_PLAYER: UserProfile = {
  id: 'master-admin-001',
  username: 'MasterAdmin',
  email: 'garrydavies1963@gmail.com',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  coins: 0,
  xp: 0,
  level: 1,
  title: 'Master Administrator',
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  approvalStatus: 'approved'
};

export const INITIAL_CATEGORIES: QuizCategory[] = [];

export const INITIAL_PACKS: QuizPack[] = [];

export const INITIAL_QUESTIONS: Question[] = [];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-first-correct',
    title: 'First Step',
    description: 'Answer your very first picture question correctly.',
    icon: 'CheckCircle2',
    category: 'gameplay',
    targetValue: 1,
    currentValue: 0,
    isUnlocked: false,
    rewardCoins: 25,
    rewardXP: 50,
  },
  {
    id: 'ach-10-correct',
    title: 'Trivia Enthusiast',
    description: 'Answer 10 picture questions correctly.',
    icon: 'Zap',
    category: 'gameplay',
    targetValue: 10,
    currentValue: 0,
    isUnlocked: false,
    rewardCoins: 50,
    rewardXP: 100,
  },
  {
    id: 'ach-50-correct',
    title: 'Picture Sleuth',
    description: 'Answer 50 picture questions correctly.',
    icon: 'Eye',
    category: 'gameplay',
    targetValue: 50,
    currentValue: 0,
    isUnlocked: false,
    rewardCoins: 150,
    rewardXP: 300,
  },
  {
    id: 'ach-first-pack',
    title: 'Pack Pioneer',
    description: '100% complete your first quiz pack.',
    icon: 'PackageCheck',
    category: 'packs',
    targetValue: 1,
    currentValue: 0,
    isUnlocked: false,
    rewardCoins: 100,
    rewardXP: 200,
  },
  {
    id: 'ach-streak-3',
    title: 'On Fire',
    description: 'Achieve a 3-day daily streak.',
    icon: 'Flame',
    category: 'streaks',
    targetValue: 3,
    currentValue: 0,
    isUnlocked: false,
    rewardCoins: 75,
    rewardXP: 150,
  },
  {
    id: 'ach-no-hint-pack',
    title: 'Master Mind',
    description: 'Complete an entire pack without using a single hint!',
    icon: 'Brain',
    category: 'hints',
    targetValue: 1,
    currentValue: 0,
    isUnlocked: false,
    rewardCoins: 200,
    rewardXP: 400,
  }
];
