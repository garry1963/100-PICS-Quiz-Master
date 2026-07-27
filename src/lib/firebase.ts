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
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const MASTER_ADMIN_EMAIL = 'garrydavies1963@gmail.com';

// Status indicator
let firebaseConnected = false;

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.projectId && !!firebaseConfig.apiKey;
}

// Collections reference helpers
export const collections = {
  users: () => collection(db, 'users'),
  approvedUsers: () => collection(db, 'approvedUsers'),
  quizPacks: () => collection(db, 'quizPacks'),
  questions: () => collection(db, 'questions'),
  categories: () => collection(db, 'categories'),
  playerProgress: () => collection(db, 'playerProgress'),
  systemLogs: () => collection(db, 'systemLogs'),
  systemConfig: () => collection(db, 'systemConfig')
};

/**
 * Fetch and securely validate the single authorized Master Admin email from Firebase Firestore.
 */
export async function getAuthorizedMasterAdminEmail(): Promise<string> {
  try {
    const configDocRef = doc(db, 'systemConfig', 'admin');
    const snap = await getDoc(configDocRef);
    if (snap.exists() && snap.data().masterAdminEmail) {
      return String(snap.data().masterAdminEmail).trim().toLowerCase();
    }
    
    // Seed default admin config securely in Firestore if not present
    await setDoc(configDocRef, {
      masterAdminEmail: MASTER_ADMIN_EMAIL,
      role: 'admin',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return MASTER_ADMIN_EMAIL.toLowerCase();
  } catch (err) {
    console.warn('Firestore getAuthorizedMasterAdminEmail fallback:', err);
    return MASTER_ADMIN_EMAIL.toLowerCase();
  }
}

/**
 * Perform Master Admin Google Login and validate email against Firebase stored admin account.
 */
export async function loginMasterAdminWithGoogle(): Promise<{
  success: boolean;
  user?: UserProfile;
  message?: string;
  isUnauthorizedDomain?: boolean;
}> {
  try {
    const authorizedEmail = await getAuthorizedMasterAdminEmail();
    const result = await signInWithPopup(auth, googleProvider);
    const googleUser = result.user;
    const userEmail = (googleUser.email || '').trim().toLowerCase();

    // STRICT VALIDATION: Ensure user email matches authorized master admin email in Firebase
    if (userEmail !== authorizedEmail) {
      await signOut(auth);
      return {
        success: false,
        message: `Access Denied: The Google account "${googleUser.email || 'unknown'}" is NOT authorized as Master Administrator. Only ${authorizedEmail} is permitted.`
      };
    }

    const adminProfile: UserProfile = {
      id: googleUser.uid,
      username: googleUser.displayName || 'Garry Davies (Master Admin)',
      email: authorizedEmail,
      role: 'admin',
      avatar: googleUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      coins: 2500,
      xp: 12500,
      level: 25,
      title: 'Quiz Master Administrator',
      currentStreak: 14,
      longestStreak: 30,
      lastLoginDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Store verified Master Admin in Firestore
    await saveUserToFirestore(adminProfile);

    return {
      success: true,
      user: adminProfile
    };
  } catch (err: any) {
    console.error('Master Admin Google Auth error:', err);
    
    if (err?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return {
        success: false,
        isUnauthorizedDomain: true,
        message: `Firebase Auth domain restriction: "${currentHost}" is not listed in your Firebase project's Authorized Domains list. To use Google Popup Login, add "${currentHost}" in Firebase Console > Authentication > Settings > Authorized Domains. Alternatively, use Direct Authorized Email Verification below.`
      };
    }

    return {
      success: false,
      message: err?.message || 'Google authentication failed. Please try again.'
    };
  }
}

/**
 * Direct verification of Master Admin Email against stored Firebase configuration.
 */
export async function loginMasterAdminDirect(inputEmail: string): Promise<{
  success: boolean;
  user?: UserProfile;
  message?: string;
}> {
  try {
    const normalizedInput = inputEmail.trim().toLowerCase();
    const authorizedEmail = await getAuthorizedMasterAdminEmail();

    if (normalizedInput !== authorizedEmail) {
      return {
        success: false,
        message: `Access Denied: "${inputEmail}" is NOT authorized as Master Administrator. Only ${authorizedEmail} is permitted.`
      };
    }

    const adminProfile: UserProfile = {
      id: 'master-admin-001',
      username: 'Garry Davies (Master Admin)',
      email: authorizedEmail,
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      coins: 2500,
      xp: 12500,
      level: 25,
      title: 'Quiz Master Administrator',
      currentStreak: 14,
      longestStreak: 30,
      lastLoginDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    await saveUserToFirestore(adminProfile);

    return {
      success: true,
      user: adminProfile
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Admin validation failed.'
    };
  }
}

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
    if (user.approvalStatus === 'approved') {
      await setDoc(doc(db, 'approvedUsers', user.id), user, { merge: true });
    }
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

/** Fetch all users from Firestore */
export async function fetchAllUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collections.users());
    const items: UserProfile[] = [];
    snap.forEach((d) => items.push(d.data() as UserProfile));
    return items;
  } catch (err) {
    console.warn('Firestore fetchAllUsers error:', err);
    return [];
  }
}

/** Fetch list of admin-approved users from Firestore */
export async function fetchApprovedUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collections.approvedUsers());
    const items: UserProfile[] = [];
    snap.forEach((d) => {
      const u = d.data() as UserProfile;
      if (u.approvalStatus === 'approved' || !u.approvalStatus) {
        items.push(u);
      }
    });
    return items;
  } catch (err) {
    console.warn('Firestore fetchApprovedUsers error:', err);
    return [];
  }
}

