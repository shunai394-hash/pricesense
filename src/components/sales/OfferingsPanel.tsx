"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";
import { emptyIcp, type Offering } from "@/lib/nbos/types";

interface OfferingsResponse {
  offerings?: Offering[];
  emptyReason?: string | null;
  error?: string;
}

function joinList(value: string[]): string {
  return value.join("\n");
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const BLANK: Offering = {
  id: "",
  name: "",
  description: "",
  problem_solved: "",
  target_industries: [],
  target_company_size: {},
  target_regions: ["japan"],
  target_departments: [],
  target_roles: [],
  qualification_conditions: [],
  exclusion_conditions: [],
  icp: emptyIcp(),
  is_active: true,
  created_at: "",
  updated_at: "",
};

export function OfferingsPanel() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [items, setItems] = useState<Offering[]>([]);
  const [draft, setDraft] = useState<Offering>(BLANK);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const authorizedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(path, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        cache: "no-store",
      });
      const json = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : `失敗（${response.status}）`
        );
      }
      persist(token);
      return json;
    },
    [persist, token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const json = (await authorizedFetch("/api/sales/offerings")) as OfferingsResponse;
      const offerings = json.offerings ?? [];
      setItems(offerings);
      const active = offerings.find((item) => item.is_active) ?? offerings[0];
      if (active) setDraft(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI新規開拓営業OS"
        title="Offering / ICP"
        description="AIは「何を売るか」とICPが無いと企業を探せません。業種一致だけでなく、今起きている企業変化と課題の一致まで判断します。"
      />
      <AdminSessionBar
        token={token}
        onTokenChange={setToken}
        onSubmit={() => void load()}
        loading={loading}
      />
      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <p className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}
      {loading ? <LoadingState /> : null}

      {token ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Offerings</p>
            <div className="mt-3 space-y-2">
              {items.length === 0 ? (
                <EmptyState title="未設定" description="最初のOfferingを保存してください。" />
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-accent/40"
                    onClick={() => setDraft(item)}
                  >
                    <span className="font-medium">{item.name}</span>
                    {item.is_active ? (
                      <span className="ml-2">
                        <Badge tone="accent">ACTIVE</Badge>
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => setDraft({ ...BLANK, icp: emptyIcp() })}
            >
              新規Offering
            </Button>
          </Card>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                setActing(true);
                setNotice("");
                setError("");
                try {
                  await authorizedFetch("/api/sales/offerings", {
                    method: "POST",
                    body: JSON.stringify({
                      ...draft,
                      id: draft.id || undefined,
                      target_industries: draft.target_industries,
                      target_regions: draft.target_regions,
                      target_departments: draft.target_departments,
                      target_roles: draft.target_roles,
                      qualification_conditions: draft.qualification_conditions,
                      exclusion_conditions: draft.exclusion_conditions,
                      is_active: true,
                    }),
                  });
                  setNotice("Offeringを保存し、探索基準として有効化しました。");
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "保存に失敗しました");
                } finally {
                  setActing(false);
                }
              })();
            }}
          >
            <Field label="名前">
              <input
                required
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="説明">
              <textarea
                value={draft.description ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="解く課題 / problem_solved">
              <textarea
                value={draft.problem_solved ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, problem_solved: event.target.value })
                }
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="対象業種（改行区切り）">
                <textarea
                  value={joinList(draft.target_industries)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      target_industries: splitList(event.target.value),
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="対象地域">
                <textarea
                  value={joinList(draft.target_regions)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      target_regions: splitList(event.target.value),
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="対象部署">
                <textarea
                  value={joinList(draft.target_departments)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      target_departments: splitList(event.target.value),
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="対象役職">
                <textarea
                  value={joinList(draft.target_roles)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      target_roles: splitList(event.target.value),
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <Field label="Problem Fit トリガー（新規事業 / 海外進出 など）">
              <textarea
                value={joinList(draft.icp.problem.triggers)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    icp: {
                      ...draft.icp,
                      problem: {
                        ...draft.icp.problem,
                        triggers: splitList(event.target.value),
                      },
                    },
                  })
                }
                className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Negative ICP">
              <textarea
                value={joinList(draft.icp.negative.conditions)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    icp: {
                      ...draft.icp,
                      negative: {
                        ...draft.icp.negative,
                        conditions: splitList(event.target.value),
                      },
                    },
                  })
                }
                className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="除外条件">
              <textarea
                value={joinList(draft.exclusion_conditions)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    exclusion_conditions: splitList(event.target.value),
                  })
                }
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Button type="submit" disabled={acting}>
              {acting ? "保存中…" : "保存して探索基準にする"}
            </Button>
          </form>
        </div>
      ) : ready ? (
        <EmptyState
          title="管理者セッションがありません"
          description="トークンを入力するとOfferingを設定できます。"
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
