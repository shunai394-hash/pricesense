"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ERROR_COPY: Record<string, string> = {
  oauth: "Googleログインに失敗しました。もう一度お試しください。",
  config: "ログイン設定が不足しています。管理者に連絡してください。",
  email: "メールログインに失敗しました。メールアドレスとパスワードを確認してください。",
  verify: "確認メールのリンクが無効か期限切れです。",
};

function nextPath(): string {
  if (typeof window === "undefined") return "/app";
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/app";
}

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const errorCode = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("error") ?? "";
  }, []);

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setFormError("");

    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`,
      },
    });

    if (error) {
      console.error("[google-login]", error.message);
      setGoogleLoading(false);
      setFormError("Googleログインに失敗しました。");
    }
  }

  async function signInWithEmail(event: FormEvent) {
    event.preventDefault();
    setEmailLoading(true);
    setFormError("");

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setEmailLoading(false);
      setFormError(
        error.message.toLowerCase().includes("email not confirmed")
          ? "メールアドレスの確認が完了していません。確認メールをチェックしてください。"
          : "メールアドレスまたはパスワードが正しくありません。"
      );
      return;
    }

    window.location.assign(nextPath());
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">PriceSense</h1>
          <p className="mt-2 text-sm text-gray-500">AI営業部にログイン</p>

          {errorCode ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {ERROR_COPY[errorCode] ?? "ログインできませんでした。"}
            </p>
          ) : null}
          {formError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-gray-900">Googleでログイン</h2>
            <p className="mt-1 text-xs text-gray-500">
              既存のGoogleアカウント連携はそのまま使えます。
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={googleLoading || emailLoading}
              className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {googleLoading ? "Googleに接続中..." : "Googleでログイン"}
            </button>
          </section>

          <div className="my-8 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            または
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <section>
            <h2 className="text-sm font-semibold text-gray-900">メールアドレスでログイン</h2>
            <form className="mt-3 space-y-3" onSubmit={(event) => void signInWithEmail(event)}>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-500">メールアドレス</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-500">パスワード</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                />
              </label>
              <button
                type="submit"
                disabled={emailLoading || googleLoading}
                className="flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {emailLoading ? "ログイン中..." : "メールアドレスでログイン"}
              </button>
            </form>
            <p className="mt-3 text-xs text-gray-500">
              <Link href="/forgot-password" className="underline">
                パスワードを忘れた場合
              </Link>
            </p>
          </section>

          <p className="mt-8 text-sm text-gray-600">
            初めての方は{" "}
            <Link href="/signup" className="font-medium text-gray-900 underline">
              アカウント作成
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
