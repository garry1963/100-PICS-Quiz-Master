import { QuizCategory, QuizPack, Question, UserProfile, DatabaseSnapshot } from '../types';
import { dbStore } from './storage';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API HTTP error ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    // Offline or server unavailable fallback
    return null;
  }
}

export const apiClient = {
  // --- AUTH ---
  async login(emailOrUsername: string, password?: string): Promise<{ user: UserProfile; success: boolean; message?: string }> {
    const serverResult = await apiFetch<{ user: UserProfile; success: boolean; message?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    });

    if (serverResult && serverResult.success) {
      dbStore.setCurrentUser(serverResult.user);
      return serverResult;
    }

    // Local DB Auth Check Fallback
    const users = dbStore.getAllUsers();
    const query = emailOrUsername.trim().toLowerCase();
    
    // Master Admin check
    if (query === 'admin' || query === 'admin@100picsquiz.com') {
      const admin = users.find(u => u.role === 'admin') || dbStore.getCurrentUser();
      dbStore.setCurrentUser(admin);
      dbStore.addLog('info', 'auth', `Master Admin logged in locally.`, admin.username);
      return { user: admin, success: true };
    }

    const found = users.find(u => u.email.toLowerCase() === query || u.username.toLowerCase() === query);
    if (found) {
      if (found.isBanned) {
        return { user: found, success: false, message: 'This account has been suspended by the administrator.' };
      }
      dbStore.setCurrentUser(found);
      dbStore.addLog('info', 'auth', `Player ${found.username} logged in.`, found.username);
      return { user: found, success: true };
    }

    return { user: dbStore.getCurrentUser(), success: false, message: 'Invalid credentials or user not found.' };
  },

  async registerPlayer(username: string, email: string): Promise<{ user: UserProfile; success: boolean; message?: string }> {
    const serverResult = await apiFetch<{ user: UserProfile; success: boolean }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    });

    if (serverResult && serverResult.success) {
      dbStore.setCurrentUser(serverResult.user);
      return serverResult;
    }

    // Local Fallback
    const newPlayer: UserProfile = {
      id: `player-${Date.now()}`,
      username: username.trim() || 'NewPlayer',
      email: email.trim().toLowerCase() || 'player@100picsquiz.com',
      role: 'player',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      coins: 100,
      xp: 0,
      level: 1,
      title: 'Rookie Detective',
      currentStreak: 1,
      longestStreak: 1,
      lastLoginDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    dbStore.saveUser(newPlayer);
    dbStore.setCurrentUser(newPlayer);
    dbStore.addLog('success', 'auth', `New player account created: ${newPlayer.username}`);
    return { user: newPlayer, success: true };
  },

  async loginUser(usernameOrEmail: string): Promise<UserProfile | null> {
    const res = await this.login(usernameOrEmail);
    if (res && res.success) {
      return res.user;
    }
    return null;
  },

  // --- GEMINI AI QUESTION GENERATOR ---
  async generateAIPack(topic: string, questionCount: number = 8): Promise<{
    title: string;
    description: string;
    category: string;
    difficulty: QuizPack['difficulty'];
    questions: Array<{
      correctAnswer: string;
      hint: string;
      triviaFact: string;
      alternativeAcceptedAnswers: string[];
      suggestedImageQuery: string;
    }>;
  } | null> {
    const serverResult = await apiFetch<{
      success: boolean;
      data: any;
      error?: string;
    }>('/api/admin/ai-generate', {
      method: 'POST',
      body: JSON.stringify({ topic, questionCount }),
    });

    if (serverResult && serverResult.success && serverResult.data) {
      return serverResult.data;
    }

    return null;
  },

  // --- BULK IMPORT/EXPORT ---
  async bulkImportJSON(jsonString: string): Promise<{ importedPacks: number; importedQuestions: number; error?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.packs && Array.isArray(parsed.packs)) {
        parsed.packs.forEach((p: QuizPack) => dbStore.savePack(p));
      }
      if (parsed.questions && Array.isArray(parsed.questions)) {
        parsed.questions.forEach((q: Question) => dbStore.saveQuestion(q));
      }
      dbStore.addLog('success', 'admin', `Bulk JSON import executed successfully.`);
      return {
        importedPacks: parsed.packs?.length || 0,
        importedQuestions: parsed.questions?.length || 0
      };
    } catch (err: any) {
      return { importedPacks: 0, importedQuestions: 0, error: err?.message || 'Invalid JSON format.' };
    }
  }
};
