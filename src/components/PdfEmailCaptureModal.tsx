"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isValidEmail, PDF_LEAD_BENEFITS } from "@/lib/leadCapture";
import { getCachedLeadEmail, type LeadRegistrationResult } from "@/lib/leads";
import type { PdfCompleteInsight } from "@/lib/calculator";

interface PdfEmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<LeadRegistrationResult>;
  isSubmitting: boolean;
  onOpenNegotiation: () => void;
  onViewPremiumReport: () => void;
  insight: PdfCompleteInsight | null;
}

function getDeliveryMessage(result: LeadRegistrationResult): string {
  if (result.deliveryMode === "email") {
    return "登録メールアドレスにPDFをお送りしました。";
  }

  return "レポートはお使いの端末にダウンロード済みです。";
}

export function PdfEmailCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  onOpenNegotiation,
  onViewPremiumReport,
  insight,
}: PdfEmailCaptureModalProps) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [registrationResult, setRegistrationResult] =
    useState<LeadRegistrationResult | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(getCachedLeadEmail());
    setError("");
    setIsComplete(false);
    setRegistrationResult(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("有効なメールアドレスを入力してください");
      return;
    }

    setError("");
    try {
      const result = await onSubmit(trimmed);
      setRegistrationResult(result);
      setIsComplete(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "PDFの保存に失敗しました。時間をおいて再度お試しください。"
      );
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center overflow-hidden p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={
        isComplete ? "pdf-email-complete-title" : "pdf-email-modal-title"
      }
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
        aria-label="閉じる"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-accent/25 bg-surface-elevated shadow-[0_0_60px_rgba(232,197,71,0.1)]">
        {isComplete && registrationResult ? (
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
                id="pdf-email-complete-title"
                className="mt-2 font-display text-xl font-semibold text-foreground"
              >
                診断結果PDFを保存しました
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                メールアドレスを登録しました。今後、単価改善に役立つ情報をお届けします。
              </p>

              {insight && (
                <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-left">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {insight.headline}
                  </p>
                  <dl className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                    {insight.details.map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs"
                      >
                        <dt className="text-muted">{item.label}</dt>
                        <dd className="font-medium text-foreground/90">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-muted/80">
                    ※ 相場データは参考値です
                  </p>
                </div>
              )}

              <p className="mt-4 rounded-lg border border-border/60 bg-surface/60 px-4 py-3 text-xs leading-relaxed text-muted">
                {getDeliveryMessage(registrationResult)}
              </p>
            </div>

            <section
              className="border-t border-border px-6 py-4"
              aria-label="次にできること"
            >
              <p className="mb-3 text-xs font-medium text-muted">
                次にできること
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onOpenNegotiation}
                  className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
                >
                  この単価で交渉する文章を作成する
                </button>
                <button
                  type="button"
                  onClick={onViewPremiumReport}
                  className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm font-medium text-foreground/90 transition-colors hover:border-accent/30 hover:bg-surface"
                >
                  プレミアム単価改善レポートを見る
                </button>
              </div>
            </section>

            <footer className="border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs text-muted transition-colors hover:text-foreground"
              >
                閉じる
              </button>
            </footer>
          </>
        ) : (
          <>
            <header className="border-b border-border px-6 py-5">
              <p className="text-xs font-medium tracking-widest text-accent">
                無料レポート保存
              </p>
              <h2
                id="pdf-email-modal-title"
                className="mt-1 font-display text-xl font-semibold text-foreground"
              >
                診断結果PDFを保存
              </h2>
              <p className="mt-2 text-sm text-muted">
                診断は登録不要のまま。PDF保存時にメールアドレスを登録すると、端末にPDFを保存し、単価改善の情報もお届けします。
              </p>
            </header>

            <div className="px-6 py-5">
              <ul className="mb-5 space-y-2">
                {PDF_LEAD_BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-2 text-sm text-foreground/90"
                  >
                    <svg
                      className="h-4 w-4 shrink-0 text-accent"
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
                    {benefit}
                  </li>
                ))}
              </ul>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="pdf-lead-email"
                    className="block text-xs font-medium text-muted"
                  >
                    メールアドレス
                  </label>
                  <input
                    id="pdf-lead-email"
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
                  {isSubmitting ? "PDFを保存中..." : "登録してPDFを保存"}
                </button>
              </form>

              <p className="mt-3 text-center text-xs text-muted/80">
                診断自体は引き続き登録不要です
              </p>
            </div>

            <footer className="border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full text-center text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                あとで保存する
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
