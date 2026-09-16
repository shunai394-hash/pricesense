"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ERROR_COPY: Record<string, string> = {
  oauth: "Googleログインに失敗しました。もう一度お試しください。",
  config: "ログイン設定が不足しています。管理者に連絡してください。",
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const errorCode = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("error") ?? "";
  }, []);

  async function signInWithGoogle() {
    setLoading(true);

    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[google-login]", error.message);
      setLoading(false);
      alert("Googleログインに失敗しました。");
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">
            PriceSense
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            AI営業部にログイン
          </p>

          {errorCode ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {ERROR_COPY[errorCode] ?? "ログインできませんでした。"}
            </p>
          ) : null}

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Googleに接続中..." : "Googleでログイン"}
          </button>
        </div>
      </div>
    </main>
  );
}
