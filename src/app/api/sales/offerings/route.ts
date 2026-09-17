import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  activateOffering,
  listOfferings,
  loadOffering,
  saveOffering,
  type OfferingInput,
} from "@/lib/nbos/offering";
import { emptyIcp } from "@/lib/nbos/types";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const offerings = await listOfferings();
    return NextResponse.json({
      offerings,
      count: offerings.length,
      emptyReason:
        offerings.length === 0
          ? "Offeringがありません。AIは何を売るか分からないため新規開拓できません。"
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load offerings") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (body.action === "activate") {
      if (typeof body.id !== "string" || !UUID_RE.test(body.id)) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const offering = await activateOffering(body.id);
      return NextResponse.json({ ok: true, offering });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const icp = isRecord(body.icp) ? body.icp : {};
    const input: OfferingInput & { id?: string } = {
      id:
        typeof body.id === "string" && UUID_RE.test(body.id) ? body.id : undefined,
      name,
      description: typeof body.description === "string" ? body.description : null,
      problem_solved:
        typeof body.problem_solved === "string" ? body.problem_solved : null,
      target_industries: strings(body.target_industries),
      target_company_size: isRecord(body.target_company_size)
        ? {
            labels: strings(body.target_company_size.labels),
            employee_min:
              typeof body.target_company_size.employee_min === "number"
                ? body.target_company_size.employee_min
                : null,
            employee_max:
              typeof body.target_company_size.employee_max === "number"
                ? body.target_company_size.employee_max
                : null,
          }
        : {},
      target_regions: strings(body.target_regions),
      target_departments: strings(body.target_departments),
      target_roles: strings(body.target_roles),
      qualification_conditions: strings(body.qualification_conditions),
      exclusion_conditions: strings(body.exclusion_conditions),
      icp: { ...emptyIcp(), ...icp },
      is_active: body.is_active === true,
    };

    if (input.id) {
      const existing = await loadOffering(input.id);
      if (!existing) {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 });
      }
    }

    const offering = await saveOffering(input);
    return NextResponse.json({ ok: true, offering });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to save offering") },
      { status: 500 }
    );
  }
}
