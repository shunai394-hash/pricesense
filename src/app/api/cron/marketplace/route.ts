import { NextResponse } from "next/server";
import { isOpsRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { runMarketplaceMonitor } from "@/lib/research/marketplace/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

interface MarketplaceMonitorTargetRow {
  id: string;
  name: string;
  query: string;
  region_code: string;
  country_code: string | null;
  limit_count: number;
  cadence_minutes: number;
  status: string;
  last_run_at: string | null;
}

function isDue(
  lastRunAt: string | null,
  cadenceMinutes: number,
  nowMs: number
) {
  if (!lastRunAt) return true;

  const lastRunMs = new Date(lastRunAt).getTime();

  if (!Number.isFinite(lastRunMs)) return true;

  return (
    nowMs - lastRunMs >= cadenceMinutes * 60_000
  );
}

export async function GET(request: Request) {
  if (!isOpsRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from("marketplace_monitor_targets")
      .select(
        "id,name,query,region_code,country_code,limit_count,cadence_minutes,status,last_run_at"
      )
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to load marketplace monitor targets: ${error.message}`
      );
    }

    const targets = (data ?? []) as MarketplaceMonitorTargetRow[];
    const nowMs = Date.now();

    const dueTargets = targets.filter((target) =>
      isDue(
        target.last_run_at,
        target.cadence_minutes,
        nowMs
      )
    );

    const results = [];

    for (const target of dueTargets) {
      const runAt = new Date().toISOString();

      try {
        const [result] = await runMarketplaceMonitor([
          {
            query: target.query,
            region: target.region_code,
            countryCode: target.country_code,
            limit: target.limit_count,
          },
        ]);

        const errors = result.marketplaces
          .filter((marketplace) => marketplace.error)
          .map(
            (marketplace) =>
              `${marketplace.marketplace}: ${marketplace.error}`
          );

        const lastError =
          errors.length > 0 ? errors.join(" | ") : null;

        const { error: updateError } = await supabase
          .from("marketplace_monitor_targets")
          .update({
            last_run_at: runAt,
            last_error: lastError,
            status: "active",
            updated_at: runAt,
          })
          .eq("id", target.id);

        if (updateError) {
          throw new Error(
            `Failed to update target ${target.id}: ${updateError.message}`
          );
        }

        results.push({
          id: target.id,
          name: target.name,
          query: target.query,
          ran: true,
          result,
          partialError: lastError,
        });
      } catch (error) {
        const message = publicErrorMessage(
          error,
          `Failed to run marketplace target ${target.name}`
        );

        await supabase
          .from("marketplace_monitor_targets")
          .update({
            last_run_at: runAt,
            last_error: message,
            status: "active",
            updated_at: runAt,
          })
          .eq("id", target.id);

        results.push({
          id: target.id,
          name: target.name,
          query: target.query,
          ran: false,
          error: message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      totalTargets: targets.length,
      ran: dueTargets.length,
      skipped: targets.length - dueTargets.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: publicErrorMessage(
          error,
          "Failed to run marketplace cron"
        ),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
