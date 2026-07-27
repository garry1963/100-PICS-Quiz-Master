import React, { useState } from 'react';
import { Database, RotateCcw, Upload, CheckCircle2, AlertTriangle, HardDrive } from 'lucide-react';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';

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
    if (confirm('CRITICAL: Are you sure you want to reset the database to factory default seed data? All custom progress and edits will be reset.')) {
      dbStore.resetDatabaseToDefault();
      soundFx.playCorrect();
      alert('Database reset to factory default state.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl text-slate-100">Database Maintenance & Recovery</h3>
        <p className="text-xs text-slate-400">Master Admin database backup, restore, and factory reset tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
