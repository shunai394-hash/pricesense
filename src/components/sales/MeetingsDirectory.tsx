"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [leadId, setLeadId] = useState("");
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const meetings = workspace?.meetings ?? [];
  const leads = workspace?.leads ?? [];

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
      {formError ? <div className="mb-6"><ErrorState message={formError} /></div> : null}
      {notice ? (
        <p className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}
      {loading ? <div className="mb-6"><LoadingState /></div> : null}
      {!loading && unauthorized && !workspace ? <UnauthorizedState /> : null}

      {workspace ? (
        <form
          className="mb-6 grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-[220px_1fr_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            setActing(true);
            setFormError(null);
            setNotice(null);
            try {
              const response = await fetch("/api/ai/meeting", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ leadId, rawNotes: notes }),
              });
              const payload = await response.json();
              if (!response.ok || payload.success === false) {
                throw new Error(payload.error || "Meeting save failed");
              }
              setNotes("");
              setNotice("商談メモを保存し、提案・見積ドラフトを作成しました。");
              await load();
            } catch (saveError) {
              setFormError(
                saveError instanceof Error
                  ? saveError.message
                  : "商談メモの保存に失敗しました。"
              );
            } finally {
              setActing(false);
            }
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-muted">Lead</span>
            <select
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              {leads.map((lead) => (
                <option key={lead.leadId} value={lead.leadId}>
                  {leadDisplayName({
                    categoryName: lead.categoryName,
                    email: lead.email,
                    leadId: lead.leadId,
                  })}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">商談メモ</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="確認した事実だけを記入"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={acting || !leadId || !notes.trim()}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
            >
              {acting ? "保存中…" : "メモを保存"}
            </button>
          </div>
        </form>
      ) : null}

      {workspace ? (
        meetings.length === 0 ? (
          <EmptyState
            title="商談はまだありません"
            description="上のフォーム、またはLead詳細から商談メモを保存すると、ここに表示されます。"
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