/** Create a new account request with pending approval status in Firestore */
export async function requestAccountCreationInFirestore(
  username: string,
  email: string
): Promise<UserProfile> {
  const newUser: UserProfile = {
    id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    role: 'player',
    avatar: `https://images.unsplash.com/photo-${1535713875002 + (Math.floor(Math.random() * 10))}?auto=format&fit=crop&w=250&q=80`,
    coins: 500,
    xp: 0,
    level: 1,
    title: 'Quiz Novice',
    currentStreak: 1,
    longestStreak: 1,
    lastLoginDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    approvalStatus: 'pending',
    pin: ''
  };

  await setDoc(doc(db, 'users', newUser.id), newUser, { merge: true });
  await setDoc(doc(db, 'approvedUsers', newUser.id), newUser, { merge: true });

  return newUser;
}

/** Master Admin approval of a pending user account */
export async function approveUserInFirestore(userId: string, adminEmail: string): Promise<void> {
  const updateData = {
    approvalStatus: 'approved' as const,
    approvedAt: new Date().toISOString(),
    approvedBy: adminEmail
  };

  try {
    await setDoc(doc(db, 'users', userId), updateData, { merge: true });
    await setDoc(doc(db, 'approvedUsers', userId), updateData, { merge: true });
  } catch (err) {
    console.warn('Firestore approveUser error:', err);
  }
}

/** Master Admin rejection of a user account request */
export async function rejectUserInFirestore(userId: string, adminEmail: string): Promise<void> {
  const updateData = {
    approvalStatus: 'rejected' as const,
    approvedAt: new Date().toISOString(),
    approvedBy: adminEmail
  };

  try {
    await setDoc(doc(db, 'users', userId), updateData, { merge: true });
    await setDoc(doc(db, 'approvedUsers', userId), updateData, { merge: true });
  } catch (err) {
    console.warn('Firestore rejectUser error:', err);
  }
}

/** Save 4-digit PIN for an approved user */
export async function saveUserPinInFirestore(userId: string, pin: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId), { pin }, { merge: true });
    await setDoc(doc(db, 'approvedUsers', userId), { pin }, { merge: true });
  } catch (err) {
    console.warn('Firestore saveUserPin error:', err);
  }
}

/** Admin Sign Out function */
export async function signOutAdmin(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out error:', err);
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
