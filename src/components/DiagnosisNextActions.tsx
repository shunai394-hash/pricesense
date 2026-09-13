"use client";

import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import type { DiagnosisNextAction } from "@/lib/nextActions";

interface DiagnosisNextActionsProps {
  actions: DiagnosisNextAction[];
  onRaiseCurrent: () => void;
}

function ExternalIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

export function DiagnosisNextActions({
  actions,
  onRaiseCurrent,
}: DiagnosisNextActionsProps) {
  const recommended = actions.find((action) => action.recommended);

  return (
    <section
      id="next-actions"
      className="scroll-mt-24 rounded-xl border border-accent/30 bg-surface-elevated/80 p-4 sm:p-5"
      aria-labelledby="next-actions-title"
    >
      <p className="text-xs font-medium tracking-widest text-accent">
        次の行動
      </p>
      <h3
        id="next-actions-title"
        className="mt-1 text-base font-semibold text-foreground sm:text-lg"
      >
        あなたの単価を上げるなら、次にこの3つ
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {recommended
          ? "診断結果から見た、今の単価を上げるための次の一手です。"
          : "案件・転職・今の仕事での交渉。状況に合うものから進められます。"}
      </p>

      <ol className="mt-4 space-y-3">
        {actions.map((action, index) => (
          <li
            key={action.id}
            className={`rounded-xl border px-3 py-3 sm:px-4 ${
              action.recommended
                ? "border-accent/35 bg-accent/5"
                : "border-border/80 bg-surface/40"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted">
                    {index + 1}.
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {action.title}
                  </p>
                  {action.recommended && (
                    <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      診断からのおすすめ
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {action.reason}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                {action.kind === "premium" ? (
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent(ANALYTICS_EVENTS.nextActionClick, {
                        action: action.id,
                        kind: action.kind,
                      });
                      onRaiseCurrent();
                    }}
                    className="inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-background transition-colors hover:bg-accent/90"
                  >
                    {action.ctaLabel}
                  </button>
                ) : (
                  action.links?.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                      onClick={() => {
                        trackEvent(ANALYTICS_EVENTS.nextActionClick, {
                          action: action.id,
                          kind: action.kind,
                          partner: link.partnerName,
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/15"
                    >
                      {link.label}
                      <ExternalIcon />
                    </a>
                  ))
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
