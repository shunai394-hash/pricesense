"use client";

import { useState } from "react";
import { openBillingPortal } from "@/lib/premium/portal";

export function SubscriptionPortalLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    const result = await openBillingPortal();

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    setIsLoading(false);
    setError(result.error ?? "契約管理ページを開けませんでした");
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-busy={isLoading}
        className="text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
      >
        {isLoading ? "読み込み中..." : "Premium契約管理"}
      </button>
      {error && (
        <span className="mt-1 max-w-xs text-[10px] leading-relaxed text-accent/90">
          {error}
        </span>
      )}
    </span>
  );
}
