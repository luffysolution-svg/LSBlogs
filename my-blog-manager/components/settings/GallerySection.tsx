"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Cloud, Code2, Save, TestTube2 } from 'lucide-react';
import { useToast } from '../ToastProvider';

type Provider = 'lsky' | 'tencent' | 'aliyun' | 'github';
type ProviderValues = Record<string, string>;

type PicBedConfig = {
  provider: Provider;
  pathPrefix: string;
  lsky: ProviderValues;
  tencent: ProviderValues;
  aliyun: ProviderValues;
  github: ProviderValues;
  hasSecrets?: Record<string, Record<string, boolean>>;
};

const EMPTY_CONFIG: PicBedConfig = {
  provider: 'lsky',
  pathPrefix: 'uploads',
  lsky: { url: '', token: '' },
  tencent: { secretId: '', secretKey: '', region: 'ap-guangzhou', bucket: '', domain: '' },
  aliyun: { accessKeyId: '', accessKeySecret: '', endpoint: 'oss-cn-hangzhou.aliyuncs.com', bucket: '', domain: '' },
  github: { token: '', owner: '', repo: '', branch: 'main', domain: '' },
};

const PROVIDERS: Array<{ id: Provider; label: string; note: string }> = [
  { id: 'lsky', label: 'Lsky Pro', note: '现有兰空图床 API' },
  { id: 'tencent', label: '腾讯云 COS', note: 'SecretId / SecretKey' },
  { id: 'aliyun', label: '阿里云 OSS', note: 'AccessKey 直传' },
  { id: 'github', label: 'GitHub', note: 'Contents API 图床' },
];

async function getApiBase() {
  const response = await fetch(`/backend_config.json?t=${Date.now()}`);
  const data = await response.json();
  return `http://127.0.0.1:${data.api_port}`;
}

export default function GallerySection() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<PicBedConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastResult, setLastResult] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const apiBase = await getApiBase();
        const response = await fetch(`${apiBase}/api/picbed/config`);
        const data = await response.json();
        if (data.success) setConfig(data.data);
      } catch {
        showToast('无法读取本地图床配置', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [showToast]);

  const updateProvider = (field: string, value: string) => {
    setConfig(current => ({
      ...current,
      [current.provider]: { ...current[current.provider], [field]: value },
    }));
  };

  const request = async (path: 'config' | 'test') => {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/api/picbed/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  };

  const testConnection = async () => {
    setIsTesting(true);
    setLastResult('');
    try {
      const data = await request('test');
      setLastResult(data.message);
      showToast(data.message, data.success ? 'success' : 'error');
    } catch {
      showToast('图床连接测试请求失败', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const data = await request('config');
      if (data.success && data.data) setConfig(data.data);
      showToast(data.message, data.success ? 'success' : 'error');
    } catch {
      showToast('图床配置保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const secretPlaceholder = (field: string) =>
    config.hasSecrets?.[config.provider]?.[field] ? '已保存在本机，留空保持不变' : '请输入密钥';

  const input = (label: string, field: string, options?: { secret?: boolean; placeholder?: string }) => (
    <label className="block">
      <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <input
        type={options?.secret ? 'password' : 'text'}
        value={config[config.provider][field] || ''}
        placeholder={options?.secret ? secretPlaceholder(field) : options?.placeholder}
        onChange={event => updateProvider(field, event.target.value)}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
      />
    </label>
  );

  return (
    <motion.section initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="rounded-[40px] border border-white/50 bg-white/40 p-8 shadow-2xl backdrop-blur-2xl dark:border-slate-800/50 dark:bg-slate-900/40">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500"><Cloud size={24} /></div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">多云图床引擎</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">密钥只写入被 Git 忽略的 manager_data，不会进入站点配置或前端包。</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PROVIDERS.map(provider => (
          <button
            key={provider.id}
            type="button"
            onClick={() => setConfig(current => ({ ...current, provider: provider.id }))}
            className={`rounded-2xl border p-4 text-left transition ${config.provider === provider.id ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'border-slate-200/70 bg-white/40 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/30'}`}
          >
            <div className="flex items-center gap-2 font-black text-slate-800 dark:text-white">
              {provider.id === 'github' ? <Code2 size={16} /> : <Cloud size={16} />}{provider.label}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{provider.note}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {config.provider === 'lsky' && <>
          {input('API 地址', 'url', { placeholder: 'https://pic.example.com' })}
          {input('Bearer Token', 'token', { secret: true })}
        </>}
        {config.provider === 'tencent' && <>
          {input('SecretId', 'secretId', { secret: true })}
          {input('SecretKey', 'secretKey', { secret: true })}
          {input('地域 Region', 'region', { placeholder: 'ap-guangzhou' })}
          {input('Bucket（含 APPID）', 'bucket', { placeholder: 'example-1250000000' })}
          {input('自定义域名（可选）', 'domain', { placeholder: 'https://img.example.com' })}
        </>}
        {config.provider === 'aliyun' && <>
          {input('AccessKey ID', 'accessKeyId', { secret: true })}
          {input('AccessKey Secret', 'accessKeySecret', { secret: true })}
          {input('Endpoint', 'endpoint', { placeholder: 'oss-cn-hangzhou.aliyuncs.com' })}
          {input('Bucket', 'bucket')}
          {input('自定义域名（可选）', 'domain', { placeholder: 'https://img.example.com' })}
        </>}
        {config.provider === 'github' && <>
          {input('Personal Access Token', 'token', { secret: true })}
          {input('仓库所有者', 'owner', { placeholder: 'username' })}
          {input('仓库名称', 'repo', { placeholder: 'image-hosting' })}
          {input('分支', 'branch', { placeholder: 'main' })}
          {input('CDN / 自定义域名（可选）', 'domain', { placeholder: 'https://cdn.jsdelivr.net/gh/user/repo@main' })}
        </>}
      </div>

      {config.provider !== 'lsky' && (
        <label className="mt-5 block max-w-xl">
          <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-400">对象路径前缀</span>
          <input value={config.pathPrefix} onChange={event => setConfig(current => ({ ...current, pathPrefix: event.target.value }))} placeholder="uploads" className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200" />
        </label>
      )}

      <p className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        云存储 Bucket 或 GitHub 仓库需要允许公开读取图片；建议使用最小权限密钥，并限制到指定 Bucket/仓库。
      </p>

      {lastResult && <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-300"><CheckCircle2 size={15} />{lastResult}</p>}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={testConnection} disabled={isTesting || isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3.5 text-xs font-black text-white transition hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-700"><TestTube2 size={16} />{isTesting ? '测试中…' : '测试当前配置'}</button>
        <button type="button" onClick={saveConfig} disabled={isSaving || isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 disabled:opacity-50"><Save size={16} />{isSaving ? '保存中…' : '保存到本机'}</button>
      </div>
    </motion.section>
  );
}
