"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_TOKEN_STORAGE_KEY } from "@/lib/sales/workspace-ui";

export function useAdminToken() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (stored) setToken(stored);
    setReady(true);
  }, []);

  const persist = useCallback((value: string) => {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
    setToken(value);
  }, []);

  const clear = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setToken("");
  }, []);

  return { token, setToken, persist, clear, ready };
}
