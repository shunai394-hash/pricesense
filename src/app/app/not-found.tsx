import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";

export default function AppNotFound() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <EmptyState
        title="ページが見つかりません"
        description="指定されたAI営業部の画面は存在しません。"
      />
      <p className="mt-6 text-center">
        <Link href="/app" className="text-sm text-accent">
          ダッシュボードへ戻る
        </Link>
      </p>
    </main>
  );
}
