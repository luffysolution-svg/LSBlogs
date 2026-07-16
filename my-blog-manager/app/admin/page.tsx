"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArchiveRestore,
  FileText,
  FolderGit2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import RepoSection from '../../components/settings/RepoSection';
import { useToast } from '../../components/ToastProvider';

type ContentType = 'post' | 'chatter' | 'moment';
type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  date: string;
  description: string;
  tags: string[];
};

type ContentResponse = {
  success: boolean;
  message?: string;
  blogPath?: string;
  items?: ContentItem[];
  counts?: Record<ContentType, number>;
};

async function getApiBase() {
  const response = await fetch(`/backend_config.json?t=${Date.now()}`);
  const config = await response.json();
  return `http://127.0.0.1:${config.api_port}`;
}

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [counts, setCounts] = useState<Record<ContentType, number>>({ post: 0, chatter: 0, moment: 0 });
  const [blogPath, setBlogPath] = useState('');
  const [filter, setFilter] = useState<'all' | ContentType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [legacyFiles, setLegacyFiles] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiBase = await getApiBase();
      const [contentResponse, deployResponse] = await Promise.all([
        fetch(`${apiBase}/api/content/list`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/deploy/config`, { cache: 'no-store' }),
      ]);
      const content: ContentResponse = await contentResponse.json();
      const deploy = await deployResponse.json();
      if (!content.success) throw new Error(content.message || '正式博客内容读取失败');
      setItems(content.items || []);
      setCounts(content.counts || { post: 0, chatter: 0, moment: 0 });
      setBlogPath(content.blogPath || deploy.blogPath || '');

      const legacyResponse = await fetch(`${apiBase}/api/sync/legacy_preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogPath: content.blogPath || deploy.blogPath || '' }),
      });
      const legacy = await legacyResponse.json();
      setLegacyFiles(legacy.success && Array.isArray(legacy.files) ? legacy.files : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '管理台加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredItems = useMemo(
    () => filter === 'all' ? items : items.filter(item => item.type === filter),
    [filter, items],
  );

  const deleteItem = async (item: ContentItem) => {
    if (!window.confirm(`确认从正式博客删除“${item.title}”吗？该删除会进入下一次 Git 发布。`)) return;
    try {
      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/content/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: item.type }),
      });
      const data = await response.json();
      showToast(data.message, data.success ? 'success' : 'error');
      if (data.success) await loadDashboard();
    } catch {
      showToast('删除请求失败', 'error');
    }
  };

  const migrateLegacyData = async () => {
    setIsMigrating(true);
    try {
      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/sync/legacy_import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogPath }),
      });
      const data = await response.json();
      showToast(data.message, data.success ? 'success' : 'error');
      if (data.success) await loadDashboard();
    } catch {
      showToast('旧数据迁移请求失败', 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const cards = [
    { type: 'post' as const, label: '文章', value: counts.post, icon: FileText, color: 'text-indigo-500 bg-indigo-500/10' },
    { type: 'chatter' as const, label: '杂谈', value: counts.chatter, icon: MessageCircle, color: 'text-pink-500 bg-pink-500/10' },
    { type: 'moment' as const, label: '说说', value: counts.moment, icon: Sparkles, color: 'text-amber-500 bg-amber-500/10' },
  ];

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <PageTransition>
        <main className="mx-auto mt-24 w-[94%] max-w-7xl space-y-8">
          <header className="flex flex-col gap-5 rounded-[36px] border border-white/50 bg-white/45 p-7 shadow-xl backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-900/45 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-500"><FolderGit2 size={15} />Local CMS</div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">博客管理控制台</h1>
              <p className="mt-2 break-all text-xs text-slate-500">唯一内容源：{blogPath || '正在识别 LSBlogs…'}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={loadDashboard} disabled={isLoading} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300"><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />刷新</button>
              <Link href="/settings" className="flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-xs font-black text-white dark:bg-slate-700"><Settings size={15} />站点设置</Link>
              <Link href="/editor?id=new&type=post" className="flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-xs font-black text-white shadow-lg shadow-indigo-500/25"><Plus size={15} />新建文章</Link>
            </div>
          </header>

          {legacyFiles.length > 0 && (
            <section className="rounded-[28px] border border-amber-500/25 bg-amber-500/10 p-5 text-amber-800 dark:text-amber-200 md:flex md:items-center md:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-black"><ArchiveRestore size={17} />发现 {legacyFiles.length} 个旧管理器文件尚未进入正式博客</p>
                <p className="mt-1 text-xs opacity-80">只迁移文章、杂谈、说说和图片，不覆盖站点配置及结构化数据。</p>
              </div>
              <button onClick={migrateLegacyData} disabled={isMigrating} className="mt-4 rounded-2xl bg-amber-500 px-5 py-3 text-xs font-black text-white shadow-lg disabled:opacity-50 md:mt-0">{isMigrating ? '迁移中…' : '一次性迁移旧数据'}</button>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            {cards.map(card => (
              <button key={card.type} onClick={() => setFilter(card.type)} className="rounded-[28px] border border-white/50 bg-white/45 p-6 text-left shadow-lg backdrop-blur-xl transition hover:-translate-y-1 dark:border-slate-800/60 dark:bg-slate-900/45">
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${card.color}`}><card.icon size={21} /></div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">正式{card.label}</p>
              </button>
            ))}
          </section>

          <section className="overflow-hidden rounded-[36px] border border-white/50 bg-white/45 shadow-xl backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-900/45">
            <div className="flex flex-col gap-4 border-b border-slate-200/60 p-6 dark:border-slate-700/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">内容库</h2>
                <p className="mt-1 text-xs text-slate-500">这里读取的是正式博客目录，不是管理器副本。</p>
              </div>
              <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                {(['all', 'post', 'chatter', 'moment'] as const).map(value => (
                  <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2 text-xs font-black transition ${filter === value ? 'bg-white text-indigo-600 shadow dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'}`}>{value === 'all' ? '全部' : value === 'post' ? '文章' : value === 'chatter' ? '杂谈' : '说说'}</button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
              {isLoading ? (
                <div className="p-12 text-center text-sm font-bold text-slate-400">正在读取正式博客…</div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center text-sm font-bold text-slate-400">当前分类还没有内容</div>
              ) : filteredItems.map(item => (
                <motion.article layout key={`${item.type}-${item.id}`} className="flex flex-col gap-4 p-5 transition hover:bg-white/40 dark:hover:bg-slate-800/30 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-lg bg-indigo-500/10 px-2 py-1 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-300">{item.type}</span>
                      <span className="text-[10px] text-slate-400">{item.date || '未设置日期'}</span>
                    </div>
                    <h3 className="truncate font-black text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.description || item.id}</p>
                  </div>
                  <div className="flex gap-2">
                    {item.type !== 'moment' && <Link href={`/editor?id=${encodeURIComponent(item.id)}&type=${item.type}`} className="flex items-center gap-1.5 rounded-xl bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-600 transition hover:bg-indigo-500 hover:text-white"><Pencil size={14} />编辑</Link>}
                    <button onClick={() => deleteItem(item)} className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-500 transition hover:bg-red-500 hover:text-white"><Trash2 size={14} />删除</button>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <RepoSection />
        </main>
      </PageTransition>
    </div>
  );
}
