import {
  QuizCategory,
  QuizPack,
  Question,
  PlayerPackProgress,
  QuestionAnswerState,
  UserProfile,
  Achievement,
  PlayerStatistics,
  AccessibilitySettings,
  SystemLog,
  DailyChallenge,
  DatabaseSnapshot
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PACKS,
  INITIAL_QUESTIONS,
  INITIAL_ACHIEVEMENTS,
  DEFAULT_MASTER_ADMIN,
  DEFAULT_PLAYER
} from './seedData';
import {
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  savePackToFirestore,
  deletePackFromFirestore,
  saveQuestionToFirestore,
  deleteQuestionFromFirestore,
  saveUserToFirestore,
  saveProgressToFirestore,
  addLogToFirestore,
  seedFirestoreIfEmpty,
  fetchPacksFromFirestore,
  fetchQuestionsFromFirestore,
  fetchCategoriesFromFirestore,
  purgeSampleDataFromFirestore
} from './firebase';

const KEYS = {
  CURRENT_USER: '100pics_current_user',
  USERS: '100pics_users_db',
  CATEGORIES: '100pics_categories',
  PACKS: '100pics_packs',
  QUESTIONS: '100pics_questions',
  PROGRESS: '100pics_player_progress',
  ANSWERS: '100pics_question_answers',
  ACHIEVEMENTS: '100pics_achievements',
  STATS: '100pics_statistics',
  ACCESSIBILITY: '100pics_accessibility',
  LOGS: '100pics_system_logs',
  OFFLINE_DOWNLOADS: '100pics_downloaded_packs',
  DAILY_CHALLENGES: '100pics_daily_challenges',
  FAVOURITES: '100pics_favourite_packs'
};

class LocalStorageEngine {
  constructor() {
    this.ensureInitialized();
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? (JSON.parse(data) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }
  }

  public purgeSampleData() {
    const sampleCategoryIds = ['cat-logos', 'cat-flags', 'cat-movies', 'cat-animals', 'cat-landmarks', 'cat-games', 'cat-food', 'cat-music'];
    const samplePackIds = ['pack-famous-logos', 'pack-world-flags', 'pack-movie-icons', 'pack-wild-animals', 'pack-world-landmarks', 'pack-retro-games', 'pack-food-delights', 'pack-music-icons'];

    const cleanCategories = this.getCategories().filter(c => !sampleCategoryIds.includes(c.id));
    this.setItem(KEYS.CATEGORIES, cleanCategories);

    const cleanPacks = this.getPacks().filter(p => !samplePackIds.includes(p.id));
    this.setItem(KEYS.PACKS, cleanPacks);

    const cleanQuestions = this.getQuestions().filter(q => 
      !samplePackIds.includes(q.packId) && 
      !q.id.startsWith('q-logo-') && !q.id.startsWith('q-flag-') &&
      !q.id.startsWith('q-movie-') && !q.id.startsWith('q-animal-') &&
      !q.id.startsWith('q-landmark-') && !q.id.startsWith('q-game-') &&
      !q.id.startsWith('q-food-') && !q.id.startsWith('q-music-')
    );
    this.setItem(KEYS.QUESTIONS, cleanQuestions);

    const cleanUsers = this.getAllUsers().filter(u => u.id !== 'player-guest-101' && u.id !== 'player-1');
    if (cleanUsers.length === 0) {
      cleanUsers.push(DEFAULT_MASTER_ADMIN);
    }
    this.setItem(KEYS.USERS, cleanUsers);

    const curr = this.getCurrentUser();
    if (curr.id === 'player-guest-101' || curr.id === 'player-1') {
      this.setItem(KEYS.CURRENT_USER, DEFAULT_MASTER_ADMIN);
    }

    purgeSampleDataFromFirestore().catch(() => {});
  }

