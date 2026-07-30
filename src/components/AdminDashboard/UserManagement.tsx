import React, { useState, useEffect } from 'react';
import { Users, Shield, Ban, CheckCircle2, RotateCcw, Coins, Trophy, UserPlus, Clock, XCircle, KeyRound, Check, RefreshCw, Trash2 } from 'lucide-react';
import { UserProfile } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';
import {
  fetchAllUsersFromFirestore,
  fetchApprovedUsersFromFirestore,
  approveUserInFirestore,
  rejectUserInFirestore,
  deleteUserFromFirestore,
  MASTER_ADMIN_EMAIL
} from '../../lib/firebase';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(() => dbStore.getAllUsers());
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'approved' | 'pending' | 'all'>('approved');

  const reloadUsers = async () => {
    setLoading(true);
    try {
      const firebaseUsers = await fetchAllUsersFromFirestore();
      if (firebaseUsers && firebaseUsers.length > 0) {
        // Merge with local storage
        firebaseUsers.forEach(u => dbStore.saveUser(u));
      }
    } catch (e) {
      console.warn('Reload users from firestore:', e);
    } finally {
      setUsers(dbStore.getAllUsers());
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadUsers();
  }, []);

  const handleApproveUser = async (user: UserProfile) => {
    soundFx.playCorrect();
    const updated: UserProfile = {
      ...user,
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: MASTER_ADMIN_EMAIL
    };
    
    dbStore.saveUser(updated);
    await approveUserInFirestore(user.id, MASTER_ADMIN_EMAIL);
    dbStore.addLog('info', 'admin', `Master Admin approved account for ${user.username} (${user.email})`);
    await reloadUsers();
  };

  const handleRejectUser = async (user: UserProfile) => {
    soundFx.playClick();
    const updated: UserProfile = {
      ...user,
      approvalStatus: 'rejected',
      approvedAt: new Date().toISOString(),
      approvedBy: MASTER_ADMIN_EMAIL
    };

    dbStore.saveUser(updated);
    await rejectUserInFirestore(user.id, MASTER_ADMIN_EMAIL);
    dbStore.addLog('warn', 'admin', `Master Admin rejected account request for ${user.username} (${user.email})`);
    await reloadUsers();
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

  const handleResetPin = (user: UserProfile) => {
    soundFx.playClick();
    const updated: UserProfile = { ...user, pin: '' };
    dbStore.saveUser(updated);
    dbStore.addLog('info', 'admin', `Reset 4-digit PIN for ${user.username}`);
    alert(`4-Digit PIN reset for ${user.username}. They will be prompted to create a new 4-digit PIN upon next login.`);
    reloadUsers();
  };

  const handleDeleteUser = async (user: UserProfile) => {
    soundFx.playClick();
    if (user.role === 'admin' || user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      alert('The Master Administrator account cannot be deleted.');
      return;
    }

    const confirmed = confirm(`CRITICAL DELETION WARNING:\n\nAre you sure you want to permanently delete user account "${user.username}" (${user.email}) and ALL associated database records from Firestore and local storage? This action cannot be undone.`);
    if (!confirmed) return;

    dbStore.deleteUser(user.id);
    await deleteUserFromFirestore(user.id);
    dbStore.addLog('warn', 'admin', `Master Admin deleted user account and associated data for ${user.username} (${user.email})`);
    soundFx.playCorrect();
    await reloadUsers();
  };

  const pendingUsers = users.filter(u => u.approvalStatus === 'pending');
  const approvedUsers = users.filter(u => u.approvalStatus === 'approved' || (!u.approvalStatus && u.role === 'admin'));

  const displayedUsers = activeSubTab === 'pending'
    ? pendingUsers
    : activeSubTab === 'approved'
    ? approvedUsers
    : users;

  return (
    <div className="space-y-6">
      {/* Header & Reload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <span>User Account & Approval Management</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Admin approval workflow, Firebase approved users storage, and 4-digit PIN security controls.
          </p>
        </div>

        <button
          onClick={reloadUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          <span>Refresh Users Sync</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('approved')}
          className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Approved Users ({approvedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pending')}
          className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'pending'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals ({pendingUsers.length})</span>
          {pendingUsers.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('all')}
          className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All User Records ({users.length})</span>
        </button>
      </div>

      {/* Pending Banner Alert if any pending users */}
      {pendingUsers.length > 0 && activeSubTab !== 'pending' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm text-amber-600 dark:text-amber-400">
                {pendingUsers.length} Pending Account Registration Request{pendingUsers.length > 1 ? 's' : ''} Awaiting Review
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Approved users will be stored in Firebase and prompted to create a 4-digit PIN on their first sign-in.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab('pending')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs whitespace-nowrap"
          >
            Review Requests
          </button>
        </div>
      )}

      {/* User Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5">User Profile</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Approval Status</th>
              <th className="p-3.5">4-Digit PIN</th>
              <th className="p-3.5">Coins & Level</th>
              <th className="p-3.5 text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No user records found in this view.
                </td>
              </tr>
            ) : (
              displayedUsers.map((u, idx) => (
                <tr key={`${u.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.username} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{u.username}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    {u.role === 'admin' ? (
                      <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-black text-xs inline-flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        MASTER ADMIN
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        PLAYER
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {u.approvalStatus === 'pending' ? (
                      <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-extrabold text-xs inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        PENDING APPROVAL
                      </span>
                    ) : u.approvalStatus === 'rejected' ? (
                      <span className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-extrabold text-xs inline-flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        REJECTED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-extrabold text-xs inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        APPROVED (FIREBASE)
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {u.role === 'admin' ? (
                      <span className="text-slate-400 text-xs font-bold">Google Auth Protected</span>
                    ) : u.pin ? (
                      <span className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 font-extrabold text-xs inline-flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        PIN SET
                      </span>
                    ) : u.approvalStatus === 'approved' ? (
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-extrabold text-xs inline-flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        AWAITING 1ST LOGIN PIN
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">—</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span className="text-amber-600 dark:text-amber-400">🪙 {u.coins}</span>
                      <span className="text-indigo-600 dark:text-indigo-400">⚡ LVL {u.level}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                    {u.role !== 'admin' && (
                      <>
                        {u.approvalStatus === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveUser(u)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm flex-inline items-center gap-1 transition-all"
                            >
                              <Check className="w-3.5 h-3.5 inline mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectUser(u)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-600 dark:text-rose-400 text-xs font-extrabold transition-all"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <>
                            {u.pin && (
                              <button
                                onClick={() => handleResetPin(u)}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                                title="Reset 4-digit security PIN"
                              >
                                Reset PIN
                              </button>
                            )}
                            <button
                              onClick={() => handleResetCoins(u)}
                              className="px-2.5 py-1 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition-colors"
                              title="Boost Coins & XP"
                            >
                              Boost
                            </button>
                            <button
                              onClick={() => handleToggleBan(u)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                                u.isBanned
                                  ? 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600/30'
                                  : 'bg-rose-600/20 text-rose-600 dark:text-rose-300 hover:bg-rose-600/30'
                              }`}
                            >
                              {u.isBanned ? 'Unban' : 'Ban'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all shadow-xs inline-flex items-center gap-1"
                              title="Permanently delete user account and associated records"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
