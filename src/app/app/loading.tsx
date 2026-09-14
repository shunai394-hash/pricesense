import { LoadingState } from "@/components/ui/primitives";

export default function AppLoading() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <LoadingState label="AI営業部を読み込み中…" />
    </main>
  );
}
