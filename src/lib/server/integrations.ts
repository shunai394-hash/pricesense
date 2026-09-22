function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function hasSecret(name: string): boolean {
  return trimEnv(process.env[name]).length > 0;
}

export type SalesIntegrationId =
  | "apollo"
  | "clay"
  | "instantly"
  | "sales_marker"
  | "sansan";

export interface SalesIntegrationStatus {
  id: SalesIntegrationId;
  name: string;
  role: string;
  connected: boolean;
  status: "connected" | "disconnected";
  statusLabel: string;
  detail: string;
  envNames: string[];
}

const INTEGRATIONS: Array<{
  id: SalesIntegrationId;
  name: string;
  role: string;
  envNames: string[];
}> = [
  {
    id: "apollo",
    name: "Apollo",
    role: "新規企業・担当者・Prospect探索の入口",
    envNames: ["APOLLO_API_KEY"],
  },
  {
    id: "clay",
    name: "Clay",
    role: "企業情報補完、調査、データ変換、スコアリング",
    envNames: ["CLAY_API_KEY"],
  },
  {
    id: "instantly",
    name: "Instantly",
    role: "メール送信・シーケンス・返信取得",
    envNames: ["INSTANTLY_API_KEY"],
  },
  {
    id: "sales_marker",
    name: "Sales Marker",
    role: "日本国内の企業/サービス導入意向などの営業シグナル",
    envNames: ["SALES_MARKER_API_KEY"],
  },
  {
    id: "sansan",
    name: "Sansan",
    role: "日本企業・人物情報、組織情報、接点情報",
    envNames: ["SANSAN_API_KEY"],
  },
];

export function getSalesIntegrations(): SalesIntegrationStatus[] {
  return INTEGRATIONS.map((item) => {
    const connected = item.envNames.some((name) => hasSecret(name));
    return {
      ...item,
      connected,
      status: connected ? "connected" : "disconnected",
      statusLabel: connected ? "接続済み" : "未接続",
      detail: connected ? "APIキー設定済み" : "APIキー未設定",
    };
  });
}

export function getSalesIntegration(
  id: SalesIntegrationId
): SalesIntegrationStatus {
  const match = getSalesIntegrations().find((item) => item.id === id);
  if (!match) {
    throw new Error(`Unknown integration: ${id}`);
  }
  return match;
}

export function isInstantlyConnected(): boolean {
  return getSalesIntegration("instantly").connected;
}

export function getWorkspaceRuntimeStatus() {
  const aiConfigured = Boolean(
    trimEnv(process.env.AI_API_KEY) || trimEnv(process.env.OPENAI_API_KEY)
  );
  const integrations = getSalesIntegrations();

  return {
    ai: {
      configured: aiConfigured,
      statusLabel: aiConfigured ? "設定済み" : "未設定",
      model: aiConfigured
        ? trimEnv(process.env.AI_MODEL) ||
          trimEnv(process.env.OPENAI_MODEL) ||
          "gpt-4o-mini"
        : null,
      baseUrlConfigured: Boolean(
        trimEnv(process.env.AI_BASE_URL) || trimEnv(process.env.OPENAI_BASE_URL)
      ),
    },
    googleAuth: {
      supabaseUrlConfigured: Boolean(trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)),
      anonKeyConfigured: Boolean(
        trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
          trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      ),
      clientIdConfigured: Boolean(trimEnv(process.env.GOOGLE_CLIENT_ID)),
      clientSecretConfigured: Boolean(trimEnv(process.env.GOOGLE_CLIENT_SECRET)),
    },
    admin: {
      tokenConfigured: Boolean(trimEnv(process.env.ADMIN_TOKEN)),
    },
    integrations,
    connectedCount: integrations.filter((item) => item.connected).length,
    disconnectedCount: integrations.filter((item) => !item.connected).length,
  };
}
