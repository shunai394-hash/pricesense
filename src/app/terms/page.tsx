import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";
import { LEGAL_CONFIG } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";
import { PREMIUM_MONTHLY_PRICE } from "@/lib/pricing";

export const metadata: Metadata = createPageMetadata({
  title: "利用規約",
  description:
    "PriceSenseの利用規約。無料診断、Premiumプラン、メール登録、Stripe決済に関する条件を定めます。",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPageShell
      title="利用規約"
      description={`本規約は、${LEGAL_CONFIG.serviceName}（以下「当サービス」）の利用条件を定めるものです。ユーザーは本規約に同意のうえ、当サービスをご利用ください。`}
    >
      <LegalSection title="第1条（適用）">
        <p>
          本規約は、当サービスの利用に関する当社とユーザーとの間の権利義務関係を定めることを目的とし、ユーザーと当社との間の当サービスの利用に関わる一切の関係に適用されます。
        </p>
      </LegalSection>

      <LegalSection title="第2条（サービス内容）">
        <p>当サービスは、フリーランス等の単価診断および関連機能を提供するウェブサービスです。主な機能は以下のとおりです。</p>
        <ul>
          <li>職種・日単価に基づく市場比較診断（無料）</li>
          <li>年間機会損失の試算</li>
          <li>交渉文サンプルの表示</li>
          <li>診断結果PDFの保存（メール登録時）</li>
          <li>
            Premiumプラン（月額
            {PREMIUM_MONTHLY_PRICE.toLocaleString("ja-JP")}
            円）による詳細レポート、交渉文全文生成、断り対応文等
          </li>
        </ul>
        <p>
          相場データは参考値であり、個別案件の条件により実際の適正単価は異なります。
        </p>
      </LegalSection>

      <LegalSection title="第3条（利用登録）">
        <p>
          単価診断自体は登録不要で利用できます。
          PDF保存、Premiumウェイトリスト登録、Premium購入時にはメールアドレス等の情報登録が必要となる場合があります。
          登録情報は Supabase に保存され、PDF送信には Resend が利用されます。
        </p>
      </LegalSection>

      <LegalSection title="第4条（Premiumプラン・決済）">
        <ul>
          <li>
            Premiumプランは月額
            {PREMIUM_MONTHLY_PRICE.toLocaleString("ja-JP")}
            円（税込）のサブスクリプションです。
          </li>
          <li>決済は Stripe を通じて行われ、クレジットカード等が利用できます。</li>
          <li>決済完了後、Premium機能が利用可能となります。</li>
          <li>解約は Stripe の顧客ポータルまたは当社所定の方法により行えます。</li>
          <li>解約後も当該請求期間の終了までは Premium 機能を利用できる場合があります。</li>
        </ul>
      </LegalSection>

      <LegalSection title="第5条（禁止事項）">
        <p>ユーザーは、以下の行為を行ってはなりません。</p>
        <ul>
          <li>法令または公序良俗に違反する行為</li>
          <li>当サービスの運営を妨害する行為</li>
          <li>不正アクセス、リバースエンジニアリング等の技術的妨害</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>虚偽の情報を登録する行為</li>
          <li>当サービスのコンテンツを無断で複製・転載・再配布する行為</li>
          <li>その他、当社が不適切と判断する行為</li>
        </ul>
      </LegalSection>

      <LegalSection title="第6条（免責事項）">
        <ul>
          <li>
            当サービスは診断結果・交渉文等を参考情報として提供するものであり、単価交渉の結果や収入を保証するものではありません。
          </li>
          <li>
            相場データの正確性・完全性・最新性について、当社は合理的な努力を行いますが、保証しません。
          </li>
          <li>
            外部サービス（Supabase、Resend、Stripe、Google Analytics等）の障害により生じた損害について、当社の故意または重過失がない限り責任を負いません。
          </li>
          <li>
            当社の責任は、ユーザーに現実に生じた直接かつ通常の損害の範囲に限定され、Premium利用料の直近1か月分を上限とする場合があります。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="第7条（知的財産権）">
        <p>
          当サービスに関する著作権、商標権その他の知的財産権は当社または正当な権利者に帰属します。
          ユーザーが生成した交渉文等はユーザー自身の責任において利用してください。
        </p>
      </LegalSection>

      <LegalSection title="第8条（サービスの変更・停止）">
        <p>
          当社は、ユーザーへの事前通知なく、当サービスの内容変更、一時停止、終了を行う場合があります。
          Premiumの価格・機能は予告なく変更される場合があり、変更後の内容は当サービス上で告知します。
        </p>
      </LegalSection>

      <LegalSection title="第9条（規約の変更）">
        <p>
          当社は、必要に応じて本規約を変更できます。変更後の規約は、当サービス上に掲載した時点から効力を生じます。
          変更後に当サービスを利用した場合、変更に同意したものとみなします。
        </p>
      </LegalSection>

      <LegalSection title="第10条（準拠法・管轄）">
        <p>
          本規約は日本法に準拠します。当サービスに関する紛争については、当社所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </LegalSection>

      <LegalSection title="第11条（お問い合わせ）">
        <p>
          本規約に関するお問い合わせは、以下までご連絡ください。
          <br />
          <a
            href={`mailto:${LEGAL_CONFIG.contactEmail}`}
            className="text-accent hover:text-accent/80"
          >
            {LEGAL_CONFIG.contactEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="第12条（AIの利用・営業自動化・人間による確認）">
        <p>
          当サービスは、診断の補助および内部の営業オペレーション（優先度の提示、提案・見積の下書き、フォローアップ案の作成等）にAIを利用する場合があります。
        </p>
        <ul>
          <li>AIの判断は参考情報であり、法的助言、成約の保証、または契約の成立ではありません。</li>
          <li>
            営業メール、電話、カレンダー登録などの外部アクションは、AIが単独で実行しません。実行する場合は管理者が確認したうえで、認証された管理API経由でのみ行います。
          </li>
          <li>
            同一の営業アクションは冪等キーにより重複実行を防止します。失敗した場合は監査ログに残り、管理者が理由を確認したうえで再実行またはキャンセルできます。
          </li>
          <li>
            提案書・見積は下書きとして保存され、ユーザーへの自動送付や契約の自動締結は行いません。
          </li>
          <li>
            管理者画面および営業実行APIへのアクセスは、管理者トークンが設定され、かつ一致する場合に限ります。
          </li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
