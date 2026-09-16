"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TableWrap,
  Td,
  Th,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";
import { formatUtc } from "@/lib/sales/workspace-ui";

interface QuoteRow {
  id: string;
  lead_id: string | null;
  meeting_id: string | null;
  currency: string | null;
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  status: string | null;
  created_at: string | null;
  valid_until: string | null;
}

export function QuotesDirectory() {
  const { token, setToken, persist } = useAdminToken();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [emptyReason, setEmptyReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sales/quotes", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await response.json()) as {
        quotes?: QuoteRow[];
        emptyReason?: string;
        error?: string;
      };
      if (!response.ok) {
        setQuotes([]);
        setError(json.error || `見積の取得に失敗しました（${response.status}）`);
        return;
      }
      persist(token);
      setQuotes(json.quotes ?? []);
      setEmptyReason(json.emptyReason ?? "");
    } catch {
      setQuotes([]);
      setError("見積ドラフトを読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  useEffect(() => {
    if (token) void load();
  }, [load, token]);

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-12 sm:px-6">
      <h2 className="font-display text-2xl">Quotes</h2>
      <p className="mt-1 text-sm text-muted">
        見積ドラフトです。金額・数量・契約条件はAIが確定しません。
      </p>

      <div className="mt-4">
        <AdminSessionBar
          token={token}
          onTokenChange={setToken}
          onSubmit={() => void load()}
          loading={loading}
        />
      </div>

      {error ? (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      ) : null}
      {loading ? (
        <div className="mb-6">
          <LoadingState />
        </div>
      ) : null}

      {!loading && quotes.length === 0 ? (
        <EmptyState
          title="見積ドラフトはありません"
          description={emptyReason || "商談から見積ドラフトを作成できます。"}
        />
      ) : null}

      {quotes.length > 0 ? (
        <TableWrap>
          <thead>
            <tr>
              <Th>Lead</Th>
              <Th>Subtotal</Th>
              <Th>Discount</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-surface">
                <Td>{quote.lead_id || "—"}</Td>
                <Td>{quote.subtotal ?? "未確定"}</Td>
                <Td>{quote.discount ?? "未確定"}</Td>
                <Td>{quote.total ?? "未確定"}</Td>
                <Td>{quote.status || "draft"}</Td>
                <Td>{formatUtc(quote.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : null}
    </div>
  );
}
