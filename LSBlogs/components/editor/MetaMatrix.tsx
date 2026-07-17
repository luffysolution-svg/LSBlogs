"use client";

import React, { useState, KeyboardEvent } from 'react';
import { ImageIcon, Tag, FileText, X, Clock, CloudUpload, Smile, Save, Send, Plus, type LucideIcon } from 'lucide-react';

interface Props {
  type: 'post' | 'chatter' | 'about';
  tags: string[]; setTags: React.Dispatch<React.SetStateAction<string[]>>;
  cover: string; setCover: (val: string) => void;
  summary: string; setSummary: (val: string) => void;
  mood?: string; setMood?: (val: string) => void;
  allHistoryPostTags: string[];
  allHistoryChatterTags: string[];
  isLoadingTags: boolean;
  allHistoryMoods: string[];
  onSave: (isPublish: boolean, finalTags?: string[]) => void;
  isSaving: boolean;
  lastSaved: string | null;
  onOpenImageTool: () => void;
}

function FieldLabel({ icon: Icon, text, color }: { icon: LucideIcon; text: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3 border-l-4 ${color} pl-4`}>
      <Icon size={14} className="text-slate-400" />
      <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">{text}</span>
    </div>
  );
}

export default function MetaMatrix({
  type, tags, setTags, cover, setCover, summary, setSummary, mood, setMood,
  allHistoryPostTags, allHistoryChatterTags, isLoadingTags, allHistoryMoods, onSave, isSaving, lastSaved, onOpenImageTool
}: Props) {
  const [tagInput, setTagInput] = useState('');
  const currentHistoryTags = type === 'chatter' ? allHistoryChatterTags : allHistoryPostTags;

  const tagsWithInput = () => {
    const values = tagInput
      .split(/[,，;；\n]+/)
      .map(value => value.trim().replace(/^#+/, ''))
      .filter(Boolean);
    return [...new Set([...tags, ...values])];
  };

  const commitTagInput = () => {
    const nextTags = tagsWithInput();
    if (nextTags.length !== tags.length) setTags(nextTags);
    setTagInput('');
    return nextTags;
  };

  const handleAddTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTagInput();
    }
  };

  const handleSave = (isPublish: boolean) => {
    const finalTags = tagInput.trim() ? commitTagInput() : tags;
    onSave(isPublish, finalTags);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* 头部标题 */}
      <div className="shrink-0 p-8 pb-4 flex flex-col border-b border-white/10 bg-white/5">
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">{type} Mode</span>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">属性设置</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col gap-10">

        {/* 1. 封面图区 */}
        <div className="flex flex-col">
          <FieldLabel icon={ImageIcon} text="Cover Image" color="border-indigo-500" />
          <div onClick={onOpenImageTool} className="w-full min-h-36 max-h-[50vh] bg-black/10 dark:bg-black/40 rounded-[32px] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden p-2 mb-4 group relative cursor-pointer shadow-inner transition-all">
            {cover ? (
              <img src={cover} alt="文章封面预览" className="max-w-full max-h-[calc(50vh-1rem)] h-auto w-auto object-contain rounded-[26px]" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <CloudUpload size={28} className="opacity-30 group-hover:opacity-100 group-hover:text-indigo-400 transition-all" />
                <span className="text-[9px] font-black uppercase tracking-widest">Click to Upload</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-sm transition-opacity">
              <span className="text-white text-xs font-bold tracking-widest">更换封面</span>
            </div>
          </div>
          <input
            type="text" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="或手动粘贴 URL..."
            className="w-full bg-white/10 dark:bg-black/20 rounded-2xl px-5 py-3.5 text-xs text-slate-800 dark:text-slate-200 border border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* 2. 标签区 */}
        {type !== 'about' && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom duration-500">
            <FieldLabel icon={Tag} text="文章书签（可多选）" color="border-pink-500" />
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5 shadow-inner">
              {tags.map(t => (
                <span key={t} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-xl flex items-center gap-2 shadow-sm border border-indigo-500/10">
                  #{t}
                  <button onClick={() => setTags(current => current.filter(x => x !== t))} className="hover:text-red-500 transition-colors"><X size={10}/></button>
                </span>
              ))}
              <input
                type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} onBlur={commitTagInput}
                placeholder="输入后按 Enter，可用逗号分隔多个" className="flex-1 min-w-[150px] bg-transparent text-xs outline-none text-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={commitTagInput}
                disabled={!tagInput.trim()}
                className="inline-flex items-center gap-1 rounded-xl bg-pink-500/15 px-2.5 py-1.5 text-[10px] font-black text-pink-600 transition hover:bg-pink-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-pink-300"
              >
                <Plus size={11} /> 添加
              </button>
            </div>
            <p className="-mt-2 mb-3 px-1 text-[9px] text-slate-400">书签会写入文章，并用于归档页筛选与搜索。</p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {isLoadingTags ? (
                <span className="text-[10px] text-slate-400 animate-pulse italic">扫描历史标签中...</span>
              ) : currentHistoryTags.length > 0 ? (
                currentHistoryTags.map(t => (
                  <button
                    key={t} disabled={tags.includes(t)} onClick={() => setTags(current => current.includes(t) ? current : [...current, t])}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                      tags.includes(t) 
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 border-transparent opacity-50 cursor-not-allowed' 
                      : 'bg-white/10 text-slate-500 dark:text-slate-400 border-white/10 hover:bg-indigo-500 hover:text-white hover:border-indigo-500'
                    }`}
                  >
                    + {t}
                  </button>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 italic">尚未发现标签</span>
              )}
            </div>
          </div>
        )}

        {/* 3. 心情区 */}
        {type === 'chatter' && setMood && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom duration-700">
            <FieldLabel icon={Smile} text="Mood Today" color="border-yellow-500" />
            <input
              type="text" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="输入心情词..."
              className="w-full bg-white/10 dark:bg-black/20 rounded-2xl px-5 py-4 text-xs text-slate-800 dark:text-slate-200 border border-white/10 outline-none focus:ring-2 focus:ring-yellow-500 mb-4 shadow-inner"
            />
            <div className="flex flex-wrap gap-2">
              {allHistoryMoods.map(h => (
                <button
                  key={h} onClick={() => setMood(h)}
                  className="px-4 py-1.5 bg-yellow-500/10 rounded-full text-[10px] font-bold text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500 hover:text-white transition-all shadow-sm"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 🌟 4. 摘要区 (补回丢失的代码) */}
        {type !== 'about' && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom duration-700">
            <FieldLabel icon={FileText} text="Description" color="border-emerald-500" />
            <textarea
              rows={6}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="记录一下这篇内容的核心思绪..."
              className="w-full bg-white/10 dark:bg-black/20 rounded-[32px] px-6 py-5 text-xs text-slate-800 dark:text-slate-200 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-inner leading-relaxed placeholder:text-slate-500 font-medium"
            />
            <p className="mt-2 text-[9px] text-slate-400 italic px-2">提示：摘要将显示在首页卡片和搜索预览中。</p>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="shrink-0 p-8 border-t border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
            <Clock size={12} />
            {isSaving ? "正在落盘至本地系统..." : lastSaved ? `最近落盘: ${lastSaved}` : "文档尚未在本地生成"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)} disabled={isSaving}
              className="flex-1 py-3.5 bg-white/20 hover:bg-white/30 text-slate-800 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl border border-white/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <Save size={14} /> 存为草稿
            </button>
            <button
              onClick={() => handleSave(true)} disabled={isSaving}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Send size={14} /> 正式发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
