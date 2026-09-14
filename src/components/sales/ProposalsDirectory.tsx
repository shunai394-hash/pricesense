"use client";

import Link from "next/link";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  AiDraftBadge,
  EmptyState,
  ErrorState,
  HumanBadge,
  LoadingState,
  PageHeader,
  ReviewBadge,
  TableWrap,
  Td,
  Th,
  UnauthorizedState,
} from "@/components/ui/primitives";
import { useSalesWorkspace } from "@/hooks/useSalesWorkspace";
import { formatUtc, leadDisplayName } from "@/lib/sales/workspace-ui";

export function ProposalsDirectory() {
  const {
    token,
    setToken,
    loading,
    error,
    unauthorized,
    workspace,
    load,
  } = useSalesWorkspace();

  const proposals = workspace?.proposals ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="Proposals"
        description="AIはDraftを作成します。顧客への提出判断は人間が行います。"
        actions={
          <div className="flex flex-wrap gap-2">
            <AiDraftBadge />
            <ReviewBadge />
            <HumanBadge />
          </div>
        }
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
        proposals.length === 0 ? (
          <EmptyState
            title="提案Draftはありません"
            description="商談後に提案Draftが保存されると、ここに表示されます。"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Proposal</Th>
                <Th>Lead</Th>
                <Th>Problem</Th>
                <Th>Proposed Solution</Th>
                <Th>Benefits</Th>
                <Th>Implementation Plan</Th>
                <Th>Assumptions</Th>
                <Th>Risks</Th>
                <Th>Next Steps</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-surface">
                  <Td>
                    <Link
                      href={`/app/leads/${proposal.leadId}`}
                      className="text-accent"
                    >
                      {proposal.title || "無題Draft"}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {formatUtc(proposal.createdAt)}
                    </p>
                  </Td>
                  <Td>
                    {leadDisplayName({
                      categoryName: proposal.categoryName,
                      email: proposal.email,
                      leadId: proposal.leadId,
                    })}
                  </Td>
                  <Td className="max-w-[180px]">
                    <span className="line-clamp-3">{proposal.problem || "—"}</span>
                  </Td>
                  <Td className="max-w-[180px]">
                    <span className="line-clamp-3">
                      {proposal.proposedSolution || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="line-clamp-3">
                      {proposal.benefits.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="line-clamp-3">
                      {proposal.implementationPlan.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="line-clamp-3">
                      {proposal.assumptions.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="line-clamp-3">
                      {proposal.risks.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="line-clamp-3">
                      {proposal.nextSteps.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td>
                    <AiDraftBadge />
                    <p className="mt-1 text-xs text-muted">
                      {proposal.status || "draft"}
                    </p>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      ) : null}
    </div>
  );
}
