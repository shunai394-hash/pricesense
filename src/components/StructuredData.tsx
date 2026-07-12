import { LEGAL_CONFIG } from "@/lib/legal";
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  SITE_NAME,
} from "@/lib/seo";

export function StructuredData() {
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        email: LEGAL_CONFIG.contactEmail,
        description: DEFAULT_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        description: DEFAULT_DESCRIPTION,
        inLanguage: "ja-JP",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
