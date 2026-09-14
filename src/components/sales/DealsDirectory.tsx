"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  AiHumanFlow,
  Badge,
  EmptyState,
  ErrorState,
  HumanBadge,
  LoadingState,
  PageHeader,
  TableWrap,
  Td,
  Th,
  UnauthorizedState,
} from "@/components/ui/primitives";
import { useSalesWorkspace } from "@/hooks/useSalesWorkspace";
import { DEAL_STATUSES } from "@/lib/ai/deal";
import {
  dealStatusLabel,
  formatAmount,
  formatUtc,
  leadDisplayName,
} from "@/lib/sales/workspace-ui";

export function DealsDirectory() {
  const {
    token,
    setToken,
    loading,
    error,
    unauthorized,
    workspace,
    load,
  } = useSalesWorkspace();
  const [status, setStatus] = useState("all");

  const deals = useMemo(() => workspace?.deals ?? [], [workspace]);
  const filtered = useMemo(() => {
    if (status === "all") return deals;
    return deals.filter((deal) => deal.status === status);
  }, [deals, status]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="Deals"
        description="成約（Won）と失注（Lost）は人間が確定します。AIが契約を成立させることはありません。"
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
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">
              <span className="mr-2 text-muted">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                {DEAL_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {dealStatusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <HumanBadge />
            <Badge tone="muted">Won / Lost は人間が確定</Badge>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Dealはありません"
              description="提案・見積が作成されるとDealが登録されます。"
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Lead</Th>
                  <Th>Deal status</Th>
                  <Th>Probability</Th>
                  <Th>Expected Value</Th>
                  <Th>Next Action</Th>
                  <Th>Next Follow-up</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal) => (
                  <tr key={deal.id} className="hover:bg-surface">
                    <Td>
                      <Link
                        href={`/app/deals/${deal.id}`}
                        className="font-medium text-accent"
                      >
                        {leadDisplayName({
                          categoryName: deal.categoryName,
                          email: deal.email,
                          leadId: deal.leadId,
                        })}
                      </Link>
                    </Td>
                    <Td>{dealStatusLabel(deal.status)}</Td>
                    <Td>
                      {deal.probability == null ? "—" : `${deal.probability}%`}
                    </Td>
                    <Td>
                      {formatAmount(deal.expectedValue, deal.currency)}
                    </Td>
                    <Td className="max-w-[240px]">
                      <span className="line-clamp-2">{deal.nextAction || "—"}</span>
                    </Td>
                    <Td>{formatUtc(deal.nextFollowupAt)}</Td>
                    <Td>{formatUtc(deal.createdAt)}</Td>
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
