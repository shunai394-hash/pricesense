"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { formatYen } from "@/lib/calculator";
import {
  splitNegotiationPreview,
  type NegotiationPack,
  type NegotiationVariantId,
} from "@/lib/negotiation";

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  negotiationPack: NegotiationPack;
  isPremium?: boolean;
  userRate: number;
  targetRate: number;
  annualUpgradeImpact: number;
  onRequestPdfByEmail?: () => void;
  isPdfExporting?: boolean;
  onOpenPremiumPurchase: (source: string) => void;
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

export function NegotiationModal({
  isOpen,
  onClose,
  negotiationPack,
  isPremium = false,
  userRate,
  targetRate,
  annualUpgradeImpact,
  onRequestPdfByEmail,
  isPdfExporting = false,
  onOpenPremiumPurchase,
}: NegotiationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeVariantId, setActiveVariantId] =
    useState<NegotiationVariantId>("formal");
  const [editedBody, setEditedBody] = useState(
    negotiationPack.primary.body
  );
  const [copiedField, setCopiedField] = useState<"subject" | "body" | "all" | null>(
    null
  );

  const activeVariant = useMemo(
    () =>
      negotiationPack.variants.find((variant) => variant.id === activeVariantId) ??
      negotiationPack.variants[0],
    [negotiationPack.variants, activeVariantId]
  );

  const activeResult = activeVariant.result;
  const previewSplit = useMemo(
    () => splitNegotiationPreview(activeResult.body),
    [activeResult.body]
  );
  const rejectionPreview = useMemo(
    () => splitNegotiationPreview(negotiationPack.rejectionResponse),
    [negotiationPack.rejectionResponse]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEditedBody(activeResult.body);
  }, [activeResult.body]);

  const fullText = `件名：${activeResult.subject}\n\n${editedBody}`;

  const handleCopy = useCallback(
    async (field: "subject" | "body" | "all") => {
      if (!isPremium) return;

      const text =
        field === "subject"
          ? activeResult.subject
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
    [isPremium, activeResult.subject, editedBody, fullText]
  );

  const handleOpenPremium = useCallback(
    (source: string) => {
      trackEvent(ANALYTICS_EVENTS.premiumUpgradeClick, { source });
      onOpenPremiumPurchase(source);
    },
    [onOpenPremiumPurchase]
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
              {!isPremium && (
                <p className="mt-1 text-xs text-muted">
                  無料版: サンプル冒頭のみ表示 · コピー不可
                </p>
              )}
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

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted">交渉文パターン</span>
              {!isPremium && (
                <span className="text-[10px] text-muted">Premiumで3パターン</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {negotiationPack.variants.map((variant) => {
                const isLocked = !isPremium && variant.id !== "formal";
                const isActive = activeVariantId === variant.id;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        handleOpenPremium("negotiation_variant");
                        return;
                      }
                      setActiveVariantId(variant.id);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-accent/40 bg-accent/15 text-accent"
                        : "border-border text-muted hover:border-accent/30"
                    }`}
                  >
                    {isLocked && <LockIcon className="h-3.5 w-3.5 text-accent/70" />}
                    {variant.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted">件名</label>
              {isPremium && (
                <button
                  type="button"
                  onClick={() => handleCopy("subject")}
                  className="text-xs text-accent hover:text-accent/80"
                >
                  {copiedField === "subject" ? "コピーしました" : "件名をコピー"}
                </button>
              )}
            </div>
            <div
              className={`rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground ${
                !isPremium ? "select-none" : ""
              }`}
              onCopy={!isPremium ? (e) => e.preventDefault() : undefined}
            >
              {activeResult.subject}
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted">
                {isPremium ? "本文（編集可能）" : "本文サンプル（冒頭のみ）"}
              </label>
              {isPremium && (
                <button
                  type="button"
                  onClick={() => handleCopy("body")}
                  className="text-xs text-accent hover:text-accent/80"
                >
                  {copiedField === "body" ? "コピーしました" : "本文をコピー"}
                </button>
              )}
            </div>

            {isPremium ? (
              <textarea
                id="negotiation-body"
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={12}
                className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 font-sans text-sm leading-relaxed text-foreground/90 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            ) : (
              <div
                className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-muted select-none"
                onCopy={(e) => e.preventDefault()}
              >
                <span className="whitespace-pre-wrap text-foreground/90">
                  {previewSplit.preview}
                </span>
                {previewSplit.isTruncated && (
                  <span className="select-none blur-[3px]">
                    {"\n\n"}
                    {activeResult.body.slice(previewSplit.preview.length)}
                  </span>
                )}
                <p className="mt-3 text-xs text-muted/80">
                  Premiumで全文表示・編集・コピーが可能です
                </p>
              </div>
            )}
          </div>

          <div className="mb-5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              {!isPremium && <LockIcon className="h-4 w-4 text-accent/70" />}
              <p className="text-xs font-medium text-foreground/80">
                断られた場合の返答文
              </p>
            </div>
            {isPremium ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {negotiationPack.rejectionResponse}
              </p>
            ) : (
              <div className="select-none text-sm leading-relaxed text-muted" onCopy={(e) => e.preventDefault()}>
                <span className="text-foreground/80">{rejectionPreview.preview}</span>
                <span className="blur-[3px]">
                  {negotiationPack.rejectionResponse.slice(rejectionPreview.preview.length)}
                </span>
                <p className="mt-2 text-xs text-muted/80">Premiumで全文表示</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-surface/60 px-4 py-3">
            <p className="text-xs font-medium text-foreground/80">交渉のヒント</p>
            <ul className="mt-2 space-y-1.5">
              {activeResult.tips.map((tip) => (
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
            {isPremium
              ? "相場データに基づき自動生成 · 自由に編集してご利用ください"
              : "無料版はサンプル表示のみ · Premiumで全文利用"}
          </p>
          <div className="flex flex-wrap gap-3">
            {onRequestPdfByEmail && (
              <button
                type="button"
                onClick={onRequestPdfByEmail}
                disabled={isPdfExporting}
                className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-5 py-3 text-sm font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/15 disabled:opacity-50"
              >
                {isPdfExporting ? "PDF生成中..." : "PDFを保存する"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-accent/30 hover:text-foreground"
            >
              閉じる
            </button>
            {isPremium ? (
              <button
                type="button"
                onClick={() => handleCopy("all")}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
              >
                {copiedField === "all" ? "コピーしました" : "全文をコピー"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenPremium("negotiation_footer")}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
              >
                Premiumで全文を利用する
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
