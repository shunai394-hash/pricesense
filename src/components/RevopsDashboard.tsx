"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAdminClientError } from "@/lib/admin-ui";
import type {
  RevopsCurrencyValue,
  RevopsFunnelStage,
  RevopsKpis,
  RevopsLeadSourceStat,
  RevopsLossReason,
  RevopsObjectionStat,
} from "@/lib/ai/revops";

const TOKEN_STORAGE_KEY = "pricesense.adminToken";

interface RevopsResponse {
  success: boolean;
  error?: string;
  kpis?: RevopsKpis;
  funnel?: RevopsFunnelStage[];
  lossReasons?: RevopsLossReason[];
  objections?: RevopsObjectionStat[];
  leadSources?: RevopsLeadSourceStat[];
  dealValue?: { currencies: RevopsCurrencyValue[] };
  period?: {
    from: string | null;
    to: string | null;
    fromInclusive: string | null;
    toExclusive: string | null;
    timezone: "UTC";
  };
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "0%";
  return `${value}%`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 2,
  }).format(value);
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}

export function RevopsDashboard() {
  const [token, setToken] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RevopsResponse | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();

    try {
      const response = await fetch(`/api/ai/revops${query ? `?${query}` : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = (await response.json()) as RevopsResponse;
      if (!response.ok || !json.success) {
        setData(null);
        setError(
          formatAdminClientError(
            json.error || `Request failed (${response.status})`,
            response.status
          )
        );
        return;
      }
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      setData(json);
    } catch (loadError) {
      setData(null);
      setError(
        formatAdminClientError(
          loadError instanceof Error ? loadError.message : "Failed to load RevOps"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, token]);

  const kpis = data?.kpis;
  const funnel = data?.funnel ?? [];
  const lossReasons = data?.lossReasons ?? [];
  const leadSources = data?.leadSources ?? [];
  const objections = data?.objections ?? [];
  const currencies = data?.dealValue?.currencies ?? [];

  const periodLabel = useMemo(() => {
    if (!data?.period) return "未取得";
    if (!data.period.from && !data.period.to) return "全期間";
    const fromLabel = data.period.from ?? "開始なし";
    const toLabel = data.period.to ?? "終了なし";
    return `${fromLabel} 〜 ${toLabel} (UTC)`;
  }, [data?.period]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">RevOps</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          AI営業部のリード〜成約を集計します。管理者トークン（ADMIN_TOKEN）が必要です。
        </p>
      </header>

      <form
        className="mb-8 grid gap-3 rounded-xl border border-border/80 bg-surface/60 p-4 md:grid-cols-[1fr_160px_160px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Admin token</span>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">From (UTC)</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">To (UTC)</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            {loading ? "読み込み中…" : "集計する"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!data?.success ? (
          <p className="text-sm text-muted">
            トークンを入力して集計を開始してください。数字は「今日の状況」と同じ実テーブル集計です。
          </p>
      ) : (
        <div className="space-y-10">
          <p className="text-sm text-muted">期間: {periodLabel}</p>

          <section>
            <h2 className="mb-4 font-display text-2xl">KPI</h2>
            {(kpis?.leads ?? 0) === 0 ? (
              <p className="mb-4 rounded-lg border border-border/80 bg-surface/50 px-4 py-3 text-sm text-muted">
                集計対象のLeadがありません。公開サイトで診断PDFを保存すると、ここに件数が反映されます。
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Leads"
                value={kpis?.leads ?? 0}
                hint={`HOT ${kpis?.hotLeads ?? 0} / WARM ${kpis?.warmLeads ?? 0} / NURTURE ${kpis?.nurtureLeads ?? 0}`}
              />
              <KpiCard
                label="Handoffs"
                value={kpis?.handoffs ?? 0}
                hint={`Lead → Handoff ${formatPercent(kpis?.conversionRates.leadToHandoff)}`}
              />
              <KpiCard
                label="Meetings"
                value={kpis?.meetings ?? 0}
                hint={`Handoff → Meeting ${formatPercent(kpis?.conversionRates.handoffToMeeting)}`}
              />
              <KpiCard
                label="Proposals"
                value={kpis?.proposals ?? 0}
                hint={`Meeting → Proposal ${formatPercent(kpis?.conversionRates.meetingToProposal)}`}
              />
              <KpiCard
                label="Won"
                value={kpis?.won ?? 0}
                hint={`Lead → Won ${formatPercent(kpis?.conversionRates.leadToWon)}`}
              />
              <KpiCard
                label="Lost"
                value={kpis?.lost ?? 0}
                hint={`Awaiting ${kpis?.awaitingResponse ?? 0} / Negotiating ${kpis?.negotiating ?? 0}`}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">Sales Funnel</h2>
            <ol className="space-y-2">
              {funnel.map((stage, index) => (
                <li key={stage.stage}>
                  {index > 0 ? (
                    <p className="px-3 py-1 text-center text-xs text-muted">↓</p>
                  ) : null}
                  <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface/70 px-4 py-3">
                    <span className="text-sm text-foreground">{stage.label}</span>
                    <span className="text-sm text-muted">
                      {stage.count} / {formatPercent(stage.conversionRate)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">Loss Reasons</h2>
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">理由</th>
                    <th className="px-4 py-2 font-medium">件数</th>
                    <th className="px-4 py-2 font-medium">割合</th>
                  </tr>
                </thead>
                <tbody>
                  {lossReasons.map((row) => (
                    <tr key={row.reason} className="border-t border-border/60">
                      <td className="px-4 py-2">{row.reason}</td>
                      <td className="px-4 py-2">{row.count}</td>
                      <td className="px-4 py-2">{formatPercent(row.share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">Lead Sources</h2>
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-4 py-2 font-medium">Leads</th>
                    <th className="px-4 py-2 font-medium">Handoffs</th>
                    <th className="px-4 py-2 font-medium">Meetings</th>
                    <th className="px-4 py-2 font-medium">Proposals</th>
                    <th className="px-4 py-2 font-medium">Won</th>
                    <th className="px-4 py-2 font-medium">Lost</th>
                    <th className="px-4 py-2 font-medium">Won rate</th>
                  </tr>
                </thead>
                <tbody>
                  {leadSources.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-muted" colSpan={8}>
                        データなし
                      </td>
                    </tr>
                  ) : (
                    leadSources.map((row) => (
                      <tr key={row.source} className="border-t border-border/60">
                        <td className="px-4 py-2">{row.source}</td>
                        <td className="px-4 py-2">{row.leads}</td>
                        <td className="px-4 py-2">{row.handoffs}</td>
                        <td className="px-4 py-2">{row.meetings}</td>
                        <td className="px-4 py-2">{row.proposals}</td>
                        <td className="px-4 py-2">{row.won}</td>
                        <td className="px-4 py-2">{row.lost}</td>
                        <td className="px-4 py-2">{formatPercent(row.wonRate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">Deal Value</h2>
            {currencies.length === 0 ? (
              <p className="text-sm text-muted">
                expected_value がある案件がありません（null は集計対象外）。
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {currencies.map((row) => (
                  <article
                    key={row.currency}
                    className="rounded-xl border border-border/80 bg-surface/70 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-accent">
                      {row.currency}
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Pipeline</dt>
                        <dd>{formatAmount(row.pipelineExpectedValue)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Won</dt>
                        <dd>{formatAmount(row.wonExpectedValue)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Average won</dt>
                        <dd>{formatAmount(row.averageWonValue)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Total</dt>
                        <dd>{formatAmount(row.totalExpectedValue)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">Objections</h2>
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">件数</th>
                    <th className="px-4 py-2 font-medium">対応回数</th>
                  </tr>
                </thead>
                <tbody>
                  {objections.map((row) => (
                    <tr key={row.objectionType} className="border-t border-border/60">
                      <td className="px-4 py-2">{row.objectionType}</td>
                      <td className="px-4 py-2">{row.count}</td>
                      <td className="px-4 py-2">{row.responseCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
