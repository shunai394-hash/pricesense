"use client";

import { useCallback, useEffect, useState } from "react";
import { getCachedLeadEmail, cacheLeadEmail } from "@/lib/leads";
import { fetchPremiumStatus } from "@/lib/premium/status";
import {
  cachePremiumStatus,
  clearPremiumStatusCache,
  getCachedPremiumStatus,
} from "@/lib/premium/storage";

export function usePremiumStatus() {
  const [isPremium, setIsPremium] = useState(
    () => getCachedPremiumStatus()?.isPremium ?? false
  );
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremiumStatus = useCallback(async () => {
    const email = getCachedLeadEmail();

    if (!email) {
      setIsPremium(false);
      clearPremiumStatusCache();
      setIsLoading(false);
      return;
    }

    const status = await fetchPremiumStatus(email);
    setIsPremium(status.isPremium);
    cachePremiumStatus({
      isPremium: status.isPremium,
      email,
      checkedAt: new Date().toISOString(),
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    const sessionId = params.get("session_id");

    const finalizeCheckout = async () => {
      if (sessionId) {
        try {
          const response = await fetch(
            `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`
          );
          if (response.ok) {
            const data = (await response.json()) as {
              email?: string | null;
              isPremium?: boolean;
            };
            if (data.email) {
              cacheLeadEmail(data.email);
              setIsPremium(Boolean(data.isPremium));
              cachePremiumStatus({
                isPremium: Boolean(data.isPremium),
                email: data.email,
                checkedAt: new Date().toISOString(),
              });
              setIsLoading(false);
            } else {
              await refreshPremiumStatus();
            }
          } else {
            await refreshPremiumStatus();
          }
        } catch {
          await refreshPremiumStatus();
        }
      } else {
        await refreshPremiumStatus();
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    };

    finalizeCheckout();
  }, [refreshPremiumStatus]);

  return { isPremium, isLoading, refreshPremiumStatus };
}
