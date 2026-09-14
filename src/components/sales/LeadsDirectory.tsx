"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  AiHumanFlow,
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
import type { LeadTemperature } from "@/lib/ai/revops";
import {
  dealStatusLabel,
  formatUtc,
  leadDisplayName,
  TEMPERATURE_LABEL,
} from "@/lib/sales/workspace-ui";

const TEMP_FILTERS: Array<LeadTemperature | "all"> = [
  "all",
  "hot",
  "warm",
  "nurture",
];

export function LeadsDirectory() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const {
    token,
    setToken,
    loading,
    error,
    unauthorized,
    workspace,
    load,
  } = useSalesWorkspace();
  const [query, setQuery] = useState(initialQuery);
  const [temperature, setTemperature] = useState<LeadTemperature | "all">(
    "all"
  );
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"score" | "created">("score");

  const leads = useMemo(() => workspace?.leads ?? [], [workspace]);
  const statuses = useMemo(() => {
    const values = new Set<string>();
    for (const lead of leads) {
      if (lead.escalationStatus) values.add(lead.escalationStatus);
    }
    return [...values].sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = leads.filter((lead) => {
      if (temperature !== "all" && lead.temperature !== temperature) {
        return false;
      }
      if (status !== "all" && lead.escalationStatus !== status) {
        return false;
      }
      if (!needle) return true;
      const hay = [
        lead.email,
        lead.categoryName,
        lead.leadId,
        lead.escalationStatus,
        lead.dealStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

    return [...rows].sort((a, b) => {
      if (sort === "created") {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
      return (b.score ?? -1) - (a.score ?? -1);
    });
  }, [leads, query, sort, status, temperature]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="Leads"
        description="実データベースのLeadのみを表示します。AIスコアは提案、対応判断は人間が行います。"
        actions={<AiHumanFlow />}
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
          <div className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-muted">検索</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="Email / Category"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">HOT / WARM / NURTURE</span>
              <select
                value={temperature}
                onChange={(event) =>
                  setTemperature(event.target.value as LeadTemperature | "all")
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {TEMP_FILTERS.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "すべて" : TEMPERATURE_LABEL[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">並び順</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as "score" | "created")
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="score">Score順</option>
                <option value="created">新しい順</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="該当するLeadはありません"
              description="フィルタを変えるか、公開サイトで診断PDFが保存されるとここに表示されます。"
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Lead</Th>
                  <Th>Email</Th>
                  <Th>Category</Th>
                  <Th>Score</Th>
                  <Th>温度</Th>
                  <Th>Escalation</Th>
                  <Th>Next Action</Th>
                  <Th>Created</Th>
                  <Th>最終会話</Th>
                  <Th>Deal Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.leadId} className="hover:bg-surface">
                    <Td>
                      <Link
                        href={`/app/leads/${lead.leadId}`}
                        className="font-medium text-accent"
                      >
                        {leadDisplayName(lead)}
                      </Link>
                    </Td>
                    <Td>{lead.email || "—"}</Td>
                    <Td>{lead.categoryName || "—"}</Td>
                    <Td>{lead.score ?? "—"}</Td>
                    <Td>
                      <Badge tone={lead.temperature}>
                        {TEMPERATURE_LABEL[lead.temperature]}
                      </Badge>
                    </Td>
                    <Td>{lead.escalationStatus || "—"}</Td>
                    <Td className="max-w-[220px]">
                      <span className="line-clamp-2">{lead.nextAction || "—"}</span>
                    </Td>
                    <Td>{formatUtc(lead.createdAt)}</Td>
                    <Td>{formatUtc(lead.lastConversationAt)}</Td>
                    <Td>{dealStatusLabel(lead.dealStatus)}</Td>
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
