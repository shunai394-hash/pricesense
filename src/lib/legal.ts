import { PREMIUM_MONTHLY_PRICE } from "@/lib/pricing";

/** Public legal / operator info (override via env for production). */
export const LEGAL_CONFIG = {
  serviceName: "PriceSense",
  appName: "AI営業部",
  operatorName:
    process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME ?? "PriceSense運営事務局",
  representativeName:
    process.env.NEXT_PUBLIC_LEGAL_REPRESENTATIVE_NAME ?? "（公開準備中）",
  address:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS ??
    "（公開準備中・お問い合わせよりご案内します）",
  contactEmail:
    process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? "support@pricesense.app",
  phone:
    process.env.NEXT_PUBLIC_LEGAL_PHONE ??
    "（メールにてお問い合わせください）",
  lastUpdated: "2026年9月15日",
  premiumPrice: PREMIUM_MONTHLY_PRICE,
} as const;

export const LEGAL_VERSIONS = {
  terms: "2026-09-15",
  privacy: "2026-09-15",
  aiPolicy: "2026-09-15",
  security: "2026-09-15",
  acceptableUse: "2026-09-15",
} as const;

export const LEGAL_LINKS = [
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/terms", label: "利用規約" },
  { href: "/legal", label: "特定商取引法に基づく表記" },
] as const;

export const LEGAL_POLICY_LINKS = [
  { href: "/ai-policy", label: "AI利用ポリシー" },
  { href: "/security", label: "セキュリティ" },
  { href: "/acceptable-use", label: "利用禁止事項" },
  { href: "/contact", label: "お問い合わせ" },
] as const;
