"use client";

import { useEffect } from "react";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import type { DiagnosisNextAction, NextMovePlan } from "@/lib/nextActions";

interface DiagnosisNextActionsProps {
  plan: NextMovePlan;
  onRaiseCurrent: () => void;
  categoryId?: string;
  diagnosisLevel?: string;
}

function ExternalIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

function funnelParams(categoryId?: string, diagnosisLevel?: string) {
  return {
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(diagnosisLevel ? { diagnosis_level: diagnosisLevel } : {}),
  };
}

function trackAction(
  action: DiagnosisNextAction,
  placement: "primary" | "alternative",
  categoryId?: string,
  diagnosisLevel?: string,
  partner?: string
) {
  const shared = {
    action: action.id,
    kind: action.kind,
    placement,
    ...funnelParams(categoryId, diagnosisLevel),
    ...(partner ? { partner } : {}),
  };

  trackEvent(ANALYTICS_EVENTS.nextActionClick, shared);

  if (action.kind === "affiliate") {
    trackEvent(ANALYTICS_EVENTS.affiliateClick, shared);
  }
}

function ActionCtas({
  action,
  emphasized,
  placement,
  onRaiseCurrent,
  categoryId,
  diagnosisLevel,
}: {
  action: DiagnosisNextAction;
  emphasized: boolean;
  placement: "primary" | "alternative";
  onRaiseCurrent: () => void;
  categoryId?: string;
  diagnosisLevel?: string;
}) {
  const buttonClass = emphasized
    ? "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90 sm:w-auto"
    : "inline-flex items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/15";

  if (action.kind === "premium") {
    return (
      <button
        type="button"
        onClick={() => {
          trackAction(action, placement, categoryId, diagnosisLevel);
          onRaiseCurrent();
        }}
        className={buttonClass}
      >
        {action.ctaLabel}
      </button>
    );
  }

  const primaryLink = action.links?.[0];
  if (!primaryLink) return null;

  return (
    <a
      href={primaryLink.href}
      rel="nofollow noopener noreferrer"
      target="_blank"
      onClick={() =>
        trackAction(
          action,
          placement,
          categoryId,
          diagnosisLevel,
          primaryLink.partnerName
        )
      }
      className={buttonClass}
    >
      {emphasized ? action.ctaLabel : primaryLink.label}
      <ExternalIcon />
    </a>
  );
}

export function DiagnosisNextActions({
  plan,
  onRaiseCurrent,
  categoryId,
  diagnosisLevel,
}: DiagnosisNextActionsProps) {
  const { primary, alternatives } = plan;

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.nextActionView, {
      primary_action: primary.id,
      primary_kind: primary.kind,
      ...funnelParams(categoryId, diagnosisLevel),
    });
  }, [primary.id, primary.kind, categoryId, diagnosisLevel]);

  return (
    <section
      id="next-actions"
      className="scroll-mt-24 space-y-4"
      aria-labelledby="next-actions-title"
    >
      <article className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/[0.12] via-surface-elevated/90 to-surface/70 p-5 sm:p-6">
        <p className="text-xs font-medium tracking-widest text-accent">
          あなたの次の一手
        </p>
        <h3
          id="next-actions-title"
          className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl"
        >
          {primary.headline}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          {primary.reason}
        </p>
        <div className="mt-5">
          <ActionCtas
            action={primary}
            emphasized
            placement="primary"
            onRaiseCurrent={onRaiseCurrent}
            categoryId={categoryId}
            diagnosisLevel={diagnosisLevel}
          />
        </div>
      </article>

      {alternatives.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-surface/40 p-4">
          <p className="text-xs font-medium text-muted">他の選択肢</p>
          <ul className="mt-3 space-y-3">
            {alternatives.map((action) => (
              <li
                key={action.id}
                className="flex flex-col gap-2 border-t border-border/50 pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 sm:pr-4">
                  <p className="text-sm font-semibold text-foreground">
                    {action.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {action.reason}
                  </p>
                </div>
                <div className="shrink-0">
                  <ActionCtas
                    action={action}
                    emphasized={false}
                    placement="alternative"
                    onRaiseCurrent={onRaiseCurrent}
                    categoryId={categoryId}
                    diagnosisLevel={diagnosisLevel}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
