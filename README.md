# PriceSense

フリーランス向けの単価診断と、診断結果をLead・AI提案・人間確認・RevOpsまでつなぐWebサービス。
ネイティブアプリの配信、AIチャット、営業メールの自動送信はありません。

## 技術スタック

- **Next.js 15**（App Router）
- **Supabase** — リード・サブスクリプション状態の保存
- **Resend** — 診断結果PDFのメール送信
- **Stripe** — Premium決済・契約管理
- **Google Analytics 4** — 利用状況の計測

## ローカル開発

```bash
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000` で起動します。

## 環境変数の設定

`.env.example` を `.env.local`（本番はホスティングの環境変数画面）にコピーし、値を設定します。

| 変数 | 公開 | 説明 |
|------|------|------|
| `NEXT_PUBLIC_APP_URL` | Yes | 本番ドメイン（例: `https://example.com`）。canonical・sitemap・Stripeリダイレクトに使用 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Yes | GA4の測定ID（`G-XXXXXXXX`） |
| `NEXT_PUBLIC_LEAD_API_ENABLED` | Yes | **未使用**。Lead保存は `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` で制御 |
| `NEXT_PUBLIC_DEBUG_MODE` | Yes | 開発用リードデバッグパネル。本番は `false` |
| `SUPABASE_URL` | No | SupabaseプロジェクトURL |
| `SUPABASE_SERVICE_ROLE_KEY` | No | サービスロールキー（**クライアントに公開しない**） |
| `RESEND_API_KEY` | No | Resend APIキー（診断PDFの依頼時送信） |
| `RESEND_FROM_EMAIL` | No | 送信元メール（例: `PriceSense <noreply@yourdomain.com>`） |
| `STRIPE_SECRET_KEY` | No | Stripeシークレットキー |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook署名シークレット |
| `STRIPE_PRICE_ID` | No | Premium月額プランの Price ID |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | No | OpenAI互換のサーバー専用設定。未設定時は決定論フォールバック |
| `ADMIN_TOKEN` | No | 管理API・営業ワークスペース用。**未設定は fail closed（401）** |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key（Googleログイン用。Service Roleではない） |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google Cloud OAuth Web Client。Supabase Auth Google Provider に設定。**クライアントに公開しない** |
| `APOLLO_API_KEY` / `CLAY_API_KEY` / `INSTANTLY_API_KEY` / `SALES_MARKER_API_KEY` / `SANSAN_API_KEY` | No | 未設定時は「未接続」。架空データは出さない |
| `NEXT_PUBLIC_LEGAL_*` | Yes | 特商法・プライバシー等の表示用運営者情報 |

---

## Supabase セットアップ

### 1. プロジェクト作成

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. **Settings → API** から以下を取得し `.env.local` に設定
   - `SUPABASE_URL` → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → `service_role` key

### 2. テーブル作成

Supabase Dashboard の **SQL Editor** で `supabase/schema.sql` を実行します（`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` のため再実行可能）。既存テーブルを DROP / 再作成しないでください。

Day-11以前に作成した本番DBには、加算分として `supabase/day-11-sales-ops.sql` を実行します。追加される主な列（`sales_action_events`）:

- `status` / `error` / `completed_at`
- `actor_kind` / `retry_of` / `attempt`
- `external_delivery` / `approval_required`

営業オペレーション系テーブルは RLS 有効・ポリシーなし（anon は読めず、`service_role` のみサーバーからアクセス）です。

作成・更新される主なテーブル:

- `leads` — PDF保存・ウェイトリスト登録時のリード
- `premium_subscriptions` — Stripeサブスクリプション状態
- `sales_action_events` — 営業アクション監査
- `sales_deals` / `deal_followup_events` / `sales_followups` / `lead_followups` / `followup_events`
- `sales_handoffs` / `sales_meetings` / `proposal_drafts` / `quote_drafts`
- `objection_bank` / `objection_events`

### 3. 動作確認

Supabase が設定された状態で PDF保存すると、`leads` テーブルへレコードが追加されます（同一メール・同一診断の24時間以内の再保存は新規行を作りません）。

---

## Resend セットアップ

診断PDFをメールで送る場合に設定します。未設定時はローカルダウンロードのみ動作します。

### 1. APIキー

