export type UserRole = 'admin' | 'player';
export type AccountStatus = 'pending' | 'approved' | 'rejected';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Master';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar: string;
  coins: number;
  xp: number;
  level: number;
  title: string;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
  createdAt: string;
  isBanned?: boolean;
  approvalStatus?: AccountStatus;
  pin?: string; // 4-digit PIN set on first login after approval
  approvedAt?: string;
  approvedBy?: string;
}

export interface QuizCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color hex or class
  questionCount?: number;
  packCount?: number;
}

export interface QuizPack {
  id: string;
  title: string;
  description: string;
  category: string; // Category ID or Name
  difficulty: DifficultyLevel;
  thumbnail: string;
  banner?: string;
  packColor: string;
  releaseDate: string;
  estimatedTime: string;
  totalQuestions: number;
  xpReward: number;
  coinReward: number;
  unlockRequirementLevel?: number;
  downloadSize: string; // e.g. "4.2 MB"
  isFeatured?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
  tags: string[];
}

export interface Question {
  id: string;
  packId: string;
  order: number;
  image: string; // URL or data URI
  correctAnswer: string;
  alternativeAcceptedAnswers?: string[];
  difficulty: DifficultyLevel;
  hint: string;
  triviaFact: string;
  category: string;
  tags: string[];
  copyrightInfo?: string;
  imageCredit?: string;
  isHidden?: boolean;
  isFeatured?: boolean;
}

export interface PlayerPackProgress {
  packId: string;
  completedQuestions: string[]; // Question IDs answered correctly
  currentQuestionIndex: number;
  completedAt?: string;
  completionPercentage: number;
  starsEarned: number; // 1-3 stars
}

export interface QuestionAnswerState {
  questionId: string;
  guessedCorrectly: boolean;
  revealedLettersIndices: number[]; // Indices of letters revealed via hint
  removedDistractors: string[]; // Letters removed from letter bank
  hintsUsedCount: number;
  timestamp: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'gameplay' | 'streaks' | 'hints' | 'packs' | 'social';
  targetValue: number;
  currentValue: number;
  progress?: number;
  maxProgress?: number;
  isUnlocked: boolean;
  unlocked?: boolean;
  claimed?: boolean;
  unlockedAt?: string;
  rewardCoins: number;
  rewardXP: number;
  coinReward?: number;
  xpReward?: number;
}

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  questionIds: string[];
  rewardCoins: number;
  rewardXP: number;
  isCompleted: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'auth' | 'database' | 'admin' | 'sync' | 'content';
  message: string;
  user?: string;
}

export interface PlayerStatistics {
  gamesPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  hintsUsed: number;
  coinsEarned: number;
  xpEarned: number;
  fastestAnswerSeconds: number;
  favouriteCategory: string;
  packsCompleted: number;
  totalTimePlayedSeconds: number;
  currentStreak: number;
  longestStreak: number;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  theme: 'light' | 'dark' | 'sepia' | 'system';
  fontSize: 'normal' | 'large' | 'xlarge';
  colorBlindFriendly: boolean;
  reduceAnimations: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
}

export interface DatabaseSnapshot {
  version: string;
  exportedAt: string;
  categories: QuizCategory[];
  packs: QuizPack[];
  questions: Question[];
  achievements: Achievement[];
  users: UserProfile[];
}
