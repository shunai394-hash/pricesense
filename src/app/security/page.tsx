import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";
import { LEGAL_CONFIG } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "セキュリティ",
  description:
    "PriceSense / AI営業部における秘密情報、管理者認証、アクセス制御、人間承認の方針です。完全な安全を保証するものではありません。",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <LegalPageShell
      title="セキュリティ"
      description="当サービスは、秘密情報の露出を避け、管理者操作と人間承認を前提に設計しています。これは「完全に安全」または「完全な法令遵守」を意味しません。"
    >
      <LegalSection title="Server-side secrets">
        <p>
          APIキー、管理者トークン、データベース接続情報などの秘密情報はサーバー側で扱います。
          ブラウザに配布するコードへ Service Role Key を埋め込む設計にはしていません。
        </p>
      </LegalSection>

      <LegalSection title="Supabase Service Role">
        <p>
          データベース管理用の Service Role はサーバーのみで使用します。
          公開HTMLやクライアントコンポーネントから読み出せる形では保持しません。
        </p>
      </LegalSection>

      <LegalSection title="Admin authentication">
        <p>
          営業ワークスペースと関連APIは、設定された管理者トークンと一致する場合に限り応答します。
          トークン未設定または不一致の場合、管理APIはデータを返しません（401）。
        </p>
      </LegalSection>

      <LegalSection title="Access control">
        <p>
          現在の営業ワークスペースは、認証された管理者向けの内部ツールです。
          一般ユーザーが他者のLead詳細へアクセスする画面は公開していません。
          Lead IDの形式が不正な場合は拒否します。管理者トークンを持つ操作者は、運用上必要な範囲でLeadを閲覧できます。
        </p>
      </LegalSection>

      <LegalSection title="Logging">
        <p>
          営業アクションの実行・失敗・再実行・キャンセルは監査ログに残します。
          ログにはクレジットカード番号や管理者トークンを含めません。
        </p>
      </LegalSection>

      <LegalSection title="Human approval">
        <p>
          契約、価格、法務、重要な外部連絡は人間の確認を必要とします。
          AIの提案を自動で外部送信する設定は、既定で有効にしていません。
        </p>
      </LegalSection>

      <LegalSection title="Data minimization">
        <p>
          診断・営業対応に必要な範囲の情報を扱います。未確認の内容を事実として保存・表示しない方針です。
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
