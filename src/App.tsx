import React, { useState, useEffect } from 'react';
import { dbStore } from './lib/storage';
import { signOutAdmin } from './lib/firebase';
import { UserProfile, AccessibilitySettings, QuizPack, Question } from './types';
import { soundFx } from './lib/sound';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';

// Components
import { Navbar } from './components/Navbar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { HomeScreen } from './components/HomeScreen';
import { QuizPlayerScreen } from './components/QuizPlayerScreen';
import { PackDetailsModal } from './components/PackDetailsModal';
import { CategoriesScreen } from './components/CategoriesScreen';
import { ChallengesScreen } from './components/ChallengesScreen';
import { AchievementsScreen } from './components/AchievementsScreen';
import { StatisticsScreen } from './components/StatisticsScreen';
import { SettingsModal } from './components/SettingsModal';
import { AdminDashboard } from './components/AdminDashboard/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { SearchModal } from './components/SearchModal';
import { HiddenImageScreen } from './components/HiddenImageScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';

import { UNAUTHENTICATED_GUEST } from './lib/seedData';

export function App() {
  // Security & Authentication verification state
  // Signed in with 4-digit PIN / Admin authorization per active browser session
  const [isPinVerified, setIsPinVerified] = useState<boolean>(() => {
    // When the app is closed or re-started, sessionStorage is automatically cleared.
    // This enforces that users must sign in again upon app launch.
    const activeSession = sessionStorage.getItem('active_session_auth');
    return activeSession === 'true';
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const activeSession = sessionStorage.getItem('active_session_auth');
    if (activeSession === 'true') {
      const cur = dbStore.getCurrentUser();
      if (cur.role === 'guest' || cur.id === 'guest-player' || cur.id === 'guest-user' || cur.username === 'Guest Player' || cur.username === 'Guest') {
        return UNAUTHENTICATED_GUEST;
      }
      return cur;
    } else {
      // Auto sign-out on app launch / closed & restarted
      dbStore.setCurrentUser(UNAUTHENTICATED_GUEST);
      signOutAdmin().catch(() => {});
      return UNAUTHENTICATED_GUEST;
    }
  });

  const [settings, setSettings] = useState<AccessibilitySettings>(() => dbStore.getAccessibilitySettings());
  const [packs, setPacks] = useState<QuizPack[]>(() => dbStore.getPacks());
  const [categories, setCategories] = useState(() => dbStore.getCategories());
  const [downloadedPackIds, setDownloadedPackIds] = useState<string[]>(() => dbStore.getDownloadedPackIds());

  // Auto sign-out verification & store subscription on app mount
  useEffect(() => {
    const activeSession = sessionStorage.getItem('active_session_auth');
    if (activeSession !== 'true') {
      setIsPinVerified(false);
      setUser(UNAUTHENTICATED_GUEST);
      dbStore.setCurrentUser(UNAUTHENTICATED_GUEST);
      signOutAdmin().catch(() => {});
    }

    const unsub = dbStore.subscribe(() => {
      refreshAllData();
    });
    return () => unsub();
  }, []);

  const [authNoticeMessage, setAuthNoticeMessage] = useState<string | null>(null);
  const [pendingGameAction, setPendingGameAction] = useState<
    | { type: 'play_pack'; packId: string }
    | { type: 'navigate_tab'; tab: string }
    | null
  >(null);

  // Sign Out Handler for Master Admin and Players
  const handleSignOutAll = async () => {
    sessionStorage.removeItem('active_session_auth');
    try {
      await signOutAdmin();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(UNAUTHENTICATED_GUEST);
    dbStore.setCurrentUser(UNAUTHENTICATED_GUEST);
    setIsPinVerified(false);
    setActiveTab('home');
    setAuthNoticeMessage('You have signed out. Please sign in with your PIN or Master Admin credentials.');
    setIsLoginOpen(true);
  };

  // Navigation & Modals State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pack & Quiz State
  const [selectedPackDetails, setSelectedPackDetails] = useState<QuizPack | null>(null);
  const [activeQuizPack, setActiveQuizPack] = useState<QuizPack | null>(null);
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[]>([]);

  // Authorization check helper for game & puzzle features
  const checkUserAuthorizedForGames = (action?: { type: 'play_pack'; packId: string } | { type: 'navigate_tab'; tab: string }): boolean => {
    const cur = user;

    // 1. Account must be approved (or master admin)
    if (cur.role !== 'admin' && cur.approvalStatus !== 'approved') {
      if (action) setPendingGameAction(action);
      setAuthNoticeMessage('Your account is currently pending Master Admin approval. You will be able to sign in with your PIN as soon as an admin approves your request.');
      setIsLoginOpen(true);
      return false;
    }

    // 2. Must be signed in with PIN for active session
    if (!isPinVerified) {
      if (action) setPendingGameAction(action);
      setAuthNoticeMessage('You must have an approved account and be signed in with your 4-digit PIN number before gaining access to any app game and puzzle features.');
      setIsLoginOpen(true);
      return false;
    }

    return true;
  };

  // Safe navigation function checking authorization before entering game/puzzle features
  const handleNavigateTab = (tab: string) => {
    if (['quiz', 'hidden-image', 'challenges'].includes(tab)) {
      if (!checkUserAuthorizedForGames({ type: 'navigate_tab', tab })) {
        return;
      }
    }
    setActiveTab(tab);
  };

  // Reload data from store
  const refreshAllData = () => {
    setUser(dbStore.getCurrentUser());
    setSettings(dbStore.getAccessibilitySettings());
    setPacks(dbStore.getPacks());
    setCategories(dbStore.getCategories());
    setDownloadedPackIds(dbStore.getDownloadedPackIds());
  };

  const handleUpdateUser = (updated: UserProfile) => {
    dbStore.saveUser(updated);
    setUser(updated);
  };

  const handleUpdateSettings = (updated: AccessibilitySettings) => {
    dbStore.saveAccessibilitySettings(updated);
    setSettings(updated);
  };

  const handlePlayPackDirect = (packId: string) => {
    if (!checkUserAuthorizedForGames({ type: 'play_pack', packId })) {
      return;
    }

    const p = packs.find(item => item.id === packId);
    if (!p) return;

    const allQuestions = dbStore.getQuestions();
    const packQs = allQuestions.filter(q => q.packId === packId).sort((a, b) => a.order - b.order);

    setActiveQuizPack(p);
    setActiveQuizQuestions(packQs);
    setActiveTab('quiz');
  };

  const handleDownloadPack = (packId: string) => {
    dbStore.markPackDownloaded(packId);
    setDownloadedPackIds(dbStore.getDownloadedPackIds());
  };

  const handleSuccessLogin = (loggedInUser: UserProfile) => {
    sessionStorage.setItem('active_session_auth', 'true');
    setUser(loggedInUser);
    dbStore.saveUser(loggedInUser);
    dbStore.setCurrentUser(loggedInUser);
    setIsPinVerified(true);
    setAuthNoticeMessage(null);

    if (loggedInUser.role === 'admin') {
      setActiveTab('admin');
      setPendingGameAction(null);
      return;
    }

    // Execute any pending game action that was intercepted
    if (pendingGameAction) {
      const act = pendingGameAction;
      setPendingGameAction(null);
      if (act.type === 'play_pack') {
        const p = packs.find(item => item.id === act.packId);
        if (p) {
          const allQuestions = dbStore.getQuestions();
          const packQs = allQuestions.filter(q => q.packId === act.packId).sort((a, b) => a.order - b.order);
          setActiveQuizPack(p);
          setActiveQuizQuestions(packQs);
          setActiveTab('quiz');
        }
      } else if (act.type === 'navigate_tab') {
        setActiveTab(act.tab);
      }
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-300 ${
      settings.theme === 'light' ? 'bg-slate-100 text-slate-900' : ''
    }`}>
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenProfile={() => setActiveTab('stats')}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigateHome={() => setActiveTab('home')}
      />

      {/* Side Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigateTab(tab)}
        onSwitchAccount={() => {
          handleSignOutAll();
        }}
        onLogout={() => {
          handleSignOutAll();
        }}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'home' && (
          <HomeScreen
            packs={packs}
            categories={categories}
            downloadedPackIds={downloadedPackIds}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectPack={(pack) => setSelectedPackDetails(pack)}
            onPlayPackDirect={handlePlayPackDirect}
            onNavigateTab={(tab) => handleNavigateTab(tab)}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesScreen
            categories={categories}
            packs={packs}
            onSelectCategoryPacks={(catName) => {
              setSearchQuery('');
              setActiveTab('home');
            }}
          />
        )}

        {activeTab === 'hidden-image' && (
          !isPinVerified && user.role !== 'admin' ? (
            <div className="p-12 text-center bg-slate-900/90 rounded-3xl border-2 border-amber-500/30 max-w-lg mx-auto space-y-4 my-12 text-white shadow-2xl">
              <div className="w-16 h-16 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black">Hidden Picture Game Locked</h3>
              <p className="text-slate-300 text-xs font-medium leading-relaxed">
                User must have an approved account and be signed in with their 4-digit PIN number before gaining access to picture puzzles and games.
              </p>
              <button
                onClick={() => {
                  setAuthNoticeMessage('You must have an approved account and sign in with your 4-digit PIN number before gaining access to Hidden Picture Puzzles.');
                  setIsLoginOpen(true);
                }}
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all"
              >
                SIGN IN WITH PIN NUMBER
              </button>
            </div>
          ) : (
            <HiddenImageScreen
              user={user}
              onUpdateUser={handleUpdateUser}
              onBack={() => setActiveTab('home')}
              packs={packs}
              questions={dbStore.getQuestions()}
            />
          )
        )}

        {activeTab === 'challenges' && (
          !isPinVerified && user.role !== 'admin' ? (
            <div className="p-12 text-center bg-slate-900/90 rounded-3xl border-2 border-amber-500/30 max-w-lg mx-auto space-y-4 my-12 text-white shadow-2xl">
              <div className="w-16 h-16 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black">Daily Trivia Challenges Locked</h3>
              <p className="text-slate-300 text-xs font-medium leading-relaxed">
                User must have an approved account and be signed in with their 4-digit PIN number before gaining access to daily challenge games.
              </p>
              <button
                onClick={() => {
                  setAuthNoticeMessage('You must have an approved account and sign in with your 4-digit PIN number to unlock Daily Challenges.');
                  setIsLoginOpen(true);
                }}
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all"
              >
                SIGN IN WITH PIN NUMBER
              </button>
            </div>
          ) : (
            <ChallengesScreen
              user={user}
              onUpdateUser={handleUpdateUser}
              onNavigateTab={(tab) => handleNavigateTab(tab as any)}
              onPlayPackDirect={handlePlayPackDirect}
            />
          )
        )}

        {activeTab === 'achievements' && (
          <AchievementsScreen
            user={user}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardScreen
            currentUser={user}
            onNavigateTab={(tab) => handleNavigateTab(tab)}
          />
        )}

        {activeTab === 'stats' && (
          <StatisticsScreen user={user} onUpdateUser={handleUpdateUser} />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            user={user}
            onOpenLogin={() => {
              setAuthNoticeMessage('Sign in with your approved account and 4-digit PIN number.');
              setIsLoginOpen(true);
            }}
          />
        )}

        {activeTab === 'admin' && (
          !isPinVerified || user.role !== 'admin' ? (
            <div className="p-12 text-center bg-slate-900/90 rounded-3xl border-2 border-rose-500/30 max-w-lg mx-auto space-y-4 my-12 text-white shadow-2xl">
              <div className="w-16 h-16 bg-rose-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black">Master Admin Access Required</h3>
              <p className="text-slate-300 text-xs font-medium leading-relaxed">
                You must sign in with Master Administrator credentials to access the control panel.
              </p>
              <button
                onClick={() => {
                  setAuthNoticeMessage('Please sign in with Master Administrator credentials.');
                  setIsLoginOpen(true);
                }}
                className="px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl shadow-xl transition-all"
              >
                SIGN IN AS MASTER ADMIN
              </button>
            </div>
          ) : (
            <AdminDashboard
              currentUser={user}
              onBackToGame={() => {
                refreshAllData();
                setActiveTab('home');
              }}
              onAdminSignOut={handleSignOutAll}
            />
          )
        )}

        {activeTab === 'quiz' && activeQuizPack && (
          !isPinVerified ? (
            <div className="p-12 text-center bg-slate-900/90 rounded-3xl border-2 border-amber-500/30 max-w-lg mx-auto space-y-4 my-12 text-white shadow-2xl">
              <div className="w-16 h-16 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black">Quiz Game Locked</h3>
              <p className="text-slate-300 text-xs font-medium leading-relaxed">
                User must have an approved account and be signed in with their 4-digit PIN number before gaining access to quiz game features.
              </p>
              <button
                onClick={() => {
                  setAuthNoticeMessage('You must have an approved account and sign in with your 4-digit PIN number before gaining access to quiz game features.');
                  setIsLoginOpen(true);
                }}
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all"
              >
                SIGN IN WITH PIN NUMBER
              </button>
            </div>
          ) : (
            <QuizPlayerScreen
              pack={activeQuizPack}
              questions={activeQuizQuestions}
              user={user}
              onUpdateUser={handleUpdateUser}
              onBack={() => {
                refreshAllData();
                setActiveTab('home');
              }}
              onCompletePack={() => {
                refreshAllData();
                setActiveTab('home');
              }}
            />
          )
        )}
      </main>

      {/* Pack Details Modal */}
      {selectedPackDetails && (
        <PackDetailsModal
          pack={selectedPackDetails}
          progress={dbStore.getPackProgress(selectedPackDetails.id)}
          isDownloaded={downloadedPackIds.includes(selectedPackDetails.id)}
          onClose={() => setSelectedPackDetails(null)}
          onPlayPack={handlePlayPackDirect}
          onDownloadPack={handleDownloadPack}
        />
      )}

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        packs={packs}
        onSelectPack={(pack) => setSelectedPackDetails(pack)}
      />

      {/* Login / Master Admin Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        authNoticeMessage={authNoticeMessage}
        onClose={() => {
          setIsLoginOpen(false);
          setAuthNoticeMessage(null);
        }}
        onAdminSignOut={handleSignOutAll}
        onSuccessLogin={handleSuccessLogin}
      />

    </div>
  );
}

export default App;
