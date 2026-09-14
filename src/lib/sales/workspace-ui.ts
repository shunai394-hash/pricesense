import { classifyLeadTemperature, type LeadTemperature } from "@/lib/ai/revops";
import type { ActionPriority, ActionType } from "@/lib/ai/sales-actions";
import type { DealLostReason, DealStatus } from "@/lib/ai/deal";

export const APP_NAME = "AI営業部";
export const ADMIN_TOKEN_STORAGE_KEY = "pricesense.adminToken";

export type FollowupBucket =
  | "today"
  | "overdue"
  | "upcoming"
  | "stopped"
  | "done";

export const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  HOT_HANDOFF: "HOT Leadへの対応",
  PROPOSAL_WAITING: "提案待ち",
  NEGOTIATION: "交渉中",
  FOLLOWUP_DUE: "フォローアップ期限",
  WARM_REVIEW: "WARM Lead確認",
  NURTURE: "NURTURE",
};

export const PRIORITY_LABEL: Record<ActionPriority, string> = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
};

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  proposal_ready: "提案準備",
  proposal_sent: "提案送付済み",
  awaiting_response: "返信待ち",
  negotiating: "交渉中",
  won: "成約",
  lost: "失注",
};

export const LOST_REASON_LABEL: Record<DealLostReason, string> = {
  price: "価格",
  competitor: "競合",
  timing: "時期",
  budget: "予算",
  no_need: "必要性なし",
  internal_approval: "社内承認",
  unknown: "不明",
};

export const TEMPERATURE_LABEL: Record<LeadTemperature, string> = {
  hot: "HOT",
  warm: "WARM",
  nurture: "NURTURE",
};

export const FOLLOWUP_BUCKET_LABEL: Record<FollowupBucket, string> = {
  today: "今日",
  overdue: "期限超過",
  upcoming: "今後",
  stopped: "停止済み",
  done: "完了",
};

export function leadTemperature(input: {
  score?: number | null;
  escalationStatus?: string | null;
}): LeadTemperature {
  return classifyLeadTemperature({
    score: input.score,
    escalation_status: input.escalationStatus,
  });
}

export function dealStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return DEAL_STATUS_LABEL[status as DealStatus] ?? status;
}

export function lostReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "—";
  return LOST_REASON_LABEL[reason as DealLostReason] ?? reason;
}

export function actionTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return ACTION_TYPE_LABEL[type as ActionType] ?? type;
}

export function formatUtc(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return `${new Date(parsed).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

export function formatAmount(
  value: number | null | undefined,
  currency?: string | null
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function categorizeFollowup(input: {
  nextFollowupAt: string | null;
  followupStatus?: string | null;
  stopReason?: string | null;
  dealStatus?: string | null;
  now?: Date;
}): FollowupBucket {
  if (input.dealStatus === "won" || input.dealStatus === "lost") return "done";
  if (input.followupStatus === "closed") return "done";
  if (
    input.followupStatus === "stopped" ||
    Boolean(input.stopReason) ||
    input.followupStatus === "closed"
  ) {
    return "stopped";
  }

  if (!input.nextFollowupAt) return "upcoming";
  const due = Date.parse(input.nextFollowupAt);
  if (Number.isNaN(due)) return "upcoming";

  const now = input.now ?? new Date();
  const today = utcDayStart(now);
  const tomorrow = today + 24 * 60 * 60 * 1000;
  if (due < today) return "overdue";
  if (due < tomorrow) return "today";
  return "upcoming";
}

export function leadDisplayName(input: {
  categoryName?: string | null;
  email?: string | null;
  leadId: string;
}): string {
  return input.categoryName || input.email || input.leadId;
}
