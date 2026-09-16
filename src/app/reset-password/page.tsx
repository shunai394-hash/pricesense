"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void supabaseBrowser.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
    });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください。");
      return;
    }
    if (password !== confirm) {
      setError("確認用パスワードが一致しません。");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({
      password,
    });
    setLoading(false);
    if (updateError) {
      setError("パスワードを更新できませんでした。リンクの有効期限を確認してください。");
      return;
    }
    setNotice("パスワードを更新しました。");
    window.setTimeout(() => {
      window.location.assign("/app");
    }, 800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">新しいパスワード</h1>
        <p className="mt-2 text-sm text-gray-500">
          メールのリンクから開いた場合のみ更新できます。
        </p>
        {hasSession === false ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            有効な再設定セッションがありません。
            <Link href="/forgot-password" className="ml-1 underline">
              再設定メールを送り直す
            </Link>
          </p>
        ) : null}
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
            <span className="mb-1 block text-gray-500">新しいパスワード</span>
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
          <label className="block text-sm">
            <span className="mb-1 block text-gray-500">新しいパスワード（確認）</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </label>
          <button
            type="submit"
            disabled={loading || hasSession === false}
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "更新中..." : "パスワードを更新"}
          </button>
        </form>
      </div>
    </main>
  );
}
