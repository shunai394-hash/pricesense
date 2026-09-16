"use client";

import { useEffect, useState } from "react";

type Action = {
  id: string;
  actionType?: string | null;
  action_type?: string | null;
  nextAction?: string | null;
  next_action?: string | null;
  score?: number | null;
  leadStatus?: string | null;
  lead_status?: string | null;
  dealStatus?: string | null;
  deal_status?: string | null;
  companyName?: string | null;
  company_name?: string | null;
};

type Props = {
  adminToken?: string;
};

export function SalesActionsDashboard({ adminToken }: Props) {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const headers: HeadersInit = {};
        if (adminToken) {
          headers.Authorization = `Bearer ${adminToken}`;
        }

        const response = await fetch("/api/ai/sales-actions", {
          headers,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data.actions)
            ? data.actions
            : [];

        if (!cancelled) {
          setActions(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [adminToken]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">
          AI Sales Actions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AIが優先順位を付けた営業アクションを確認します。
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">
          Loading...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 p-6 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && actions.length === 0 && (
        <div className="rounded-xl border p-8 text-sm text-muted-foreground">
          現在、実行対象の営業アクションはありません。
        </div>
      )}

      {!loading && !error && actions.length > 0 && (
        <section className="rounded-xl border">
          <div className="border-b px-5 py-4">
            <h3 className="font-semibold">Priority Actions</h3>
          </div>

          <div className="divide-y">
            {actions.map((action) => {
              const actionType =
                action.actionType ?? action.action_type ?? "Sales action";
              const nextAction =
                action.nextAction ?? action.next_action ?? "次の営業アクションを確認";
              const companyName =
                action.companyName ?? action.company_name ?? "Unknown company";
              const leadStatus =
                action.leadStatus ?? action.lead_status ?? "—";
              const dealStatus =
                action.dealStatus ?? action.deal_status ?? "—";

              return (
                <div key={action.id} className="px-5 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{companyName}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {actionType}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
                      <div>
                        <div className="text-muted-foreground">Score</div>
                        <div>{action.score ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Lead</div>
                        <div>{leadStatus}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Deal</div>
                        <div>{dealStatus}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-sm">
                    <span className="font-medium">Next action: </span>
                    {nextAction}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}


export default SalesActionsDashboard;
