import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, Database, RefreshCw, Zap, ShieldCheck, Activity, Layers } from 'lucide-react';
import {
  saveCategoryToFirestore,
  fetchCategoriesFromFirestore,
  deleteCategoryFromFirestore,
  savePackToFirestore,
  fetchPacksFromFirestore,
  deletePackFromFirestore,
  saveQuestionToFirestore,
  fetchQuestionsFromFirestore,
  deleteQuestionFromFirestore,
  saveUserToFirestore,
  fetchUserFromFirestore,
  deleteUserFromFirestore,
  db
} from '../../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { QuizCategory, QuizPack, Question, UserProfile } from '../../types';
import { soundFx } from '../../lib/sound';

interface TestStepResult {
  id: string;
  name: string;
  category: 'Write' | 'Read' | 'Query' | 'Update' | 'Delete' | 'Batch Stress';
  status: 'pending' | 'running' | 'success' | 'failed';
  latencyMs?: number;
  details?: string;
  error?: string;
}

export const FirestoreStressTester: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestStepResult[]>([]);
  const [overallSummary, setOverallSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    avgLatencyMs: number;
    timestamp?: string;
  } | null>(null);

  const initialTestSteps: Omit<TestStepResult, 'status'>[] = [
    { id: 'ping', name: 'Firestore Ping & Connectivity Check', category: 'Read' },
    { id: 'cat-write', name: 'Write Category Document (`categories/_test_cat`)', category: 'Write' },
    { id: 'cat-read', name: 'Read & Query Category (`fetchCategoriesFromFirestore`)', category: 'Read' },
    { id: 'cat-delete', name: 'Delete Test Category (`categories/_test_cat`)', category: 'Delete' },
    { id: 'pack-write', name: 'Write Quiz Pack Document (`quizPacks/_test_pack`)', category: 'Write' },
    { id: 'pack-read', name: 'Read & Query Quiz Packs (`fetchPacksFromFirestore`)', category: 'Query' },
    { id: 'pack-delete', name: 'Delete Test Quiz Pack (`quizPacks/_test_pack`)', category: 'Delete' },
    { id: 'q-write', name: 'Write Question Document (`questions/_test_q1`)', category: 'Write' },
    { id: 'q-query', name: 'Query Questions Collection (`fetchQuestionsFromFirestore`)', category: 'Query' },
    { id: 'q-delete', name: 'Delete Test Question Document (`questions/_test_q1`)', category: 'Delete' },
    { id: 'user-write', name: 'Write User Profile Document (`users/_test_user`)', category: 'Write' },
    { id: 'user-read', name: 'Read User Profile (`fetchUserFromFirestore`)', category: 'Read' },
    { id: 'user-delete', name: 'Delete Test User Profile (`users/_test_user`)', category: 'Delete' },
    { id: 'batch-stress', name: 'Concurrent Batch Stress Test (5 Parallel Writes & Reads)', category: 'Batch Stress' }
  ];

  const runStressTest = async () => {
    soundFx.playClick();
    setIsRunning(true);
    setProgress(0);
    setOverallSummary(null);

    const stepResults: TestStepResult[] = initialTestSteps.map(s => ({
      ...s,
      status: 'pending'
    }));
    setResults([...stepResults]);

    let passedCount = 0;
    let failedCount = 0;
    const latencies: number[] = [];

    const updateStep = (id: string, update: Partial<TestStepResult>) => {
      const idx = stepResults.findIndex(r => r.id === id);
      if (idx !== -1) {
        stepResults[idx] = { ...stepResults[idx], ...update };
        setResults([...stepResults]);
      }
    };

    const testCat: QuizCategory = {
      id: '_test_cat_stress',
      name: 'Stress Test Category',
      slug: 'stress-test-category',
      description: 'Temporary category generated for automated database health test',
      icon: 'Activity',
      color: '#3B82F6'
    };

    const testPack: QuizPack = {
      id: '_test_pack_stress',
      category: '_test_cat_stress',
      title: 'Stress Test Pack',
      description: 'Temporary pack for testing Firestore latency',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80',
      difficulty: 'Easy',
      totalQuestions: 1,
      packColor: '#3B82F6',
      releaseDate: new Date().toISOString(),
      estimatedTime: '5 mins',
      xpReward: 50,
      coinReward: 20,
      downloadSize: '1.2 MB',
      tags: ['stress', 'test']
    };

    const testQuestion: Question = {
      id: '_test_q1_stress',
      packId: '_test_pack_stress',
      order: 1,
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80',
      correctAnswer: 'STRESS',
      difficulty: 'Easy',
      hint: 'Test hint',
      triviaFact: 'Firestore database is active',
      category: '_test_cat_stress',
      tags: ['test']
    };

    const testUser: UserProfile = {
      id: '_test_user_stress',
      username: 'StressTestUser',
      email: 'stresstest@quiz.test',
      role: 'player',
      avatar: '',
      coins: 100,
      xp: 0,
      level: 1,
      title: 'Tester',
      currentStreak: 1,
      longestStreak: 1,
      lastLoginDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Step 1: Connectivity Ping
    try {
      updateStep('ping', { status: 'running' });
      const t0 = performance.now();
      const pingDocRef = doc(db, '_health_check', 'ping');
      await setDoc(pingDocRef, { timestamp: new Date().toISOString() }, { merge: true });
      const pingSnap = await getDoc(pingDocRef);
      await deleteDoc(pingDocRef);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('ping', {
        status: 'success',
        latencyMs: latency,
        details: `Connected to Firestore in ${latency}ms (Doc exists: ${pingSnap.exists()})`
      });
    } catch (err: any) {
      failedCount++;
      updateStep('ping', { status: 'failed', error: err?.message || 'Connection failed' });
    }
    setProgress(10);

    // Step 2: Category Write
    try {
      updateStep('cat-write', { status: 'running' });
      const t0 = performance.now();
      await saveCategoryToFirestore(testCat);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('cat-write', { status: 'success', latencyMs: latency, details: `Category document written in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('cat-write', { status: 'failed', error: err?.message || 'Category write failed' });
    }
    setProgress(20);

    // Step 3: Category Read
    try {
      updateStep('cat-read', { status: 'running' });
      const t0 = performance.now();
      const cats = await fetchCategoriesFromFirestore();
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      const found = cats.some(c => c.id === testCat.id);
      if (found) {
        passedCount++;
        updateStep('cat-read', { status: 'success', latencyMs: latency, details: `Fetched ${cats.length} categories in ${latency}ms (Test item present)` });
      } else {
        failedCount++;
        updateStep('cat-read', { status: 'failed', error: 'Category written but not returned in query' });
      }
    } catch (err: any) {
      failedCount++;
      updateStep('cat-read', { status: 'failed', error: err?.message || 'Category fetch failed' });
    }
    setProgress(30);

    // Step 4: Category Delete
    try {
      updateStep('cat-delete', { status: 'running' });
      const t0 = performance.now();
      await deleteCategoryFromFirestore(testCat.id);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('cat-delete', { status: 'success', latencyMs: latency, details: `Category document deleted in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('cat-delete', { status: 'failed', error: err?.message || 'Category deletion failed' });
    }
    setProgress(40);

    // Step 5: Pack Write
    try {
      updateStep('pack-write', { status: 'running' });
      const t0 = performance.now();
      await savePackToFirestore(testPack);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('pack-write', { status: 'success', latencyMs: latency, details: `Quiz pack written in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('pack-write', { status: 'failed', error: err?.message || 'Pack write failed' });
    }
    setProgress(50);

    // Step 6: Pack Read
    try {
      updateStep('pack-read', { status: 'running' });
      const t0 = performance.now();
      const packs = await fetchPacksFromFirestore();
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      const found = packs.some(p => p.id === testPack.id);
      if (found) {
        passedCount++;
        updateStep('pack-read', { status: 'success', latencyMs: latency, details: `Fetched ${packs.length} packs in ${latency}ms (Test pack present)` });
      } else {
        failedCount++;
        updateStep('pack-read', { status: 'failed', error: 'Pack written but not found in query' });
      }
    } catch (err: any) {
      failedCount++;
      updateStep('pack-read', { status: 'failed', error: err?.message || 'Pack query failed' });
    }
    setProgress(60);

    // Step 7: Pack Delete
    try {
      updateStep('pack-delete', { status: 'running' });
      const t0 = performance.now();
      await deletePackFromFirestore(testPack.id);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('pack-delete', { status: 'success', latencyMs: latency, details: `Quiz pack deleted in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('pack-delete', { status: 'failed', error: err?.message || 'Pack deletion failed' });
    }
    setProgress(70);

    // Step 8: Question Write
    try {
      updateStep('q-write', { status: 'running' });
      const t0 = performance.now();
      await saveQuestionToFirestore(testQuestion);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('q-write', { status: 'success', latencyMs: latency, details: `Question document saved in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('q-write', { status: 'failed', error: err?.message || 'Question write failed' });
    }
    setProgress(75);

    // Step 9: Question Query
    try {
      updateStep('q-query', { status: 'running' });
      const t0 = performance.now();
      const questions = await fetchQuestionsFromFirestore();
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      const found = questions.some(q => q.id === testQuestion.id);
      if (found) {
        passedCount++;
        updateStep('q-query', { status: 'success', latencyMs: latency, details: `Queried ${questions.length} questions in ${latency}ms` });
      } else {
        failedCount++;
        updateStep('q-query', { status: 'failed', error: 'Question saved but missing from query' });
      }
    } catch (err: any) {
      failedCount++;
      updateStep('q-query', { status: 'failed', error: err?.message || 'Question query failed' });
    }
    setProgress(80);

    // Step 10: Question Delete
    try {
      updateStep('q-delete', { status: 'running' });
      const t0 = performance.now();
      await deleteQuestionFromFirestore(testQuestion.id);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('q-delete', { status: 'success', latencyMs: latency, details: `Question document deleted in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('q-delete', { status: 'failed', error: err?.message || 'Question deletion failed' });
    }
    setProgress(85);

    // Step 11: User Write
    try {
      updateStep('user-write', { status: 'running' });
      const t0 = performance.now();
      await saveUserToFirestore(testUser);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('user-write', { status: 'success', latencyMs: latency, details: `User document saved in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('user-write', { status: 'failed', error: err?.message || 'User write failed' });
    }
    setProgress(90);

    // Step 12: User Read
    try {
      updateStep('user-read', { status: 'running' });
      const t0 = performance.now();
      const fetchedUser = await fetchUserFromFirestore(testUser.id);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      if (fetchedUser && fetchedUser.id === testUser.id) {
        passedCount++;
        updateStep('user-read', { status: 'success', latencyMs: latency, details: `Fetched user profile directly in ${latency}ms` });
      } else {
        failedCount++;
        updateStep('user-read', { status: 'failed', error: 'User profile not returned by ID fetch' });
      }
    } catch (err: any) {
      failedCount++;
      updateStep('user-read', { status: 'failed', error: err?.message || 'User read failed' });
    }
    setProgress(93);

    // Step 13: User Delete
    try {
      updateStep('user-delete', { status: 'running' });
      const t0 = performance.now();
      await deleteUserFromFirestore(testUser.id);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);
      passedCount++;
      updateStep('user-delete', { status: 'success', latencyMs: latency, details: `Test user profile purged in ${latency}ms` });
    } catch (err: any) {
      failedCount++;
      updateStep('user-delete', { status: 'failed', error: err?.message || 'User deletion failed' });
    }
    setProgress(95);

    // Step 14: Batch Concurrent Stress
    try {
      updateStep('batch-stress', { status: 'running' });
      const t0 = performance.now();
      const batchPromises = Array.from({ length: 5 }).map(async (_, idx) => {
        const docRef = doc(db, '_stress_batch', `batch_${idx}`);
        await setDoc(docRef, { index: idx, timestamp: new Date().toISOString() });
        const snap = await getDoc(docRef);
        await deleteDoc(docRef);
        return snap.exists();
      });

      const batchResults = await Promise.all(batchPromises);
      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);

      if (batchResults.every(Boolean)) {
        passedCount++;
        updateStep('batch-stress', {
          status: 'success',
          latencyMs: latency,
          details: `Executed 5 concurrent write-read-delete pipelines in ${latency}ms (${Math.round(latency / 5)}ms per op average)`
        });
      } else {
        failedCount++;
        updateStep('batch-stress', { status: 'failed', error: 'One or more batch concurrent operations failed verification' });
      }
    } catch (err: any) {
      failedCount++;
      updateStep('batch-stress', { status: 'failed', error: err?.message || 'Batch stress test error' });
    }

    setProgress(100);
    setIsRunning(false);

    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    setOverallSummary({
      total: initialTestSteps.length,
      passed: passedCount,
      failed: failedCount,
      avgLatencyMs: avgLatency,
      timestamp: new Date().toLocaleTimeString()
    });

    if (failedCount === 0) {
      soundFx.playCorrect();
    } else {
      soundFx.playWrong();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-100">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Firestore Read/Write Stress & Diagnostic Test</span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Executes automated real-time read, write, query, delete, and batch operations against your Firestore database instance to verify database security rules and latency performance.
          </p>
        </div>

        <button
          onClick={runStressTest}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 whitespace-nowrap cursor-pointer"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
              <span>Running Diagnostic...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Start Stress Test</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="space-y-2 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span>Executing Firestore Stress Pipeline...</span>
            <span className="text-indigo-400">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Overall Summary Header */}
      {overallSummary && (
        <div className={`p-5 rounded-2xl border ${overallSummary.failed === 0 ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-rose-950/40 border-rose-500/40'} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              {overallSummary.failed === 0 ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-200">FIRESTORE STORAGE OPERATIONAL & HEALTHY</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-200">FIRESTORE STORAGE ISSUES DETECTED</span>
                </>
              )}
            </div>
            <span className="text-xs text-slate-400">Tested at {overallSummary.timestamp}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Total Ops</p>
              <p className="text-lg font-bold text-slate-100">{overallSummary.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-center">
              <p className="text-xs text-emerald-400">Passed Ops</p>
              <p className="text-lg font-bold text-emerald-300">{overallSummary.passed}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-center">
              <p className="text-xs text-rose-400">Failed Ops</p>
              <p className="text-lg font-bold text-rose-300">{overallSummary.failed}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Avg Latency</p>
              <p className="text-lg font-bold text-indigo-400">{overallSummary.avgLatencyMs} ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Results List */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">
            Diagnostic Operation Log
          </h4>

          <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            {results.map((step) => (
              <div key={step.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {step.status === 'pending' && <Clock className="w-4 h-4 text-slate-500 shrink-0" />}
                  {step.status === 'running' && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
                  {step.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {step.status === 'failed' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200 truncate">{step.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        step.category === 'Write' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        step.category === 'Read' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        step.category === 'Query' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        step.category === 'Delete' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {step.category}
                      </span>
                    </div>

                    {step.details && <p className="text-[11px] text-slate-400 mt-0.5">{step.details}</p>}
                    {step.error && <p className="text-[11px] text-rose-400 mt-0.5 font-mono">{step.error}</p>}
                  </div>
                </div>

                {step.latencyMs !== undefined && (
                  <span className="font-mono font-bold text-slate-400 shrink-0">
                    {step.latencyMs} ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
