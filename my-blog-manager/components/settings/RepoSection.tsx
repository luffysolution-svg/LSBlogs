"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FolderOpen,
  GitBranch,
  RefreshCw,
  Rocket,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useToast } from '../ToastProvider';

type DeployConfig = {
  blogPath: string;
  sourceBranch: string;
  autoDetected?: boolean;
  pathWarning?: string;
};

type PublishPreview = {
  message: string;
  canPublish: boolean;
  blogPath: string;
  sourceBranch: string;
  currentBranch: string;
  remoteUrl: string;
  files: string[];
  stagedFiles: string[];
  unrelatedChangesCount: number;
};

type DesktopWindow = Window & {
  pywebview?: {
    api?: {
      choose_blog_directory?: () => Promise<string>;
    };
  };
};

async function getApiBase() {
  const response = await fetch(`/backend_config.json?t=${Date.now()}`);
  const config = await response.json();
  return `http://127.0.0.1:${config.api_port}`;
}

export default function RepoSection() {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [deployData, setDeployData] = useState<DeployConfig>({
    blogPath: '',
    sourceBranch: 'main',
  });
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const apiBase = await getApiBase();
        const response = await fetch(`${apiBase}/api/deploy/config`);
        const data = await response.json();
        setDeployData({
          blogPath: data.blogPath || '',
          sourceBranch: data.sourceBranch || 'main',
          autoDetected: Boolean(data.autoDetected),
          pathWarning: data.pathWarning || '',
        });
      } catch {
        setDeployData((current) => ({
          ...current,
          pathWarning: '无法读取本地发布设置，请确认桌面后端正在运行。',
        }));
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const chooseBlogDirectory = async () => {
    const desktopApi = (window as DesktopWindow).pywebview?.api;
    if (!desktopApi?.choose_blog_directory) {
      showToast('目录选择器仅在桌面管理器窗口中可用', 'warning');
      return;
    }

    const selected = await desktopApi.choose_blog_directory();
    if (selected) {
      setDeployData((current) => ({
        ...current,
        blogPath: selected,
        autoDetected: false,
        pathWarning: '',
      }));
    }
  };

  const checkRepository = async () => {
    setIsChecking(true);
    try {
      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/deploy/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployData),
      });
      const data = await response.json();
      showToast(data.message, data.success ? 'success' : 'error');
    } catch {
      showToast('本地发布引擎没有响应', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/deploy/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployData),
      });
      const data = await response.json();
      if (data.success) {
        setDeployData((current) => ({
          ...current,
          blogPath: data.blogPath,
          sourceBranch: data.sourceBranch,
          autoDetected: false,
        }));
      }
      showToast(data.message, data.success ? 'success' : 'error');
    } catch {
      showToast('保存发布设置失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const inspectRelease = async () => {
    setIsPreviewing(true);
    try {
      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/deploy/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployData),
      });
      const data = await response.json();
      if (!data.success) {
        showToast(data.message, 'error');
        return;
      }
      setPreview(data);
    } catch {
      showToast('发布检查失败，请确认桌面后端正在运行', 'error');
    } finally {
      setIsPreviewing(false);
    }
  };

  const confirmRelease = async () => {
    if (!preview?.canPublish) return;
    setIsPublishing(true);
    try {
      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/deploy/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployData),
      });
      const data = await response.json();
      showToast(data.message, data.success ? 'success' : 'error');
      if (data.success) setPreview(null);
    } catch {
      showToast('发布请求中断，请检查终端中的构建信息', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="relative z-10 mb-24 rounded-[40px] border border-white/50 bg-white/40 p-6 shadow-2xl backdrop-blur-2xl dark:border-slate-800/50 dark:bg-slate-900/40 md:p-8"
      >
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-indigo-500">
              <ShieldCheck size={18} />
              <span className="text-xs font-black tracking-wider">安全发布</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">本地博客仓库</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              管理器只同步博客内容，构建通过后再提交相关文件，并使用现有 origin 推送到目标分支。
            </p>
          </div>
          {deployData.autoDetected && (
            <span className="w-fit rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
              已自动识别目录
            </span>
          )}
        </div>

        {deployData.pathWarning && (
          <p className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            {deployData.pathWarning}
          </p>
        )}

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/70 bg-white/50 p-5 dark:border-slate-700/60 dark:bg-slate-950/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                <FolderOpen size={16} className="text-indigo-500" /> 博客目录
              </label>
              <button
                type="button"
                onClick={checkRepository}
                disabled={isChecking || isLoading}
                className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-500 disabled:opacity-50 dark:text-indigo-300"
              >
                <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />
                {isChecking ? '检查中' : '检查连接'}
              </button>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={deployData.blogPath}
                onChange={(event) => setDeployData((current) => ({
                  ...current,
                  blogPath: event.target.value,
                  autoDetected: false,
                }))}
                disabled={isLoading}
                placeholder="自动寻找管理器旁边的 LSBlogs"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-mono text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={chooseBlogDirectory}
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-3 text-xs font-black text-indigo-600 transition hover:bg-indigo-500 hover:text-white active:scale-[0.98] dark:text-indigo-300"
              >
                <FolderOpen size={15} /> 选择目录
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
            <div className="rounded-3xl border border-slate-200/70 bg-white/50 p-5 dark:border-slate-700/60 dark:bg-slate-950/20">
              <label className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                <GitBranch size={16} className="text-indigo-500" /> Vercel 监听分支
              </label>
              <input
                type="text"
                value={deployData.sourceBranch}
                onChange={(event) => setDeployData((current) => ({
                  ...current,
                  sourceBranch: event.target.value,
                }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-mono text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              />
            </div>

            <div className="rounded-3xl border border-indigo-500/15 bg-indigo-500/[0.06] p-5">
              <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">发布保护</p>
              <div className="space-y-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <p className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-500" /> 不清空文章和图片目录</p>
                <p className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-500" /> 构建通过后才允许提交</p>
                <p className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-500" /> 不提交无关路径和已暂存文件</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={saveConfig}
              disabled={isSaving || isLoading}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-white active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <Save size={17} /> {isSaving ? '保存中' : '保存本机设置'}
            </button>
            <button
              type="button"
              onClick={inspectRelease}
              disabled={isPreviewing || isLoading || !deployData.blogPath}
              className="flex flex-[1.35] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-indigo-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCheck2 size={17} className={isPreviewing ? 'animate-pulse' : ''} />
              {isPreviewing ? '正在检查' : '检查并发布'}
            </button>
          </div>
        </div>
      </motion.section>

      {mounted && createPortal(
        <AnimatePresence>
          {preview && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.button
                type="button"
                aria-label="关闭发布确认"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isPublishing && setPreview(null)}
                className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 18 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 18 }}
                className="relative w-full max-w-xl rounded-[32px] border border-white/40 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 md:p-8"
              >
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  disabled={isPublishing}
                  className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X size={18} />
                </button>

                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${preview.canPublish ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {preview.canPublish ? <Rocket size={27} /> : <AlertTriangle size={27} />}
                </div>
                <h3 className="pr-10 text-xl font-black text-slate-900 dark:text-white">发布前检查</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{preview.message}</p>

                <div className="mt-5 grid gap-3 rounded-2xl bg-slate-100/80 p-4 text-xs dark:bg-slate-950/50">
                  <p className="break-all text-slate-500"><span className="font-black text-slate-700 dark:text-slate-200">目录：</span>{preview.blogPath}</p>
                  <p className="break-all text-slate-500"><span className="font-black text-slate-700 dark:text-slate-200">远程：</span>{preview.remoteUrl}</p>
                  <p className="text-slate-500"><span className="font-black text-slate-700 dark:text-slate-200">分支：</span>{preview.sourceBranch}</p>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">本次涉及文件</p>
                    <span className="text-xs font-bold text-slate-400">{preview.files.length}</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white/60 p-3 font-mono text-[11px] leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
                    {preview.files.length > 0
                      ? preview.files.map((file) => <div key={file}>{file}</div>)
                      : <p className="font-sans">没有检测到内容差异，确认后只执行生产构建。</p>}
                  </div>
                </div>

                {preview.unrelatedChangesCount > 0 && (
                  <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    仓库还有 {preview.unrelatedChangesCount} 个无关改动，本次不会暂存或提交它们。
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    disabled={isPublishing}
                    className="flex-1 whitespace-nowrap rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    返回检查
                  </button>
                  <button
                    type="button"
                    onClick={confirmRelease}
                    disabled={!preview.canPublish || isPublishing}
                    className="flex flex-[1.3] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-indigo-500 px-5 py-3.5 text-sm font-black text-white transition hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Rocket size={16} className={isPublishing ? 'animate-bounce' : ''} />
                    {isPublishing ? '构建并推送中' : '确认构建并发布'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
