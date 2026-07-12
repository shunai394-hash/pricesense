export const ANALYTICS_EVENTS = {
  diagnosisStart: "diagnosis_start",
  diagnosisComplete: "diagnosis_complete",
  pdfExportClick: "pdf_export_click",
  leadRegistered: "lead_registered",
  negotiationOpen: "negotiation_open",
  premiumPreviewClick: "premium_preview_click",
  premiumUpgradeClick: "premium_upgrade_click",
  premiumPurchaseClick: "premium_purchase_click",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
