"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatYen, type DiagnosisLevel } from "@/lib/calculator";
import { isValidEmail } from "@/lib/leadCapture";
import { LEGAL_CONFIG } from "@/lib/legal";
import {
  cacheLeadEmail,
  getCachedLeadEmail,
  getCachedLeadRecord,
  type LeadRecord,
} from "@/lib/leads";
import {
  fetchPremiumAccount,
  type PremiumAccountResponse,
} from "@/lib/premium/account";
import { openBillingPortal } from "@/lib/premium/portal";
import { cachePremiumStatus } from "@/lib/premium/storage";
import { PRICING_PLANS } from "@/lib/pricing";

const DIAGNOSIS_LEVEL_LABELS: Record<DiagnosisLevel, string> = {
  significantly_low: "大幅に低位",
  below_market: "やや低位",
  at_market: "市場水準",
  above_market: "やや上位",
  premium: "上位水準",
};

function formatPeriodEnd(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatSavedAt(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(account: PremiumAccountResponse): string {
  if (account.cancelAtPeriodEnd && account.isPremium) {
    return "今期末で解約予定";
  }

  switch (account.status) {
    case "active":
      return "契約中";
    case "trialing":
      return "トライアル中";
    case "past_due":
      return "支払い確認中";
    case "unpaid":
      return "未払い";
    case "canceled":
      return "解約済み";
    case "incomplete":
    case "incomplete_expired":
      return "手続き未完了";
    case "paused":
      return "一時停止";
    default:
      return account.isPremium ? "契約中" : "未契約";
  }
}

function DiagnosisSnapshot({ record }: { record: LeadRecord }) {
  const savedAt = formatSavedAt(record.createdAt);
  const levelLabel = record.diagnosisLevel
    ? DIAGNOSIS_LEVEL_LABELS[record.diagnosisLevel]
    : null;

  return (
    <div className="mt-8 rounded-2xl border border-border/80 bg-surface/40 p-5 sm:p-6">
      <p className="text-xs font-medium text-muted">この端末の診断結果</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
        {record.categoryName ?? "単価診断"}
      </h2>
      {savedAt ? (
        <p className="mt-1 text-xs text-muted">保存日時: {savedAt}</p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">登録メール</dt>
          <dd className="mt-0.5 break-all text-foreground">{record.email}</dd>
        </div>
        <div>
          <dt className="text-muted">診断レベル</dt>
          <dd className="mt-0.5 text-foreground">{levelLabel ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">現在単価</dt>
          <dd className="mt-0.5 text-foreground">
            {typeof record.userRate === "number"
              ? `${formatYen(record.userRate)} / 日`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">市場平均（参考）</dt>
          <dd className="mt-0.5 text-foreground">
            {typeof record.marketRate === "number"
              ? `${formatYen(record.marketRate)} / 日`
              : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        PDFは保存時にこの端末へダウンロードされます。クラウド上のファイルロッカーではありません。再取得する場合は診断結果から再度PDFを保存してください。メール送信は保存を依頼したときのみです。
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/diagnosis"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
        >
          診断に戻って次の行動を見る
        </Link>
        <a
          href={`mailto:${LEGAL_CONFIG.contactEmail}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent/40"
        >
          問い合わせる
        </a>
      </div>
    </div>
  );
}

export function AccountPageContent() {
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<PremiumAccountResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [cachedLead, setCachedLead] = useState<LeadRecord | null>(null);

  const lookupAccount = async (lookupEmail: string) => {
    const normalized = lookupEmail.trim();

    if (!isValidEmail(normalized)) {
      setError("有効なメールアドレスを入力してください");
      setAccount(null);
      setHasLookedUp(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setPortalError(null);

    const result = await fetchPremiumAccount(normalized);

    cacheLeadEmail(normalized);
    cachePremiumStatus({
      isPremium: result.isPremium,
      email: normalized,
      checkedAt: new Date().toISOString(),
    });

    setAccount(result);
    setHasLookedUp(true);
    setIsLoading(false);
  };

  useEffect(() => {
    setCachedLead(getCachedLeadRecord());
    const cached = getCachedLeadEmail();
    if (!cached) return;

    setEmail(cached);
    lookupAccount(cached);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    lookupAccount(email);
  };

  const handleCancel = async () => {
    setIsPortalLoading(true);
    setPortalError(null);

    const result = await openBillingPortal(email);

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    setIsPortalLoading(false);
    setPortalError(result.error ?? "契約管理ページを開けませんでした");
  };

  const periodEndLabel = formatPeriodEnd(account?.currentPeriodEnd);
  const canManageSubscription = Boolean(account?.hasCustomerId);
  const canCancel =
    canManageSubscription &&
    Boolean(account?.isPremium) &&
    !account?.cancelAtPeriodEnd;

  return (
    <section className="px-6 pb-24 pt-16 sm:pt-24">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-medium tracking-widest text-accent">
          Account
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
          マイページ
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          診断結果・Lead情報・プランを確認できます。パスワードログインやアプリのダウンロードはありません。PDF保存またはPremium購入時に登録したメールアドレスで確認します。
        </p>

        <ol className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
          {[
            "1. トップで単価診断する",
            "2. 結果を確認する",
            "3. PDF保存でLead登録する",
            "4. 交渉文・次の行動を見る",
          ].map((step) => (
            <li
              key={step}
              className="rounded-xl border border-border/70 bg-surface/40 px-4 py-3 text-foreground/90"
            >
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">
          営業メールの自動送信はありません。プラン確認のあとに、診断へ戻ることもできます。
        </p>

        {cachedLead ? (
          <DiagnosisSnapshot record={cachedLead} />
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border/80 bg-surface/30 p-5 sm:p-6">
            <p className="text-sm font-medium text-foreground">
              この端末に保存された診断結果はまだありません
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              トップで診断し、PDFを保存するとLeadとして登録され、ここに表示されます。
            </p>
            <Link
              href="/diagnosis"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
            >
              無料診断を始める
            </Link>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-2xl border border-border/80 bg-surface/40 p-5 sm:p-6"
        >
          <label
            htmlFor="account-email"
            className="text-sm font-medium text-foreground"
          >
            登録メールアドレス
          </label>
          <p className="mt-1 text-xs text-muted">
            Premium購入時、またはPDF保存時に登録したメールアドレスを入力してください。
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent/60 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="shrink-0 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              {isLoading ? "確認中..." : "プランを確認"}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-accent/90">{error}</p>
          )}
        </form>

        {hasLookedUp && account && (
          <div className="mt-6 rounded-2xl border border-border/80 bg-surface/40 p-5 sm:p-6">
            <p className="text-xs font-medium text-muted">現在のプラン</p>
            <p className="mt-2 font-display text-2xl font-semibold text-foreground">
              {account.hasCustomerId
                ? PRICING_PLANS.premium.label
                : PRICING_PLANS.free.label}
            </p>
            <p className="mt-1 text-sm text-muted">{statusLabel(account)}</p>

            {periodEndLabel && (
              <p className="mt-4 text-sm leading-relaxed text-foreground/85">
                {account.cancelAtPeriodEnd
                  ? `ご利用期限: ${periodEndLabel}（この日までPremiumを利用できます）`
                  : account.isPremium
                    ? `次回更新日: ${periodEndLabel}`
                    : `契約終了日: ${periodEndLabel}`}
              </p>
            )}

            {account.isPremium && !account.cancelAtPeriodEnd && (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                解約後も、当該請求期間の終了まではPremium機能をご利用いただけます。
              </p>
            )}

            {portalError && (
              <p className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-xs text-accent">
                {portalError}
              </p>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPortalLoading}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
              >
                {isPortalLoading
                  ? "契約管理ページへ移動中..."
                  : "サブスクリプションを解約"}
              </button>
            )}

            {canManageSubscription && account.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPortalLoading}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
              >
                {isPortalLoading
                  ? "契約管理ページへ移動中..."
                  : "契約を管理（再開・確認）"}
              </button>
            )}

            {!account.isPremium && (
              <div className="mt-6 grid gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90"
                >
                  料金プランを見る
                </Link>
                <Link
                  href="/diagnosis"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40"
                >
                  診断に戻る
                </Link>
              </div>
            )}

            {canCancel && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
                Stripeの契約管理ページで解約手続きを行います。PriceSense側の契約状態も連動して更新されます。
              </p>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          データ削除やその他のお問い合わせは{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.contactEmail}`}
            className="text-accent hover:text-accent/80"
          >
            {LEGAL_CONFIG.contactEmail}
          </a>
        </p>
      </div>
    </section>
  );
}
