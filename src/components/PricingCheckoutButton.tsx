"use client";

import { useState } from "react";
import { startPremiumCheckout } from "@/lib/premium/checkout";

interface PricingCheckoutButtonProps {
  source?: string;
  className?: string;
  children: React.ReactNode;
}

export function PricingCheckoutButton({
  source = "pricing_page",
  className = "",
  children,
}: PricingCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    setIsUnavailable(false);

    const result = await startPremiumCheckout(source);

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    setIsLoading(false);
    setIsUnavailable(true);
  };

  if (isUnavailable) {
    return (
      <div
        className={`rounded-xl border border-accent/25 bg-accent/5 px-5 py-4 text-center ${className}`}
      >
        <p className="text-sm font-medium text-foreground">公開準備中</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          決済機能は現在準備中です。公開時に改めてご案内します。
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-label={isLoading ? "決済ページへ移動中" : undefined}
      className={className}
    >
      {isLoading ? "処理中..." : children}
    </button>
  );
}
