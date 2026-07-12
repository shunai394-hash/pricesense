import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";
import { LEGAL_CONFIG } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "プライバシーポリシー",
  description:
    "PriceSenseにおける個人情報の取り扱いについて。メール登録、Stripe決済、Supabase、Google Analyticsの利用を含みます。",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="プライバシーポリシー"
      description={`${LEGAL_CONFIG.serviceName}（以下「当サービス」）は、ユーザーの個人情報を適切に保護するため、本プライバシーポリシーを定めます。`}
    >
      <LegalSection title="1. 事業者情報">
        <p>
          事業者名: {LEGAL_CONFIG.operatorName}
          <br />
          お問い合わせ:{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.contactEmail}`}
            className="text-accent hover:text-accent/80"
          >
            {LEGAL_CONFIG.contactEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. 収集する情報">
        <p>当サービスでは、以下の情報を収集する場合があります。</p>
        <ul>
          <li>メールアドレス（PDF保存時の登録、Premiumウェイトリスト登録時）</li>
          <li>
            診断コンテキスト（職種、日単価、市場平均、診断結果、目標単価など）
          </li>
          <li>
            決済関連情報（Stripeを通じたサブスクリプション状態。クレジットカード番号等は当サービスでは保持しません）
          </li>
          <li>
            アクセスログ・利用状況（Google Analyticsによる匿名化されたトラフィックデータ）
          </li>
          <li>ブラウザのローカルストレージに保存されるキャッシュ情報（メールアドレス、Premium状態など）</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 利用目的">
        <p>収集した情報は、以下の目的で利用します。</p>
        <ul>
          <li>単価診断サービスの提供</li>
          <li>診断結果PDFの保存・メール送信（Resend）</li>
          <li>リード情報の管理・保存（Supabase）</li>
          <li>Premiumプランの提供・課金管理（Stripe）</li>
          <li>サービス改善のための利用状況分析（Google Analytics）</li>
          <li>お問い合わせへの対応</li>
          <li>法令に基づく対応</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. 外部サービスの利用">
        <p>当サービスは、以下の外部サービスを利用しています。</p>
        <ul>
          <li>
            <strong className="text-foreground/90">Supabase</strong>
            — メール登録時のリード情報、Premiumサブスクリプション状態の保存
          </li>
          <li>
            <strong className="text-foreground/90">Resend</strong>
            — 診断結果PDFのメール送信
          </li>
          <li>
            <strong className="text-foreground/90">Stripe</strong>
            — Premiumプランの決済・サブスクリプション管理
          </li>
          <li>
            <strong className="text-foreground/90">Google Analytics（GA4）</strong>
            — アクセス解析（ページ閲覧、診断開始、PDF保存、Premium購入クリック等のイベント計測）
          </li>
        </ul>
        <p>
          各サービスのデータ取り扱いについては、各事業者のプライバシーポリシーもご確認ください。
        </p>
      </LegalSection>

      <LegalSection title="5. 診断データの取り扱い">
        <p>
          単価診断の入力・計算は、原則としてユーザーのブラウザ内で行われます。
          メール登録やPremium購入時に、診断コンテキストがサーバー（Supabase）に保存される場合があります。
        </p>
        <p>
          PDF保存時には、登録メールアドレスとともに診断情報が送信され、設定に応じてメール（Resend）でPDFが届くか、ブラウザでのダウンロードが行われます。
        </p>
      </LegalSection>

      <LegalSection title="6. Cookie・ローカルストレージ">
        <p>
          Google Analyticsの利用に伴い、Cookieが使用される場合があります。
          また、当サービスは利便性向上のため、ブラウザのローカルストレージにメールアドレスやPremium状態などを保存します。
        </p>
        <p>
          ブラウザの設定によりCookieを無効化できますが、一部機能が正常に動作しない場合があります。
        </p>
      </LegalSection>

      <LegalSection title="7. 第三者提供">
        <p>
          法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供することはありません。
          ただし、上記外部サービスへの業務委託に伴い、必要な範囲でデータが各事業者に送信されます。
        </p>
      </LegalSection>

      <LegalSection title="8. 安全管理">
        <p>
          個人情報の漏えい、滅失、毀損を防止するため、適切な安全管理措置を講じます。
          サーバー側のデータベースアクセスは認証情報により保護されます。
        </p>
      </LegalSection>

      <LegalSection title="9. 開示・訂正・削除">
        <p>
          ご本人から個人情報の開示、訂正、削除等のご請求があった場合、合理的な範囲で対応します。
          お問い合わせは下記メールアドレスまでご連絡ください。
        </p>
        <p>
          <a
            href={`mailto:${LEGAL_CONFIG.contactEmail}`}
            className="text-accent hover:text-accent/80"
          >
            {LEGAL_CONFIG.contactEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="10. ポリシーの変更">
        <p>
          本ポリシーは、法令の改正やサービス内容の変更に応じて改定する場合があります。
          重要な変更がある場合は、当サービス上でお知らせします。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
