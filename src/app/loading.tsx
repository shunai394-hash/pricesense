export default function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label="読み込み中"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-accent/20 border-t-accent"
          aria-hidden
        />
        <p className="text-sm text-muted">読み込み中...</p>
      </div>
    </div>
  );
}
