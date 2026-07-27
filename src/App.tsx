import React, { useState, useEffect } from 'react';
import { dbStore } from './lib/storage';
import { UserProfile, AccessibilitySettings, QuizPack, Question } from './types';
import { soundFx } from './lib/sound';

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

export function App() {
  const [user, setUser] = useState<UserProfile>(() => dbStore.getCurrentUser());
  const [settings, setSettings] = useState<AccessibilitySettings>(() => dbStore.getAccessibilitySettings());
  const [packs, setPacks] = useState<QuizPack[]>(() => dbStore.getPacks());
  const [categories, setCategories] = useState(() => dbStore.getCategories());
  const [downloadedPackIds, setDownloadedPackIds] = useState<string[]>(() => dbStore.getDownloadedPackIds());

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
        onSelectTab={(tab) => setActiveTab(tab)}
        onSwitchAccount={() => setIsLoginOpen(true)}
        onLogout={() => {
          setIsLoginOpen(true);
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
            onNavigateTab={(tab) => setActiveTab(tab)}
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
          <HiddenImageScreen
            user={user}
            onUpdateUser={handleUpdateUser}
            onBack={() => setActiveTab('home')}
            packs={packs}
            questions={dbStore.getQuestions()}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengesScreen
            user={user}
            onUpdateUser={handleUpdateUser}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onPlayPackDirect={handlePlayPackDirect}
          />
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
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'stats' && (
          <StatisticsScreen user={user} />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            user={user}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            currentUser={user}
            onBackToGame={() => {
              refreshAllData();
              setActiveTab('home');
            }}
          />
        )}

        {activeTab === 'quiz' && activeQuizPack && (
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
        onClose={() => setIsLoginOpen(false)}
        onSuccessLogin={(loggedInUser) => {
          setUser(loggedInUser);
          dbStore.saveUser(loggedInUser);
          if (loggedInUser.role === 'admin') {
            setActiveTab('admin');
          }
        }}
      />

    </div>
  );
}

export default App;
