import { getSiteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export function SoftwareApplicationStructuredData() {
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/#software`,
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
      description: "無料の基本単価診断",
    },
    featureList: [
      "職種別単価診断",
      "市場平均との比較",
      "年間機会損失の試算",
      "交渉文サンプル生成",
      "診断結果PDFの保存",
      "Leadとしての登録",
      "営業アクションの人間確認",
      "営業履歴の監査",
    ],
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: "ja-JP",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
