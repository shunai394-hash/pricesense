import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";
import { LEGAL_CONFIG } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "特定商取引法に基づく表記",
  description:
    "PriceSense Premiumの販売に関する特定商取引法に基づく表記。料金、支払方法、解約条件等を記載しています。",
  path: "/legal",
});

function LegalTableRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <th className="w-36 shrink-0 px-4 py-4 text-left align-top text-xs font-medium text-muted sm:w-44 sm:text-sm">
        {label}
      </th>
      <td className="px-4 py-4 text-sm leading-relaxed text-foreground/90">
        {children}
      </td>
    </tr>
  );
}

export default function LegalPage() {
  return (
    <LegalPageShell
      title="特定商取引法に基づく表記"
      description="PriceSense Premium（デジタルコンテンツ・サブスクリプション）の販売に関する法定表示です。"
    >
      <LegalSection title="販売事業者情報">
        <div className="overflow-hidden rounded-xl border border-border/80">
          <table className="w-full border-collapse">
            <tbody>
              <LegalTableRow label="販売事業者">
                {LEGAL_CONFIG.operatorName}
              </LegalTableRow>
              <LegalTableRow label="運営責任者">
                {LEGAL_CONFIG.representativeName}
              </LegalTableRow>
              <LegalTableRow label="所在地">
                {LEGAL_CONFIG.address}
              </LegalTableRow>
              <LegalTableRow label="お問い合わせ">
                <div className="space-y-1">
                  <p>
                    メール:{" "}
                    <a
                      href={`mailto:${LEGAL_CONFIG.contactEmail}`}
                      className="text-accent hover:text-accent/80"
                    >
                      {LEGAL_CONFIG.contactEmail}
                    </a>
                  </p>
                  <p className="text-xs text-muted">
                    ※ お問い合わせはメールにて受け付けております。通常2営業日以内に返信いたします。
                  </p>
                </div>
              </LegalTableRow>
              <LegalTableRow label="電話番号">
                {LEGAL_CONFIG.phone}
              </LegalTableRow>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="販売価格・支払い">
        <div className="overflow-hidden rounded-xl border border-border/80">
          <table className="w-full border-collapse">
            <tbody>
              <LegalTableRow label="販売価格">
                <p>
                  Premiumプラン: 月額
                  {LEGAL_CONFIG.premiumPrice.toLocaleString("ja-JP")}
                  円（税込）
                </p>
                <p className="mt-1 text-xs text-muted">
                  無料プラン（単価診断基本機能）は ¥0 です。
                </p>
              </LegalTableRow>
              <LegalTableRow label="商品代金以外の必要料金">
                インターネット接続料金、通信料金等はお客様のご負担となります。
              </LegalTableRow>
              <LegalTableRow label="支払方法">
                クレジットカード決済（Stripe）
              </LegalTableRow>
              <LegalTableRow label="支払時期">
                サブスクリプション申込時に初回決済が行われ、以降毎月自動更新時に課金されます。
              </LegalTableRow>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="サービス提供・解約">
        <div className="overflow-hidden rounded-xl border border-border/80">
          <table className="w-full border-collapse">
            <tbody>
              <LegalTableRow label="サービスの提供時期">
                Stripeによる決済完了後、直ちにPremium機能が利用可能となります。
              </LegalTableRow>
              <LegalTableRow label="提供内容">
                <ul className="list-disc space-y-1 pl-5">
                  <li>詳細レポート全文</li>
                  <li>交渉文全文生成（3パターン）</li>
                  <li>断られた場合の返答文</li>
                  <li>交渉文のコピー・編集</li>
                  <li>診断・交渉履歴の保存</li>
                </ul>
              </LegalTableRow>
              <LegalTableRow label="返品・キャンセル">
                <p>
                  デジタルコンテンツの性質上、決済完了後の返金は原則としてお受けできません。
                </p>
                <p className="mt-2">
                  サブスクリプションの解約は Stripe の顧客ポータルまたはお問い合わせにより行えます。
                  解約後も当該請求期間の終了までは Premium をご利用いただけます。
                </p>
              </LegalTableRow>
              <LegalTableRow label="動作環境">
                最新の主要ブラウザ（Chrome、Safari、Firefox、Edge等）を推奨します。
              </LegalTableRow>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="その他">
        <p>
          個人情報の取り扱いについては
          <a href="/privacy" className="mx-1 text-accent hover:text-accent/80">
            プライバシーポリシー
          </a>
          をご確認ください。サービス利用条件については
          <a href="/terms" className="mx-1 text-accent hover:text-accent/80">
            利用規約
          </a>
          をご確認ください。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
