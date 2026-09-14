"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import { SalesLeadWorkspace } from "@/components/SalesLeadWorkspace";
import {
  EmptyState,
  ErrorState,
  HumanBadge,
  LoadingState,
  PageHeader,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";
import { formatAdminClientError } from "@/lib/admin-ui";

interface DealLookupResponse {
  success: boolean;
  error?: string;
  leadId?: string;
  dealId?: string;
}

export function SalesDealWorkspace({ dealId }: { dealId: string }) {
  const { token, setToken, persist, ready } = useAdminToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const resolve = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await fetch(
        `/api/ai/sales-actions?dealId=${encodeURIComponent(dealId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = (await response.json()) as DealLookupResponse;
      if (response.status === 404) {
        setLeadId(null);
        setNotFound(true);
        setError(formatAdminClientError(json.error, response.status));
        return;
      }
      if (!response.ok || !json.success || !json.leadId) {
        setLeadId(null);
        setError(
          formatAdminClientError(
            json.error || "Dealの取得に失敗しました",
            response.status
          )
        );
        return;
      }
      persist(token);
      setLeadId(json.leadId);
    } catch (resolveError) {
      setLeadId(null);
      setError(
        formatAdminClientError(
          resolveError instanceof Error
            ? resolveError.message
            : "Dealの読み込みに失敗しました"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [dealId, persist, token]);

  useEffect(() => {
    if (!ready || !token) return;
    void resolve();
  }, [ready, resolve, token]);

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <PageHeader
          eyebrow="AI営業部"
          title="Deal詳細"
          description="Status変更・Won / Lost / Manual Stop は人間が確定します。"
          actions={
            <div className="flex items-center gap-3">
              <HumanBadge />
              <Link href="/app/deals" className="text-sm text-accent">
                Deal一覧へ
              </Link>
            </div>
          }
        />
        <AdminSessionBar
          token={token}
          onTokenChange={setToken}
          onSubmit={() => void resolve()}
          loading={loading}
        />
        {error ? <div className="mb-6"><ErrorState message={error} /></div> : null}
        {loading ? <div className="mb-6"><LoadingState /></div> : null}
        {notFound ? (
          <EmptyState
            title="Dealが見つかりません"
            description="IDが誤っているか、削除された可能性があります。"
          />
        ) : null}
      </div>
      {leadId ? (
        <SalesLeadWorkspace
          leadId={leadId}
          backHref="/app/deals"
          backLabel="Deal一覧"
          eyebrow="Deal"
          title="Deal操作"
          hideChrome
        />
      ) : null}
    </div>
  );
}
