import { motion } from "framer-motion";
import { GitBranch, MessageSquareText, Save } from "lucide-react";

interface CommentSectionProps {
  formData: any;
  handleUpdate: (field: string, value: any) => void;
  pushToQueue: (label: string, key?: string, value?: any) => void;
}

export default function CommentSection({ formData, handleUpdate, pushToQueue }: CommentSectionProps) {
  const comments = formData.githubComments || {
    repo: "",
    label: "blog-comment",
  };

  const updateComments = (key: "repo" | "label", value: string) => {
    const next = { ...comments, [key]: value };
    handleUpdate("githubComments", next);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-[40px] border border-white/50 bg-white/40 p-8 shadow-2xl backdrop-blur-2xl dark:border-slate-800/50 dark:bg-slate-900/40"
    >
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-black text-slate-800 dark:text-white">
            <GitBranch className="text-[#ff5a52]" /> GitHub Issues 评论
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            使用 Utterances 连接公开仓库，不需要在博客中保存 OAuth 密钥。
          </p>
        </div>
        <MessageSquareText className="shrink-0 text-slate-300 dark:text-slate-600" />
      </div>

      <div className="grid gap-6">
        <label className="grid gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          评论仓库（owner/repo）
          <input
            value={comments.repo || ""}
            onChange={(event) => updateComments("repo", event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#ff5a52] dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
          />
        </label>

        <label className="grid gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Issue 标签
          <input
            value={comments.label || ""}
            onChange={(event) => updateComments("label", event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#ff5a52] dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
          />
        </label>

        <button
          onClick={() => pushToQueue("GitHub Issues 评论")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#ff5a52] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#ff5a52]/25 transition hover:-translate-y-0.5 hover:bg-[#ff443b]"
        >
          <Save size={16} /> 暂存评论配置
        </button>
      </div>
    </motion.section>
  );
}
