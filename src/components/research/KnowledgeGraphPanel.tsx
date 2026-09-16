"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";

interface GraphPayload {
  organizations?: Array<{ id: string; name: string; domain: string | null; country: string | null }>;
  brands?: Array<{ id: string; name: string; country: string | null }>;
  products?: Array<{ id: string; name: string }>;
  people?: Array<{ id: string; full_name: string; job_title: string | null }>;
  places?: Array<{ id: string; name: string; country: string | null }>;
  relationships?: Array<{
    id: string;
    from_type: string;
    to_type: string;
    relation: string;
    is_hypothesis: boolean;
  }>;
  emptyReason?: string | null;
}

export function KnowledgeGraphPanel() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/research/graph", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await response.json()) as GraphPayload & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || `失敗（${response.status}）`);
      }
      persist(token);
      setPayload(json);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="共通Research基盤"
        title="Knowledge Graph"
        description="企業・人物・ブランド・商品・場所・ニュースの関係です。仮説の関係は仮説と表示します。"
      />
      <AdminSessionBar
        token={token}
        onTokenChange={setToken}
        onSubmit={() => void load()}
        loading={loading}
      />
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

      {payload ? (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-display text-xl">Organizations</h2>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>名前</Th>
                    <Th>ドメイン</Th>
                    <Th>国</Th>
                  </tr>
                </thead>
                <tbody>
                  {(payload.organizations ?? []).map((item) => (
                    <tr key={item.id}>
                      <Td>{item.name}</Td>
                      <Td>{item.domain || "—"}</Td>
                      <Td>{item.country || "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
            <Card>
              <h2 className="font-display text-xl">Relationships</h2>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>from</Th>
                    <Th>relation</Th>
                    <Th>to</Th>
                    <Th>kind</Th>
                  </tr>
                </thead>
                <tbody>
                  {(payload.relationships ?? []).map((item) => (
                    <tr key={item.id}>
                      <Td>{item.from_type}</Td>
                      <Td>{item.relation}</Td>
                      <Td>{item.to_type}</Td>
                      <Td>{item.is_hypothesis ? "Hypothesis" : "Unverified"}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          </div>
          {(payload.organizations ?? []).length === 0 &&
          (payload.relationships ?? []).length === 0 ? (
            <EmptyState
              title="Graphは空です"
              description={payload.emptyReason || "確認済みソースがまだありません。"}
            />
          ) : null}
        </div>
      ) : !token && ready ? (
        <EmptyState
          title="管理者セッションがありません"
          description="トークンを入力するとKnowledge Graphを表示できます。"
        />
      ) : null}
    </div>
  );
}
