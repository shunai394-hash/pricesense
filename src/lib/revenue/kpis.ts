import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

/**
 * Revenue operating metrics for PriceSense.
 * North-star: revenue per completed diagnosis.
 *
 * In-app events cover the owned funnel. A8 approvals and ad revenue
 * are recorded in partner dashboards and combined here when reporting.
 */
export const NORTH_STAR_KPI = {
  id: "revenue_per_diagnosis",
  label: "1診断完了ユーザーあたり売上",
  formula: "総売上 ÷ 診断完了数",
} as const;

export const REVENUE_KPIS = [
  {
    id: "diagnosis_complete",
    label: "診断完了数",
    source: "GA4",
    event: ANALYTICS_EVENTS.diagnosisComplete,
  },
  {
    id: "affiliate_click",
    label: "A8クリック数",
    source: "GA4",
    event: ANALYTICS_EVENTS.affiliateClick,
  },
  {
    id: "a8_conversions",
    label: "A8成果件数",
    source: "A8.net レポート（承認件数）",
    event: null,
  },
  {
    id: "a8_approved_amount",
    label: "A8承認額",
    source: "A8.net レポート（承認報酬）",
    event: null,
  },
  {
    id: "negotiation_click",
    label: "単価交渉クリック数",
    source: "GA4",
    event: ANALYTICS_EVENTS.negotiationOpen,
  },
  {
    id: "negotiation_purchase",
    label: "単価交渉購入数",
    source: "GA4 + Stripe",
    event: ANALYTICS_EVENTS.purchaseCompleted,
  },
  {
    id: "premium_signup",
    label: "Premium登録数",
    source: "Stripe（新規サブスク）",
    event: ANALYTICS_EVENTS.purchaseCompleted,
  },
  {
    id: "ad_revenue",
    label: "広告収益",
    source: "A8バナー / もしも 管理画面（補助）",
    event: null,
  },
  {
    id: "gross_revenue",
    label: "総売上",
    source: "A8承認額 + Stripe売上 + 広告収益",
    event: null,
  },
  {
    id: "revenue_per_diagnosis",
    label: NORTH_STAR_KPI.label,
    source: NORTH_STAR_KPI.formula,
    event: null,
  },
] as const;

export const FUNNEL_EVENTS = [
  ANALYTICS_EVENTS.diagnosisStart,
  ANALYTICS_EVENTS.diagnosisComplete,
  ANALYTICS_EVENTS.nextActionView,
  ANALYTICS_EVENTS.nextActionClick,
  ANALYTICS_EVENTS.affiliateClick,
  ANALYTICS_EVENTS.negotiationOpen,
  ANALYTICS_EVENTS.checkoutStarted,
  ANALYTICS_EVENTS.purchaseCompleted,
] as const;
