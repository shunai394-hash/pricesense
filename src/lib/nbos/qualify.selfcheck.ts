import { inferTargetContact, scoreQualification } from "@/lib/nbos/qualify";
import { emptyIcp, type Offering } from "@/lib/nbos/types";

function offering(): Offering {
  return {
    id: "test",
    name: "PriceSense",
    description: "test",
    problem_solved: "新規開拓の対象企業が見つからない",
    target_industries: ["IT", "SaaS"],
    target_company_size: { employee_min: 30, employee_max: 5000 },
    target_regions: ["japan"],
    target_departments: ["経営企画"],
    target_roles: ["事業責任者"],
    qualification_conditions: [],
    exclusion_conditions: ["既存顧客"],
    icp: {
      ...emptyIcp(),
      problem: { triggers: ["海外進出", "新規事業"], notes: "" },
      negative: { industries: [], conditions: ["既存顧客"], notes: "" },
    },
    is_active: true,
    created_at: "",
    updated_at: "",
  };
}

const pursue = scoreQualification({
  offering: offering(),
  company: { name: "Example", industry: "IT", location: "東京", country: "JP", employeeCount: 200, domain: "example.jp" },
  factText: "2026年9月17日に韓国進出を発表した",
  hypothesis: "海外販売体制の構築が必要になる可能性",
  unknown: null,
  signalType: "expansion",
  verificationStatus: "source_confirmed",
  sourceUrl: "https://news.example.jp/korea",
  detectedAt: new Date().toISOString(),
  regionCode: "japan",
  contactability: "role_identified",
  engagement: {
    status: "UNCONTACTED",
    reasons: [],
    hasLead: false,
    hasSentOutreach: false,
    hasInbound: false,
    hasMeeting: false,
    hasOpenDeal: false,
    hasWonDeal: false,
    hasLostDeal: false,
    hasFollowup: false,
    existingCustomer: false,
  },
  hasPersonName: false,
});

if (pursue.decision !== "pursue") {
  throw new Error(`expected pursue, got ${pursue.decision}`);
}

const customer = scoreQualification({
  ...{
    offering: offering(),
    company: { name: "Customer", industry: "IT", location: "東京", country: "JP", employeeCount: 200, domain: "c.jp" },
    factText: "新製品を発表",
    hypothesis: null,
    unknown: null,
    signalType: "product",
    verificationStatus: "source_confirmed",
    sourceUrl: "https://news.example.jp/p",
    detectedAt: new Date().toISOString(),
    regionCode: "japan",
    contactability: "unknown",
    hasPersonName: false,
  },
  engagement: {
    status: "CUSTOMER",
    reasons: ["既存顧客"],
    hasLead: true,
    hasSentOutreach: true,
    hasInbound: true,
    hasMeeting: true,
    hasOpenDeal: false,
    hasWonDeal: true,
    hasLostDeal: false,
    hasFollowup: false,
    existingCustomer: true,
  },
});

if (customer.decision !== "disqualify") {
  throw new Error(`expected disqualify for customer, got ${customer.decision}`);
}

const target = inferTargetContact(
  offering(),
  "expansion",
  "韓国進出を発表",
  null
);
if (target.role !== "海外事業責任者") {
  throw new Error(`expected overseas role, got ${target.role}`);
}

console.log("nbos qualify selfcheck ok");
