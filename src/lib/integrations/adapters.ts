import {
  getSalesIntegration,
  getSalesIntegrations,
  type SalesIntegrationId,
  type SalesIntegrationStatus,
} from "@/lib/server/integrations";

export class AdapterNotConnectedError extends Error {
  readonly code = "ADAPTER_NOT_CONNECTED";
  readonly integrationId: SalesIntegrationId;

  constructor(integration: SalesIntegrationStatus) {
    super(`${integration.name}は${integration.detail}`);
    this.name = "AdapterNotConnectedError";
    this.integrationId = integration.id;
  }
}

export interface AdapterSearchInput {
  query?: string;
  domain?: string;
  country?: string;
}

export interface AdapterSearchResult {
  id: SalesIntegrationId;
  connected: boolean;
  statusLabel: string;
  detail: string;
  records: never[];
}

function adapterResult(id: SalesIntegrationId): AdapterSearchResult {
  const integration = getSalesIntegration(id);
  if (!integration.connected) {
    throw new AdapterNotConnectedError(integration);
  }
  return {
    id,
    connected: true,
    statusLabel: integration.statusLabel,
    detail: "接続済みですが、実データ取得クライアントは未実装です。架空データは返しません。",
    records: [],
  };
}

export const integrationAdapters = {
  apollo: {
    id: "apollo" as const,
    searchCompanies(): AdapterSearchResult {
      return adapterResult("apollo");
    },
  },
  clay: {
    id: "clay" as const,
    enrich(): AdapterSearchResult {
      return adapterResult("clay");
    },
  },
  instantly: {
    id: "instantly" as const,
    listCampaigns(): AdapterSearchResult {
      return adapterResult("instantly");
    },
  },
  salesMarker: {
    id: "sales_marker" as const,
    listSignals(): AdapterSearchResult {
      return adapterResult("sales_marker");
    },
  },
  sansan: {
    id: "sansan" as const,
    searchPeople(): AdapterSearchResult {
      return adapterResult("sansan");
    },
  },
};

export function probeIntegrationAdapter(
  id: SalesIntegrationId
): Omit<AdapterSearchResult, "records"> & { records: never[] } {
  const integration = getSalesIntegration(id);
  return {
    id,
    connected: integration.connected,
    statusLabel: integration.statusLabel,
    detail: integration.detail,
    records: [],
  };
}

export function listIntegrationAdapters(): SalesIntegrationStatus[] {
  return getSalesIntegrations();
}
