import React, { useState } from 'react';
import {
  Shield,
  Users,
  FolderPlus,
  HelpCircle,
  Sparkles,
  FileSpreadsheet,
  Database,
  Terminal,
  BarChart3,
  ArrowLeft,
  X,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Check,
  AlertTriangle,
  LogOut,
  Activity
} from 'lucide-react';
import { UserProfile, QuizCategory, QuizPack, Question, SystemLog } from '../../types';
import { soundFx } from '../../lib/sound';
import { dbStore } from '../../lib/storage';
import { apiClient } from '../../lib/apiClient';
import { signOutAdmin } from '../../lib/firebase';

// Sub-views
import { UserManagement } from './UserManagement';
import { QuizPackEditor } from './QuizPackEditor';
import { QuestionEditor } from './QuestionEditor';
import { BulkImportExport } from './BulkImportExport';
import { AIGeneratorModal } from './AIGeneratorModal';
import { DatabaseMaintenance } from './DatabaseMaintenance';
import { SystemLogs } from './SystemLogs';
import { CategoryManager } from './CategoryManager';
import { BulkImageUploader } from './BulkImageUploader';
import { FirestoreStressTester } from './FirestoreStressTester';

interface AdminDashboardProps {
  currentUser: UserProfile;
  onBackToGame: () => void;
  onAdminSignOut?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onBackToGame,
  onAdminSignOut
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'bulk-images' | 'packs' | 'questions' | 'ai' | 'users' | 'import' | 'database' | 'diagnostics' | 'logs'>('overview');
  const [selectedCategoryForBulkUpload, setSelectedCategoryForBulkUpload] = useState<string | undefined>(undefined);

  const handleAdminSignOut = async () => {
    soundFx.playClick();
    await signOutAdmin();
    dbStore.addLog('info', 'auth', 'Master Admin signed out from Admin Dashboard.');
    if (onAdminSignOut) {
      onAdminSignOut();
    } else {
      onBackToGame();
    }
  };
  
  // Verify master admin access with strict email check
  const isMasterAdminEmail = currentUser.email.toLowerCase() === 'garrydavies1963@gmail.com';

  if (currentUser.role !== 'admin' || !isMasterAdminEmail) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <Shield className="w-12 h-12" />
        </div>
        <h2 className="font-black text-2xl text-slate-100">Access Restricted</h2>
        <p className="text-slate-400 text-sm">
          Master Administrator privileges are strictly restricted to <strong className="text-amber-400">garrydavies1963@gmail.com</strong> via Google Account authentication.
        </p>
        <button
          onClick={onBackToGame}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm"
        >
          Return to Game
        </button>
      </div>
    );
  }

  const packs = dbStore.getPacks();
  const questions = dbStore.getQuestions();
  const categories = dbStore.getCategories();
  const users = dbStore.getAllUsers();
  const logs = dbStore.getLogs();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800/60 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-200 dark:shadow-none">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-2xl tracking-tight text-slate-900 dark:text-white uppercase">Master Admin Control Panel</h1>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-black text-[10px] uppercase">
                GOOGLE VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 mt-0.5">
              <span>Authenticated Admin:</span>
              <strong className="text-amber-600 dark:text-amber-400 font-black">{currentUser.email}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            id="header-firestore-diagnostic-btn"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('diagnostics');
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Activity className="w-4 h-4 text-emerald-200 animate-pulse" />
            <span>🔥 Firestore Stress Diagnostic</span>
          </button>

          <button
            id="admin-signout-btn"
            onClick={handleAdminSignOut}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Admin</span>
          </button>

          <button
            id="admin-exit-btn"
            onClick={() => {
              soundFx.playClick();
              onBackToGame();
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Game</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          id="tab-overview-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('overview'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview & Stats</span>
        </button>

        <button
          id="tab-diagnostics-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('diagnostics'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
              : 'bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>🔥 Firestore Stress Diagnostic</span>
        </button>

        <button
          id="tab-categories-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('categories'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          id="tab-bulk-images-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('bulk-images'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'bulk-images'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Upload className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Bulk Upload Images</span>
        </button>

        <button
          id="tab-packs-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('packs'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'packs'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>Quiz Packs ({packs.length})</span>
        </button>

        <button
          id="tab-questions-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('questions'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Question Editor ({questions.length})</span>
        </button>

        <button
          id="tab-ai-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('ai'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>AI Pack Generator</span>
        </button>

        <button
          id="tab-import-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('import'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'import'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Bulk CSV/JSON Import</span>
        </button>

        <button
          id="tab-users-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('users'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Player Accounts ({users.length})</span>
        </button>

        <button
          id="tab-database-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('database'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backups & Restore</span>
        </button>

        <button
          id="tab-logs-btn"
          onClick={() => { soundFx.playClick(); setActiveTab('logs'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Main Tab Content Render */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-xs">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">System Overview</h3>
            
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">Total Quiz Packs</span>
                <span className="font-black text-3xl text-indigo-600 dark:text-indigo-400 mt-1 block">{packs.length}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">100% Published</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">Picture Questions</span>
                <span className="font-black text-3xl text-amber-600 dark:text-amber-400 mt-1 block">{questions.length}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 block">High Resolution</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">Categories</span>
                <span className="font-black text-3xl text-indigo-600 dark:text-indigo-400 mt-1 block">{categories.length}</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold mt-1 block">Active</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">Registered Users</span>
                <span className="font-black text-3xl text-emerald-600 dark:text-emerald-400 mt-1 block">{users.length}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">1 Master Admin</span>
              </div>
            </div>

            {/* Recent Audit Log Preview */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Recent Admin Audit Activity</h4>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-extrabold"
                >
                  View All Logs →
                </button>
              </div>

              <div className="space-y-2">
                {logs.slice(0, 5).map(log => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                        log.level === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}>
                        {log.category.toUpperCase()}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{log.message}</span>
                    </div>
                    <span className="text-slate-400 text-[10px] font-bold">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <CategoryManager
            onSelectCategoryForBulkUpload={(catId) => {
              setSelectedCategoryForBulkUpload(catId);
              setActiveTab('bulk-images');
            }}
          />
        )}
        {activeTab === 'bulk-images' && (
          <BulkImageUploader initialCategoryId={selectedCategoryForBulkUpload} />
        )}
        {activeTab === 'packs' && (
          <QuizPackEditor
            onManageQuestions={(packId) => {
              setActiveTab('questions');
            }}
          />
        )}
        {activeTab === 'questions' && <QuestionEditor />}
        {activeTab === 'ai' && <AIGeneratorModal />}
        {activeTab === 'import' && <BulkImportExport />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'database' && <DatabaseMaintenance />}
        {activeTab === 'diagnostics' && <FirestoreStressTester />}
        {activeTab === 'logs' && <SystemLogs />}
      </div>

    </div>
  );
};
