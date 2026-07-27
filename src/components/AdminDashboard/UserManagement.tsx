import React, { useState } from 'react';
import { Users, Shield, Ban, CheckCircle2, RotateCcw, Coins, Trophy } from 'lucide-react';
import { UserProfile } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(() => dbStore.getAllUsers());

  const reloadUsers = () => {
    setUsers(dbStore.getAllUsers());
  };

  const handleToggleBan = (user: UserProfile) => {
    soundFx.playClick();
    if (user.role === 'admin') {
      alert('The Master Administrator account cannot be banned.');
      return;
    }
    const updated: UserProfile = { ...user, isBanned: !user.isBanned };
    dbStore.saveUser(updated);
    dbStore.addLog('warn', 'admin', `User ${user.username} status set to ${updated.isBanned ? 'Banned' : 'Active'}`);
    reloadUsers();
  };

  const handleResetCoins = (user: UserProfile) => {
    soundFx.playClick();
    const updated: UserProfile = { ...user, coins: 500, xp: 1000, level: 10 };
    dbStore.saveUser(updated);
    dbStore.addLog('info', 'admin', `Granted 500 coins and Level 10 boost to ${user.username}`);
    reloadUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl text-slate-100">User Account Management</h3>
          <p className="text-xs text-slate-400">Master Admin control over all player accounts and permissions.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Coins & XP</th>
              <th className="p-3">Level</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-3 flex items-center gap-3">
                  <img src={u.avatar} alt={u.username} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <span className="font-bold text-slate-100 block">{u.username}</span>
                    <span className="text-[11px] text-slate-400 block">{u.email}</span>
                  </div>
                </td>
                <td className="p-3">
                  {u.role === 'admin' ? (
                    <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-xs inline-flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      MASTER ADMIN
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold">
                      PLAYER
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span className="text-amber-400">🪙 {u.coins}</span>
                    <span className="text-indigo-400">⚡ {u.xp} XP</span>
                  </div>
                </td>
                <td className="p-3 font-bold text-slate-200">LVL {u.level}</td>
                <td className="p-3">
                  {u.isBanned ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[11px]">
                      Banned
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                      Active
                    </span>
                  )}
                </td>
                <td className="p-3 text-right space-x-2">
                  {u.role !== 'admin' && (
                    <>
                      <button
                        onClick={() => handleResetCoins(u)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold transition-colors"
                        title="Boost Coins & XP"
                      >
                        Boost Coins
                      </button>
                      <button
                        onClick={() => handleToggleBan(u)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                          u.isBanned
                            ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50'
                            : 'bg-rose-600/30 text-rose-300 hover:bg-rose-600/50'
                        }`}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
