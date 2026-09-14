"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/primitives";

export function AdminSessionBar({
  token,
  onTokenChange,
  onSubmit,
  loading,
  submitLabel = "読み込む",
}: {
  token: string;
  onTokenChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className="mb-6 grid gap-3 rounded-xl border border-border/80 bg-surface/60 p-4 md:grid-cols-[1fr_auto]"
      onSubmit={handleSubmit}
    >
      <label className="block text-sm">
        <span className="mb-1 block text-muted">管理者トークン</span>
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(event) => onTokenChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-accent"
        />
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={loading || !token} className="w-full">
          {loading ? "読み込み中…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
