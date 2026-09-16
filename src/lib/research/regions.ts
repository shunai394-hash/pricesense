export const RESEARCH_REGIONS = [
  "global",
  "japan",
  "north_america",
  "europe",
  "asia",
  "oceania",
  "middle_east",
  "africa",
  "latin_america",
] as const;

export type ResearchRegion = (typeof RESEARCH_REGIONS)[number];

export const RESEARCH_REGION_LABEL: Record<ResearchRegion, string> = {
  global: "Global",
  japan: "Japan",
  north_america: "North America",
  europe: "Europe",
  asia: "Asia",
  oceania: "Oceania",
  middle_east: "Middle East",
  africa: "Africa",
  latin_america: "Latin America",
};

const COUNTRY_TO_REGION: Record<string, ResearchRegion> = {
  JP: "japan",
  US: "north_america",
  CA: "north_america",
  MX: "latin_america",
  GB: "europe",
  DE: "europe",
  FR: "europe",
  IT: "europe",
  ES: "europe",
  NL: "europe",
  SE: "europe",
  PL: "europe",
  CN: "asia",
  KR: "asia",
  TW: "asia",
  HK: "asia",
  SG: "asia",
  IN: "asia",
  ID: "asia",
  TH: "asia",
  VN: "asia",
  MY: "asia",
  PH: "asia",
  AU: "oceania",
  NZ: "oceania",
  AE: "middle_east",
  SA: "middle_east",
  IL: "middle_east",
  QA: "middle_east",
  ZA: "africa",
  NG: "africa",
  KE: "africa",
  EG: "africa",
  BR: "latin_america",
  AR: "latin_america",
  CL: "latin_america",
  CO: "latin_america",
};

export function isResearchRegion(value: unknown): value is ResearchRegion {
  return (
    typeof value === "string" &&
    (RESEARCH_REGIONS as readonly string[]).includes(value)
  );
}

export function regionFromCountry(
  country: string | null | undefined
): ResearchRegion | null {
  if (!country) return null;
  return COUNTRY_TO_REGION[country.trim().toUpperCase()] ?? null;
}

export function countryCodeFromText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  return null;
}
