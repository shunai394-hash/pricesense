"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    );

    setLoading(false);
    if (resetError) {
      setError("リセットメールを送信できませんでした。");
      return;
    }
    setNotice("リセット用メールを送信しました。届いたリンクから新しいパスワードを設定してください。");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">パスワード再設定</h1>
        <p className="mt-2 text-sm text-gray-500">
          登録済みのメールアドレスに再設定リンクを送ります。
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "送信中..." : "リセットメールを送る"}
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-600">
          <Link href="/login" className="underline">
            ログインに戻る
          </Link>
        </p>
      </div>
    </main>
  );
}
