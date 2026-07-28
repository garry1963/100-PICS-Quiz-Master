import React, { useState } from 'react';
import { FolderPlus, Plus, Trash2, Edit3, Copy, Save, X, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { QuizPack, DifficultyLevel } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';

interface QuizPackEditorProps {
  onManageQuestions?: (packId: string) => void;
}

export const QuizPackEditor: React.FC<QuizPackEditorProps> = ({ onManageQuestions }) => {
  const [packs, setPacks] = useState<QuizPack[]>(() => dbStore.getPacks());
  const [editingPack, setEditingPack] = useState<QuizPack | null>(null);
  const [isNew, setIsNew] = useState(false);

  const categories = dbStore.getCategories();

  const reloadPacks = () => {
    setPacks(dbStore.getPacks());
  };

  const handleCreateNew = () => {
    soundFx.playClick();
    const newPack: QuizPack = {
      id: `pack-${Date.now()}`,
      title: 'New Quiz Pack',
      description: 'Test your knowledge on this exciting picture category!',
      category: categories[0]?.name || 'Logos & Brands',
      difficulty: 'Easy',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      packColor: 'from-blue-600 to-indigo-700',
      releaseDate: new Date().toISOString().split('T')[0],
      estimatedTime: '5 mins',
      totalQuestions: 10,
      xpReward: 250,
      coinReward: 100,
      downloadSize: '2.5 MB',
      isFeatured: false,
      tags: ['new', 'quiz']
    };
    setEditingPack(newPack);
    setIsNew(true);
  };

  const handleSave = () => {
    if (!editingPack) return;
    soundFx.playCorrect();
    dbStore.savePack(editingPack);
    dbStore.addLog('success', 'content', `Quiz Pack saved: ${editingPack.title}`);
    setEditingPack(null);
    reloadPacks();
  };

  const handleDelete = (packId: string, title: string) => {
    soundFx.playClick();
    if (confirm(`Are you sure you want to delete "${title}"? This will also remove its associated questions.`)) {
      dbStore.deletePack(packId);
      dbStore.addLog('warn', 'content', `Quiz Pack deleted: ${title}`);
      reloadPacks();
    }
  };

  const handleDuplicate = (pack: QuizPack) => {
    soundFx.playClick();
    const dup: QuizPack = {
      ...pack,
      id: `pack-${Date.now()}`,
      title: `${pack.title} (Copy)`,
      releaseDate: new Date().toISOString().split('T')[0]
    };
    dbStore.savePack(dup);
    dbStore.addLog('info', 'content', `Duplicated pack: ${dup.title}`);
    reloadPacks();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-xl text-slate-100">Quiz Pack Editor</h3>
          <p className="text-xs text-slate-400">Create, edit, duplicate, and publish picture quiz packs.</p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE NEW PACK</span>
        </button>
      </div>

      {/* Editing Form Modal */}
      {editingPack && (
        <div className="p-6 rounded-3xl bg-slate-800 border-2 border-indigo-500/50 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h4 className="font-bold text-lg text-amber-300">
              {isNew ? 'Create New Quiz Pack' : `Editing: ${editingPack.title}`}
            </h4>
            <button onClick={() => setEditingPack(null)} className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Pack Title</label>
              <input
                type="text"
                value={editingPack.title}
                onChange={e => setEditingPack({ ...editingPack, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Category</label>
              <select
                value={editingPack.category}
                onChange={e => setEditingPack({ ...editingPack, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-300 block mb-1">Description</label>
              <textarea
                value={editingPack.description}
                onChange={e => setEditingPack({ ...editingPack, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 h-20"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Difficulty</label>
              <select
                value={editingPack.difficulty}
                onChange={e => setEditingPack({ ...editingPack, difficulty: e.target.value as DifficultyLevel })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
                <option value="Master">Master</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Coin Reward</label>
              <input
                type="number"
                value={editingPack.coinReward}
                onChange={e => setEditingPack({ ...editingPack, coinReward: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">XP Reward</label>
              <input
                type="number"
                value={editingPack.xpReward}
                onChange={e => setEditingPack({ ...editingPack, xpReward: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Thumbnail Image URL</label>
              <input
                type="text"
                value={editingPack.thumbnail}
                onChange={e => setEditingPack({ ...editingPack, thumbnail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
            <button
              onClick={() => setEditingPack(null)}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>SAVE PACK</span>
            </button>
          </div>
        </div>
      )}

      {/* Packs Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map(p => (
          <div key={p.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between gap-3">
            <div className="flex gap-3">
              <img src={p.thumbnail} alt={p.title} className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-indigo-400">{p.category}</span>
                <h4 className="font-bold text-sm text-slate-100 truncate">{p.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className="text-amber-400 font-bold">{p.difficulty}</span>
                  <span>• {p.totalQuestions} Pics</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <div className="text-[11px] text-slate-400 font-bold">
                🪙 +{p.coinReward} | ⚡ +{p.xpReward} XP
              </div>
              <div className="flex items-center gap-1">
                {onManageQuestions && (
                  <button
                    onClick={() => onManageQuestions(p.id)}
                    className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30"
                    title="Manage & Remove Images / Questions for this Pack"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(p)}
                  className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300"
                  title="Duplicate Pack"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setEditingPack(p); setIsNew(false); }}
                  className="p-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300"
                  title="Edit Pack"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.title)}
                  className="p-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300"
                  title="Delete Pack"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
