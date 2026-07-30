import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  HelpCircle,
  X,
  Trash2,
  Sparkles,
  Plus,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { QuizCategory, QuizPack, Question, DifficultyLevel } from '../../types';
import { dbStore } from '../../lib/storage';
import { soundFx } from '../../lib/sound';
import { compressImage } from '../../lib/imageUtils';

interface BulkImageItem {
  id: string;
  file: File;
  dataUrl: string;
  answer: string;
  hint: string;
  triviaFact: string;
  difficulty: DifficultyLevel;
}

interface BulkImageUploaderProps {
  initialCategoryId?: string;
}

export const BulkImageUploader: React.FC<BulkImageUploaderProps> = ({
  initialCategoryId
}) => {
  const [categories, setCategories] = useState<QuizCategory[]>(() => dbStore.getCategories());
  const [packs, setPacks] = useState<QuizPack[]>(() => dbStore.getPacks());

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    if (initialCategoryId) return initialCategoryId;
    const cats = dbStore.getCategories();
    return cats.length > 0 ? cats[0].id : '';
  });

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setCategories(dbStore.getCategories());
      setPacks(dbStore.getPacks());
    });
    return () => unsub();
  }, []);

  const [packOption, setPackOption] = useState<'existing' | 'new'>('existing');
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  
  // New Pack Form State
  const [newPackTitle, setNewPackTitle] = useState('');
  const [newPackDifficulty, setNewPackDifficulty] = useState<DifficultyLevel>('Easy');
  const [newPackCost, setNewPackCost] = useState<number>(0);

  // Uploaded Batch State
  const [uploadedItems, setUploadedItems] = useState<BulkImageItem[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter packs by selected category
  const categoryPacks = packs.filter(p => {
    const currentCat = categories.find(c => c.id === selectedCategoryId);
    return p.category === selectedCategoryId || (currentCat && p.category?.toLowerCase() === currentCat.name.toLowerCase());
  });

  // Helper to format filename into clean title answer
  const formatFileNameToAnswer = (filename: string): string => {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    // Replace underscores, hyphens, pluses with spaces
    const cleanStr = nameWithoutExt.replace(/[-_+]/g, ' ').trim();
    // Return uppercase clean answer string
    return cleanStr.toUpperCase();
  };

  // Process uploaded image files with canvas compression
  const handleFilesAdded = async (files: FileList | File[]) => {
    setIsProcessingFiles(true);
    setStatusMessage(null);

    const newItems: BulkImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        // Compress image to max 800x800 JPEG quality 0.8 to fit within Firestore 1MB document limit
        const dataUrl = await compressImage(file, 800, 800, 0.8);
        const answer = formatFileNameToAnswer(file.name);

        newItems.push({
          id: `bulk_img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
          file,
          dataUrl,
          answer,
          hint: `What is this picture showing? (${answer.length} letters)`,
          triviaFact: `A famous picture challenge featuring ${answer.toLowerCase()}.`,
          difficulty: 'Easy'
        });
      } catch (err) {
        console.error('Error reading and compressing image file:', err);
      }
    }

    setUploadedItems(prev => [...prev, ...newItems]);
    setIsProcessingFiles(false);
    soundFx.playPop();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (id: string) => {
    soundFx.playClick();
    setUploadedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BulkImageItem, value: any) => {
    setUploadedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleBulkUppercaseAnswers = () => {
    soundFx.playClick();
    setUploadedItems(prev =>
      prev.map(item => ({ ...item, answer: item.answer.toUpperCase().trim() }))
    );
  };

  const handleSaveBulkUpload = async () => {
    if (uploadedItems.length === 0) return;

    soundFx.playCorrect();

    let targetPackId = selectedPackId;
    const selectedCategoryObj = categories.find(c => c.id === selectedCategoryId);
    const categoryName = selectedCategoryObj ? selectedCategoryObj.name : 'General';

    // Ensure category is present in database
    if (selectedCategoryObj) {
      dbStore.saveCategory(selectedCategoryObj);
    }

    // If creating a new pack
    if (packOption === 'new' || !targetPackId) {
      const packTitle = newPackTitle.trim() || `Bulk Upload ${categoryName} Pack`;
      targetPackId = `pack_bulk_${Date.now()}`;

      const newPack: QuizPack = {
        id: targetPackId,
        title: packTitle,
        description: `Custom picture pack with ${uploadedItems.length} questions in ${categoryName}.`,
        category: selectedCategoryId,
        difficulty: newPackDifficulty,
        thumbnail: uploadedItems[0].dataUrl,
        banner: uploadedItems[0].dataUrl,
        packColor: 'indigo',
        releaseDate: new Date().toISOString().split('T')[0],
        estimatedTime: '10 mins',
        totalQuestions: uploadedItems.length,
        xpReward: 100,
        coinReward: 50,
        downloadSize: '1.5 MB',
        isFeatured: false,
        tags: [categoryName.toLowerCase(), 'bulk-upload']
      };

      dbStore.savePack(newPack);
    }

    // Convert each item to Question and compress image if necessary
    let savedCount = 0;
    for (let idx = 0; idx < uploadedItems.length; idx++) {
      const item = uploadedItems[idx];
      let finalImg = item.dataUrl;

      // Double-check image size safety
      if (finalImg.length > 500000) {
        finalImg = await compressImage(finalImg, 800, 800, 0.75);
      }

      const newQuestion: Question = {
        id: `q_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        packId: targetPackId,
        order: idx + 1,
        image: finalImg,
        correctAnswer: item.answer.toUpperCase().trim(),
        difficulty: item.difficulty,
        hint: item.hint.trim(),
        triviaFact: item.triviaFact.trim(),
        category: selectedCategoryId,
        tags: [categoryName.toLowerCase()]
      };

      dbStore.saveQuestion(newQuestion);
      savedCount++;
    }

    // Update pack question count & thumbnail
    const updatedPacks = dbStore.getPacks();
    const targetPack = updatedPacks.find(p => p.id === targetPackId);
    if (targetPack) {
      const packQuestions = dbStore.getQuestions().filter(q => q.packId === targetPackId);
      targetPack.totalQuestions = packQuestions.length;
      if (!targetPack.thumbnail && packQuestions.length > 0) {
        targetPack.thumbnail = packQuestions[0].image;
      }
      dbStore.savePack(targetPack);
    }

    dbStore.addLog(
      'success',
      'admin',
      `Bulk uploaded ${savedCount} images to category "${categoryName}" (Pack: ${targetPackId}).`
    );

    setStatusMessage({
      type: 'success',
      text: `Successfully saved & synced ${savedCount} picture questions to Firestore database!`
    });

    setUploadedItems([]);
    setNewPackTitle('');
    setPacks(dbStore.getPacks());
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 border border-indigo-700/60 text-white shadow-md space-y-1">
        <h3 className="font-black text-xl tracking-tight uppercase flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-400" />
          Bulk Image Uploader
        </h3>
        <p className="text-xs text-indigo-200 font-extrabold">
          Select any category, drop multiple images at once, preview auto-extracted answers, and save picture questions in bulk!
        </p>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl border font-extrabold text-xs flex items-center justify-between ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Configuration Grid: Select Category & Quiz Pack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[28px] bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/60 shadow-xs">
        
        {/* Category Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-amber-500" />
            1. Select Target Category
          </label>

          <select
            value={selectedCategoryId}
            onChange={e => {
              setSelectedCategoryId(e.target.value);
              setSelectedPackId('');
            }}
            className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.id})
              </option>
            ))}
          </select>
        </div>

        {/* Quiz Pack Option */}
        <div className="space-y-3">
          <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            2. Quiz Pack Destination
          </label>

          <div className="flex items-center gap-4 text-xs font-extrabold">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="packOption"
                checked={packOption === 'existing'}
                onChange={() => setPackOption('existing')}
                className="accent-amber-500"
              />
              <span>Use Existing Pack</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="packOption"
                checked={packOption === 'new'}
                onChange={() => setPackOption('new')}
                className="accent-amber-500"
              />
              <span>Create New Pack</span>
            </label>
          </div>

          {packOption === 'existing' ? (
            <select
              value={selectedPackId}
              onChange={e => setSelectedPackId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
            >
              <option value="">-- Choose an Existing Pack --</option>
              {categoryPacks.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.totalQuestions || 0} questions)
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="New Quiz Pack Title (e.g. World Architecture 100)"
                value={newPackTitle}
                onChange={e => setNewPackTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newPackDifficulty}
                  onChange={e => setNewPackDifficulty(e.target.value as DifficultyLevel)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert</option>
                </select>

                <input
                  type="number"
                  placeholder="Unlock Cost (0 = Free)"
                  value={newPackCost}
                  onChange={e => setNewPackCost(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-8 rounded-[32px] border-3 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 bg-white dark:bg-slate-900 text-center cursor-pointer transition-all space-y-3 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files && handleFilesAdded(e.target.files)}
        />

        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <FileImage className="w-8 h-8" />
        </div>

        <div>
          <h4 className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            Drag & Drop Images Here or Click to Browse
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
            Supports PNG, JPG, WEBP, GIF. Select dozens of picture files simultaneously!
          </p>
        </div>
      </div>

      {/* Batch Preview Table */}
      {uploadedItems.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Batch Queue ({uploadedItems.length} Images Ready)
            </h4>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkUppercaseAnswers}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300"
              >
                Uppercase All Answers
              </button>
              <button
                onClick={() => setUploadedItems([])}
                className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-200"
              >
                Clear Queue
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {uploadedItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4 shadow-xs"
              >
                {/* Thumbnail Preview */}
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={item.dataUrl} alt={item.answer} className="w-full h-full object-cover" />
                </div>

                {/* Form Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                      Answer Name #{index + 1}
                    </label>
                    <input
                      type="text"
                      value={item.answer}
                      onChange={e => handleItemChange(item.id, 'answer', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-black text-xs uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                      Hint
                    </label>
                    <input
                      type="text"
                      value={item.hint}
                      onChange={e => handleItemChange(item.id, 'hint', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveBulkUpload}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
          >
            <Upload className="w-5 h-5" />
            <span>SAVE & UPLOAD ALL {uploadedItems.length} PICTURE QUESTIONS</span>
          </button>
        </div>
      )}

    </div>
  );
};
