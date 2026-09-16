"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  HumanBadge,
  LoadingState,
  PageHeader,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";
import { LEGAL_CONFIG, LEGAL_VERSIONS } from "@/lib/legal";
import { APP_NAME } from "@/lib/sales/workspace-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface AccountResponse {
  isPremium?: boolean;
  plan?: string;
  status?: string;
}

export function SettingsPanel() {
  const { token, setToken, persist, clear, ready } = useAdminToken();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionPresent, setSessionPresent] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>("未確認");

  useEffect(() => {
    if (!ready) return;
    setSessionPresent(Boolean(token));
  }, [ready, token]);

  useEffect(() => {
    void supabaseBrowser.auth.getUser().then(({ data }) => {
      setGoogleEmail(data.user?.email ?? null);
      const provider = data.user?.app_metadata?.provider;
      setAuthProvider(typeof provider === "string" ? provider : "");
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    void fetch("/api/sales/integrations", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return;
        const json = (await response.json()) as {
          ai?: { configured?: boolean; model?: string | null };
        };
        setAiStatus(
          json.ai?.configured
            ? `設定済み${json.ai.model ? `（${json.ai.model}）` : ""}`
            : "未設定"
        );
      })
      .catch(() => {
        setAiStatus("未確認");
      });
  }, [token]);

  const loadAccount = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setAccount(null);
      setAccountError("メールアドレスを入力してください。");
      return;
    }
    setLoading(true);
    setAccountError(null);
    try {
      const response = await fetch(
        `/api/premium/account?email=${encodeURIComponent(trimmed)}`
      );
      const json = (await response.json()) as AccountResponse;
      setAccount(json);
    } catch {
      setAccount(null);
      setAccountError("アカウント情報を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={APP_NAME}
        title="Settings"
        description="保存されていない項目は表示しません。未実装の設定を架空保存することもありません。"
      />

      <AdminSessionBar
        token={token}
        onTokenChange={setToken}
        onSubmit={() => persist(token)}
        loading={false}
        submitLabel="セッションを保存"
      />

      <div className="space-y-6">
        <Card>
          <h2 className="font-display text-2xl">ログインアカウント</h2>
          <p className="mt-2 text-sm text-muted">
            {googleEmail
              ? `${googleEmail} で営業ワークスペースに入っています。${
                  authProvider === "google"
                    ? "（Googleログイン）"
                    : "（メールログイン）"
                }`
              : "ログインセッションが見つかりません。"}
          </p>
          <a
            href="/auth/logout"
            className="mt-3 inline-block rounded-lg border border-border px-4 py-2 text-sm"
          >
            ログアウト
          </a>
        </Card>

        <Card>
          <h2 className="font-display text-2xl">パスワード変更</h2>
          <p className="mt-2 text-sm text-muted">
            メール認証ユーザーはここでパスワードを変更できます。パスワード自体は独自DBへ保存しません。
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                setPasswordError("");
                setPasswordNotice("");
                if (newPassword.length < 8) {
                  setPasswordError("パスワードは8文字以上にしてください。");
                  return;
                }
                setPasswordSaving(true);
                const { error } = await supabaseBrowser.auth.updateUser({
                  password: newPassword,
                });
                setPasswordSaving(false);
                if (error) {
                  setPasswordError(
                    "パスワードを更新できませんでした。メールログインのセッションが必要です。"
                  );
                  return;
                }
                setNewPassword("");
                setPasswordNotice("パスワードを更新しました。");
              })();
            }}
          >
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="新しいパスワード"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={passwordSaving || !newPassword}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
            >
              {passwordSaving ? "更新中…" : "パスワードを変更"}
            </button>
          </form>
          {passwordError ? (
            <p className="mt-3 text-sm text-red-300">{passwordError}</p>
          ) : null}
          {passwordNotice ? (
            <p className="mt-3 text-sm text-accent">{passwordNotice}</p>
          ) : null}
        </Card>

        <Card>
          <h2 className="font-display text-2xl">Account</h2>
          <p className="mt-2 text-sm text-muted">
            このワークスペースの営業データ操作には管理者トークンが必要です。
            ログイン（Google / メール）と管理者APIは別です。
            Premiumの状態は、登録済みメールがあれば既存APIで確認できます。
          </p>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="登録メールアドレス"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadAccount()}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            {loading ? "確認中…" : "アカウント状態を確認"}
          </button>
          {accountError ? (
            <div className="mt-3">
              <ErrorState message={accountError} />
            </div>
          ) : null}
          {account ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Account status</dt>
                <dd className="mt-1 text-sm">
                  {account.status || account.plan || "free"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Plan</dt>
                <dd className="mt-1 text-sm">{account.plan || "free"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">
              メール未入力の場合、Account statusは表示しません。
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-2xl">AI</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">AI assistance status</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm">
                {aiStatus}
                <Badge tone="ai">AI提案</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Human approval required</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm">
                必須
                <HumanBadge />
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted">
            契約・価格・法務・重要な外部連絡は人間が確定します。この方針は設定でOFFにできません。
          </p>
        </Card>

        <Card>
          <h2 className="font-display text-2xl">Notifications</h2>
          <p className="mt-2 text-sm text-muted">
            Follow-up notification はアプリ内の「今日 / 期限超過」一覧で確認します。
            外部メール通知の自動送信は有効化されていません。
          </p>
          <Link href="/app/followups" className="mt-3 inline-block text-sm text-accent">
            フォローアップを開く
          </Link>
        </Card>

        <Card>
          <h2 className="font-display text-2xl">Security</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Session information</dt>
              <dd className="mt-1">
                {sessionPresent
                  ? "このブラウザのタブに管理者トークンが保存されています（sessionStorage）。"
                  : "管理者セッションはありません。"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Admin / session handling</dt>
              <dd className="mt-1 text-muted">
                管理APIはサーバー側の ADMIN_TOKEN と一致する場合のみ応答します。
                Service Role Key はクライアントに出しません。
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              セッションを破棄
            </button>
            <Link href="/admin/ops" className="rounded-lg border border-border px-4 py-2 text-sm">
              監査・復旧（互換画面）
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-2xl">Legal</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-muted">Terms version</dt>
              <dd className="mt-1">{LEGAL_VERSIONS.terms}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Privacy version</dt>
              <dd className="mt-1">{LEGAL_VERSIONS.privacy}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">AI Policy version</dt>
              <dd className="mt-1">{LEGAL_VERSIONS.aiPolicy}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Accepted timestamp</dt>
              <dd className="mt-1 text-muted">
                未記録（同意時刻を保存する仕組みはまだありません）
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">
            最終更新日の表示: {LEGAL_CONFIG.lastUpdated}
          </p>
        </Card>

        {loading ? <LoadingState label="アカウント確認中…" /> : null}
        {!token && ready ? (
          <EmptyState
            title="管理者セッションがありません"
            description="トークンを入力すると営業データにアクセスできます。"
          />
        ) : null}
      </div>
    </div>
  );
}
