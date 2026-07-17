"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/cms/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.authenticated) router.replace("/admin");
      });
  }, [router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const response = await fetch("/api/cms/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      router.replace("/admin");
      router.refresh();
      return;
    }
    setMessage(data.message || "登录失败");
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen grid place-items-center px-5 bg-[radial-gradient(circle_at_top,#e0e7ff_0,transparent_42%)] dark:bg-[radial-gradient(circle_at_top,#312e81_0,transparent_42%)]">
      <form onSubmit={login} className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/85">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
          <Sparkles size={26} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-500">LSBlogs Cloud CMS</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">登录管理台</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">使用部署时设置的管理密码。在电脑、平板和手机上，功能与数据保持一致。</p>
        <label className="mt-7 block text-xs font-black text-slate-600 dark:text-slate-300" htmlFor="cms-password">管理密码</label>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
          <LockKeyhole size={18} className="text-slate-400" />
          <input id="cms-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-13 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none dark:text-white" required autoFocus />
        </div>
        {message && <p role="alert" className="mt-3 text-sm font-bold text-red-500">{message}</p>}
        <button type="submit" disabled={submitting} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 disabled:opacity-50">
          <LogIn size={18} />{submitting ? "正在登录…" : "进入管理台"}
        </button>
      </form>
    </main>
  );
}
