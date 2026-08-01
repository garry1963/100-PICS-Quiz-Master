import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { dbStore } from '../../lib/storage';
import { apiClient } from '../../lib/apiClient';
import { QuizPack, Question } from '../../types';
import { soundFx } from '../../lib/sound';

export const AIGeneratorModal: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPack, setGeneratedPack] = useState<any | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    soundFx.playClick();
    setLoading(true);
    setError(null);
    setGeneratedPack(null);

    const result = await apiClient.generateAIPack(topic, questionCount);

    setLoading(false);

    if (result) {
      soundFx.playCorrect();
      setGeneratedPack(result);
    } else {
      soundFx.playWrong();
      setError('AI generation request failed. Make sure GEMINI_API_KEY is configured in your project secrets.');
    }
  };

  const handleSaveToDatabase = () => {
    if (!generatedPack) return;
    soundFx.playCorrect();

    const newPackId = `pack-ai-${Date.now()}`;

    const pack: QuizPack = {
      id: newPackId,
      title: generatedPack.title || topic,
      description: generatedPack.description || `AI-generated picture quiz pack for ${topic}`,
      category: generatedPack.category || 'General Knowledge',
      difficulty: generatedPack.difficulty || 'Medium',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      packColor: 'from-purple-600 to-indigo-800',
      releaseDate: new Date().toISOString().split('T')[0],
      estimatedTime: '5 mins',
      totalQuestions: generatedPack.questions?.length || 6,
      xpReward: 300,
      coinReward: 120,
      downloadSize: '2.8 MB',
      isNew: true,
      tags: ['ai-generated', topic.toLowerCase()]
    };

    dbStore.savePack(pack);

    // Save Questions
    (generatedPack.questions || []).forEach((q: any, idx: number) => {
      const queryTerm = encodeURIComponent(q.suggestedImageQuery || q.correctAnswer || topic || 'nature');
      // Curated list of high-quality Unsplash image URLs based on index to ensure visual variety if query fails
      const defaultVarieties = [
        'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1564349683136-77e08dba1ef9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=800&q=80'
      ];
      const imageUrl = q.imageUrl || `https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80&sig=${idx}`;
      
      const question: Question = {
        id: `q-ai-${Date.now()}-${idx}`,
        packId: newPackId,
        order: idx + 1,
        image: imageUrl || defaultVarieties[idx % defaultVarieties.length],
        correctAnswer: String(q.correctAnswer || 'ANSWER').toUpperCase(),
        alternativeAcceptedAnswers: (q.alternativeAcceptedAnswers || []).map((a: string) => a.toUpperCase()),
        difficulty: pack.difficulty,
        hint: q.hint || `Clue for ${q.correctAnswer}`,
        triviaFact: q.triviaFact || `Fascinating trivia about ${q.correctAnswer}.`,
        category: pack.category,
        tags: ['ai']
      };
      dbStore.saveQuestion(question);
    });
    dbStore.markPackDownloaded(newPackId);

    dbStore.addLog('success', 'content', `AI Pack saved to database: ${pack.title}`);
    alert(`Successfully created and published "${pack.title}" with ${generatedPack.questions.length} picture questions!`);
    setGeneratedPack(null);
    setTopic('');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <h3 className="font-bold text-xl text-slate-100">Gemini AI Quiz Generator</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Instantly generate full 100 PICS picture quiz packs with trivia facts, clues, and accepted spellings using server-side Gemini API.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-800/80 border border-purple-500/30 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="font-bold text-xs text-slate-300 block mb-1">Enter Any Topic</label>
            <input
              type="text"
              placeholder="e.g. '1990s Cartoon Villains', 'Fastest Supercars', 'Marvel Superhero Logos'..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-xs text-slate-300 block mb-1">Question Count</label>
            <select
              value={questionCount}
              onChange={e => setQuestionCount(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-semibold"
            >
              <option value={4}>4 Pictures</option>
              <option value={6}>6 Pictures</option>
              <option value={8}>8 Pictures</option>
              <option value={10}>10 Pictures</option>
            </select>
          </div>
        </div>

        <button
          disabled={loading || !topic.trim()}
          onClick={handleGenerate}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:brightness-110 text-white font-black text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating AI Quiz Pack...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>GENERATE PACK WITH GEMINI AI</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Preview Result */}
      {generatedPack && (
        <div className="p-6 rounded-3xl bg-slate-800 border-2 border-emerald-500/50 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400">AI GENERATED PACK</span>
              <h4 className="font-bold text-xl text-slate-100">{generatedPack.title}</h4>
            </div>

            <button
              onClick={handleSaveToDatabase}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>PUBLISH PACK TO GAME</span>
            </button>
          </div>

          <p className="text-xs text-slate-300">{generatedPack.description}</p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {generatedPack.questions?.map((q: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>#{idx + 1} {q.correctAnswer}</span>
                  <span className="text-slate-500 text-[10px]">Query: {q.suggestedImageQuery}</span>
                </div>
                <p className="text-slate-400 italic">Clue: {q.hint}</p>
                <p className="text-slate-300">Trivia: {q.triviaFact}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