  public ensureInitialized() {
    if (!localStorage.getItem(KEYS.CATEGORIES)) {
      this.setItem(KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(KEYS.PACKS)) {
      this.setItem(KEYS.PACKS, INITIAL_PACKS);
    }
    if (!localStorage.getItem(KEYS.QUESTIONS)) {
      this.setItem(KEYS.QUESTIONS, INITIAL_QUESTIONS);
    }
    if (!localStorage.getItem(KEYS.ACHIEVEMENTS)) {
      this.setItem(KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
    }
    if (!localStorage.getItem(KEYS.USERS)) {
      this.setItem(KEYS.USERS, [DEFAULT_MASTER_ADMIN]);
    }
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      this.setItem(KEYS.CURRENT_USER, DEFAULT_MASTER_ADMIN);
    }

    // Always strip lingering sample data
    this.purgeSampleData();

    // Seed & Sync with Firebase Firestore in the background
    seedFirestoreIfEmpty(
      this.getCategories(),
      this.getPacks(),
      this.getQuestions(),
      this.getAllUsers()
    ).then(() => {
      // Background sync packs, questions & categories from Firestore
      Promise.all([
        fetchPacksFromFirestore(),
        fetchQuestionsFromFirestore(),
        fetchCategoriesFromFirestore()
      ]).then(([remotePacks, remoteQuestions, remoteCategories]) => {
        // MERGE CATEGORIES: Keep remote and local (excluding sample IDs)
        const sampleCategoryIds = ['cat-logos', 'cat-flags', 'cat-movies', 'cat-animals', 'cat-landmarks', 'cat-games', 'cat-food', 'cat-music'];
        const samplePackIds = ['pack-famous-logos', 'pack-world-flags', 'pack-movie-icons', 'pack-wild-animals', 'pack-world-landmarks', 'pack-retro-games', 'pack-food-delights', 'pack-music-icons'];

        const localCats = this.getCategories();
        const catMap = new Map<string, QuizCategory>();
        remoteCategories.filter(c => !sampleCategoryIds.includes(c.id)).forEach(c => catMap.set(c.id, c));
        localCats.filter(c => !sampleCategoryIds.includes(c.id)).forEach(c => {
          if (!catMap.has(c.id)) {
            saveCategoryToFirestore(c).catch(() => {});
          }
          catMap.set(c.id, c);
        });
        const mergedCategories = Array.from(catMap.values());
        this.setItem(KEYS.CATEGORIES, mergedCategories);

        // MERGE PACKS
        const localPacks = this.getPacks();
        const packMap = new Map<string, QuizPack>();
        remotePacks.filter(p => !samplePackIds.includes(p.id)).forEach(p => packMap.set(p.id, p));
        localPacks.filter(p => !samplePackIds.includes(p.id)).forEach(p => {
          if (!packMap.has(p.id)) {
            savePackToFirestore(p).catch(() => {});
          }
          packMap.set(p.id, p);
        });
        const mergedPacks = Array.from(packMap.values());
        this.setItem(KEYS.PACKS, mergedPacks);

        // MERGE QUESTIONS
        const localQuestions = this.getQuestions();
        const questionMap = new Map<string, Question>();
        remoteQuestions.filter(q => !samplePackIds.includes(q.packId)).forEach(q => questionMap.set(q.id, q));
        localQuestions.filter(q => !samplePackIds.includes(q.packId)).forEach(q => {
          if (!questionMap.has(q.id)) {
            saveQuestionToFirestore(q).catch(() => {});
          }
          questionMap.set(q.id, q);
        });
        const mergedQuestions = Array.from(questionMap.values());
        this.setItem(KEYS.QUESTIONS, mergedQuestions);
      }).catch(err => console.warn('Background Firestore pull failed:', err));
    });
  }

  // --- USER AUTH & PROFILES ---
  public getCurrentUser(): UserProfile {
    return this.getItem<UserProfile>(KEYS.CURRENT_USER, DEFAULT_PLAYER);
  }

  public setCurrentUser(user: UserProfile) {
    this.setItem(KEYS.CURRENT_USER, user);
    this.updateUserInList(user);
    saveUserToFirestore(user).catch(() => {});
  }

  public getAllUsers(): UserProfile[] {
    return this.getItem<UserProfile[]>(KEYS.USERS, [DEFAULT_MASTER_ADMIN, DEFAULT_PLAYER]);
  }

  public saveUser(user: UserProfile) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.setItem(KEYS.USERS, users);
    if (this.getCurrentUser().id === user.id) {
      this.setItem(KEYS.CURRENT_USER, user);
    }
    saveUserToFirestore(user).catch(() => {});
  }

