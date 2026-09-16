"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminToken } from "@/hooks/useAdminToken";
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

interface Prospect {
  id: string;
  status: string;
  score: number | null;
  fit_score: number | null;
  intent_score: number | null;
  priority: string | null;
  owner: string | null;
  source: string | null;
  last_activity_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  company: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    location: string | null;
    employee_count: number | null;
    revenue_range: string | null;
    website_url: string | null;
  } | null;
  contact: {
    id: string;
    full_name: string | null;
    job_title: string | null;
    department: string | null;
    seniority: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
  } | null;
}

interface ProspectsResponse {
  prospects?: Prospect[];
  count?: number;
  error?: string;
}

function priorityTone(priority: string | null): "hot" | "warm" | "nurture" {
  const value = (priority ?? "").toLowerCase();
  if (value === "high" || value === "p0" || value === "p1") return "hot";
  if (value === "medium" || value === "p2") return "warm";
  return "nurture";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function ProspectsDirectory() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const load = async () => {
    if (!token) {
      setUnauthorized(true);
      setError("Admin tokenを入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const response = await fetch("/api/sales/prospects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await response.json()) as ProspectsResponse;

      if (response.status === 401) {
        setUnauthorized(true);
        setProspects([]);
        setError("Admin tokenが正しくありません。");
        return;
      }

      if (!response.ok) {
        throw new Error(json.error || "Prospectsの取得に失敗しました。");
      }

      persist(token);
      setProspects(json.prospects ?? []);
    } catch (loadError) {
      setProspects([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Prospectsの取得に失敗しました。"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && token) {
      void load();
    }
  }, [ready, token]);

  const statuses = useMemo(
    () => [...new Set(prospects.map((item) => item.status))].sort(),
    [prospects]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return prospects
      .filter((prospect) => {
        if (status !== "all" && prospect.status !== status) return false;
        if (
          priority !== "all" &&
          priorityTone(prospect.priority) !== priority
        ) {
          return false;
        }

        if (!needle) return true;

        const haystack = [
          prospect.company?.name,
          prospect.company?.domain,
          prospect.company?.industry,
          prospect.company?.location,
          prospect.contact?.full_name,
          prospect.contact?.job_title,
          prospect.contact?.department,
          prospect.contact?.email,
          prospect.next_action,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(needle);
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [prospects, query, status, priority]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="Prospects"
        description="企業を開拓し、営業優先順位を決めます。"
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
          <LoadingState label="Prospectsを読み込んでいます…" />
        </div>
      ) : null}

      {!loading && unauthorized ? <UnauthorizedState /> : null}

      {ready && token && !unauthorized ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted">検索</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="会社名 / 担当者 / 業種 / メール"
              />
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
              <span className="mb-1 block text-muted">Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                <option value="hot">High</option>
                <option value="warm">Medium</option>
                <option value="nurture">Low / 未設定</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Prospectがありません"
              description="企業・担当者を登録すると、ここで営業優先順位を管理できます。"
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>企業</Th>
                  <Th>担当者</Th>
                  <Th>業種</Th>
                  <Th>Score</Th>
                  <Th>Fit</Th>
                  <Th>Intent</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th>次のアクション</Th>
                  <Th>最終活動</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-surface">
                    <Td>
                      <div className="font-medium">
                        {prospect.company?.name || "—"}
                      </div>
                      <div className="text-xs text-muted">
                        {prospect.company?.domain || prospect.company?.location || "—"}
                      </div>
                    </Td>
                    <Td>
                      <div>{prospect.contact?.full_name || "未特定"}</div>
                      <div className="text-xs text-muted">
                        {prospect.contact?.job_title ||
                          prospect.contact?.department ||
                          "—"}
                      </div>
                    </Td>
                    <Td>{prospect.company?.industry || "—"}</Td>
                    <Td>
                      <span className="font-semibold">
                        {prospect.score ?? "—"}
                      </span>
                    </Td>
                    <Td>{prospect.fit_score ?? "—"}</Td>
                    <Td>{prospect.intent_score ?? "—"}</Td>
                    <Td>
                      <Badge tone={priorityTone(prospect.priority)}>
                        {prospect.priority || "Low"}
                      </Badge>
                    </Td>
                    <Td>{prospect.status}</Td>
                    <Td className="max-w-[240px]">
                      <div className="line-clamp-2">
                        {prospect.next_action || "AIで次アクションを決定"}
                      </div>
                    </Td>
                    <Td>{formatDate(prospect.last_activity_at)}</Td>
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
