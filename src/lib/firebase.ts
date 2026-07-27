import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  QuizCategory,
  QuizPack,
  Question,
  PlayerPackProgress,
  UserProfile,
  SystemLog
} from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID if present, else default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Status indicator
let firebaseConnected = false;

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.projectId && !!firebaseConfig.apiKey;
}

// Collections reference helpers
export const collections = {
  users: () => collection(db, 'users'),
  quizPacks: () => collection(db, 'quizPacks'),
  questions: () => collection(db, 'questions'),
  categories: () => collection(db, 'categories'),
  playerProgress: () => collection(db, 'playerProgress'),
  systemLogs: () => collection(db, 'systemLogs')
};

// --- FIRESTORE SYNC & DATA API ---

/** Sync or fetch all categories from Firestore */
export async function fetchCategoriesFromFirestore(): Promise<QuizCategory[]> {
  try {
    const snap = await getDocs(collections.categories());
    const items: QuizCategory[] = [];
    snap.forEach((d) => items.push(d.data() as QuizCategory));
    firebaseConnected = true;
    return items;
  } catch (err) {
    console.warn('Firestore fetchCategories error:', err);
    return [];
  }
}

/** Save a category to Firestore */
export async function saveCategoryToFirestore(category: QuizCategory): Promise<void> {
  try {
    await setDoc(doc(db, 'categories', category.id), category, { merge: true });
  } catch (err) {
    console.warn('Firestore saveCategory error:', err);
  }
}

/** Delete a category from Firestore */
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    console.warn('Firestore deleteCategory error:', err);
  }
}

/** Fetch all quiz packs from Firestore */
export async function fetchPacksFromFirestore(): Promise<QuizPack[]> {
  try {
    const snap = await getDocs(collections.quizPacks());
    const items: QuizPack[] = [];
    snap.forEach((d) => items.push(d.data() as QuizPack));
    firebaseConnected = true;
    return items;
  } catch (err) {
    console.warn('Firestore fetchPacks error:', err);
    return [];
  }
}

/** Save a quiz pack to Firestore */
export async function savePackToFirestore(pack: QuizPack): Promise<void> {
  try {
    await setDoc(doc(db, 'quizPacks', pack.id), pack, { merge: true });
  } catch (err) {
    console.warn('Firestore savePack error:', err);
  }
}

/** Delete a quiz pack from Firestore */
export async function deletePackFromFirestore(packId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'quizPacks', packId));
  } catch (err) {
    console.warn('Firestore deletePack error:', err);
  }
}

/** Fetch all questions from Firestore */
export async function fetchQuestionsFromFirestore(): Promise<Question[]> {
  try {
    const snap = await getDocs(collections.questions());
    const items: Question[] = [];
    snap.forEach((d) => items.push(d.data() as Question));
    return items;
  } catch (err) {
    console.warn('Firestore fetchQuestions error:', err);
    return [];
  }
}

/** Save a question to Firestore */
export async function saveQuestionToFirestore(question: Question): Promise<void> {
  try {
    await setDoc(doc(db, 'questions', question.id), question, { merge: true });
  } catch (err) {
    console.warn('Firestore saveQuestion error:', err);
  }
}

/** Delete a question from Firestore */
export async function deleteQuestionFromFirestore(questionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'questions', questionId));
  } catch (err) {
    console.warn('Firestore deleteQuestion error:', err);
  }
}

/** Save player user profile to Firestore */
export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
  } catch (err) {
    console.warn('Firestore saveUser error:', err);
  }
}

/** Fetch user profile from Firestore */
export async function fetchUserFromFirestore(userId: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Firestore fetchUser error:', err);
    return null;
  }
}

/** Save player pack progress to Firestore */
export async function saveProgressToFirestore(userId: string, progress: PlayerPackProgress): Promise<void> {
  try {
    const docId = `${userId}_${progress.packId}`;
    await setDoc(doc(db, 'playerProgress', docId), { ...progress, userId }, { merge: true });
  } catch (err) {
    console.warn('Firestore saveProgress error:', err);
  }
}

/** Fetch all progress for a user from Firestore */
export async function fetchUserProgressFromFirestore(userId: string): Promise<Record<string, PlayerPackProgress>> {
  try {
    const q = query(collections.playerProgress(), where('userId', '==', userId));
    const snap = await getDocs(q);
    const result: Record<string, PlayerPackProgress> = {};
    snap.forEach((d) => {
      const data = d.data() as PlayerPackProgress & { userId: string };
      result[data.packId] = data;
    });
    return result;
  } catch (err) {
    console.warn('Firestore fetchProgress error:', err);
    return {};
  }
}

/** Add a system audit log to Firestore */
export async function addLogToFirestore(log: SystemLog): Promise<void> {
  try {
    await setDoc(doc(db, 'systemLogs', log.id), log, { merge: true });
  } catch (err) {
    console.warn('Firestore addLog error:', err);
  }
}

/** Seed Firestore with initial data if empty */
export async function seedFirestoreIfEmpty(
  categories: QuizCategory[],
  packs: QuizPack[],
  questions: Question[],
  users: UserProfile[]
): Promise<void> {
  try {
    const existingPacks = await getDocs(collections.quizPacks());
    if (existingPacks.empty) {
      console.log('Seeding initial dataset to Firestore...');
      for (const cat of categories) {
        await saveCategoryToFirestore(cat);
      }
      for (const pack of packs) {
        await savePackToFirestore(pack);
      }
      for (const q of questions) {
        await saveQuestionToFirestore(q);
      }
      for (const u of users) {
        await saveUserToFirestore(u);
      }
      console.log('Firestore initial seed complete!');
    }
  } catch (err) {
    console.warn('Error during seedFirestoreIfEmpty:', err);
  }
}
