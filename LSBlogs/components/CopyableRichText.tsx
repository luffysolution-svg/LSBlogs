"use client";

import { useEffect, useMemo, useRef } from 'react';

interface CopyableRichTextProps {
  html: string;
  className: string;
  id?: string;
}

export function addCopyButtons(html: string): string {
  return html.replace(
    /<pre(?:\s[^>]*)?>/gi,
    (openingTag) => `${openingTag}<button type="button" class="code-copy-button" data-code-copy aria-label="复制代码" aria-live="polite">复制</button>`,
  );
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('浏览器拒绝了剪贴板访问');
}

export default function CopyableRichText({ html, className, id }: CopyableRichTextProps) {
  const decoratedHtml = useMemo(() => addCopyButtons(html), [html]);
  const resetTimerRef = useRef<number | null>(null);
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
  }, []);

  const resetActiveButton = () => {
    if (!activeButtonRef.current) return;
    activeButtonRef.current.textContent = '复制';
    delete activeButtonRef.current.dataset.copyState;
    activeButtonRef.current = null;
  };

  const handleClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button[data-code-copy]');
    if (!button || !event.currentTarget.contains(button)) return;

    event.preventDefault();
    const code = button.closest('pre')?.querySelector('code');
    if (!code) return;

    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetActiveButton();
    activeButtonRef.current = button;

    try {
      await copyText(code.textContent || '');
      button.textContent = '已复制';
      button.dataset.copyState = 'success';
    } catch {
      button.textContent = '复制失败';
      button.dataset.copyState = 'error';
    }

    resetTimerRef.current = window.setTimeout(resetActiveButton, 1800);
  };

  return (
    <>
      <style>{`
        .copyable-rich-text pre {
          position: relative !important;
          padding-top: 3.6rem !important;
        }
        .copyable-rich-text .code-copy-button {
          position: absolute;
          top: 0.85rem;
          right: 0.85rem;
          z-index: 2;
          margin: 0 !important;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 0.65rem;
          background: rgba(15, 23, 42, 0.72);
          padding: 0.45rem 0.75rem;
          color: rgba(255, 255, 255, 0.82);
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
        }
        .copyable-rich-text .code-copy-button:hover {
          border-color: rgba(129, 140, 248, 0.65);
          background: rgba(79, 70, 229, 0.82);
          color: white;
        }
        .copyable-rich-text .code-copy-button[data-copy-state="success"] {
          border-color: rgba(52, 211, 153, 0.65);
          background: rgba(5, 150, 105, 0.82);
          color: white;
        }
        .copyable-rich-text .code-copy-button[data-copy-state="error"] {
          border-color: rgba(248, 113, 113, 0.65);
          background: rgba(220, 38, 38, 0.82);
          color: white;
        }
      `}</style>
      <div
        id={id}
        className={`copyable-rich-text ${className}`}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: decoratedHtml }}
      />
    </>
  );
}
