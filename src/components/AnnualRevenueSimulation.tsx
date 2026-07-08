"use client";

import {
  formatYen,
  WORKING_DAYS_PER_YEAR,
  type AnnualSimulationRow,
} from "@/lib/calculator";

interface AnnualRevenueSimulationProps {
  rows: AnnualSimulationRow[];
}

export function AnnualRevenueSimulation({ rows }: AnnualRevenueSimulationProps) {
  if (rows.length === 0) return null;

  const maxRevenue = Math.max(...rows.map((r) => r.annualRevenue));

  return (
    <section
      id="annual-simulation"
      className="rounded-xl border border-accent/25 bg-accent/5 p-5 sm:p-6"
      aria-labelledby="annual-simulation-title"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-accent">
            年間収益シミュレーション
          </p>
          <h3
            id="annual-simulation-title"
            className="mt-1 text-lg font-semibold text-foreground"
          >
            単価改定の年間インパクト
          </h3>
          <p className="mt-1 text-xs text-muted">
            {WORKING_DAYS_PER_YEAR}稼働日で換算 · 現在単価との差額を表示
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border/80 text-left text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">シナリオ</th>
              <th className="pb-2 pr-4 font-medium">日単価</th>
              <th className="pb-2 pr-4 font-medium">年間収益</th>
              <th className="pb-2 font-medium">現在比</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const barWidth =
                maxRevenue > 0 ? (row.annualRevenue / maxRevenue) * 100 : 0;
              const isPositive = row.diffFromCurrent > 0;
              const isNegative = row.diffFromCurrent < 0;

              return (
                <tr
                  key={row.id}
                  className={`border-b border-border/50 last:border-0 ${
                    row.highlight ? "bg-accent/10" : ""
                  }`}
                >
                  <td className="py-3 pr-4">
                    <span
                      className={`font-medium ${
                        row.highlight ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {row.label}
                    </span>
                    <div className="mt-1.5 h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-border">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          row.highlight
                            ? "bg-accent"
                            : "bg-foreground/40"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-foreground/90">
                    {formatYen(row.dailyRate)}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-foreground">
                    {formatYen(row.annualRevenue)}
                  </td>
                  <td className="py-3">
                    {row.id === "current" ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span
                        className={`font-medium ${
                          isPositive
                            ? "text-emerald-400"
                            : isNegative
                              ? "text-accent"
                              : "text-muted"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {formatYen(row.diffFromCurrent)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
