import { getCompatibleAiConfig } from "@/lib/server/env";
import {
  parseConversation,
  scoreInputFromLeadConversation,
  type ConversationMessage,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import type {
  ObjectionEventRow,
  SalesBrief,
  SalesBriefObjection,
} from "@/lib/ai/sales-brief";
import { scoreLead, type ScoreResult } from "@/lib/sales/scoring";

export interface MeetingSummary {
  summary: string;
  customerNeeds: string[];
  objections: string[];
  agreedPoints: string[];
  unresolvedPoints: string[];
  nextAction: string;
}

export interface MeetingContext {
  lead: SalesLeadRow;
  brief: SalesBrief | null;
  conversation: ConversationMessage[];
  objections: ObjectionEventRow[];
  rawNotes: string;
}

function uniqueTexts(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function userAndNotesText(context: MeetingContext): string {
  const userTurns = context.conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content);
  return [...userTurns, context.rawNotes].filter(Boolean).join("\n");
}

function objectionLabels(
  events: ObjectionEventRow[],
  briefObjections: SalesBriefObjection[] | undefined,
  notes: string
): string[] {
  const fromEvents = events.map((event) => {
    const type = event.objection_type || event.objection_key || "objection";
    const message = event.customer_message || event.raw_text || "";
    return message ? `${type}: ${message}` : type;
  });
  const fromBrief = (briefObjections ?? []).map((item) =>
    item.message ? `${item.type}: ${item.message}` : item.type
  );
  const fromNotes: string[] = [];
  if (/高(い|すぎ)|価格/.test(notes)) {
    fromNotes.push("too_expensive: 価格が高い");
  }
  return uniqueTexts([...fromEvents, ...fromBrief, ...fromNotes]);
}

export function buildDeterministicMeetingSummary(
  context: MeetingContext
): MeetingSummary {
  const notes = context.rawNotes.trim();
  const text = userAndNotesText(context);
  const objections = objectionLabels(
    context.objections,
    context.brief?.objections,
    text
  );

  const needs = uniqueTexts([
    context.brief?.pain,
    /導入|単価|改善/.test(text) ? "単価改善・導入の具体化" : null,
    notes ? null : "商談で確認したニーズは要確認",
  ]);

  const agreed = uniqueTexts([
    /予算は確保|予算を確保/.test(text) ? "予算は確保済み（会話上）" : null,
    /決裁者は私|私が決裁/.test(text) ? "決裁者は本人（会話上）" : null,
    /(\d+)\s*日以内/.test(text) ? "導入希望時期の言及あり" : null,
    /合意|進める|問題ない/.test(notes) ? notes.slice(0, 80) : null,
  ]);

  const unresolved = uniqueTexts([
    objections.some((item) => item.includes("too_expensive") || item.includes("価格"))
      ? "価格条件は未解消"
      : null,
    /範囲|スコープ/.test(text) || !notes ? "提案範囲は要確認" : null,
    "見積金額は要確認",
    /開始|キックオフ|契約/.test(notes) ? null : "開始日・契約条件は要確認",
  ]);

  const nextAction =
    "提案ドラフトと見積ドラフトを社内レビューし、未確定の範囲・金額・開始日を確認する";

  const summaryParts = [
    context.brief?.overview ? `対象: ${context.brief.overview}` : null,
    notes ? `商談メモ: ${notes.slice(0, 180)}` : "商談メモは未記入のため、内容は要確認。",
    objections.length > 0 ? `懸念: ${objections.join(" / ")}` : null,
    agreed.length > 0 ? `合意候補: ${agreed.join(" / ")}` : "合意事項は要確認。",
  ].filter(Boolean);

  return {
    summary: summaryParts.join(" "),
    customerNeeds: needs.length > 0 ? needs : ["要確認"],
    objections: objections.length > 0 ? objections : ["商談上の新規反論は要確認"],
    agreedPoints: agreed.length > 0 ? agreed : ["要確認"],
    unresolvedPoints: unresolved,
    nextAction,
  };
}

async function refineSummaryWithLlm(
  fallback: MeetingSummary,
  context: MeetingContext
): Promise<MeetingSummary> {
  const config = getCompatibleAiConfig();
  if (!config) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "商談メモを整理しJSONだけ返す。キー: summary, customerNeeds, objections, agreedPoints, unresolvedPoints, nextAction。話していない内容は事実にしない。不明は要確認。金額を作らない。",
          },
          {
            role: "user",
            content: JSON.stringify({
              fallback,
              rawNotes: context.rawNotes,
              brief: context.brief,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return fallback;
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return fallback;
    const parsed = JSON.parse(content.slice(start, end + 1)) as Partial<MeetingSummary>;
    return {
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : fallback.summary,
      customerNeeds: Array.isArray(parsed.customerNeeds)
        ? parsed.customerNeeds.filter((item): item is string => typeof item === "string")
        : fallback.customerNeeds,
      objections: Array.isArray(parsed.objections)
        ? parsed.objections.filter((item): item is string => typeof item === "string")
        : fallback.objections,
      agreedPoints: Array.isArray(parsed.agreedPoints)
        ? parsed.agreedPoints.filter((item): item is string => typeof item === "string")
        : fallback.agreedPoints,
      unresolvedPoints: Array.isArray(parsed.unresolvedPoints)
        ? parsed.unresolvedPoints.filter((item): item is string => typeof item === "string")
        : fallback.unresolvedPoints,
      nextAction:
        typeof parsed.nextAction === "string" && parsed.nextAction.trim()
          ? parsed.nextAction.trim()
          : fallback.nextAction,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown AI error";
    console.error("[ai/meeting] summary refine failed:", message);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

export async function summarizeMeeting(
  context: MeetingContext
): Promise<MeetingSummary> {
  const fallback = buildDeterministicMeetingSummary(context);
  return refineSummaryWithLlm(fallback, context);
}

export function scoreLeadAfterMeeting(
  lead: SalesLeadRow,
  rawNotes: string
): ScoreResult {
  const conversation = parseConversation(lead.conversation);
  if (rawNotes.trim()) {
    conversation.push({
      role: "user",
      content: rawNotes.trim(),
      createdAt: new Date().toISOString(),
    });
  }
  return scoreLead(scoreInputFromLeadConversation(lead, conversation));
}
