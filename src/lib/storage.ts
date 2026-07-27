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
  fetchCategoriesFromFirestore
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
      this.setItem(KEYS.USERS, [DEFAULT_MASTER_ADMIN, DEFAULT_PLAYER]);
    }
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      // Default to guest player account
      this.setItem(KEYS.CURRENT_USER, DEFAULT_PLAYER);
    }

    // Seed & Sync with Firebase Firestore in the background
    seedFirestoreIfEmpty(
      this.getCategories(),
      this.getPacks(),
      this.getQuestions(),
      this.getAllUsers()
    ).then(() => {
      // Background sync packs & questions from Firestore if available
      Promise.all([
        fetchPacksFromFirestore(),
        fetchQuestionsFromFirestore(),
        fetchCategoriesFromFirestore()
      ]).then(([remotePacks, remoteQuestions, remoteCategories]) => {
        if (remotePacks.length > 0) {
          this.setItem(KEYS.PACKS, remotePacks);
        }
        if (remoteQuestions.length > 0) {
          this.setItem(KEYS.QUESTIONS, remoteQuestions);
        }
        if (remoteCategories.length > 0) {
          this.setItem(KEYS.CATEGORIES, remoteCategories);
        }
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
    const questions = this.getQuestions().filter(q => q.id !== questionId);
    this.setItem(KEYS.QUESTIONS, questions);
    deleteQuestionFromFirestore(questionId).catch(() => {});
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
    this.setItem(KEYS.USERS, [DEFAULT_MASTER_ADMIN, DEFAULT_PLAYER]);
    this.setItem(KEYS.CURRENT_USER, DEFAULT_PLAYER);
    this.addLog('warn', 'database', 'Database reset to factory default seed state.');
  }
}

export const dbStore = new LocalStorageEngine();
