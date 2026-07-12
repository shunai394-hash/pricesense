"use client";

import { PDF_LEAD_BENEFITS } from "@/lib/leadCapture";

interface DiagnosisActionBarProps {
  onRequestPdfByEmail: () => void;
  onOpenNegotiation: () => void;
  isPdfExporting: boolean;
  isDisabled: boolean;
  ctaLabel: string;
}

export function DiagnosisActionBar({
  onRequestPdfByEmail,
  onOpenNegotiation,
  isPdfExporting,
  isDisabled,
  ctaLabel,
}: DiagnosisActionBarProps) {
  return (
    <section
      id="diagnosis-actions"
      className="rounded-xl border border-accent/30 bg-surface-elevated/80 p-4 sm:p-5"
      aria-label="診断アクション"
    >
      <p className="mb-3 text-xs font-medium text-accent">診断結果アクション</p>

      <ul className="mb-4 space-y-1.5 rounded-lg border border-border/60 bg-surface/40 px-3 py-2.5">
        {PDF_LEAD_BENEFITS.map((benefit) => (
          <li
            key={benefit}
            className="flex items-center gap-2 text-xs text-muted"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0 text-accent"
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          id="pdf-export-button"
          onClick={onRequestPdfByEmail}
          disabled={isDisabled || isPdfExporting}
          aria-busy={isPdfExporting}
          aria-label={
            isPdfExporting
              ? "PDFを生成中"
              : "診断結果PDFを保存する"
          }
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-accent/40 bg-accent/10 px-5 py-3.5 text-sm font-semibold text-accent transition-all hover:border-accent/60 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          {isPdfExporting
            ? "PDF生成中..."
            : "診断結果PDFを保存する"}
        </button>
        <button
          type="button"
          onClick={onOpenNegotiation}
          disabled={isDisabled}
          aria-label={isDisabled ? "交渉文生成（日単価入力後に利用可能）" : ctaLabel}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          {ctaLabel}
        </button>
      </div>
      {isDisabled && (
        <p className="mt-2 text-center text-xs text-muted">
          日単価を入力するとPDF保存・交渉文サンプルが利用できます
        </p>
      )}
    </section>
  );
}
