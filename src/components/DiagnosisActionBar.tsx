"use client";

interface DiagnosisActionBarProps {
  onExportPdf: () => void;
  onOpenNegotiation: () => void;
  isPdfExporting: boolean;
  isDisabled: boolean;
  ctaLabel: string;
}

export function DiagnosisActionBar({
  onExportPdf,
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          id="pdf-export-button"
          onClick={onExportPdf}
          disabled={isDisabled || isPdfExporting}
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
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3"
            />
          </svg>
          {isPdfExporting ? "PDF生成中..." : "診断結果をPDF保存"}
        </button>
        <button
          type="button"
          onClick={onOpenNegotiation}
          disabled={isDisabled}
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
          日単価を入力するとPDF保存・交渉文生成が利用できます
        </p>
      )}
    </section>
  );
}
