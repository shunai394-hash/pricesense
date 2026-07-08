"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatYen } from "@/lib/calculator";

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  body: string;
  tips: string[];
  userRate: number;
  targetRate: number;
  annualUpgradeImpact: number;
  tone: "formal" | "direct";
  onToneChange: (tone: "formal" | "direct") => void;
  onExportPdf?: () => void;
  isPdfExporting?: boolean;
}

export function NegotiationModal({
  isOpen,
  onClose,
  subject,
  body,
  tips,
  userRate,
  targetRate,
  annualUpgradeImpact,
  tone,
  onToneChange,
  onExportPdf,
  isPdfExporting = false,
}: NegotiationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [editedBody, setEditedBody] = useState(body);
  const [copiedField, setCopiedField] = useState<"subject" | "body" | "all" | null>(
    null
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEditedBody(body);
  }, [body]);

  const fullText = `件名：${subject}\n\n${editedBody}`;

  const handleCopy = useCallback(
    async (field: "subject" | "body" | "all") => {
      const text =
        field === "subject"
          ? subject
          : field === "body"
            ? editedBody
            : fullText;

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    },
    [subject, editedBody, fullText]
  );

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const { overflow: bodyOverflow, position, top, width } = document.body.style;
    const htmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="negotiation-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="閉じる"
      />

      <div className="relative z-10 flex max-h-[min(90vh,100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-accent/20 bg-surface-elevated shadow-[0_0_60px_rgba(232,197,71,0.08)]">
        <header className="shrink-0 border-b border-border px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest text-accent">
                交渉文ジェネレーター
              </p>
              <h2
                id="negotiation-modal-title"
                className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl"
              >
                値上げ交渉文
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-accent/30 hover:text-foreground"
              aria-label="閉じる"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="mb-5 grid gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">現在の日単価</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {formatYen(userRate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">交渉目標単価</p>
              <p className="mt-0.5 text-sm font-semibold text-accent">
                {formatYen(targetRate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">改定後の年間増収（推定）</p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                +{formatYen(annualUpgradeImpact)}
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">文体：</span>
            <button
              type="button"
              onClick={() => onToneChange("formal")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                tone === "formal"
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border text-muted hover:border-accent/30"
              }`}
            >
              フォーマル
            </button>
            <button
              type="button"
              onClick={() => onToneChange("direct")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                tone === "direct"
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border text-muted hover:border-accent/30"
              }`}
            >
              ややカジュアル
            </button>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted">件名</label>
              <button
                type="button"
                onClick={() => handleCopy("subject")}
                className="text-xs text-accent hover:text-accent/80"
              >
                {copiedField === "subject" ? "コピーしました" : "件名をコピー"}
              </button>
            </div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
              {subject}
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="negotiation-body"
                className="text-xs font-medium text-muted"
              >
                本文（編集可能）
              </label>
              <button
                type="button"
                onClick={() => handleCopy("body")}
                className="text-xs text-accent hover:text-accent/80"
              >
                {copiedField === "body" ? "コピーしました" : "本文をコピー"}
              </button>
            </div>
            <textarea
              id="negotiation-body"
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={12}
              className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 font-sans text-sm leading-relaxed text-foreground/90 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div className="rounded-xl border border-border/80 bg-surface/60 px-4 py-3">
            <p className="text-xs font-medium text-foreground/80">
              交渉のヒント
            </p>
            <ul className="mt-2 space-y-1.5">
              {tips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-xs text-muted"
                >
                  <span className="mt-0.5 shrink-0 text-accent">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            相場データに基づき自動生成 · 自由に編集してご利用ください
          </p>
          <div className="flex flex-wrap gap-3">
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                disabled={isPdfExporting}
                className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-5 py-3 text-sm font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/15 disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3"
                  />
                </svg>
                {isPdfExporting ? "PDF生成中..." : "PDF保存"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-accent/30 hover:text-foreground"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={() => handleCopy("all")}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
            >
              {copiedField === "all" ? "コピーしました" : "全文をコピー"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
