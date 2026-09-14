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
            アクセスログ・利用状況（Google Analyticsを設定している場合の、匿名化されたトラフィックデータ）
          </li>
          <li>ブラウザのローカルストレージに保存されるキャッシュ情報（メールアドレス、Premium状態など）</li>
          <li>
            営業オペレーションの監査ログ（管理者による営業アクションの種別、実行状態、失敗理由、再実行の有無。クレジットカード番号や管理者トークンは含みません）
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 利用目的">
        <p>収集した情報は、以下の目的で利用します。</p>
        <ul>
          <li>単価診断サービスの提供</li>
          <li>診断結果PDFの保存・メール送信（Resend）</li>
          <li>リード情報の管理・保存（Supabase）</li>
          <li>Premiumプランの提供・課金管理（Stripe）</li>
          <li>サービス改善のための利用状況分析（計測を設定している場合）</li>
          <li>お問い合わせへの対応</li>
          <li>法令に基づく対応</li>
          <li>
            内部の営業オペレーション（リード対応の優先度判断、提案・見積ドラフトの作成、管理者による確認・実行履歴の監査）。当サービスは、AIがユーザーへ営業メールや電話を自動送信することはありません。
          </li>
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
            — 測定IDが設定されている場合のアクセス解析。未設定の環境では利用しません。
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

      <LegalSection title="8. 安全管理（保存・セキュリティ）">
        <p>
          個人情報の漏えい、滅失、毀損を防止するため、適切な安全管理措置を講じます。
          サーバー側のデータベースアクセスは認証情報により保護されます。
          保存期間は、サービス提供および監査に必要な範囲とし、不要になった情報は合理的な範囲で削除または匿名化します。
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

      <LegalSection title="11. AI営業支援・監査ログ・外部連絡">
        <p>
          当サービスは、単価診断に関連する問い合わせやリードについて、管理者が対応を判断できるよう内部でAIを利用する場合があります。AIの出力は参考情報であり、契約・見積・提案の最終判断は人間の管理者が行います。
        </p>
        <ul>
          <li>
            AIは営業メール、SMS、電話、カレンダー招待などの外部連絡を自動実行しません。診断結果PDFの送信（Resend）は、ユーザーが保存を依頼した場合に限ります。
          </li>
          <li>
            管理者権限はサーバー側の管理者トークンにより検証します。未設定または不一致の場合、管理APIはデータを返しません。
          </li>
          <li>
            営業アクションの実行履歴（判断内容、選択したアクション、承認の要否、実行結果、失敗理由、再実行）は監査目的で保存します。保持期間は運用上必要な範囲とし、法令に基づく請求があれば合理的な範囲で開示・訂正・削除に対応します。
          </li>
          <li>
            マイページはパスワードによるログインではなく、PDF保存またはPremium購入時に登録したメールアドレスでプランを確認する機能です。
          </li>
          <li>
            当サービスから営業目的のメール配信は行っていないため、営業メールの配信停止（オプトアウト）手続は不要です。診断PDFやお問い合わせ返信の停止を希望する場合は、下記メールまでご連絡ください。
          </li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
