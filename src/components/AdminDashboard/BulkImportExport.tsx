import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, Code } from 'lucide-react';
import { dbStore } from '../../lib/storage';
import { apiClient } from '../../lib/apiClient';
import { soundFx } from '../../lib/sound';

export const BulkImportExport: React.FC = () => {
  const [jsonText, setJsonText] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleExportJSON = () => {
    soundFx.playClick();
    const snapshot = dbStore.exportDatabaseSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `100pics_database_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dbStore.addLog('info', 'admin', 'Exported database JSON snapshot.');
  };

  const handleImportJSON = async () => {
    if (!jsonText.trim()) return;
    soundFx.playClick();
    const res = await apiClient.bulkImportJSON(jsonText);
    if (res.error) {
      soundFx.playWrong();
      setStatusMsg(`Import Error: ${res.error}`);
    } else {
      soundFx.playCorrect();
      setStatusMsg(`Successfully imported ${res.importedPacks} Quiz Packs and ${res.importedQuestions} Questions!`);
      setJsonText('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl text-slate-100">Bulk Import & Export Center</h3>
        <p className="text-xs text-slate-400">Import hundreds of picture questions via JSON/CSV format or export complete database snapshots.</p>
      </div>

      {/* Export Action Card */}
      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-slate-100">Export Full Database Snapshot</h4>
          <p className="text-xs text-slate-400">Download all quiz packs, picture questions, categories, and player accounts as JSON.</p>
        </div>

        <button
          onClick={handleExportJSON}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT DATABASE JSON</span>
        </button>
      </div>

      {/* JSON / CSV Import Area */}
      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-400" />
            <span>Paste JSON Content for Import</span>
          </h4>
        </div>

        <textarea
          rows={8}
          placeholder='{\n  "packs": [...],\n  "questions": [...]\n}'
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        {statusMsg && (
          <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs font-semibold text-indigo-300">
            {statusMsg}
          </div>
        )}

        <button
          disabled={!jsonText.trim()}
          onClick={handleImportJSON}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          <span>EXECUTE BULK IMPORT</span>
        </button>
      </div>
    </div>
  );
};
