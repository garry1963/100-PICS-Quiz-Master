import React, { useState } from 'react';
import {
  FolderPlus,
  Trash2,
  Edit2,
  Plus,
  Upload,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  HelpCircle,
  Folder,
  Sparkles,
  Camera,
  Tv,
  Utensils,
  Compass,
  Trophy,
  Gamepad2,
  Music,
  Globe,
  Palette,
  Car,
  Smile,
  X
} from 'lucide-react';
import { QuizCategory, QuizPack, Question } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';

interface CategoryManagerProps {
  onSelectCategoryForBulkUpload?: (categoryId: string) => void;
}

const ICON_PRESETS = [
  'Image', 'Folder', 'Sparkles', 'Camera', 'Tv', 'Utensils', 
  'Compass', 'Trophy', 'Gamepad2', 'Music', 'Globe', 'Palette', 'Car', 'Smile'
];

const COLOR_PRESETS = [
  { name: 'Indigo', hex: 'from-indigo-500 to-indigo-600', text: 'text-indigo-600 dark:text-indigo-400' },
  { name: 'Emerald', hex: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'Amber', hex: 'from-amber-500 to-amber-600', text: 'text-amber-600 dark:text-amber-400' },
  { name: 'Rose', hex: 'from-rose-500 to-rose-600', text: 'text-rose-600 dark:text-rose-400' },
  { name: 'Purple', hex: 'from-purple-500 to-purple-600', text: 'text-purple-600 dark:text-purple-400' },
  { name: 'Cyan', hex: 'from-cyan-500 to-cyan-600', text: 'text-cyan-600 dark:text-cyan-400' },
  { name: 'Orange', hex: 'from-orange-500 to-orange-600', text: 'text-orange-600 dark:text-orange-400' }
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onSelectCategoryForBulkUpload
}) => {
  const [categories, setCategories] = useState<QuizCategory[]>(() => dbStore.getCategories());
  const [packs, setPacks] = useState<QuizPack[]>(() => dbStore.getPacks());
  const [questions, setQuestions] = useState<Question[]>(() => dbStore.getQuestions());

  // Form state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuizCategory | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('Sparkles');
  const [categoryColor, setCategoryColor] = useState('indigo');

  // Deletion state
  const [categoryToDelete, setCategoryToDelete] = useState<QuizCategory | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshData = () => {
    setCategories(dbStore.getCategories());
    setPacks(dbStore.getPacks());
    setQuestions(dbStore.getQuestions());
  };

  const resetForm = () => {
    setCategoryName('');
    setCategoryDescription('');
    setCategoryIcon('Sparkles');
    setCategoryColor('indigo');
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  const handleStartAdd = () => {
    soundFx.playClick();
    resetForm();
    setIsAddingCategory(true);
  };

  const handleStartEdit = (cat: QuizCategory) => {
    soundFx.playClick();
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setCategoryIcon(cat.icon || 'Folder');
    setCategoryColor(cat.color || 'indigo');
    setIsAddingCategory(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    soundFx.playCorrect();
    const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const catId = editingCategory ? editingCategory.id : `cat_${Date.now()}`;

    const newCategory: QuizCategory = {
      id: catId,
      name: categoryName.trim(),
      slug,
      description: categoryDescription.trim() || `${categoryName} picture trivia packs and questions.`,
      icon: categoryIcon,
      color: categoryColor
    };

    dbStore.saveCategory(newCategory);
    dbStore.addLog(
      'success',
      'admin',
      editingCategory ? `Updated category "${newCategory.name}"` : `Added new category "${newCategory.name}"`
    );

    setStatusMessage(editingCategory ? 'Category updated successfully!' : 'New category created successfully!');
    setTimeout(() => setStatusMessage(null), 3000);

    resetForm();
    refreshData();
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;

    soundFx.playPop();
    dbStore.deleteCategory(categoryToDelete.id);
    dbStore.addLog('warn', 'admin', `Removed category "${categoryToDelete.name}" (${categoryToDelete.id}).`);

    setStatusMessage(`Category "${categoryToDelete.name}" removed.`);
    setTimeout(() => setStatusMessage(null), 3000);

    setCategoryToDelete(null);
    refreshData();
  };

  // Calculate counts per category
  const getCategoryStats = (catId: string, catName: string) => {
    const catPacks = packs.filter(p => p.category === catId || p.category?.toLowerCase() === catName.toLowerCase());
    const packIds = new Set(catPacks.map(p => p.id));
    const catQuestions = questions.filter(q => packIds.has(q.packId) || q.category === catId || q.category?.toLowerCase() === catName.toLowerCase());

    return {
      packCount: catPacks.length,
      questionCount: catQuestions.length
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-500" />
            Category Management
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-extrabold mt-0.5">
            Add, modify, or remove picture trivia categories and organize your quiz content.
          </p>
        </div>

        <button
          id="add-category-btn"
          onClick={handleStartAdd}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>ADD NEW CATEGORY</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Add / Edit Category Modal / Form Card */}
      {isAddingCategory && (
        <form onSubmit={handleSaveCategory} className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-black text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">Category Name</label>
              <input
                type="text"
                required
                placeholder="e.g. World Landmarks, Animals, Architecture"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">Color Theme</label>
              <select
                value={categoryColor}
                onChange={e => setCategoryColor(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {COLOR_PRESETS.map(c => (
                  <option key={c.name} value={c.name.toLowerCase()}>{c.name} Theme</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">Description</label>
            <input
              type="text"
              placeholder="Brief summary describing this category's picture packs"
              value={categoryDescription}
              onChange={e => setCategoryDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-2">Category Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_PRESETS.map(iconName => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setCategoryIcon(iconName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    categoryIcon === iconName
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {iconName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20"
            >
              {editingCategory ? 'SAVE CATEGORY CHANGES' : 'CREATE CATEGORY'}
            </button>
          </div>
        </form>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const stats = getCategoryStats(cat.id, cat.name);

          return (
            <div
              key={cat.id}
              className="p-5 rounded-[24px] bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col justify-between space-y-4 group hover:border-amber-400 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                        {cat.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        ID: {cat.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCategoryToDelete(cat)}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-rose-600 hover:text-white transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2">
                  {cat.description || 'No description provided.'}
                </p>
              </div>

              {/* Stats & Bulk Upload Action */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{stats.packCount}</span> Packs • <span className="text-amber-600 dark:text-amber-400 font-black">{stats.questionCount}</span> Pictures
                </div>

                {onSelectCategoryForBulkUpload && (
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onSelectCategoryForBulkUpload(cat.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] flex items-center gap-1 transition-all shadow-xs"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Bulk Upload Images</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Category Confirmation Dialog */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-800 rounded-[32px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight">Delete Category?</h4>
                <p className="text-xs text-slate-500 font-bold">{categoryToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to delete this category? Any associated quiz packs will remain, but will no longer be listed under this category filter.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/20"
              >
                CONFIRM REMOVE CATEGORY
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
