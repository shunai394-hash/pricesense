"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isValidEmail } from "@/lib/leadCapture";
import { getCachedLeadEmail, registerPremiumWaitlist, type LeadDiagnosisContext } from "@/lib/leads";

const PREMIUM_OFFER_FEATURES = [
  "単価アップ理由分析",
  "経験年数別ポジション",
  "職種別改善ポイント",
  "交渉戦略",
] as const;

interface PremiumOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosisContext?: LeadDiagnosisContext;
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-accent"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function PremiumOfferModal({
  isOpen,
  onClose,
  diagnosisContext,
}: PremiumOfferModalProps) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(getCachedLeadEmail());
    setError("");
    setIsComplete(false);
  }, [isOpen]);

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
      if (e.key === "Escape" && !isSubmitting) onClose();
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
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim();
      if (!isValidEmail(trimmed)) {
        setError("有効なメールアドレスを入力してください");
        return;
      }

      setError("");
      setIsSubmitting(true);
      try {
        await registerPremiumWaitlist({
          email: trimmed,
          context: diagnosisContext,
        });
        setIsComplete(true);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "登録に失敗しました。時間をおいて再度お試しください。"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, diagnosisContext]
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center overflow-hidden p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={
        isComplete ? "premium-offer-complete-title" : "premium-offer-title"
      }
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
        aria-label="閉じる"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-accent/25 bg-surface-elevated shadow-[0_0_60px_rgba(232,197,71,0.1)]">
        {isComplete ? (
          <>
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
                <svg
                  className="h-7 w-7 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium tracking-widest text-accent">
                登録完了
              </p>
              <h2
                id="premium-offer-complete-title"
                className="mt-2 font-display text-xl font-semibold text-foreground"
              >
                公開通知の登録が完了しました
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Premiumの公開準備が整い次第、ご登録のメールアドレスにご案内します。
              </p>
              <p className="mt-4 rounded-lg border border-border/60 bg-surface/60 px-4 py-3 text-xs leading-relaxed text-muted">
                ※ 現在は決済・購入機能はありません。公開時に改めて内容をご確認いただけます。
              </p>
            </div>
            <footer className="border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
              >
                閉じる
              </button>
            </footer>
          </>
        ) : (
          <>
            <header className="border-b border-border px-6 py-5">
              <p className="text-xs font-medium tracking-widest text-accent">
                PriceSense Premium
              </p>
              <h2
                id="premium-offer-title"
                className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl"
              >
                相場を知るだけでは、単価は上がりません。
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                診断結果をもとに、単価改善に必要な分析と交渉準備を提供する。
              </p>
            </header>

            <div className="px-6 py-5">
              <ul className="space-y-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
                {PREMIUM_OFFER_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-foreground/90"
                  >
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-center text-sm text-muted">
                料金:{" "}
                <span className="font-medium text-foreground/90">
                  Premium公開準備中
                </span>
              </p>
              <p className="mt-1 text-center text-xs text-muted/80">
                価格・提供形式は公開時に正式告知します（参考）
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="premium-offer-email"
                    className="block text-xs font-medium text-muted"
                  >
                    メールアドレス
                  </label>
                  <input
                    id="premium-offer-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="example@email.com"
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 disabled:opacity-50"
                  />
                  {error && (
                    <p className="mt-1.5 text-xs text-accent">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "登録中..." : "公開通知を受け取る"}
                </button>
              </form>

              <p className="mt-3 text-center text-xs text-muted/80">
                通知登録のみ。現在は購入・決済はできません。
              </p>
            </div>

            <footer className="border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full text-center text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                あとで確認する
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