  public updateUserInList(user: UserProfile) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
      this.setItem(KEYS.USERS, users);
    }
    saveUserToFirestore(user).catch(() => {});
  }

  // --- CATEGORIES ---
  public getCategories(): QuizCategory[] {
    return this.getItem<QuizCategory[]>(KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  public saveCategories(categories: QuizCategory[]) {
    this.setItem(KEYS.CATEGORIES, categories);
    categories.forEach(c => saveCategoryToFirestore(c).catch(() => {}));
  }

  public saveCategory(category: QuizCategory) {
    const categories = this.getCategories();
    const idx = categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      categories[idx] = category;
    } else {
      categories.push(category);
    }
    this.setItem(KEYS.CATEGORIES, categories);
    saveCategoryToFirestore(category).catch(() => {});
  }

  public deleteCategory(categoryId: string) {
    const categories = this.getCategories().filter(c => c.id !== categoryId);
    this.setItem(KEYS.CATEGORIES, categories);
    deleteCategoryFromFirestore(categoryId).catch(() => {});
  }

  // --- PACKS ---
  public getPacks(): QuizPack[] {
    return this.getItem<QuizPack[]>(KEYS.PACKS, INITIAL_PACKS);
  }

  public savePacks(packs: QuizPack[]) {
    this.setItem(KEYS.PACKS, packs);
    packs.forEach(p => savePackToFirestore(p).catch(() => {}));
  }

  public savePack(pack: QuizPack) {
    const packs = this.getPacks();
    const idx = packs.findIndex(p => p.id === pack.id);
    if (idx >= 0) {
      packs[idx] = pack;
    } else {
      packs.unshift(pack);
    }
    this.setItem(KEYS.PACKS, packs);
    savePackToFirestore(pack).catch(() => {});
  }

  public deletePack(packId: string) {
    const packs = this.getPacks().filter(p => p.id !== packId);
    this.setItem(KEYS.PACKS, packs);
    // Delete associated questions
    const questions = this.getQuestions().filter(q => q.packId !== packId);
    this.setItem(KEYS.QUESTIONS, questions);
    deletePackFromFirestore(packId).catch(() => {});
  }

  // --- QUESTIONS ---
  public getQuestions(): Question[] {
    return this.getItem<Question[]>(KEYS.QUESTIONS, INITIAL_QUESTIONS);
  }

  public getQuestionsByPack(packId: string): Question[] {
    return this.getQuestions()
      .filter(q => q.packId === packId && !q.isHidden)
      .sort((a, b) => a.order - b.order);
  }

  public saveQuestions(questions: Question[]) {
    this.setItem(KEYS.QUESTIONS, questions);
    questions.forEach(q => saveQuestionToFirestore(q).catch(() => {}));
  }

  public saveQuestion(question: Question) {
    const questions = this.getQuestions();
    const idx = questions.findIndex(q => q.id === question.id);
    if (idx >= 0) {
      questions[idx] = question;
    } else {
      questions.push(question);
    }
    this.setItem(KEYS.QUESTIONS, questions);
    saveQuestionToFirestore(question).catch(() => {});
  }

  public deleteQuestion(questionId: string) {
    const allQs = this.getQuestions();
    const targetQ = allQs.find(q => q.id === questionId);
    const questions = allQs.filter(q => q.id !== questionId);
    this.setItem(KEYS.QUESTIONS, questions);
    deleteQuestionFromFirestore(questionId).catch(() => {});

    if (targetQ) {
      const packId = targetQ.packId;
      const packQsCount = questions.filter(q => q.packId === packId).length;
      const packs = this.getPacks();
      const pack = packs.find(p => p.id === packId);
      if (pack) {
        pack.totalQuestions = packQsCount;
        this.savePack(pack);
      }
    }
  }

  public deleteQuestionsBatch(questionIds: string[]) {
    if (!questionIds || questionIds.length === 0) return;
    const idsSet = new Set(questionIds);
    const allQs = this.getQuestions();
    const affectedPackIds = new Set(allQs.filter(q => idsSet.has(q.id)).map(q => q.packId));
    const questions = allQs.filter(q => !idsSet.has(q.id));
    this.setItem(KEYS.QUESTIONS, questions);
    questionIds.forEach(id => deleteQuestionFromFirestore(id).catch(() => {}));

    // Sync pack question counts
    const packs = this.getPacks();
    affectedPackIds.forEach(packId => {
      const pack = packs.find(p => p.id === packId);
      if (pack) {
        pack.totalQuestions = questions.filter(q => q.packId === packId).length;
        this.savePack(pack);
      }
    });
  }

  public clearQuestionImageAndInfo(questionId: string) {
    const questions = this.getQuestions();
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx >= 0) {
      questions[idx] = {
        ...questions[idx],
        image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
        hint: '',
        triviaFact: '',
        alternativeAcceptedAnswers: []
      };
      this.setItem(KEYS.QUESTIONS, questions);
      saveQuestionToFirestore(questions[idx]).catch(() => {});
    }
  }

  // --- PROGRESS ---
  public getAllProgress(): Record<string, PlayerPackProgress> {
    return this.getItem<Record<string, PlayerPackProgress>>(KEYS.PROGRESS, {});
  }

  public getPackProgress(packId: string): PlayerPackProgress {
    const all = this.getAllProgress();
    if (all[packId]) return all[packId];
    return {
      packId,
      completedQuestions: [],
      currentQuestionIndex: 0,
      completionPercentage: 0,
      starsEarned: 0
    };
  }

  public savePackProgress(progress: PlayerPackProgress) {
    const all = this.getAllProgress();
    all[progress.packId] = progress;
    this.setItem(KEYS.PROGRESS, all);
    saveProgressToFirestore(this.getCurrentUser().id, progress).catch(() => {});
  }

  // --- QUESTION ANSWERS ---
  public getQuestionAnswerState(questionId: string): QuestionAnswerState | null {
    const all = this.getItem<Record<string, QuestionAnswerState>>(KEYS.ANSWERS, {});
    return all[questionId] || null;
  }

  public saveQuestionAnswerState(state: QuestionAnswerState) {
    const all = this.getItem<Record<string, QuestionAnswerState>>(KEYS.ANSWERS, {});
    all[state.questionId] = state;
    this.setItem(KEYS.ANSWERS, all);
  }

  // --- FAVOURITES & DOWNLOADS ---
  public getFavouritePackIds(): string[] {
    return this.getItem<string[]>(KEYS.FAVOURITES, []);
  }

  public toggleFavouritePack(packId: string): boolean {
    const favs = this.getFavouritePackIds();
    const exists = favs.includes(packId);
    let updated: string[];
    if (exists) {
      updated = favs.filter(id => id !== packId);
    } else {
      updated = [...favs, packId];
    }
    this.setItem(KEYS.FAVOURITES, updated);
    return !exists;
  }

  public getDownloadedPackIds(): string[] {
    return this.getItem<string[]>(KEYS.OFFLINE_DOWNLOADS, [
      'pack-famous-logos',
      'pack-world-flags',
      'pack-movie-icons',
      'pack-wild-animals'
    ]);
  }

  public markPackDownloaded(packId: string) {
    const downloads = this.getDownloadedPackIds();
    if (!downloads.includes(packId)) {
      this.setItem(KEYS.OFFLINE_DOWNLOADS, [...downloads, packId]);
    }
  }

  // --- ACHIEVEMENTS ---
  public getAchievements(): Achievement[] {
    return this.getItem<Achievement[]>(KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
  }

  public saveAchievements(achievements: Achievement[]) {
    this.setItem(KEYS.ACHIEVEMENTS, achievements);
  }

  public claimAchievementReward(achievementId: string) {
    const list = this.getAchievements();
    const idx = list.findIndex(a => a.id === achievementId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], claimed: true };
      this.saveAchievements(list);
    }
  }

  public clearUserProgress() {
    this.setItem(KEYS.PROGRESS, {});
    this.setItem(KEYS.ANSWERS, {});
  }

  // --- CHALLENGES ---
  public getChallengeState() {
    return this.getItem<{
      claimedDailies: string[];
      claimedWeeklies: string[];
      lastDailyClaimDate: string;
      lastStreakClaimDate: string;
      streakDays: number;
    }>(KEYS.DAILY_CHALLENGES, {
      claimedDailies: [],
      claimedWeeklies: [],
      lastDailyClaimDate: '',
      lastStreakClaimDate: '',
      streakDays: 3
    });
  }

  public saveChallengeState(state: {
    claimedDailies: string[];
    claimedWeeklies: string[];
    lastDailyClaimDate: string;
    lastStreakClaimDate: string;
    streakDays: number;
  }) {
    this.setItem(KEYS.DAILY_CHALLENGES, state);
  }

  // --- STATISTICS ---
  public getPlayerStats(): PlayerStatistics {
    return this.getItem<PlayerStatistics>(KEYS.STATS, {
      gamesPlayed: 12,
      questionsAnswered: 24,
      correctAnswers: 20,
      incorrectAnswers: 4,
      hintsUsed: 3,
      coinsEarned: 350,
      xpEarned: 840,
      fastestAnswerSeconds: 3.2,
      favouriteCategory: 'Logos & Brands',
      packsCompleted: 1,
      totalTimePlayedSeconds: 1450,
      currentStreak: 3,
      longestStreak: 5
    });
  }

  public savePlayerStats(stats: PlayerStatistics) {
    this.setItem(KEYS.STATS, stats);
  }

  // --- ACCESSIBILITY & SETTINGS ---
  public getAccessibilitySettings(): AccessibilitySettings {
    return this.getItem<AccessibilitySettings>(KEYS.ACCESSIBILITY, {
      highContrast: false,
      theme: 'dark',
      fontSize: 'normal',
      colorBlindFriendly: false,
      reduceAnimations: false,
      soundEnabled: true,
      musicEnabled: false,
      hapticEnabled: true
    });
  }

  public saveAccessibilitySettings(settings: AccessibilitySettings) {
    this.setItem(KEYS.ACCESSIBILITY, settings);
  }

  // --- SYSTEM LOGS ---
  public getLogs(): SystemLog[] {
    return this.getItem<SystemLog[]>(KEYS.LOGS, [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'database',
        message: 'Master database initialized with 8 seed quiz packs and 64 picture questions.'
      }
    ]);
  }

  public clearLogs() {
    this.setItem(KEYS.LOGS, []);
  }

  public addLog(level: SystemLog['level'], category: SystemLog['category'], message: string, user?: string) {
    const logs = this.getLogs();
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      user
    };
    logs.unshift(newLog);
    // Keep last 100 logs
    this.setItem(KEYS.LOGS, logs.slice(0, 100));
    addLogToFirestore(newLog).catch(() => {});
  }

  // --- SNAPSHOT BACKUP & RESTORE ---
  public exportDatabaseSnapshot(): DatabaseSnapshot {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      categories: this.getCategories(),
      packs: this.getPacks(),
      questions: this.getQuestions(),
      achievements: this.getAchievements(),
      users: this.getAllUsers()
    };
  }

  public importDatabaseSnapshot(snapshot: DatabaseSnapshot) {
    if (snapshot.categories) this.saveCategories(snapshot.categories);
    if (snapshot.packs) this.savePacks(snapshot.packs);
    if (snapshot.questions) this.saveQuestions(snapshot.questions);
    if (snapshot.achievements) this.saveAchievements(snapshot.achievements);
    if (snapshot.users) this.setItem(KEYS.USERS, snapshot.users);
    this.addLog('success', 'database', 'Database successfully restored from backup snapshot.');
  }

  public resetDatabaseToDefault() {
    this.setItem(KEYS.CATEGORIES, INITIAL_CATEGORIES);
    this.setItem(KEYS.PACKS, INITIAL_PACKS);
    this.setItem(KEYS.QUESTIONS, INITIAL_QUESTIONS);
    this.setItem(KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
    this.setItem(KEYS.PROGRESS, {});
    this.setItem(KEYS.ANSWERS, {});
    this.setItem(KEYS.USERS, [DEFAULT_MASTER_ADMIN]);
    this.setItem(KEYS.CURRENT_USER, DEFAULT_MASTER_ADMIN);
    this.purgeSampleData();
    this.addLog('warn', 'database', 'Database reset to factory default clean state.');
  }
}

export const dbStore = new LocalStorageEngine();
