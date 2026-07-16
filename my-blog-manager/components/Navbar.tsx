"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOperations } from '../context/OperationContext';
import { useToast } from './ToastProvider';
import { AlertTriangle, FileCheck2, Rocket, X } from 'lucide-react';
import { siteConfig } from '../siteConfig';

type PublishPreview = {
  message: string;
  canPublish: boolean;
  blogPath: string;
  sourceBranch: string;
  remoteUrl: string;
  files: string[];
  unrelatedChangesCount: number;
};

export default function Navbar() {
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isOpBoxOpen, setIsOpBoxOpen] = useState(false);

  const [targetBlogPath, setTargetBlogPath] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [publishPreview, setPublishPreview] = useState<PublishPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const pathname = usePathname();
  const { operations, removeOperation, clearOperations } = useOperations();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchPath = async () => {
      try {
        const configRes = await fetch(`/backend_config.json?t=${Date.now()}`);
        const config = await configRes.json();
        const res = await fetch(`http://127.0.0.1:${config.api_port}/api/deploy/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.blogPath) {
            setTargetBlogPath(data.blogPath);
          }
          setTargetBranch(data.sourceBranch || 'main');
        }
      } catch (e) {
        setTargetBlogPath("");
      }
    };
    fetchPath();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) setShowNav(false);
      else setShowNav(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // 🌟 这里新增了 /tree 路由
  const navLinks = [
    { name: '首页', href: '/' },
    { name: '项目', href: '/projects' },
    { name: '归档', href: '/timeline' },
    { name: '照片墙', href: '/photowall' },
    { name: '音乐', href: '/music' },
    { name: '说说', href: '/moments' },
    { name: '杂谈', href: '/chatter' },
    { name: '🌳 灵境', href: '/tree' }, // <--- 新增的入口在这里喵！
    { name: '📝 草稿箱', href: '/drafts' },
    { name: '友链', href: '/friends' },
    { name: '关于', href: '/about' },
    { name: '⚙️ 设置', href: '/settings' },
  ];

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).pywebview?.api) {
      (window as any).pywebview.api.minimize_window();
    }
  };
  const handleMaximize = () => {
    if (typeof window !== 'undefined' && (window as any).pywebview?.api) {
      (window as any).pywebview.api.maximize_window();
    }
  };
  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).pywebview?.api) {
      (window as any).pywebview.api.close_window();
    }
  };

  // 🌟 监控增强版更新逻辑
  const handleUpdateLocal = async () => {
      if (operations.length === 0) {
        showToast("队列中没有待处理的操作", "warning");
        return;
      }

      try {
        showToast(`🔍 正在准备发送 ${operations.length} 个任务...`, "info");

        const configRes = await fetch(`/backend_config.json?t=${Date.now()}`);
        const configData = await configRes.json();
        const apiBase = `http://127.0.0.1:${configData.api_port}`;

        for (const op of operations) {
          let apiUrl = '';
          let body = {};

          switch (op.type) {
            case 'sync_photowall':
              apiUrl = `${apiBase}/api/gallery/sync`;
              body = { albums: op.value };
              break;
            case 'sync_friends':
              apiUrl = `${apiBase}/api/friends/sync`;
              body = { friends: op.value };
              break;
            case 'sync_projects':
              apiUrl = `${apiBase}/api/projects/sync`;
              body = { projects: op.value };
              break;
            case 'CONFIG':
              apiUrl = `${apiBase}/api/config/update`;
              body = { updates: op.payload };
              break;
            case 'create_moment':
              apiUrl = `${apiBase}/api/moments/save`;
              body = op.payload;
              break;
            default:
              apiUrl = `${apiBase}/api/drafts/sync_local`;
              body = { operations: [op] };
              break;
          }

          showToast(`🚀 正在请求后端: ${apiUrl}`, "info");

          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          const data = await res.json();
          if (!data.success) {
            showToast(`❌ 任务执行失败: ${data.message}`, "error");
            return;
          }
        }

        showToast("✅ 任务已全部执行，本地数据已写入！", "success");
        clearOperations();
        setIsOpBoxOpen(false);

        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (error: any) {
        showToast(`后端连接异常: ${error.message}`, "error");
      }
    };

  const handlePublishClick = async () => {
    if (operations.length > 0) {
      showToast("请先保存待处理操作，再检查发布内容", "warning");
      return;
    }
    if (!targetBlogPath) {
      showToast("没有识别到博客目录，请先在项目仓库设置中选择", "warning");
      return;
    }

    setIsPreviewing(true);
    try {
      const configRes = await fetch(`/backend_config.json?t=${Date.now()}`);
      const configData = await configRes.json();
      const res = await fetch(`http://127.0.0.1:${configData.api_port}/api/deploy/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogPath: targetBlogPath, sourceBranch: targetBranch })
      });
      const data = await res.json();
      if (data.success) {
        setPublishPreview(data);
        setIsOpBoxOpen(false);
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("无法连接到本地发布引擎", "error");
    } finally {
      setIsPreviewing(false);
    }
  };

  const executePublishBlog = async () => {
    if (!publishPreview?.canPublish) return;
    setIsPublishing(true);
    try {
      const configRes = await fetch(`/backend_config.json?t=${Date.now()}`);
      const configData = await configRes.json();
      const res = await fetch(`http://127.0.0.1:${configData.api_port}/api/deploy/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogPath: targetBlogPath, sourceBranch: targetBranch })
      });
      const data = await res.json();
      showToast(data.message, data.success ? "success" : "error");
      if (data.success) setPublishPreview(null);
    } catch {
      showToast("发布请求中断，请查看启动终端中的构建信息", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <header className={`w-full fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b ${showNav ? 'translate-y-0' : '-translate-y-full'} bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border-white/20 dark:border-white/5 shadow-sm pywebview-drag-region`}>
        <div className="w-[95%] max-w-7xl mx-auto h-16 flex items-center justify-between px-4 box-border">

          <Link href="/" className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">
            {siteConfig.navTitle}
            <span className="text-indigo-500 mx-1">
              {siteConfig.navSuffix || 'の'}
            </span>
            {siteConfig.navAfter}
          </Link>

          <div className="flex items-center gap-6" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <nav className="hidden lg:flex gap-8 text-sm font-bold">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className={`relative py-1 transition-colors ${pathname === link.href ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="relative">
              <button onClick={() => setIsOpBoxOpen(!isOpBoxOpen)} className="relative w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-lg hover:scale-105 transition-all border border-white/20 shadow-sm cursor-pointer">
                📥
                {operations.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] font-black text-white items-center justify-center border-2 border-white dark:border-slate-900">
                      {operations.length}
                    </span>
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isOpBoxOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 z-50 cursor-default">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">待处理操作</h3>
                      <button onClick={clearOperations} className="text-[10px] text-red-500 font-bold hover:underline">清空全部</button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mb-4 custom-scrollbar">
                      {operations.length === 0 ? (
                        <p className="text-center py-6 text-sm text-slate-400 font-medium">暂无积攒的操作</p>
                      ) : (
                        operations.map(op => (
                          <div key={op.id} className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{op.label}</span>
                              <span className="text-[10px] text-slate-400">{op.timestamp}</span>
                            </div>
                            <button onClick={() => removeOperation(op.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all text-lg">✕</button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={handleUpdateLocal} className="py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-colors">
                        保存到本地
                      </button>
                      <button onClick={handlePublishClick} disabled={isPreviewing || isPublishing} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                        <FileCheck2 size={14} className={isPreviewing ? 'animate-pulse' : ''} />
                        {isPreviewing ? '检查中' : '检查并发布'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 ml-2 pl-6 border-l border-slate-300/50 dark:border-slate-600/50">
              <button onClick={handleMinimize} className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center group transition-colors shadow-sm cursor-pointer z-[101]">
                <span className="opacity-0 group-hover:opacity-100 text-[8px] text-yellow-900 font-black">-</span>
              </button>
              <button onClick={handleMaximize} className="w-3.5 h-3.5 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center group transition-colors shadow-sm cursor-pointer z-[101]">
                <span className="opacity-0 group-hover:opacity-100 text-[8px] text-green-900 font-black">+</span>
              </button>
              <button onClick={handleClose} className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center group transition-colors shadow-sm cursor-pointer z-[101]">
                <span className="opacity-0 group-hover:opacity-100 text-[8px] text-red-900 font-black">×</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      <AnimatePresence>
        {publishPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.button type="button" aria-label="关闭发布确认" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isPublishing && setPublishPreview(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/50 dark:border-white/10 p-6 md:p-8">
              <button type="button" onClick={() => setPublishPreview(null)} disabled={isPublishing} className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition disabled:opacity-40">
                <X size={18} />
              </button>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${publishPreview.canPublish ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {publishPreview.canPublish ? <Rocket size={28} /> : <AlertTriangle size={28} />}
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">发布前检查</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{publishPreview.message}</p>

              <div className="mt-5 rounded-2xl bg-slate-100/80 dark:bg-slate-950/50 p-4 text-xs space-y-2">
                <p className="text-slate-500 break-all"><span className="font-black text-slate-700 dark:text-slate-200">目录：</span>{publishPreview.blogPath}</p>
                <p className="text-slate-500 break-all"><span className="font-black text-slate-700 dark:text-slate-200">远程：</span>{publishPreview.remoteUrl}</p>
                <p className="text-slate-500"><span className="font-black text-slate-700 dark:text-slate-200">分支：</span>{publishPreview.sourceBranch}</p>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">本次涉及文件</p>
                  <span className="text-xs font-bold text-slate-400">{publishPreview.files.length}</span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-950/30 p-3 font-mono text-[11px] leading-6 text-slate-500 dark:text-slate-400">
                  {publishPreview.files.length > 0
                    ? publishPreview.files.map(file => <div key={file}>{file}</div>)
                    : <p className="font-sans">没有内容差异，确认后只执行生产构建。</p>}
                </div>
              </div>

              {publishPreview.unrelatedChangesCount > 0 && (
                <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  另有 {publishPreview.unrelatedChangesCount} 个无关改动，本次不会提交。
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                <button onClick={() => setPublishPreview(null)} disabled={isPublishing} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50">返回</button>
                <button onClick={executePublishBlog} disabled={!publishPreview.canPublish || isPublishing} className="flex-[1.3] flex items-center justify-center gap-2 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-45 disabled:cursor-not-allowed">
                  <Rocket size={15} className={isPublishing ? 'animate-bounce' : ''} />
                  {isPublishing ? '构建并推送中' : '确认构建并发布'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
