"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatAdminClientError } from "@/lib/admin-ui";
import type { SalesAction, SalesActionCounts } from "@/lib/ai/sales-actions";
import type { SalesActivityCounts } from "@/lib/ai/sales-action-history";
import type { SalesWorkspaceCatalog } from "@/lib/ai/sales-workspace";
import { useAdminToken } from "@/hooks/useAdminToken";

interface WorkspaceResponse {
  success: boolean;
  error?: string;
  actions?: SalesAction[];
  counts?: SalesActionCounts;
  activity?: SalesActivityCounts;
  workspace?: SalesWorkspaceCatalog;
}

export function useSalesWorkspace(options: { includeWorkspace?: boolean } = {}) {
  const includeWorkspace = options.includeWorkspace ?? true;
  const { token, setToken, persist, ready } = useAdminToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [actions, setActions] = useState<SalesAction[]>([]);
  const [counts, setCounts] = useState<SalesActionCounts | null>(null);
  const [activity, setActivity] = useState<SalesActivityCounts | null>(null);
  const [workspace, setWorkspace] = useState<SalesWorkspaceCatalog | null>(null);
  const autoLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!token) {
      setUnauthorized(true);
      setError("管理者認証に失敗しました。ADMIN_TOKEN を確認し、再試行してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const query = includeWorkspace ? "?include=workspace" : "";
      const response = await fetch(`/api/ai/sales-actions${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await response.json()) as WorkspaceResponse;

      if (response.status === 401) {
        setUnauthorized(true);
        setActions([]);
        setCounts(null);
        setActivity(null);
        setWorkspace(null);
        setError(formatAdminClientError(json.error, response.status));
        return;
      }

      if (!response.ok || !json.success) {
        setActions([]);
        setCounts(null);
        setActivity(null);
        setWorkspace(null);
        setError(
          formatAdminClientError(
            json.error || "営業データの取得に失敗しました",
            response.status
          )
        );
        return;
      }

      persist(token);
      setActions(json.actions ?? []);
      setCounts(json.counts ?? null);
      setActivity(json.activity ?? null);
      setWorkspace(json.workspace ?? null);
    } catch (loadError) {
      setActions([]);
      setCounts(null);
      setActivity(null);
      setWorkspace(null);
      setError(
        formatAdminClientError(
          loadError instanceof Error
            ? loadError.message
            : "営業データの読み込みに失敗しました"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [includeWorkspace, persist, token]);

  useEffect(() => {
    if (!ready || !token || autoLoaded.current) return;
    autoLoaded.current = true;
    void load();
  }, [load, ready, token]);

  return {
    token,
    setToken,
    ready,
    loading,
    error,
    unauthorized,
    actions,
    counts,
    activity,
    workspace,
    load,
  };
}
