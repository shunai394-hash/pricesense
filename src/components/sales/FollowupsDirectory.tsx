"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  TableWrap,
  Td,
  Th,
  UnauthorizedState,
} from "@/components/ui/primitives";
import { useSalesWorkspace } from "@/hooks/useSalesWorkspace";
import type { FollowupBucket } from "@/lib/sales/workspace-ui";
import {
  FOLLOWUP_BUCKET_LABEL,
  formatUtc,
  leadDisplayName,
} from "@/lib/sales/workspace-ui";

const BUCKETS: FollowupBucket[] = [
  "today",
  "overdue",
  "upcoming",
  "stopped",
  "done",
];

export function FollowupsDirectory() {
  const {
    token,
    setToken,
    loading,
    error,
    unauthorized,
    workspace,
    load,
  } = useSalesWorkspace();
  const [bucket, setBucket] = useState<FollowupBucket | "all">("all");

  const followups = useMemo(() => workspace?.followups ?? [], [workspace]);
  const counts = useMemo(() => {
    const next: Record<FollowupBucket, number> = {
      today: 0,
      overdue: 0,
      upcoming: 0,
      stopped: 0,
      done: 0,
    };
    for (const item of followups) {
      next[item.bucket] += 1;
    }
    return next;
  }, [followups]);

  const filtered =
    bucket === "all"
      ? followups
      : followups.filter((item) => item.bucket === bucket);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="Follow-ups"
        description="期限到来の確認と停止状態を管理します。外部メールは自動送信しません。"
      />

      <AdminSessionBar
        token={token}
        onTokenChange={setToken}
        onSubmit={() => void load()}
        loading={loading}
      />

      {error ? <div className="mb-6"><ErrorState message={error} /></div> : null}
      {loading ? <div className="mb-6"><LoadingState /></div> : null}
      {!loading && unauthorized && !workspace ? <UnauthorizedState /> : null}

      {workspace ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBucket("all")}
              className={`rounded-full border px-3 py-1 text-xs ${
                bucket === "all"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted"
              }`}
            >
              すべて ({followups.length})
            </button>
            {BUCKETS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setBucket(item)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  bucket === item
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted"
                }`}
              >
                {FOLLOWUP_BUCKET_LABEL[item]} ({counts[item]})
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="このカテゴリのフォローアップはありません"
              description="期限や停止状態があるLeadのみを表示します。"
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>カテゴリ</Th>
                  <Th>Lead</Th>
                  <Th>Source</Th>
                  <Th>Status</Th>
                  <Th>Next Follow-up</Th>
                  <Th>Last contacted</Th>
                  <Th>Stop reason</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={`${item.source}-${item.leadId}`} className="hover:bg-surface">
                    <Td>
                      <Badge
                        tone={
                          item.bucket === "overdue"
                            ? "danger"
                            : item.bucket === "today"
                              ? "accent"
                              : "muted"
                        }
                      >
                        {FOLLOWUP_BUCKET_LABEL[item.bucket]}
                      </Badge>
                    </Td>
                    <Td>
                      <Link
                        href={
                          item.dealId
                            ? `/app/deals/${item.dealId}`
                            : `/app/leads/${item.leadId}`
                        }
                        className="text-accent"
                      >
                        {leadDisplayName({
                          categoryName: item.categoryName,
                          email: item.email,
                          leadId: item.leadId,
                        })}
                      </Link>
                    </Td>
                    <Td>{item.source === "deal" ? "Deal" : "Lead"}</Td>
                    <Td>{item.status || "—"}</Td>
                    <Td>{formatUtc(item.nextFollowupAt)}</Td>
                    <Td>{formatUtc(item.lastContactedAt)}</Td>
                    <Td>{item.stopReason || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      ) : null}
    </div>
  );
}
