"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ToastProvider';

interface FloatingImageToolProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
  mode?: 'content' | 'cover';
}

type CropSource = {
  file: File;
  url: string;
  x: number;
  y: number;
  zoom: number;
};

function drawCoverCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: CropSource) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const targetRatio = 16 / 9;
  let cropWidth = image.naturalWidth;
  let cropHeight = cropWidth / targetRatio;
  if (cropHeight > image.naturalHeight) {
    cropHeight = image.naturalHeight;
    cropWidth = cropHeight * targetRatio;
  }
  cropWidth /= crop.zoom;
  cropHeight /= crop.zoom;
  const sourceX = (image.naturalWidth - cropWidth) * (crop.x / 100);
  const sourceY = (image.naturalHeight - cropHeight) * (crop.y / 100);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
}

export default function FloatingImageTool({ isOpen, onClose, onInsert, mode = 'content' }: FloatingImageToolProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload'); // 🌟 新增：切换状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState(''); // 🌟 新增：外链输入状态
  const [isDragging, setIsDragging] = useState(false);
  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!cropSource || !cropCanvasRef.current) return;
    const image = new Image();
    image.onload = () => {
      if (cropCanvasRef.current) drawCoverCrop(cropCanvasRef.current, image, cropSource);
    };
    image.src = cropSource.url;
  }, [cropSource]);

  const clearCropSource = () => {
    setCropSource(current => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const closeTool = () => {
    clearCropSource();
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
        clearCropSource();
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
    if (mode === 'cover') {
      clearCropSource();
      setCropSource({ file, url: URL.createObjectURL(file), x: 50, y: 50, zoom: 1 });
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
      clearCropSource();
      setCropSource({ file, url: URL.createObjectURL(file), x: 50, y: 50, zoom: 1 });
      setUploadedUrl('');
      showToast('外链图片已载入，请确认 16:9 取景', 'success');
    } catch (error) {
      showToast(`外链封面载入失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadCroppedCover = () => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !cropSource) return;
    setIsUploading(true);
    canvas.toBlob(blob => {
      if (!blob) {
        setIsUploading(false);
        showToast('封面裁剪失败，请重新选择图片', 'error');
        return;
      }
      const filename = `${cropSource.file.name.replace(/\.[^.]+$/, '') || 'cover'}-16x9.webp`;
      handleFileUpload(new File([blob], filename, { type: 'image/webp' }));
    }, 'image/webp', 0.9);
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
              <span className="text-emerald-500 text-lg">☁️</span> {mode === 'cover' ? '封面裁剪与上传' : '图床工作台'}
            </h3>
            <button onClick={closeTool} className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm">✕</button>
          </div>

          <div className="p-6 cursor-default bg-white/20 dark:bg-slate-900/20">
            {/* 🌟 模式切换 Tab */}
            {!uploadedUrl && !cropSource && (
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

            {cropSource ? (
              <div className="flex flex-col gap-4" onPointerDown={event => event.stopPropagation()}>
                <canvas ref={cropCanvasRef} width={1600} height={900} className="aspect-video w-full rounded-2xl bg-slate-950 object-cover shadow-inner" />
                <div className="grid gap-3 rounded-2xl bg-white/45 p-4 dark:bg-slate-800/45">
                  <label className="grid grid-cols-[52px_1fr] items-center gap-3 text-[10px] font-bold text-slate-500">
                    缩放
                    <input type="range" min="1" max="3" step="0.01" value={cropSource.zoom} onChange={event => setCropSource({ ...cropSource, zoom: Number(event.target.value) })} />
                  </label>
                  <label className="grid grid-cols-[52px_1fr] items-center gap-3 text-[10px] font-bold text-slate-500">
                    水平
                    <input type="range" min="0" max="100" value={cropSource.x} onChange={event => setCropSource({ ...cropSource, x: Number(event.target.value) })} />
                  </label>
                  <label className="grid grid-cols-[52px_1fr] items-center gap-3 text-[10px] font-bold text-slate-500">
                    垂直
                    <input type="range" min="0" max="100" value={cropSource.y} onChange={event => setCropSource({ ...cropSource, y: Number(event.target.value) })} />
                  </label>
                </div>
                <p className="text-[10px] leading-5 text-slate-500">将按 16:9、1600×900 输出，预览画面就是文章封面的最终取景。</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={clearCropSource} className="rounded-xl bg-white/60 py-2.5 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-800/60 dark:text-slate-200">重新选择</button>
                  <button onClick={uploadCroppedCover} disabled={isUploading} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50">{isUploading ? '上传中…' : '裁剪并上传'}</button>
                </div>
              </div>
            ) : !uploadedUrl ? (
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
                    {isUploading ? '正在载入...' : mode === 'cover' ? '载入并裁剪' : '确认图片链接'}
                  </button>
                  {mode === 'cover' && <p className="text-[10px] leading-5 text-slate-500">外链图片会先安全载入裁剪器，确认 16:9 取景后再上传。</p>}
                </div>
              )
            ) : (
              // 预览与确认插入区
              <div className="flex flex-col gap-4">
                <div className={`${mode === 'cover' ? 'aspect-video' : 'h-36 p-2'} w-full rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-950/50 border border-white/40 dark:border-slate-700/50 flex items-center justify-center shadow-inner group relative`}>
                  <img src={uploadedUrl} alt="preview" className={mode === 'cover' ? 'h-full w-full object-cover' : 'max-w-full max-h-full object-contain rounded-xl drop-shadow-md'} />
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

