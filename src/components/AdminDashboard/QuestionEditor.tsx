import React, { useState } from 'react';
import { HelpCircle, Plus, Trash2, Edit3, ArrowUp, ArrowDown, Save, X, Image as ImageIcon } from 'lucide-react';
import { Question, QuizPack, DifficultyLevel } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';

export const QuestionEditor: React.FC = () => {
  const packs = dbStore.getPacks();
  const [selectedPackId, setSelectedPackId] = useState<string>(packs[0]?.id || '');
  const [questions, setQuestions] = useState<Question[]>(() => dbStore.getQuestions());
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const packQuestions = questions
    .filter(q => q.packId === selectedPackId)
    .sort((a, b) => a.order - b.order);

  const reloadQuestions = () => {
    setQuestions(dbStore.getQuestions());
  };

  const handleAddNewQuestion = () => {
    soundFx.playClick();
    const currentPack = packs.find(p => p.id === selectedPackId);
    const newQ: Question = {
      id: `q-${Date.now()}`,
      packId: selectedPackId,
      order: packQuestions.length + 1,
      image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
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

  const handleDelete = (questionId: string) => {
    soundFx.playClick();
    if (confirm('Delete this picture question?')) {
      dbStore.deleteQuestion(questionId);
      dbStore.addLog('warn', 'content', `Question deleted: ${questionId}`);
      reloadQuestions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-xl text-slate-100">Question & Picture Editor</h3>
          <p className="text-xs text-slate-400">Add, edit, and reorder picture questions, accepted spellings, and trivia facts.</p>
        </div>

        {/* Pack Selector Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPackId}
            onChange={e => setSelectedPackId(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 font-bold text-xs"
          >
            {packs.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.category})
              </option>
            ))}
          </select>

          <button
            onClick={handleAddNewQuestion}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>ADD QUESTION</span>
          </button>
        </div>
      </div>

      {/* Editing Question Modal */}
      {editingQuestion && (
        <div className="p-6 rounded-3xl bg-slate-800 border-2 border-indigo-500/50 shadow-2xl space-y-4">
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

            <div className="md:col-span-2">
              <label className="font-bold text-slate-300 block mb-1">Picture Image URL</label>
              <input
                type="text"
                value={editingQuestion.image}
                onChange={e => setEditingQuestion({ ...editingQuestion, image: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200"
              />
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
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
      )}

      {/* Questions Table/List */}
      <div className="space-y-3">
        {packQuestions.length === 0 ? (
          <p className="text-slate-400 text-sm italic text-center py-8">No questions in this pack yet.</p>
        ) : (
          packQuestions.map((q, idx) => (
            <div key={q.id} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-indigo-400 font-extrabold text-xs flex items-center justify-center shrink-0">
                  #{idx + 1}
                </span>
                <img src={q.image} alt={q.correctAnswer} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                <div>
                  <h5 className="font-black text-sm text-amber-300 tracking-wider">{q.correctAnswer}</h5>
                  <p className="text-xs text-slate-400 italic truncate max-w-sm">{q.hint}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingQuestion(q)}
                  className="p-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold"
                  title="Edit Question"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-xs font-bold"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
