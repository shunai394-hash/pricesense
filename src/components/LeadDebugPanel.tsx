"use client";

import { useCallback, useEffect, useState } from "react";
import { formatYen } from "@/lib/calculator";
import { clearCachedLeadRecord, getCachedLeadRecords } from "@/lib/leads/storage";
import type { LeadRecord } from "@/lib/leads/types";

const DEBUG_MODE_ENABLED =
  process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

function formatRate(value: number | undefined): string {
  if (value === undefined) return "—";
  return formatYen(value);
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function LeadRecordCard({ record }: { record: LeadRecord }) {
  const rows = [
    { label: "email", value: record.email },
    { label: "leadSource", value: record.leadSource },
    { label: "categoryName", value: record.categoryName ?? "—" },
    { label: "userRate", value: formatRate(record.userRate) },
    { label: "marketRate", value: formatRate(record.marketRate) },
    { label: "diagnosisLevel", value: record.diagnosisLevel ?? "—" },
    { label: "targetRate", value: formatRate(record.targetRate) },
    { label: "createdAt", value: formatTimestamp(record.createdAt) },
  ];

  return (
    <article className="rounded-lg border border-border/80 bg-surface/60 p-3">
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs"
          >
            <dt className="font-mono text-muted">{row.label}</dt>
            <dd className="break-all text-foreground/90">{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function LeadDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<LeadRecord[]>([]);

  const refreshRecords = useCallback(() => {
    setRecords(getCachedLeadRecords());
  }, []);

  useEffect(() => {
    if (!DEBUG_MODE_ENABLED) return;
    refreshRecords();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "pricesense_lead_context") {
        refreshRecords();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshRecords]);

  if (!DEBUG_MODE_ENABLED) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[120] max-w-[calc(100vw-2rem)]">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            refreshRecords();
            setIsOpen(true);
          }}
          className="rounded-lg border border-accent/40 bg-surface-elevated/95 px-3 py-2 text-xs font-medium text-accent shadow-lg backdrop-blur-sm transition-colors hover:border-accent/60 hover:bg-surface-elevated"
        >
          Lead Debug ({records.length})
        </button>
      ) : (
        <section
          className="w-[min(100vw-2rem,24rem)] rounded-xl border border-accent/30 bg-surface-elevated/95 shadow-[0_0_40px_rgba(232,197,71,0.12)] backdrop-blur-sm"
          aria-label="Lead Debug Panel"
        >
          <header className="flex items-center justify-between border-b border-border/80 px-4 py-3">
            <div>
              <p className="text-xs font-medium tracking-widest text-accent">
                DEV ONLY
              </p>
              <h2 className="text-sm font-semibold text-foreground">
                Lead Debug Panel
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent/30 hover:text-foreground"
              aria-label="パネルを閉じる"
            >
              閉じる
            </button>
          </header>

          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
            <button
              type="button"
              onClick={refreshRecords}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent/30 hover:text-foreground"
            >
              更新
            </button>
            <button
              type="button"
              onClick={() => {
                clearCachedLeadRecord();
                refreshRecords();
              }}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent/30 hover:text-foreground"
            >
              クリア
            </button>
            <span className="ml-auto text-xs text-muted">
              {records.length} 件
            </span>
          </div>

          <div className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto p-4">
            {records.length === 0 ? (
              <p className="text-xs text-muted">
                pricesense_lead_context に保存済みリードはありません。
              </p>
            ) : (
              [...records].reverse().map((record, index) => (
                <LeadRecordCard
                  key={`${record.createdAt}-${record.email}-${index}`}
                  record={record}
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
