import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";
import { LEGAL_CONFIG } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "お問い合わせ",
  description: `${LEGAL_CONFIG.serviceName}およびAI営業部に関するお問い合わせ先です。`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <LegalPageShell
      title="お問い合わせ"
      description={`${LEGAL_CONFIG.serviceName}（AI営業部を含む）に関するご質問は、下記メールにて受け付けます。`}
    >
      <LegalSection title="連絡先">
        <p>
          メール:{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.contactEmail}`}
            className="text-accent hover:text-accent/80"
          >
            {LEGAL_CONFIG.contactEmail}
          </a>
        </p>
        <p>電話: {LEGAL_CONFIG.phone}</p>
        <p>
          運営: {LEGAL_CONFIG.operatorName}
          <br />
          所在地: {LEGAL_CONFIG.address}
        </p>
      </LegalSection>

      <LegalSection title="受付内容">
        <ul>
          <li>単価診断・Premiumプランに関する質問</li>
          <li>個人情報の開示・訂正・削除のご請求</li>
          <li>AI営業支援機能の利用に関する確認</li>
          <li>利用規約・ポリシーに関する問い合わせ</li>
        </ul>
        <p>
          通常、2営業日以内の返信を目安としています。内容によりお時間をいただく場合があります。
        </p>
      </LegalSection>

      <LegalSection title="ご注意">
        <p>
          当サービスは、AIが契約・見積・法務判断を確定したり、重要な外部連絡を自動送信したりすることはありません。
          営業上の重要な連絡は、人間の確認後に行われます。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
