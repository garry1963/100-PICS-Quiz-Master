import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Search, CheckSquare, Square, AlertTriangle, RefreshCw, Eraser, Upload } from 'lucide-react';
import { Question, QuizPack } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';
import { compressImage } from '../../lib/imageUtils';

export const QuestionEditor: React.FC = () => {
  const [packs, setPacks] = useState<QuizPack[]>(() => dbStore.getPacks());
  const [selectedPackId, setSelectedPackId] = useState<string>(() => packs[0]?.id || '');
  const [questions, setQuestions] = useState<Question[]>(() => dbStore.getQuestions());
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [showConfirmModal, setShowConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Automatically update state whenever dbStore changes (e.g. background Firestore sync)
  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      const freshPacks = dbStore.getPacks();
      const freshQs = dbStore.getQuestions();
      setPacks(freshPacks);
      setQuestions(freshQs);
      if (!selectedPackId && freshPacks.length > 0) {
        setSelectedPackId(freshPacks[0].id);
      }
    });
    return () => unsub();
  }, [selectedPackId]);

  const selectedPack = packs.find(p => p.id === selectedPackId);

  const packQuestions = questions
    .filter(q => q.packId === selectedPackId)
    .sort((a, b) => a.order - b.order);

  const filteredQuestions = packQuestions.filter(q => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      q.correctAnswer.toLowerCase().includes(term) ||
      (q.hint && q.hint.toLowerCase().includes(term)) ||
      (q.triviaFact && q.triviaFact.toLowerCase().includes(term)) ||
      (q.image && q.image.toLowerCase().includes(term)) ||
      (q.alternativeAcceptedAnswers && q.alternativeAcceptedAnswers.some(alt => alt.toLowerCase().includes(term)))
    );
  });

  const reloadQuestions = () => {
    setQuestions(dbStore.getQuestions());
    setPacks(dbStore.getPacks());
    setSelectedQuestionIds([]);
  };

  const handleSyncFirestore = async () => {
    soundFx.playClick();
    setIsSyncing(true);
    setSyncStatusMsg(null);
    const result = await dbStore.syncWithFirestore();
    setIsSyncing(false);
    if (result.success) {
      soundFx.playCorrect();
      setSyncStatusMsg({ type: 'success', text: result.message });
      reloadQuestions();
    } else {
      soundFx.playWrong();
      setSyncStatusMsg({ type: 'error', text: result.message });
    }
  };

  const handleImageFileSelected = async (file: File) => {
    if (!editingQuestion || !file.type.startsWith('image/')) return;
    try {
      const compressedDataUrl = await compressImage(file, 800, 800, 0.8);
      setEditingQuestion({
        ...editingQuestion,
        image: compressedDataUrl
      });
      soundFx.playPop();
    } catch (err) {
      console.error('Error compressing image:', err);
    }
  };

  const handleAddNewQuestion = () => {
    soundFx.playClick();
    const currentPack = packs.find(p => p.id === selectedPackId);
    const newQ: Question = {
      id: `q-${Date.now()}`,
      packId: selectedPackId,
      order: packQuestions.length + 1,
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      correctAnswer: 'NEW ANSWER',
      alternativeAcceptedAnswers: [],
      difficulty: currentPack?.difficulty || 'Easy',
      hint: 'Clue hint phrase for this picture.',
      triviaFact: 'Interesting fact revealed after player guesses correctly.',
      category: currentPack?.category || 'General Knowledge',
      tags: ['new']
    };
    setEditingQuestion(newQ);
  };

  const handleSave = () => {
    if (!editingQuestion) return;
    soundFx.playCorrect();
    dbStore.saveQuestion(editingQuestion);
    dbStore.addLog('success', 'content', `Question saved: ${editingQuestion.correctAnswer}`);
    setEditingQuestion(null);
    reloadQuestions();
  };

  // Remove single image & question completely from pack
  const handleRemoveImageAndInfo = (questionId: string, answerText: string) => {
    soundFx.playClick();
    setShowConfirmModal({
      isOpen: true,
      title: 'Remove Image & Question Information',
      message: `Are you sure you want to remove the picture and associated question information for "${answerText}" from this quiz pack?`,
      onConfirm: () => {
        dbStore.deleteQuestion(questionId);
        dbStore.addLog('warn', 'content', `Removed image & question info: ${questionId} (${answerText})`);
        setShowConfirmModal(prev => ({ ...prev, isOpen: false }));
        reloadQuestions();
      }
    });
  };

  // Clear image URL and reset info to defaults without deleting slot
  const handleClearImageAndReset = (questionId: string) => {
    soundFx.playClick();
    dbStore.clearQuestionImageAndInfo(questionId);
    dbStore.addLog('info', 'content', `Cleared image & reset info for question: ${questionId}`);
    reloadQuestions();
  };

  // Batch remove selected images and question info
  const handleRemoveSelected = () => {
    if (selectedQuestionIds.length === 0) return;
    soundFx.playClick();
    setShowConfirmModal({
      isOpen: true,
      title: `Remove ${selectedQuestionIds.length} Selected Images & Questions`,
      message: `Are you sure you want to permanently remove ${selectedQuestionIds.length} selected image(s) and their associated question information from this quiz pack?`,
      onConfirm: () => {
        dbStore.deleteQuestionsBatch(selectedQuestionIds);
        dbStore.addLog('warn', 'content', `Batch removed ${selectedQuestionIds.length} images & questions from pack ${selectedPackId}`);
        setShowConfirmModal(prev => ({ ...prev, isOpen: false }));
        reloadQuestions();
      }
    });
  };

  // Remove ALL images & question info from the current pack
  const handleRemoveAllFromPack = () => {
    if (packQuestions.length === 0) return;
    soundFx.playClick();
    const packTitle = selectedPack?.title || 'Selected Pack';
    setShowConfirmModal({
      isOpen: true,
      title: `Remove ALL Images & Information from "${packTitle}"`,
      message: `WARNING: This will remove ALL ${packQuestions.length} picture questions and associated trivia information from "${packTitle}". This action cannot be undone.`,
      onConfirm: () => {
        const allIds = packQuestions.map(q => q.id);
        dbStore.deleteQuestionsBatch(allIds);
        dbStore.addLog('warn', 'content', `Wiped all ${allIds.length} images and questions from pack ${selectedPackId}`);
        setShowConfirmModal(prev => ({ ...prev, isOpen: false }));
        reloadQuestions();
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.length === filteredQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(filteredQuestions.map(q => q.id));
    }
  };

  const toggleSelectQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter(i => i !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      {showConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-white">{showConfirmModal.title}</h4>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{showConfirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={showConfirmModal.onConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-slate-900/90 rounded-3xl border border-slate-800">
        <div>
          <h3 className="font-black text-xl text-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            Quiz Pack Image & Question Manager
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Select any quiz pack to edit, update, sync Firestore images, or permanently remove picture questions.
          </p>
        </div>

        {/* Pack Selector & Add/Sync Action */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncFirestore}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/30 whitespace-nowrap cursor-pointer"
            title="Fetch and synchronize images directly from Firestore cloud storage"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-200' : ''}`} />
            <span>{isSyncing ? 'SYNCING FIRESTORE...' : 'SYNC FIRESTORE IMAGES'}</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Select Pack:</span>
            <select
              value={selectedPackId}
              onChange={e => {
                setSelectedPackId(e.target.value);
                setSelectedQuestionIds([]);
              }}
              className="bg-transparent text-amber-300 font-extrabold text-xs focus:outline-none"
            >
              {packs.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.title} ({p.totalQuestions || 0} pics)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddNewQuestion}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>ADD QUESTION</span>
          </button>
        </div>
      </div>

      {syncStatusMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
          syncStatusMsg.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
        }`}>
          <span>{syncStatusMsg.text}</span>
          <button onClick={() => setSyncStatusMsg(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Pack Summary Banner */}
      {selectedPack && (
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={selectedPack.thumbnail}
              alt={selectedPack.title}
              className="w-12 h-12 rounded-xl object-cover bg-slate-900"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-amber-300">{selectedPack.title}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase">
                  {selectedPack.category}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Total Pictures in Pack: <strong className="text-white">{packQuestions.length}</strong>
              </p>
            </div>
          </div>

          {/* Action to Remove ALL images from Pack */}
          {packQuestions.length > 0 && (
            <button
              onClick={handleRemoveAllFromPack}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 font-black text-xs transition-colors self-start sm:self-center"
              title="Remove all pictures and associated trivia info from this pack"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>REMOVE ALL IMAGES FROM PACK</span>
            </button>
          )}
        </div>
      )}

      {/* Search & Bulk Operations Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Search images by answer, hint, fact or URL..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {packQuestions.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
            >
              {selectedQuestionIds.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All</span>
            </button>
          )}

          {selectedQuestionIds.length > 0 && (
            <button
              onClick={handleRemoveSelected}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>REMOVE SELECTED ({selectedQuestionIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Question Form Modal */}
      {editingQuestion && (
        <div className="p-6 rounded-3xl bg-slate-800 border-2 border-indigo-500/50 shadow-2xl space-y-4">
          <input
            ref={editFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files && e.target.files[0] && handleImageFileSelected(e.target.files[0])}
          />
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h4 className="font-bold text-lg text-amber-300">
              Edit Question #{editingQuestion.order}
            </h4>
            <button onClick={() => setEditingQuestion(null)} className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Correct Answer (Uppercase)</label>
              <input
                type="text"
                value={editingQuestion.correctAnswer}
                onChange={e => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-black tracking-wider text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Alternative Accepted Answers (comma-separated)</label>
              <input
                type="text"
                value={(editingQuestion.alternativeAcceptedAnswers || []).join(', ')}
                onChange={e => setEditingQuestion({
                  ...editingQuestion,
                  alternativeAcceptedAnswers: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
                })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-medium"
                placeholder="e.g. APPLE INC, MACINTOSH"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-slate-300 block">Picture Image URL / File Upload</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editingQuestion.image}
                  onChange={e => setEditingQuestion({ ...editingQuestion, image: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                  placeholder="Paste URL or upload image file below"
                />
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image File</span>
                </button>
                {editingQuestion.image && (
                  <img
                    src={editingQuestion.image}
                    alt="Preview"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-900"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Clue Hint</label>
              <input
                type="text"
                value={editingQuestion.hint}
                onChange={e => setEditingQuestion({ ...editingQuestion, hint: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Trivia Fact (Revealed on Win)</label>
              <input
                type="text"
                value={editingQuestion.triviaFact}
                onChange={e => setEditingQuestion({ ...editingQuestion, triviaFact: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700">
            <button
              onClick={() => {
                if (editingQuestion.id) {
                  handleRemoveImageAndInfo(editingQuestion.id, editingQuestion.correctAnswer);
                  setEditingQuestion(null);
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>REMOVE IMAGE & INFO</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>SAVE QUESTION</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-2">
            <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">
              {searchFilter ? 'No picture questions match your search filter.' : 'No picture questions in this quiz pack yet.'}
            </p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className={`p-4 rounded-2xl bg-slate-800/80 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                selectedQuestionIds.includes(q.id)
                  ? 'border-indigo-500 bg-indigo-950/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleSelectQuestion(q.id)}
                  className="p-1 text-slate-400 hover:text-white shrink-0"
                >
                  {selectedQuestionIds.includes(q.id) ? (
                    <CheckSquare className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500" />
                  )}
                </button>

                <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                  #{idx + 1}
                </span>

                <div className="relative group shrink-0">
                  <img
                    src={q.image}
                    alt={q.correctAnswer}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-700 bg-slate-900"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-black text-sm text-amber-300 tracking-wider truncate">{q.correctAnswer}</h5>
                    {q.alternativeAcceptedAnswers && q.alternativeAcceptedAnswers.length > 0 && (
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-700 hidden md:inline-block">
                        +{q.alternativeAcceptedAnswers.length} alt spellings
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 italic truncate max-w-md mt-0.5">{q.hint || 'No clue hint defined.'}</p>
                  {q.triviaFact && (
                    <p className="text-[11px] text-slate-500 truncate max-w-md hidden sm:block">Fact: {q.triviaFact}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => setEditingQuestion(q)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1"
                  title="Edit question parameters and image URL"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleRemoveImageAndInfo(q.id, q.correctAnswer)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1"
                  title="Remove image and associated question info completely from pack"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden md:inline">Remove Image & Info</span>
                  <span className="md:hidden">Remove</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
