import React, { useState } from 'react';
import { X, Shield, User, Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound, Clock, UserPlus, LogOut, Mail, Check } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import {
  loginMasterAdminWithGoogle,
  loginMasterAdminDirect,
  MASTER_ADMIN_EMAIL,
  requestAccountCreationInFirestore,
  saveUserPinInFirestore,
  fetchUserFromFirestore,
  signOutAdmin
} from '../lib/firebase';
import { UserProfile } from '../types';
import { dbStore } from '../lib/storage';
import { soundFx } from '../lib/sound';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserProfile) => void;
  onAdminSignOut?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  onAdminSignOut
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'player' | 'admin'>('player');
  const [playerStep, setPlayerStep] = useState<'login' | 'register' | 'pin_setup' | 'pin_verify' | 'pending_notice' | 'rejected_notice'>('login');
  
  // Login / Registration Form States
  const [identifier, setIdentifier] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  
  // Target user being logged in
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  
  // PIN States
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  
  // Admin Direct Login State
  const [adminDirectEmail, setAdminDirectEmail] = useState(MASTER_ADMIN_EMAIL);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDirectInput, setShowDirectInput] = useState(false);

  const resetModalState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPinInput('');
    setConfirmPinInput('');
    setPlayerStep('login');
    setTargetUser(null);
  };

  // Find user by username or email
  const handlePlayerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setErrorMessage(null);
    setLoading(true);

    const queryStr = identifier.trim().toLowerCase();
    if (!queryStr) {
      setErrorMessage('Please enter your username or email address.');
      setLoading(false);
      return;
    }

    // Search in local database store
    const allUsers = dbStore.getAllUsers();
    let found = allUsers.find(
      u => u.username.toLowerCase() === queryStr || u.email.toLowerCase() === queryStr
    );

    // If not found locally, attempt to fetch from Firestore
    if (!found) {
      try {
        found = await fetchUserFromFirestore(queryStr) || undefined;
      } catch (err) {
        console.warn('User search error:', err);
      }
    }

    setLoading(false);

    if (!found) {
      setErrorMessage(`No account found for "${identifier}". You can request account creation below.`);
      return;
    }

    setTargetUser(found);

    // Check account approval status
    if (found.approvalStatus === 'pending') {
      setPlayerStep('pending_notice');
      return;
    }

    if (found.approvalStatus === 'rejected') {
      setPlayerStep('rejected_notice');
      return;
    }

    // Account is approved (or admin/default user)
    // Check if 4-digit PIN is set
    if (!found.pin || found.pin.trim().length !== 4) {
      // First login after approval -> prompt PIN Creation
      setPlayerStep('pin_setup');
    } else {
      // PIN already exists -> prompt PIN Verification
      setPlayerStep('pin_verify');
    }
  };

  // Submit Account Request
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setErrorMessage(null);
    setLoading(true);

    if (!regUsername.trim() || !regEmail.trim()) {
      setErrorMessage('Please provide both username and email.');
      setLoading(false);
      return;
    }

    // Check if user already exists
    const existing = dbStore.getAllUsers().find(
      u => u.username.toLowerCase() === regUsername.trim().toLowerCase() ||
           u.email.toLowerCase() === regEmail.trim().toLowerCase()
    );

    if (existing) {
      setErrorMessage('An account with this username or email already exists.');
      setLoading(false);
      return;
    }

    try {
      const newUser = await requestAccountCreationInFirestore(regUsername, regEmail);
      dbStore.saveUser(newUser);
      dbStore.addLog('info', 'auth', `New account request created for ${newUser.username} (${newUser.email}) awaiting admin approval.`);
      
      setTargetUser(newUser);
      setSuccessMessage('Account request submitted successfully!');
      setPlayerStep('pending_notice');
      soundFx.playCorrect();
    } catch (err) {
      setErrorMessage('Failed to create account request. Please try again.');
      soundFx.playWrong();
    } finally {
      setLoading(false);
    }
  };

  // Save 4-Digit PIN on First Login
  const handleSavePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setErrorMessage(null);

    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setErrorMessage('PIN must be exactly 4 numeric digits (0-9).');
      soundFx.playWrong();
      return;
    }

    if (pinInput !== confirmPinInput) {
      setErrorMessage('PINs do not match. Please enter matching 4 digits.');
      soundFx.playWrong();
      return;
    }

    if (!targetUser) return;

    setLoading(true);
    const updatedUser: UserProfile = {
      ...targetUser,
      pin: pinInput,
      approvalStatus: 'approved'
    };

    dbStore.saveUser(updatedUser);
    await saveUserPinInFirestore(updatedUser.id, pinInput);
    dbStore.addLog('info', 'auth', `User ${updatedUser.username} set 4-digit security PIN.`);

    setLoading(false);
    soundFx.playCorrect();
    onSuccessLogin(updatedUser);
    onClose();
  };

  // Verify PIN on Subsequent Logins
  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setErrorMessage(null);

    if (!targetUser) return;

    if (pinInput !== targetUser.pin) {
      setErrorMessage('Incorrect 4-digit PIN. Please check and try again.');
      soundFx.playWrong();
      return;
    }

    soundFx.playCorrect();
    onSuccessLogin(targetUser);
    onClose();
  };

  // Master Admin Google Login
  const handleLoginMasterAdminGoogle = async () => {
    soundFx.playClick();
    setLoading(true);
    setErrorMessage(null);

    const res = await loginMasterAdminWithGoogle();
    setLoading(false);

    if (res.success && res.user) {
      soundFx.playCorrect();
      onSuccessLogin(res.user);
      onClose();
    } else {
      soundFx.playWrong();
      setErrorMessage(res.message || 'Google account validation failed.');
      if (res.isUnauthorizedDomain) {
        setShowDirectInput(true);
      }
    }
  };

  // Master Admin Direct Login
  const handleLoginDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setLoading(true);
    setErrorMessage(null);

    const res = await loginMasterAdminDirect(adminDirectEmail);
    setLoading(false);

    if (res.success && res.user) {
      soundFx.playCorrect();
      onSuccessLogin(res.user);
      onClose();
    } else {
      soundFx.playWrong();
      setErrorMessage(res.message || 'Direct email validation failed.');
    }
  };

  // Master Admin Sign Out
  const handleAdminSignOutClick = async () => {
    soundFx.playClick();
    await signOutAdmin();
    dbStore.addLog('info', 'auth', 'Master Admin signed out.');
    if (onAdminSignOut) {
      onAdminSignOut();
    }
    onClose();
  };

  const currentUser = dbStore.getCurrentUser();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={() => {
          soundFx.playClick();
          onClose();
        }}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-2xl z-10 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 p-0.5 shadow-sm">
              <div className="w-full h-full bg-indigo-600 rounded-[14px] flex items-center justify-center font-black text-amber-300 text-sm">
                100
              </div>
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">User Account Access</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Admin Approval & 4-Digit Security PIN</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Player vs Admin */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black">
          <button
            onClick={() => { resetModalState(); setMode('player'); }}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'player' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Player Account
          </button>
          <button
            onClick={() => { resetModalState(); setMode('admin'); }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'admin' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Master Admin</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm text-rose-900 dark:text-rose-100 mb-0.5">Notice</div>
              <p className="leading-relaxed font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Alert Box */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100 mb-0.5">Success</div>
              <p className="leading-relaxed font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* MODE: PLAYER ACCOUNT */}
        {mode === 'player' && (
          <div>
            {/* STEP: LOGIN SEARCH */}
            {playerStep === 'login' && (
              <form onSubmit={handlePlayerLoginSubmit} className="space-y-4">
                <div>
                  <label className="font-black text-xs text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Sign In with Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Username or email..."
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <span>CONTINUE SIGN IN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                    Need a new account? Creation requires Master Admin approval.
                  </p>
                  <button
                    type="button"
                    onClick={() => { resetModalState(); setPlayerStep('register'); }}
                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-black text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Request New User Account</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP: REGISTER / ACCOUNT REQUEST */}
            {playerStep === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 font-medium">
                  <p className="font-extrabold flex items-center gap-1.5 mb-1">
                    <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    User Account Request
                  </p>
                  Your account request will be stored in Firebase for Master Admin approval. Once approved, you can set your 4-digit security PIN to log in.
                </div>

                <div>
                  <label className="font-black text-xs text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Desired Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. TriviaMaster99..."
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-black text-xs text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="player@example.com..."
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <span>SUBMIT REQUEST FOR ADMIN APPROVAL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPlayerStep('login')}
                  className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline text-center"
                >
                  ← Back to Sign In
                </button>
              </form>
            )}

            {/* STEP: PENDING APPROVAL NOTICE */}
            {playerStep === 'pending_notice' && (
              <div className="space-y-4 text-center">
                <div className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-300 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 mx-auto flex items-center justify-center">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-black text-lg">Account Request Pending Approval</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Your account for <strong className="text-slate-900 dark:text-white font-extrabold">{targetUser?.username}</strong> is awaiting Master Admin review in the Admin Dashboard.
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 p-2.5 rounded-xl">
                    Once approved by admin, sign in with your username to set your 4-digit PIN!
                  </p>
                </div>

                <button
                  onClick={() => resetModalState()}
                  className="w-full py-3 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 text-xs font-black uppercase"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* STEP: REJECTED NOTICE */}
            {playerStep === 'rejected_notice' && (
              <div className="space-y-4 text-center">
                <div className="p-6 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-900 dark:text-rose-300 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white mx-auto flex items-center justify-center">
                    <X className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-lg">Account Request Rejected</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Account request for <strong className="text-slate-900 dark:text-white font-extrabold">{targetUser?.username}</strong> was not approved by the Master Administrator.
                  </p>
                </div>

                <button
                  onClick={() => resetModalState()}
                  className="w-full py-3 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 text-xs font-black uppercase"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* STEP: CREATE 4-DIGIT PIN ON FIRST LOGIN */}
            {playerStep === 'pin_setup' && targetUser && (
              <form onSubmit={handleSavePinSubmit} className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                  <p className="font-black flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Account Approved by Admin!
                  </p>
                  <p>
                    Welcome <strong className="font-black text-slate-900 dark:text-white">{targetUser.username}</strong>! Please create a 4-digit PIN for future sign-ins.
                  </p>
                </div>

                <div>
                  <label className="font-black text-xs text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Create 4-Digit Security PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="4 Digits (e.g. 1234)"
                      value={pinInput}
                      onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-indigo-500/50 text-slate-900 dark:text-slate-100 text-lg font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-black text-xs text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Confirm 4-Digit Security PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="Confirm 4 Digits"
                      value={confirmPinInput}
                      onChange={e => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-indigo-500/50 text-slate-900 dark:text-slate-100 text-lg font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || pinInput.length !== 4}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <Check className="w-5 h-5" />
                  <span>SAVE 4-DIGIT PIN & ENTER GAME</span>
                </button>
              </form>
            )}

            {/* STEP: VERIFY 4-DIGIT PIN ON SUBSEQUENT LOGINS */}
            {playerStep === 'pin_verify' && targetUser && (
              <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <img src={targetUser.avatar} alt={targetUser.username} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <span className="font-black text-sm text-slate-900 dark:text-white block">{targetUser.username}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Approved Account • Enter 4-Digit PIN</span>
                  </div>
                </div>

                <div>
                  <label className="font-black text-xs text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
                    Enter 4-Digit Security PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      maxLength={4}
                      required
                      autoFocus
                      placeholder="• • • •"
                      value={pinInput}
                      onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-indigo-500 text-slate-900 dark:text-slate-100 text-2xl font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || pinInput.length !== 4}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <span>SIGN IN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => resetModalState()}
                  className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline text-center"
                >
                  Switch Account Username
                </button>
              </form>
            )}
          </div>
        )}

        {/* MODE: MASTER ADMIN */}
        {mode === 'admin' && (
          <div className="space-y-4 text-center">
            {currentUser.role === 'admin' && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-rose-700 dark:text-rose-300">Currently Signed in as Master Admin</span>
                  <span className="px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 text-[10px] font-black uppercase">Active</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">{currentUser.email}</p>

                {/* Admin Sign Out Option */}
                <button
                  onClick={handleAdminSignOutClick}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>SIGN OUT MASTER ADMIN</span>
                </button>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs space-y-2 text-left">
              <div className="font-black flex items-center justify-between text-amber-900 dark:text-amber-300 text-sm">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Master Admin Authentication
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] font-black uppercase">
                  RESTRICTED
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Only <strong className="text-slate-900 dark:text-white font-black">{MASTER_ADMIN_EMAIL}</strong> is authorized as Master Administrator.
              </p>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleLoginMasterAdminGoogle}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.99] border border-amber-300"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>{loading ? 'VALIDATING GOOGLE ACCOUNT...' : 'SIGN IN WITH GOOGLE ADMIN'}</span>
            </button>

            {/* Direct Authorized Email Login Toggle / Form */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-left">
              {!showDirectInput ? (
                <button
                  type="button"
                  onClick={() => setShowDirectInput(true)}
                  className="w-full py-2.5 text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Verify Authorized Admin Account Email Directly</span>
                </button>
              ) : (
                <form onSubmit={handleLoginDirect} className="space-y-3 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Authorized Admin Email
                    </label>
                    <span className="text-[10px] text-amber-600 font-extrabold uppercase">Firebase Store Validated</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={adminDirectEmail}
                    onChange={e => setAdminDirectEmail(e.target.value)}
                    placeholder="garrydavies1963@gmail.com"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-amber-500/40 text-slate-900 dark:text-slate-100 text-sm font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <Shield className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                    <span>VERIFY & LOGIN ADMIN</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

