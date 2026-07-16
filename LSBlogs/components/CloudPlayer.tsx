"use client";

import { Disc3, Music2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMusic } from "./MusicProvider";

const formatTime = (time: number) => {
  if (!time || Number.isNaN(time)) return "00:00";
  const minutes = Math.floor(time / 60).toString().padStart(2, "0");
  const seconds = Math.floor(time % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function CloudPlayer() {
  const {
    playlist,
    currentSong,
    isPlaying,
    progress,
    currentTime,
    duration,
    currentLyric,
    isLoading,
    togglePlay,
    nextSong,
    prevSong,
    handleSeek,
  } = useMusic();

  if (isLoading) {
    return (
      <div className="glass-panel flex min-h-[290px] items-center justify-center p-6" aria-live="polite">
        <div className="text-center">
          <Disc3 className="mx-auto size-9 animate-spin text-[var(--accent)]" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-[var(--foreground)]">正在连接音乐</p>
        </div>
      </div>
    );
  }

  if (playlist.length === 0 || !currentSong) {
    return (
      <div className="glass-panel flex min-h-[290px] flex-col items-center justify-center p-6 text-center">
        <Music2 className="size-9 text-[var(--accent)]" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">音乐稍后抵达</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">请检查歌单配置或网络连接。</p>
      </div>
    );
  }

  return (
    <div className="glass-panel flex min-h-[290px] flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Now playing</p>
          <Link href="/music" className="mt-1 block text-xl font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
            云端音乐
          </Link>
        </div>
        <Disc3
          className={`size-6 text-[var(--muted-foreground)] ${isPlaying ? "animate-spin [animation-duration:5s]" : ""}`}
          aria-hidden="true"
        />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className={`relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-white/35 shadow-lg ${isPlaying ? "animate-spin [animation-duration:8s]" : ""}`}>
          <Image src={currentSong.cover} alt="" fill sizes="64px" className="object-cover" unoptimized />
          <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/15 bg-white/85" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--foreground)]">{currentSong.title}</p>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">{currentSong.artist}</p>
        </div>
      </div>

      <p className="mt-5 min-h-10 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">
        {currentLyric || "让旋律陪你读完这一页。"}
      </p>

      <div className="mt-auto pt-4">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          aria-label="播放进度"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--border)]"
          style={{ background: `linear-gradient(to right, var(--accent) ${progress}%, var(--border) ${progress}%)` }}
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--muted-foreground)]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-5">
          <button type="button" onClick={prevSong} className="icon-button" aria-label="上一首">
            <SkipBack className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="flex size-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(201,68,64,0.26)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? <Pause className="size-4" aria-hidden="true" /> : <Play className="ml-0.5 size-4" aria-hidden="true" />}
          </button>
          <button type="button" onClick={nextSong} className="icon-button" aria-label="下一首">
            <SkipForward className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
