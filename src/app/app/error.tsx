"use client";

import { useEffect } from "react";
import { Button, ErrorState } from "@/components/ui/primitives";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl">読み込みエラー</h1>
      <div className="mt-4">
        <ErrorState message="営業ワークスペースの表示中に問題が発生しました。再試行するか、時間をおいてください。" />
      </div>
      <Button className="mt-6" type="button" onClick={reset}>
        再試行
      </Button>
    </main>
  );
}
