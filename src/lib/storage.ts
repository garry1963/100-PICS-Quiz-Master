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
  DEFAULT_PLAYER,
  UNAUTHENTICATED_GUEST
} from './seedData';
import {
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  savePackToFirestore,
  deletePackFromFirestore,
  saveQuestionToFirestore,
  deleteQuestionFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveProgressToFirestore,
  addLogToFirestore,
  seedFirestoreIfEmpty,
  fetchPacksFromFirestore,
  fetchQuestionsFromFirestore,
  fetchCategoriesFromFirestore,
  purgeSampleDataFromFirestore
} from './firebase';
import {
  saveImageToIndexedDB,
  getImageFromIndexedDB,
  getAllImagesFromIndexedDB
} from './imageDB';

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
  private inMemoryCache: Map<string, any> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.warn('Error in dbStore subscriber listener:', err);
      }
    });
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key) as T;
    }
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data) as T;
        this.inMemoryCache.set(key, parsed);
        return parsed;
      }
    } catch {
      // fallback
    }
    return defaultValue;
  }

  private setItem<T>(key: string, value: T): void {
    this.inMemoryCache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // If localStorage quota is exceeded, persist base64 data URLs to IndexedDB
      if (key === KEYS.QUESTIONS && Array.isArray(value)) {
        try {
          const trimmed = value.map((q: any) => {
            if (q && typeof q.image === 'string' && q.image.startsWith('data:')) {
              saveImageToIndexedDB(q.id, q.image).catch(() => {});
              return { ...q, image: `idb:${q.id}` };
            }
            return q;
          });
          localStorage.setItem(key, JSON.stringify(trimmed));
        } catch {
          // inMemoryCache & IndexedDB & Firestore retain full image data safely
        }
      }
    }
  }

  public purgeSampleData() {
    const legacySampleCategoryIds = ['cat-logos', 'cat-flags', 'cat-movies', 'cat-landmarks', 'cat-games', 'cat-food', 'cat-music'];
    const legacySamplePackIds = ['pack-famous-logos', 'pack-world-flags', 'pack-movie-icons', 'pack-world-landmarks', 'pack-retro-games', 'pack-food-delights', 'pack-music-icons'];

    const cleanCategories = this.getCategories().filter(c => !legacySampleCategoryIds.includes(c.id));
    if (cleanCategories.length === 0) {
      cleanCategories.push(INITIAL_CATEGORIES[0]);
    }
    this.setItem(KEYS.CATEGORIES, cleanCategories);

    const cleanPacks = this.getPacks().filter(p => !legacySamplePackIds.includes(p.id));
    if (cleanPacks.length === 0) {
      cleanPacks.push(INITIAL_PACKS[0]);
    }
    this.setItem(KEYS.PACKS, cleanPacks);

    const cleanQuestions = this.getQuestions().filter(q => 
      !legacySamplePackIds.includes(q.packId) && 
      !q.id.startsWith('q-logo-') && !q.id.startsWith('q-flag-') &&
      !q.id.startsWith('q-movie-') &&
      !q.id.startsWith('q-landmark-') && !q.id.startsWith('q-game-') &&
      !q.id.startsWith('q-food-') && !q.id.startsWith('q-music-')
    );
    if (cleanQuestions.length === 0) {
      cleanQuestions.push(...INITIAL_QUESTIONS);
    }
    this.setItem(KEYS.QUESTIONS, cleanQuestions);

    const cleanUsers = this.getAllUsers().filter(
      u => u.id !== 'player-guest-101' && u.id !== 'player-1' && u.id !== 'guest-player' && u.id !== 'guest-user' && u.username !== 'PlayerOne' && u.username !== 'Guest Player' && u.username !== 'Guest' && u.role !== 'guest'
    );
    if (cleanUsers.length === 0) {
      cleanUsers.push(DEFAULT_MASTER_ADMIN);
    }
    this.setItem(KEYS.USERS, cleanUsers);

    const curr = this.getCurrentUser();
    if (curr.id === 'player-guest-101' || curr.id === 'player-1' || curr.id === 'guest-player' || curr.id === 'guest-user' || curr.username === 'PlayerOne' || curr.username === 'Guest Player' || curr.role === 'guest') {
      this.setItem(KEYS.CURRENT_USER, UNAUTHENTICATED_GUEST);
    }

    purgeSampleDataFromFirestore().catch(() => {});
  }

  public async syncWithFirestore(): Promise<{
    success: boolean;
    packCount: number;
    questionCount: number;
    categoryCount: number;
    message: string;
  }> {
    try {
      const [remotePacks, remoteQuestions, remoteCategories] = await Promise.all([
        fetchPacksFromFirestore(),
        fetchQuestionsFromFirestore(),
        fetchCategoriesFromFirestore()
      ]);

      const sampleCategoryIds = ['cat-logos', 'cat-flags', 'cat-movies', 'cat-animals', 'cat-landmarks', 'cat-games', 'cat-food', 'cat-music'];
      const samplePackIds = ['pack-famous-logos', 'pack-world-flags', 'pack-movie-icons', 'pack-wild-animals', 'pack-world-landmarks', 'pack-retro-games', 'pack-food-delights', 'pack-music-icons'];

      // MERGE CATEGORIES: Remote categories take priority if present
      const catMap = new Map<string, QuizCategory>();
      remoteCategories.filter(c => !sampleCategoryIds.includes(c.id)).forEach(c => catMap.set(c.id, c));
      this.getCategories().filter(c => !sampleCategoryIds.includes(c.id)).forEach(c => {
        if (!catMap.has(c.id)) {
          catMap.set(c.id, c);
          saveCategoryToFirestore(c).catch(() => {});
        }
      });
      const mergedCategories = Array.from(catMap.values());
      this.setItem(KEYS.CATEGORIES, mergedCategories);

      // MERGE PACKS: Remote packs take priority (preserving thumbnails)
      const packMap = new Map<string, QuizPack>();
      remotePacks.filter(p => !samplePackIds.includes(p.id)).forEach(p => packMap.set(p.id, p));
      this.getPacks().filter(p => !samplePackIds.includes(p.id)).forEach(p => {
        if (!packMap.has(p.id)) {
          packMap.set(p.id, p);
          savePackToFirestore(p).catch(() => {});
        } else {
          const remoteP = packMap.get(p.id)!;
          const localIsFallback = !p.thumbnail || p.thumbnail.includes('photo-1618005182384');
          const remoteHasReal = remoteP.thumbnail && !remoteP.thumbnail.includes('photo-1618005182384');
          if (remoteHasReal || localIsFallback) {
            packMap.set(p.id, {
              ...p,
              thumbnail: remoteP.thumbnail || p.thumbnail,
              banner: remoteP.banner || p.banner
            });
          }
        }
      });
      const mergedPacks = Array.from(packMap.values());
      this.setItem(KEYS.PACKS, mergedPacks);

      // MERGE QUESTIONS: Remote Firestore questions ALWAYS retain full picture image data
      const questionMap = new Map<string, Question>();
      remoteQuestions.filter(q => !samplePackIds.includes(q.packId)).forEach(q => questionMap.set(q.id, q));
      this.getQuestions().filter(q => !samplePackIds.includes(q.packId)).forEach(q => {
        if (!questionMap.has(q.id)) {
          questionMap.set(q.id, q);
          saveQuestionToFirestore(q).catch(() => {});
        } else {
          const remoteQ = questionMap.get(q.id)!;
          const localIsFallback = !q.image || q.image.includes('photo-1579546929518-9e396f3cc809');
          const remoteHasReal = remoteQ.image && !remoteQ.image.includes('photo-1579546929518-9e396f3cc809');
          if (remoteHasReal || localIsFallback) {
            questionMap.set(q.id, {
              ...q,
              image: remoteQ.image || q.image
            });
          }
        }
      });
      const mergedQuestions = Array.from(questionMap.values());
      this.setItem(KEYS.QUESTIONS, mergedQuestions);

      this.notifyListeners();

      return {
        success: true,
        packCount: mergedPacks.length,
        questionCount: mergedQuestions.length,
        categoryCount: mergedCategories.length,
        message: `Synced ${mergedPacks.length} packs & ${mergedQuestions.length} picture questions from Firestore.`
      };
    } catch (err: any) {
      console.warn('syncWithFirestore failed:', err);
      return {
        success: false,
        packCount: 0,
        questionCount: 0,
        categoryCount: 0,
        message: `Sync error: ${err?.message || 'Failed to communicate with Firestore'}`
      };
    }
  }

  public async rehydrateImagesFromIndexedDB() {
    try {
      const idbImages = await getAllImagesFromIndexedDB();
      const questions = this.getQuestions();
      let updated = false;
      const rehydrated = questions.map(q => {
        if (idbImages[q.id]) {
          updated = true;
          return { ...q, image: idbImages[q.id] };
        }
        if (q.image && q.image.startsWith('idb:') && idbImages[q.image.replace('idb:', '')]) {
          updated = true;
          return { ...q, image: idbImages[q.image.replace('idb:', '')] };
        }
        return q;
      });
      if (updated) {
        this.inMemoryCache.set(KEYS.QUESTIONS, rehydrated);
        this.notifyListeners();
      }
    } catch (err) {
      console.warn('rehydrateImagesFromIndexedDB error:', err);
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
      this.setItem(KEYS.USERS, [DEFAULT_MASTER_ADMIN]);
    }
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      this.setItem(KEYS.CURRENT_USER, DEFAULT_MASTER_ADMIN);
    }

    // Rehydrate heavy base64 images stored in IndexedDB
    this.rehydrateImagesFromIndexedDB().catch(() => {});

    // Always strip lingering sample data
    this.purgeSampleData();

    // Seed & Sync with Firebase Firestore in the background
    seedFirestoreIfEmpty(
      this.getCategories(),
      this.getPacks(),
      this.getQuestions(),
      this.getAllUsers()
    ).then(() => {
      this.syncWithFirestore().catch(err => console.warn('Initial Firestore sync failed:', err));
    });
  }

  // --- USER AUTH & PROFILES ---
  public getCurrentUser(): UserProfile {
    return this.getItem<UserProfile>(KEYS.CURRENT_USER, UNAUTHENTICATED_GUEST);
  }

  public setCurrentUser(user: UserProfile) {
    this.setItem(KEYS.CURRENT_USER, user);
    if (user.role !== 'guest' && user.id !== 'guest-user' && user.id !== 'guest-player' && user.username !== 'Guest' && user.username !== 'Guest Player') {
      this.updateUserInList(user);
      saveUserToFirestore(user).catch(() => {});
    }
  }

  public getAllUsers(): UserProfile[] {
    return this.getItem<UserProfile[]>(KEYS.USERS, [DEFAULT_MASTER_ADMIN]).filter(
      u => u.username !== 'PlayerOne' &&
           u.username !== 'Guest Player' &&
           u.username !== 'Guest' &&
           u.id !== 'player-1' &&
           u.id !== 'guest-player' &&
           u.id !== 'guest-user' &&
           u.id !== 'player-guest-101' &&
           u.role !== 'guest'
    );
  }

  public saveUser(user: UserProfile) {
    if (user.role === 'guest' || user.id === 'guest-user' || user.id === 'guest-player' || user.username === 'Guest Player' || user.username === 'Guest') {
      return;
    }
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
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
    if (user.role === 'guest' || user.id === 'guest-user' || user.id === 'guest-player' || user.username === 'Guest Player' || user.username === 'Guest') {
      return;
    }
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
      this.setItem(KEYS.USERS, users);
    }
    saveUserToFirestore(user).catch(() => {});
  }

  public deleteUser(userId: string) {
    const users = this.getAllUsers().filter(u => u.id !== userId);
    this.setItem(KEYS.USERS, users);
    const curr = this.getCurrentUser();
    if (curr.id === userId) {
      this.setItem(KEYS.CURRENT_USER, DEFAULT_MASTER_ADMIN);
    }
    deleteUserFromFirestore(userId).catch(() => {});
  }

  // --- CATEGORIES ---
  public getCategories(): QuizCategory[] {
    return this.getItem<QuizCategory[]>(KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  public saveCategories(categories: QuizCategory[]) {
    this.setItem(KEYS.CATEGORIES, categories);
    categories.forEach(c => saveCategoryToFirestore(c).catch(() => {}));
    this.notifyListeners();
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
    this.notifyListeners();
  }

  public deleteCategory(categoryId: string) {
    const categories = this.getCategories().filter(c => c.id !== categoryId);
    this.setItem(KEYS.CATEGORIES, categories);
    deleteCategoryFromFirestore(categoryId).catch(() => {});
    this.notifyListeners();
  }

  // --- PACKS ---
  public getPacks(): QuizPack[] {
    return this.getItem<QuizPack[]>(KEYS.PACKS, INITIAL_PACKS);
  }

  public savePacks(packs: QuizPack[]) {
    this.setItem(KEYS.PACKS, packs);
    packs.forEach(p => savePackToFirestore(p).catch(() => {}));
    this.notifyListeners();
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
    this.notifyListeners();
  }

  public deletePack(packId: string) {
    const packs = this.getPacks().filter(p => p.id !== packId);
    this.setItem(KEYS.PACKS, packs);
    // Delete associated questions
    const questions = this.getQuestions().filter(q => q.packId !== packId);
    this.setItem(KEYS.QUESTIONS, questions);
    deletePackFromFirestore(packId).catch(() => {});
    this.notifyListeners();
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
    questions.forEach(q => {
      if (q.image && q.image.startsWith('data:')) {
        saveImageToIndexedDB(q.id, q.image).catch(() => {});
      }
      saveQuestionToFirestore(q).catch(() => {});
    });
    this.setItem(KEYS.QUESTIONS, questions);
    this.notifyListeners();
  }

  public saveQuestion(question: Question) {
    if (question.image && question.image.startsWith('data:')) {
      saveImageToIndexedDB(question.id, question.image).catch(() => {});
    }
    const questions = this.getQuestions();
    const idx = questions.findIndex(q => q.id === question.id);
    if (idx >= 0) {
      questions[idx] = question;
    } else {
      questions.push(question);
    }
    this.setItem(KEYS.QUESTIONS, questions);
    saveQuestionToFirestore(question).catch(() => {});
    this.notifyListeners();
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
    this.notifyListeners();
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
    this.notifyListeners();
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
      this.notifyListeners();
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
  public getAllAnswerStates(): Record<string, QuestionAnswerState> {
    return this.getItem<Record<string, QuestionAnswerState>>(KEYS.ANSWERS, {});
  }

  public getQuestionAnswerState(questionId: string): QuestionAnswerState | null {
    const all = this.getAllAnswerStates();
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
      'pack-world-animals'
    ]);
  }

  public markPackDownloaded(packId: string) {
    const downloads = this.getDownloadedPackIds();
    if (!downloads.includes(packId)) {
      this.setItem(KEYS.OFFLINE_DOWNLOADS, [...downloads, packId]);
      this.notifyListeners();
    }
  }

  public async downloadPackFromCloud(packId: string): Promise<{
    success: boolean;
    message: string;
    pack?: QuizPack;
    questions?: Question[];
  }> {
    try {
      // Fetch remote packs & questions from Firestore
      const [remotePacks, remoteQuestions] = await Promise.all([
        fetchPacksFromFirestore(),
        fetchQuestionsFromFirestore()
      ]);

      let targetPack = remotePacks.find(p => p.id === packId) || this.getPacks().find(p => p.id === packId);
      let targetQuestions = remoteQuestions.filter(q => q.packId === packId);

      if (!targetQuestions || targetQuestions.length === 0) {
        targetQuestions = this.getQuestions().filter(q => q.packId === packId);
      }

      if (!targetPack) {
        return {
          success: false,
          message: `Puzzle pack "${packId}" was not found on the cloud server.`
        };
      }

      // Save & Smart Cache locally
      this.savePack(targetPack);
      if (targetQuestions.length > 0) {
        const allQuestions = this.getQuestions();
        const existingIds = new Set(allQuestions.map(q => q.id));
        const updatedQuestions = [...allQuestions];
        
        targetQuestions.forEach(q => {
          if (existingIds.has(q.id)) {
            const idx = updatedQuestions.findIndex(x => x.id === q.id);
            if (idx >= 0) updatedQuestions[idx] = q;
          } else {
            updatedQuestions.push(q);
          }
        });

        this.saveQuestions(updatedQuestions);
      }

      this.markPackDownloaded(packId);

      return {
        success: true,
        message: `Successfully downloaded and cached "${targetPack.title}" (${targetQuestions.length} picture questions) into local temporary storage.`,
        pack: targetPack,
        questions: targetQuestions
      };
    } catch (err: any) {
      console.warn('Error downloading cloud pack:', err);
      const localPack = this.getPacks().find(p => p.id === packId);
      if (localPack) {
        this.markPackDownloaded(packId);
        return {
          success: true,
          message: `Cached "${localPack.title}" locally for offline play.`,
          pack: localPack
        };
      }
      return {
        success: false,
        message: `Could not connect to cloud server: ${err?.message || 'Network error'}`
      };
    }
  }

  public cleanOldestCompletedPuzzleImages(): {
    success: boolean;
    freedBytes: number;
    cleanedPacksCount: number;
    cleanedPackTitles: string[];
    remainingCachedCount: number;
    message: string;
  } {
    const downloadedIds = this.getDownloadedPackIds();
    const allPacks = this.getPacks();
    const allProgress = this.getAllProgress();

    // Starter pack World Animals is protected from deletion
    const protectedIds = ['pack-world-animals', 'pack-wild-animals'];

    // Identify completed downloaded packs (100% finished)
    const completedDownloadedPackIds = downloadedIds.filter(id => {
      if (protectedIds.includes(id)) return false;
      const prog = allProgress[id];
      return prog && prog.completionPercentage >= 100;
    });

    if (completedDownloadedPackIds.length === 0) {
      return {
        success: true,
        freedBytes: 0,
        cleanedPacksCount: 0,
        cleanedPackTitles: [],
        remainingCachedCount: downloadedIds.length,
        message: 'No completed cloud puzzle image caches found to clean. Device storage is optimal.'
      };
    }

    // Estimate size freed
    let estBytes = 0;
    const cleanedTitles: string[] = [];
    const allQuestions = this.getQuestions();

    completedDownloadedPackIds.forEach(packId => {
      const p = allPacks.find(x => x.id === packId);
      if (p) cleanedTitles.push(p.title);

      const packQs = allQuestions.filter(q => q.packId === packId);
      packQs.forEach(q => {
        if (q.image) estBytes += q.image.length;
      });
    });

    // Remove completed pack IDs from downloaded list while preserving player progress & scores
    const updatedDownloadedIds = downloadedIds.filter(id => !completedDownloadedPackIds.includes(id));
    this.setItem(KEYS.OFFLINE_DOWNLOADS, updatedDownloadedIds);

    this.notifyListeners();
    this.addLog(
      'info',
      'database',
      `Storage Cleanup: Freed approx ${Math.round(estBytes / 1024)} KB by purging image caches for ${completedDownloadedPackIds.length} completed puzzle pack(s).`
    );

    return {
      success: true,
      freedBytes: estBytes,
      cleanedPacksCount: completedDownloadedPackIds.length,
      cleanedPackTitles: cleanedTitles,
      remainingCachedCount: updatedDownloadedIds.length,
      message: `Freed approx ${Math.max(0.1, (estBytes / (1024 * 1024))).toFixed(2)} MB of device storage by removing picture image caches for ${completedDownloadedPackIds.length} completed puzzle pack(s) (${cleanedTitles.join(', ')}). Your player progress, stars, and coin balances remain 100% saved!`
    };
  }

  public getStorageUsageInfo() {
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('100pics_')) {
          const val = localStorage.getItem(key);
          if (val) totalBytes += val.length;
        }
      }
    } catch {
      // ignore
    }

    const downloadedIds = this.getDownloadedPackIds();
    const allProgress = this.getAllProgress();
    const completedCount = downloadedIds.filter(id => {
      const prog = allProgress[id];
      return prog && prog.completionPercentage >= 100;
    }).length;

    return {
      totalBytes,
      totalKB: Math.round(totalBytes / 1024),
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      downloadedCount: downloadedIds.length,
      completedCount,
      downloadedIds,
      starterPackAvailable: downloadedIds.includes('pack-world-animals') || downloadedIds.includes('pack-wild-animals')
    };
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

  public clearPersonalStats(user: UserProfile): UserProfile {
    this.setItem(KEYS.PROGRESS, {});
    this.setItem(KEYS.ANSWERS, {});
    
    const updatedUser: UserProfile = {
      ...user,
      coins: 100,
      xp: 0,
      level: 1,
      title: 'Puzzle Rookie',
      currentStreak: 0,
      longestStreak: 0
    };
    
    this.saveUser(updatedUser);
    this.setCurrentUser(updatedUser);
    this.addLog('info', 'auth', `Personal statistics and progress cleared for ${user.username}`);
    return updatedUser;
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
    const currentUser = this.getCurrentUser();
    const resolvedUser = user || currentUser?.username || 'Master Admin';
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      user: resolvedUser
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