1. [Resend](https://resend.com/) でアカウント作成
2. **API Keys** からキーを発行 → `RESEND_API_KEY`

### 2. 送信ドメイン

1. **Domains** で送信ドメインを追加・DNS認証
2. 認証済みアドレスを `RESEND_FROM_EMAIL` に設定

例:

```env
RESEND_FROM_EMAIL=PriceSense <noreply@yourdomain.com>
```

### 3. 動作確認

Supabase・Resend両方が設定されている状態で PDF保存すると、`deliveryMode: "email"` となり登録メールにPDFが届きます。

---

## Stripe セットアップ

Premium（月額1,480円）のサブスクリプション決済に使用します。

### 1. 商品・Priceの作成

1. [Stripe Dashboard](https://dashboard.stripe.com/) → **Products**
2. 月額 **¥1,480**（税込）のサブスクリプション商品を作成
3. 作成した Price ID を `STRIPE_PRICE_ID` に設定（`price_...`）

### 2. APIキー

**Developers → API keys** から:

- `STRIPE_SECRET_KEY` — シークレットキー（本番は `sk_live_...`）

### 3. Webhook

**Developers → Webhooks** でエンドポイントを追加:

| 項目 | 値 |
|------|-----|
| URL | `https://<your-domain>/api/stripe/webhook` |
| イベント | `checkout.session.completed` |
| | `customer.subscription.created` |
| | `customer.subscription.updated` |
| | `customer.subscription.deleted` |

作成後に表示される **Signing secret** を `STRIPE_WEBHOOK_SECRET` に設定します。

#### ローカル開発時

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

表示される `whsec_...` をローカルの `STRIPE_WEBHOOK_SECRET` に設定します。

### 4. 顧客ポータル（解約・支払い方法変更）

**Settings → Billing → Customer portal** でポータルを有効化します。

利用規約・FAQで案内している「Stripe顧客ポータル」は、フッターの **Premium契約管理** からアクセスできます。

### 5. リダイレクトURL

`NEXT_PUBLIC_APP_URL` を本番ドメインに設定してください。Checkout完了後は以下へ戻ります。

- 成功: `/?checkout=success&session_id={CHECKOUT_SESSION_ID}`
- キャンセル: `/?checkout=cancelled`

---

## Google Analytics 4 セットアップ

### 1. プロパティ作成

1. [Google Analytics](https://analytics.google.com/) で GA4 プロパティを作成
2. **データストリーム → ウェブ** から測定ID（`G-XXXXXXXX`）を取得
3. `NEXT_PUBLIC_GA_MEASUREMENT_ID` に設定

### 2. 計測イベント

以下のイベントが自動送信されます（未設定時は計測なし）:

| イベント名 | 内容 |
|-----------|------|
| `diagnosis_start` | 診断開始 |
| `diagnosis_complete` | 診断完了 |
| `pdf_export_click` | PDF保存クリック |
| `lead_registered` | メール登録 |
| `negotiation_open` | 交渉文モーダル表示 |
| `premium_preview_click` | Premiumプレビュークリック |
| `premium_upgrade_click` | Premiumアップグレードクリック |
| `premium_purchase_click` | Premium購入クリック |

---

## 本番デプロイ手順

### 1. 事前準備

- [ ] Supabase テーブル作成済み（`schema.sql`。既存本番は必要なら `day-11-sales-ops.sql`）
- [ ] `ADMIN_TOKEN` を本番に設定済み（未設定だと管理APIはすべて401）
- [ ] Stripe 商品・Webhook・顧客ポータル設定済み
- [ ] Resend ドメイン認証済み（メール送信する場合）
- [ ] GA4 測定ID取得済み
- [ ] 法的情報（`NEXT_PUBLIC_LEGAL_*`）入力済み

### 2. 環境変数

ホスティング（Vercel 等）の環境変数に `.env.example` の全項目を設定します。

本番で特に重要な値:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_DEBUG_MODE=false
ADMIN_TOKEN=<server-only>
```

### 3. ビルド確認

```bash
npm run build
npm run start
```

警告・エラーがゼロであることを確認してからデプロイします。

### 4. デプロイ後の動作確認

| 確認項目 | 期待結果 |
|---------|---------|
| トップページ診断 | 登録不要で診断可能 |
| PDF保存 | `leads` テーブルに保存 |
| PDFメール | 登録メールにPDF到達（Resend設定時） |
| Premium購入 | Checkout → Premium機能解放 |
| 契約管理 | フッターからStripeポータルへ遷移 |
| 営業ワークスペース | `/admin` でトークン入力後、今日の状況・アクション・監査・RevOps |
| 法的情報 | `/privacy` `/terms` `/legal` 表示 |
| SEO | `/robots.txt` `/sitemap.xml` アクセス可。`/account` `/admin` `/api/` は disallow |

---

## API エンドポイント

| メソッド | パス | 用途 |
|---------|------|------|
| POST | `/api/save-report` | リード登録・診断PDFメール（依頼時のみ） |
| GET | `/api/premium/status` | Premium状態確認 |
| GET | `/api/premium/account` | マイページのプラン確認 |
| POST | `/api/stripe/checkout` | Checkout Session作成 |
| POST | `/api/stripe/webhook` | Stripe Webhook |
| GET | `/api/stripe/session` | 決済完了後のセッション確認 |
| POST | `/api/stripe/portal` | 顧客ポータルURL発行 |
| GET/POST | `/api/ai/*` | 営業支援・監査（`ADMIN_TOKEN` 必須。未認証は401） |

---

## ディレクトリ構成（主要）

```
src/
├── app/              # ページ・APIルート
├── components/       # UIコンポーネント
├── lib/
│   ├── leads/        # リード登録クライアント
│   ├── analytics/    # GA4
│   ├── premium/      # Premium・Stripe連携
│   └── server/       # Supabase・Resend・Stripe（サーバー専用）
supabase/
└── schema.sql        # DBスキーマ
```