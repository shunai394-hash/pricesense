"use client";

import Link from "next/link";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  AiDraftBadge,
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
import { formatUtc, leadDisplayName } from "@/lib/sales/workspace-ui";

export function MeetingsDirectory() {
  const {
    token,
    setToken,
    loading,
    error,
    unauthorized,
    workspace,
    load,
  } = useSalesWorkspace();

  const meetings = workspace?.meetings ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="Meetings"
        description="商談メモと合意事項です。要約はAI Draftとして扱い、未確認事項は事実にしません。"
        actions={<AiDraftBadge />}
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
        meetings.length === 0 ? (
          <EmptyState
            title="商談はまだありません"
            description="Lead詳細から商談メモを保存すると、ここに表示されます。"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Meeting date</Th>
                <Th>Lead</Th>
                <Th>Status</Th>
                <Th>Summary</Th>
                <Th>Customer Needs</Th>
                <Th>Objections</Th>
                <Th>Agreed Points</Th>
                <Th>Unresolved Points</Th>
                <Th>Next Action</Th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id} className="hover:bg-surface">
                  <Td>{formatUtc(meeting.meetingAt || meeting.createdAt)}</Td>
                  <Td>
                    <Link
                      href={`/app/leads/${meeting.leadId}`}
                      className="text-accent"
                    >
                      {leadDisplayName({
                        categoryName: meeting.categoryName,
                        email: meeting.email,
                        leadId: meeting.leadId,
                      })}
                    </Link>
                  </Td>
                  <Td>{meeting.meetingStatus || "—"}</Td>
                  <Td className="max-w-[220px]">
                    <span className="line-clamp-3">{meeting.summary || "—"}</span>
                  </Td>
                  <Td className="max-w-[180px]">
                    <span className="line-clamp-3">
                      {meeting.customerNeeds.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[180px]">
                    <span className="line-clamp-3">
                      {meeting.objections.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[180px]">
                    <span className="line-clamp-3">
                      {meeting.agreedPoints.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[180px]">
                    <span className="line-clamp-3">
                      {meeting.unresolvedPoints.join(" / ") || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[180px]">
                    <span className="line-clamp-3">{meeting.nextAction || "—"}</span>
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
