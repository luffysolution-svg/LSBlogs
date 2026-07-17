"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ToastProvider';

interface FloatingImageToolProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
  mode?: 'content' | 'cover';
}

export default function FloatingImageTool({ isOpen, onClose, onInsert, mode = 'content' }: FloatingImageToolProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload'); // 🌟 新增：切换状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState(''); // 🌟 新增：外链输入状态
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeTool = () => {
    setUploadedUrl('');
    setExternalUrl('');
    onClose();
  };

  // 处理文件上传逻辑 (保持不变)
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    showToast("正在将图片传送至云端...", "success");

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await fetch('/api/cms/picbed/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setUploadedUrl(data.url);
        showToast("✅ 上传成功！", "success");
      } else {
        showToast(`上传失败: ${data.message || '未知错误'}`, "error");
      }
    } catch (error: any) {
      showToast(`连接异常: ${error.message}`, "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'warning');
      return;
    }
    handleFileUpload(file);
  };

  const loadExternalCover = async (url: string) => {
    setIsUploading(true);
    try {
      const response = await fetch('/api/cms/picbed/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'webp';
      const file = new File([blob], `external-cover.${extension}`, { type: blob.type });
      setUploadedUrl('');
      await handleFileUpload(file);
    } catch (error) {
      showToast(`外链封面载入失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleSelectedFile(e.dataTransfer.files[0]);
  };

  // 🌟 新增：验证并确认外链图片
  const handleConfirmExternalUrl = () => {
    if (!externalUrl.trim()) {
      showToast("请输入有效的图片 URL", "warning");
      return;
    }
    if (!externalUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)$|^data:image/i)) {
        showToast("这似乎不是一个标准的图片链接，但仍尝试预览", "warning");
    }
    if (mode === 'cover') {
      void loadExternalCover(externalUrl.trim());
      return;
    }
    setUploadedUrl(externalUrl.trim());
    showToast("预览已生成", "success");
  };

  const copyUrlToClipboard = () => {
    if (uploadedUrl) {
      navigator.clipboard.writeText(uploadedUrl);
      showToast("链接已复制到剪贴板！", "success");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0}
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{ position: 'fixed', top: '15vh', right: '5vw', zIndex: 99999 }}
          className={`${mode === 'cover' ? 'w-[390px]' : 'w-80'} max-w-[calc(100vw-2rem)] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col cursor-move`}
        >
          {/* 标题栏 */}
          <div className="flex justify-between items-center p-5 border-b border-white/30 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-emerald-500 text-lg">☁️</span> {mode === 'cover' ? '封面原图上传' : '图床工作台'}
            </h3>
            <button onClick={closeTool} className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm">✕</button>
          </div>

          <div className="p-6 cursor-default bg-white/20 dark:bg-slate-900/20">
            {/* 🌟 模式切换 Tab */}
            {!uploadedUrl && (
              <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl mb-5">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  云端上传
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'url' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  外链插入
                </button>
              </div>
            )}

            {!uploadedUrl ? (
              activeTab === 'upload' ? (
                // 模式 A：上传拖拽区
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all shadow-inner ${isDragging ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/40' : 'border-slate-300/80 dark:border-slate-600/80 hover:bg-white/60 dark:hover:bg-slate-800/60'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleSelectedFile(e.target.files[0])} accept="image/*" className="hidden" />
                  <div className="text-4xl drop-shadow-sm">{isUploading ? '⏳' : '📥'}</div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{isUploading ? '正在极速上传...' : '点击或拖拽图片'}</p>
                  </div>
                </div>
              ) : (
                // 🌟 模式 B：外链输入区
                <div className="w-full space-y-4">
                  <div className="relative">
                    <textarea
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="粘贴图片链接 (http://...)"
                      className="w-full h-24 p-4 text-xs font-medium bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <button
                    onClick={handleConfirmExternalUrl}
                    disabled={isUploading}
                    className="w-full py-3 bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-black shadow-lg hover:opacity-90 transition-all active:scale-95"
                  >
                    {isUploading ? '正在载入...' : mode === 'cover' ? '载入并上传' : '确认图片链接'}
                  </button>
                  {mode === 'cover' && <p className="text-[10px] leading-5 text-slate-500">外链图片会保持原始长宽比上传，不做裁剪。</p>}
                </div>
              )
            ) : (
              // 预览与确认插入区
              <div className="flex flex-col gap-4">
                <div className={`${mode === 'cover' ? 'min-h-36 max-h-[50vh]' : 'h-36'} w-full rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-950/50 border border-white/40 dark:border-slate-700/50 flex items-center justify-center p-2 shadow-inner group relative`}>
                  <img src={uploadedUrl} alt="preview" className="max-w-full max-h-[calc(50vh-1rem)] h-auto w-auto object-contain rounded-xl drop-shadow-md" />
                  {/* 🌟 重新选择按钮 */}
                  <button
                    onClick={() => { setUploadedUrl(''); setExternalUrl(''); }}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                  >
                    重新选择
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={copyUrlToClipboard} className="py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm">🔗 复制链接</button>
                  <button onClick={() => { onInsert(uploadedUrl); setUploadedUrl(''); setExternalUrl(''); }} className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600 transition-all active:scale-95">✨ {mode === 'cover' ? '设为封面' : '嵌入正文'}</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
