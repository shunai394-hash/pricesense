/**
 * Affiliate destinations used by PriceSense.
 * Click URLs are copied from existing A8 tags in A8AffiliateBanner.
 * Do not invent URLs that are not already in the codebase.
 */

export const A8_CLICK_URLS = {
  /** Program 21455 — IT freelance project matching (techadapt). */
  techadapt: "https://px.a8.net/svt/ejp?a8mat=4BAEXJ+BFZZEA+4LJQ+5Z6WX",
  /** Program 22413 — career agent matching (転職AGENT Navi). */
  agentNavi: "https://px.a8.net/svt/ejp?a8mat=4B7YP3+1SBLE+4SXU+HVNAP",
  /** Program 24757 — IT engineer career change (TechGo). Advertiser code 5B0Y. */
  techGo: "https://px.a8.net/svt/ejp?a8mat=4B7YP3+6JSFM+5B0Y+I0KRL",
} as const;

export const A8_OFFERS = {
  techadapt: {
    id: "techadapt",
    name: "techadapt",
    href: A8_CLICK_URLS.techadapt,
  },
  agentNavi: {
    id: "agent_navi",
    name: "転職AGENT Navi",
    href: A8_CLICK_URLS.agentNavi,
  },
  techGo: {
    id: "techgo",
    name: "TechGo",
    href: A8_CLICK_URLS.techGo,
  },
} as const;

export type AffiliateOfferId = keyof typeof A8_OFFERS;
