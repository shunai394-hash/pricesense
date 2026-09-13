export const ANALYTICS_EVENTS = {
  diagnosisStart: "diagnosis_start",
  diagnosisComplete: "diagnosis_complete",
  nextActionView: "next_action_view",
  nextActionClick: "next_action_click",
  affiliateClick: "affiliate_click",
  negotiationOpen: "negotiation_open",
  checkoutStarted: "checkout_started",
  purchaseCompleted: "purchase_completed",
  pdfExportClick: "pdf_export_click",
  leadRegistered: "lead_registered",
  premiumPreviewClick: "premium_preview_click",
  premiumUpgradeClick: "premium_upgrade_click",
  /** @deprecated Use checkoutStarted. Kept so existing GA reports still receive a signal. */
  premiumPurchaseClick: "premium_purchase_click",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
