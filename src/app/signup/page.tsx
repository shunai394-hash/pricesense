"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    if (password.length < 8) {
      setLoading(false);
      setError("パスワードは8文字以上にしてください。");
      return;
    }

    const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
      },
    });

    if (signUpError) {
      setLoading(false);
      setError("アカウントを作成できませんでした。すでに登録済みの可能性があります。");
      return;
    }

    if (data.session) {
      window.location.assign("/app");
      return;
    }

    setLoading(false);
    setNotice("確認メールを送信しました。メール内のリンクを開いてからログインしてください。");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">アカウント作成</h1>
        <p className="mt-2 text-sm text-gray-500">
          メールアドレスとパスワードでPriceSenseに登録します。パスワードはSupabase Authで管理し、独自DBには保存しません。
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {notice}
          </p>
        ) : null}
        <form className="mt-6 space-y-3" onSubmit={(event) => void onSubmit(event)}>
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
            <span className="mb-1 block text-gray-500">パスワード（8文字以上）</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "作成中..." : "アカウントを作成"}
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-600">
          すでにアカウントがある場合は{" "}
          <Link href="/login" className="underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
