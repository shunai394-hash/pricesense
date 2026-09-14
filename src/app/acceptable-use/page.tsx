import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";
import { LEGAL_CONFIG } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "利用禁止事項",
  description:
    "PriceSense / AI営業部の利用にあたり禁止する行為（spam、詐欺、なりすまし等）を定めます。",
  path: "/acceptable-use",
});

export default function AcceptableUsePage() {
  return (
    <LegalPageShell
      title="利用禁止事項"
      description={`${LEGAL_CONFIG.serviceName}およびAI営業部を、迷惑行為・違法行為・不正アクセスに利用することを禁じます。`}
    >
      <LegalSection title="禁止行為">
        <ul>
          <li>Spam（同意のない大量送信、迷惑な営業自動化）</li>
          <li>Fraud（詐欺、虚偽の提案、架空の成果保証）</li>
          <li>Impersonation（なりすまし、他者または当サービスの偽装）</li>
          <li>Harassment（嫌がらせ、脅迫、差別的な連絡）</li>
          <li>Illegal solicitation（違法な勧誘、無許可の金融・医薬等の勧誘）</li>
          <li>Privacy abuse（個人情報の不正取得・過剰な収集・無断公開）</li>
          <li>Unauthorized access（不正アクセス、他アカウントの探索）</li>
          <li>Malicious automation（悪意ある自動化、サービスの妨害）</li>
        </ul>
      </LegalSection>

      <LegalSection title="営業支援機能について">
        <p>
          AI営業部は、管理者の確認なしに外部へ営業メールを送りません。
          それでも、生成された文面を使って禁止行為を行うことはできません。
        </p>
      </LegalSection>

      <LegalSection title="措置">
        <p>
          禁止行為が確認された場合、アカウント停止、データの利用制限、法令に基づく対応を行うことがあります。
        </p>
      </LegalSection>

      <LegalSection title="お問い合わせ">
        <p>
          <a
            href={`mailto:${LEGAL_CONFIG.contactEmail}`}
            className="text-accent hover:text-accent/80"
          >
            {LEGAL_CONFIG.contactEmail}
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
