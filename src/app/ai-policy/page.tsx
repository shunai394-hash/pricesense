import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";
import { LEGAL_CONFIG } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI利用ポリシー",
  description:
    "PriceSense / AI営業部におけるAI支援の範囲と、人間による確認が必要な判断を定めます。",
  path: "/ai-policy",
});

export default function AiPolicyPage() {
  return (
    <LegalPageShell
      title="AI利用ポリシー"
      description={`${LEGAL_CONFIG.serviceName}のAI営業部は、営業活動を支援します。最終判断は人間が行います。`}
    >
      <LegalSection title="1. 支援の範囲">
        <p>
          AIは営業活動を支援します。優先度の提示、会話の整理、提案・見積・フォロー文面の下書き作成などが対象です。
        </p>
      </LegalSection>

      <LegalSection title="2. 正確性">
        <p>
          AI出力は必ずしも正確ではありません。診断結果、相場、提案内容、要約を事実として断定しないでください。
        </p>
      </LegalSection>

      <LegalSection title="3. 人間による確認">
        <p>重要な判断は人間が確認します。特に次の事項は人間が行います。</p>
        <ul>
          <li>契約の成立・拒否</li>
          <li>価格の確定、値引き、未提示金額の約束</li>
          <li>法務判断</li>
          <li>重要な外部連絡の実行</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. 自動実行しないこと">
        <ul>
          <li>AIが勝手に契約を成立させません。</li>
          <li>AIが勝手に値引きしません。</li>
          <li>AIが重要な外部連絡を勝手に行いません。</li>
          <li>現状、営業メールの自動送信は有効化されていません。</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. データの扱い">
        <ul>
          <li>架空情報を事実として扱いません。未確認事項は「要確認」とします。</li>
          <li>個人情報を必要以上に扱いません。営業ワークスペースは管理者認証が必要です。</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. お問い合わせ">
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
