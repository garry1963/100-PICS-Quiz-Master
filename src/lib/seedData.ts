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

export const UNAUTHENTICATED_GUEST: UserProfile = {
  id: 'guest-user',
  username: 'Guest',
  email: '',
  role: 'guest',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
  coins: 0,
  xp: 0,
  level: 1,
  title: 'Guest',
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  approvalStatus: 'none'
};

export const DEFAULT_PLAYER: UserProfile = DEFAULT_MASTER_ADMIN;

export const INITIAL_CATEGORIES: QuizCategory[] = [
  {
    id: 'cat-animals',
    name: 'Animals',
    slug: 'animals',
    description: 'Explore wild creatures, mammals, birds, and sea life from around the globe.',
    icon: '🐾',
    color: 'from-emerald-500 to-teal-700',
    packCount: 1,
    questionCount: 8
  }
];

export const STARTER_PACK_WORLD_ANIMALS: QuizPack = {
  id: 'pack-world-animals',
  title: 'World Animals',
  description: 'Identify iconic wild animals from continents across the globe in this starter picture puzzle pack!',
  category: 'Animals',
  thumbnail: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=600&q=80',
  banner: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=1200&q=80',
  totalQuestions: 8,
  difficulty: 'Easy',
  estimatedTime: '4 mins',
  coinReward: 150,
  xpReward: 300,
  packColor: 'emerald',
  releaseDate: '2026-01-01',
  downloadSize: '3.2 MB',
  tags: ['Animals', 'Nature', 'Starter']
};

export const INITIAL_PACKS: QuizPack[] = [STARTER_PACK_WORLD_ANIMALS];

export const STARTER_QUESTIONS_WORLD_ANIMALS: Question[] = [
  {
    id: 'q-world-animal-1',
    packId: 'pack-world-animals',
    order: 1,
    image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'LION',
    difficulty: 'Easy',
    hint: 'Known as the King of the Jungle.',
    triviaFact: 'Lions live in family groups called prides.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  },
  {
    id: 'q-world-animal-2',
    packId: 'pack-world-animals',
    order: 2,
    image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'ELEPHANT',
    difficulty: 'Easy',
    hint: 'The world’s largest land mammal with long tusks and trunk.',
    triviaFact: 'Elephants communicate using low-frequency vibrations.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  },
  {
    id: 'q-world-animal-3',
    packId: 'pack-world-animals',
    order: 3,
    image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef9?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'PANDA',
    difficulty: 'Easy',
    hint: 'Black-and-white bear native to bamboo forests in China.',
    triviaFact: 'Pandas spend up to 12 hours a day eating bamboo.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  },
  {
    id: 'q-world-animal-4',
    packId: 'pack-world-animals',
    order: 4,
    image: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'TIGER',
    difficulty: 'Easy',
    hint: 'Largest wild cat species known for its orange fur and dark stripes.',
    triviaFact: 'No two tigers have the exact same stripe pattern.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  },
  {
    id: 'q-world-animal-5',
    packId: 'pack-world-animals',
    order: 5,
    image: 'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'GIRAFFE',
    difficulty: 'Easy',
    hint: 'Tallest living terrestrial animal with an extremely long neck.',
    triviaFact: 'A giraffe’s neck can measure up to 6 feet long.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  },
  {
    id: 'q-world-animal-6',
    packId: 'pack-world-animals',
    order: 6,
    image: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'DOLPHIN',
    difficulty: 'Easy',
    hint: 'Highly intelligent marine mammal famous for leaping out of water.',
    triviaFact: 'Dolphins use echolocation to navigate and hunt.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  },
  {
    id: 'q-world-animal-7',
    packId: 'pack-world-animals',
    order: 7,
    image: 'https://images.unsplash.com/photo-1540573133985-778788170485?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'ZEBRA',
    difficulty: 'Easy',
    hint: 'African wild horse famous for its distinctive black-and-white striped coat.',
    triviaFact: 'Zebras run in zig-zag patterns to evade predators.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  },
  {
    id: 'q-world-animal-8',
    packId: 'pack-world-animals',
    order: 8,
    image: 'https://images.unsplash.com/photo-1539418596795-5f99217b7b12?auto=format&fit=crop&w=800&q=80',
    correctAnswer: 'KANGAROO',
    difficulty: 'Easy',
    hint: 'Marsupial from Australia that hops on powerful hind legs.',
    triviaFact: 'Kangaroos use their large muscular tails for balance while hopping.',
    category: 'Animals',
    tags: ['Animals', 'Starter']
  }
];

export const INITIAL_QUESTIONS: Question[] = [...STARTER_QUESTIONS_WORLD_ANIMALS];

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
