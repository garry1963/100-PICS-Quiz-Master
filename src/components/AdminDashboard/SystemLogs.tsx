import React, { useState } from 'react';
import { Terminal, RefreshCw, Trash2, Filter } from 'lucide-react';
import { SystemLog } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';

export const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>(() => dbStore.getLogs());

  const handleRefresh = () => {
    soundFx.playClick();
    setLogs(dbStore.getLogs());
  };

  const handleClear = () => {
    soundFx.playClick();
    if (confirm('Clear all system audit logs?')) {
      dbStore.clearLogs();
      setLogs([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl text-slate-100">Audit & System Event Logs</h3>
          <p className="text-xs text-slate-400">Chronological history of admin actions, AI generations, and system events.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs space-y-2 max-h-96 overflow-y-auto border border-slate-800">
        {logs.length === 0 ? (
          <p className="text-slate-500 italic text-center py-6">No audit logs recorded yet.</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 border-b border-slate-900 pb-2">
              <span className="text-slate-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase shrink-0 ${
                log.level === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                log.level === 'warn' ? 'bg-amber-500/20 text-amber-300' :
                log.level === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {log.category}
              </span>
              <span className="text-slate-300 flex-1">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
