import React from 'react';
import { Upload, RotateCcw, Trash2 } from 'lucide-react';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';
import { FirestoreStressTester } from './FirestoreStressTester';

export const DatabaseMaintenance: React.FC = () => {
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        dbStore.importDatabaseSnapshot(parsed);
        soundFx.playCorrect();
        alert('Database snapshot restored successfully!');
        window.location.reload();
      } catch (err: any) {
        soundFx.playWrong();
        alert(`Failed to parse backup JSON file: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    soundFx.playClick();
    if (confirm('CRITICAL: Are you sure you want to reset the database to factory default clean state? All custom progress and edits will be reset.')) {
      dbStore.resetDatabaseToDefault();
      soundFx.playCorrect();
      alert('Database reset to factory default clean state.');
      window.location.reload();
    }
  };

  const handleClearAllStats = () => {
    soundFx.playClick();
    if (confirm('Are you sure you want to clear all user statistics, solved question records, and accuracy logs across the application?')) {
      const curr = dbStore.getCurrentUser();
      dbStore.clearPersonalStats(curr);
      soundFx.playCorrect();
      alert('All personal and player statistics have been cleared.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl text-slate-100">Database Maintenance & Stress Diagnostic</h3>
        <p className="text-xs text-slate-400">Master Admin database backup, restore, factory reset, and Firestore stress diagnostics.</p>
      </div>

      {/* Firestore Stress Tester Component */}
      <FirestoreStressTester />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Restore from File */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
            <Upload className="w-5 h-5 text-indigo-400" />
            <span>Restore Snapshot from File</span>
          </div>
          <p className="text-xs text-slate-400">
            Select a `.json` backup snapshot file from your computer to restore all quiz packs and questions.
          </p>

          <label className="block w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-center font-bold text-xs text-indigo-300 cursor-pointer transition-colors">
            <span>Choose Backup File (.json)</span>
            <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
          </label>
        </div>

        {/* Clear Personal Statistics */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
            <Trash2 className="w-5 h-5 text-amber-400" />
            <span>Clear Personal Statistics</span>
          </div>
          <p className="text-xs text-slate-400">
            Clears all gameplay progress, solved picture counts, streak logs, and accuracy stats.
          </p>

          <button
            onClick={handleClearAllStats}
            className="w-full py-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors"
          >
            CLEAR ALL STATISTICS
          </button>
        </div>

        {/* Factory Reset */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-rose-500/30 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <RotateCcw className="w-5 h-5" />
            <span>Factory Database Reset</span>
          </div>
          <p className="text-xs text-slate-400">
            Resets all packs, questions, categories, and achievements back to initial seed data.
          </p>

          <button
            onClick={handleResetToDefault}
            className="w-full py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-bold text-xs transition-colors"
          >
            RESET DATABASE TO DEFAULT
          </button>
        </div>
      </div>
    </div>
  );
};
