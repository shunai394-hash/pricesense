import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  parseConversation,
  type ConversationMessage,
} from "@/lib/ai/respond";
import { generateOutreachDraft, type OutreachKind } from "@/lib/ai/sales-outreach";
import type { IntentSignals } from "@/lib/sales/scoring";
import { companyIdentityFromLead } from "@/lib/sales/company-identity";

const PAGE_SIZE = 1000;

export interface SalesOsLeadRow {
  id: string;
  email: string | null;
  company_name: string | null;
  industry: string | null;
  employee_count: number | null;
  job_title: string | null;
  department: string | null;
  seniority: string | null;
  category_name: string | null;
  score: number | null;
  next_action: string | null;
  intent_signals: unknown;
  conversation: unknown;
  prospect_id: string | null;
  created_at: string;
}

export interface SalesOsSyncResult {
  leadsScanned: number;
  companiesCreated: number;
  companiesUpdated: number;
  contactsCreated: number;
  prospectsCreated: number;
  signalsCreated: number;
  inboxCreated: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const supabase = getSupabaseAdmin();
  const rows: T[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

function parseIntentSignals(value: unknown): IntentSignals | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.signals) && typeof value.priorityScore !== "number") {
    return value as unknown as IntentSignals;
  }
  return value as unknown as IntentSignals;
}

export async function syncLeadsIntoSalesOs(): Promise<SalesOsSyncResult> {
  const supabase = getSupabaseAdmin();
  const result: SalesOsSyncResult = {
    leadsScanned: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    contactsCreated: 0,
    prospectsCreated: 0,
    signalsCreated: 0,
    inboxCreated: 0,
  };

  const leads = await fetchAllRows<SalesOsLeadRow>(
    "leads",
    "id, email, company_name, industry, employee_count, job_title, department, seniority, category_name, score, next_action, intent_signals, conversation, prospect_id, created_at"
  );
  result.leadsScanned = leads.length;
  if (leads.length === 0) return result;

  const companies = await fetchAllRows<{
    id: string;
    source: string | null;
    source_id: string | null;
    data: unknown;
    industry: string | null;
    employee_count: number | null;
  }>("companies", "id, source, source_id, data, industry, employee_count");

  const contacts = await fetchAllRows<{
    id: string;
    company_id: string;
    email: string | null;
    source_id: string | null;
  }>("contacts", "id, company_id, email, source_id");

  const prospects = await fetchAllRows<{
    id: string;
    company_id: string;
    contact_id: string | null;
    lead_id: string | null;
  }>("prospects", "id, company_id, contact_id, lead_id");

  const companyByKey = new Map<string, string>();
  for (const company of companies) {
    if (company.source && company.source_id) {
      companyByKey.set(`${company.source}:${company.source_id}`, company.id);
    }
    if (isRecord(company.data) && typeof company.data.identity_key === "string") {
      companyByKey.set(company.data.identity_key, company.id);
    }
  }

  const contactByEmail = new Map<string, string>();
  const contactBySource = new Map<string, string>();
  for (const contact of contacts) {
    if (contact.email) contactByEmail.set(contact.email.toLowerCase(), contact.id);
    if (contact.source_id) contactBySource.set(contact.source_id, contact.id);
  }

  const prospectByPair = new Map<string, string>();
  const prospectByLead = new Map<string, string>();
  for (const prospect of prospects) {
    prospectByPair.set(`${prospect.company_id}:${prospect.contact_id ?? ""}`, prospect.id);
    if (prospect.lead_id) prospectByLead.set(prospect.lead_id, prospect.id);
  }

  for (const lead of leads) {
    const identity = companyIdentityFromLead(lead);
    const sourceId = identity.key;
    let companyId =
      companyByKey.get(`lead:${sourceId}`) ?? companyByKey.get(identity.key);

    if (!companyId) {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: identity.name,
          domain: identity.domain,
          industry: lead.industry ?? lead.category_name ?? null,
          employee_count: lead.employee_count,
          source: "lead",
          source_id: sourceId,
          data: {
            identity_key: identity.key,
            lead_ids: [lead.id],
            derived_from: "lead",
          },
        })
        .select("id")
        .single();

      if (error) {
        const existing = companies.find(
          (row) => row.source === "lead" && row.source_id === sourceId
        );
        if (existing) {
          companyId = existing.id;
        } else {
          console.error("[sales-os] company insert failed:", error.message);
          continue;
        }
      } else if (data?.id) {
        const createdId = data.id;
        companyId = createdId;
        result.companiesCreated += 1;
        companyByKey.set(identity.key, createdId);
        companyByKey.set(`lead:${sourceId}`, createdId);
      }
    }

    if (!companyId) continue;

    const current = companies.find((row) => row.id === companyId);
    const needsIndustry = !current?.industry && (lead.industry || lead.category_name);
    const needsHeadcount =
      current?.employee_count == null && lead.employee_count != null;
    if (needsIndustry || needsHeadcount) {
      await supabase
        .from("companies")
        .update({
          industry: current?.industry ?? lead.industry ?? lead.category_name ?? null,
          employee_count: current?.employee_count ?? lead.employee_count ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId);
      result.companiesUpdated += 1;
    }

    const email = text(lead.email)?.toLowerCase() ?? null;
    let contactId =
      (email ? contactByEmail.get(email) : null) ??
      contactBySource.get(lead.id) ??
      null;

    if (!contactId) {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          company_id: companyId,
          full_name: email,
          email,
          job_title: lead.job_title,
          department: lead.department,
          seniority: lead.seniority,
          source: "lead",
          source_id: lead.id,
          data: { lead_id: lead.id },
        })
        .select("id")
        .single();

      if (error) {
        console.error("[sales-os] contact insert failed:", error.message);
      } else if (data?.id) {
        const createdId = data.id;
        contactId = createdId;
        result.contactsCreated += 1;
        if (email) contactByEmail.set(email, createdId);
        contactBySource.set(lead.id, createdId);
      }
    }

    let prospectId =
      prospectByLead.get(lead.id) ??
      prospectByPair.get(`${companyId}:${contactId ?? ""}`) ??
      null;

    if (!prospectId) {
      const { data, error } = await supabase
        .from("prospects")
        .insert({
          company_id: companyId,
          contact_id: contactId,
          lead_id: lead.id,
          status: "new",
          score: lead.score,
          source: "lead",
          source_id: lead.id,
          next_action: lead.next_action,
          last_activity_at: lead.created_at,
          priority:
            typeof lead.score === "number" && lead.score >= 80
              ? "high"
              : typeof lead.score === "number" && lead.score >= 61
                ? "medium"
                : "normal",
          metadata: { lead_id: lead.id },
        })
        .select("id")
        .single();

      if (error) {
        console.error("[sales-os] prospect insert failed:", error.message);
      } else if (data?.id) {
        const createdId = data.id;
        prospectId = createdId;
        result.prospectsCreated += 1;
        prospectByPair.set(`${companyId}:${contactId ?? ""}`, createdId);
        prospectByLead.set(lead.id, createdId);
        if (!lead.prospect_id) {
          await supabase
            .from("leads")
            .update({ prospect_id: prospectId })
            .eq("id", lead.id)
            .is("prospect_id", null);
        }
      }
    } else if (!lead.prospect_id) {
      await supabase
        .from("leads")
        .update({ prospect_id: prospectId })
        .eq("id", lead.id)
        .is("prospect_id", null);
    }

    if (companyId && prospectId) {
      result.signalsCreated += await persistLeadIntentSignals({
        lead,
        companyId,
        prospectId,
      });
      result.inboxCreated += await syncInboxFromLeadConversation({
        lead,
        prospectId,
        contactId,
      });
    }
  }

  return result;
}

export async function persistLeadIntentSignals(input: {
  lead: Pick<SalesOsLeadRow, "id" | "score" | "next_action" | "intent_signals">;
  companyId: string;
  prospectId: string;
}): Promise<number> {
  const supabase = getSupabaseAdmin();
  const parsed = parseIntentSignals(input.lead.intent_signals);
  const signalNames = Array.isArray(parsed?.signals)
    ? parsed.signals.filter((item): item is string => typeof item === "string")
    : [];

  if (typeof input.lead.score === "number") {
    signalNames.push("lead_score");
  }

  const unique = [...new Set(signalNames)];
  if (unique.length === 0) return 0;

  const { data: existing, error } = await supabase
    .from("intent_signals")
    .select("id, metadata")
    .eq("company_id", input.companyId);

  if (error) {
    console.error("[sales-os] intent_signals load failed:", error.message);
    return 0;
  }

  const existingKeys = new Set(
    (existing ?? [])
      .map((row) =>
        isRecord(row.metadata) && typeof row.metadata.source_id === "string"
          ? row.metadata.source_id
          : null
      )
      .filter((value): value is string => Boolean(value))
  );

  let created = 0;
  for (const signalType of unique) {
    const sourceId = `${input.lead.id}:${signalType}`;
    if (existingKeys.has(sourceId)) continue;

    const strength =
      signalType === "lead_score" && typeof input.lead.score === "number"
        ? input.lead.score
        : parsed?.priorityScore ?? null;

    const { error: insertError } = await supabase.from("intent_signals").insert({
      company_id: input.companyId,
      prospect_id: input.prospectId,
      signal_type: signalType,
      signal_strength: strength,
      title:
        signalType === "lead_score"
          ? `Lead驛｢・ｧ繝ｻ・ｹ驛｢・ｧ繝ｻ・ｳ驛｢・ｧ繝ｻ・｢ ${input.lead.score}`
          : signalType,
      description: input.lead.next_action,
      source: "lead",
      detected_at: new Date().toISOString(),
      metadata: {
        source_id: sourceId,
        lead_id: input.lead.id,
      },
    });

    if (insertError) {
      console.error("[sales-os] intent_signals insert failed:", insertError.message);
      continue;
    }
    created += 1;
    existingKeys.add(sourceId);
  }

  return created;
}

export async function syncInboxFromLeadConversation(input: {
  lead: Pick<SalesOsLeadRow, "id" | "conversation">;
  prospectId: string;
  contactId: string | null;
}): Promise<number> {
  const messages = parseConversation(input.lead.conversation).filter(
    (message) => message.role === "user"
  );
  if (messages.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from("inbox_messages")
    .select("id, body, received_at")
    .eq("prospect_id", input.prospectId);

  if (error) {
    console.error("[sales-os] inbox load failed:", error.message);
    return 0;
  }

  const existingKeys = new Set(
    (existing ?? []).map(
      (row) => `${row.body ?? ""}|${row.received_at ?? ""}`
    )
  );

  let created = 0;
  for (const message of messages) {
    const key = `${message.content}|${message.createdAt}`;
    if (existingKeys.has(key)) continue;

    const { error: insertError } = await supabase.from("inbox_messages").insert({
      prospect_id: input.prospectId,
      contact_id: input.contactId,
      channel: "email",
      direction: "inbound",
      subject: "Lead髣費ｽｨ陞溷･・ｽｽ・ｩ繝ｻ・ｱ驍ｵ・ｺ繝ｻ・ｮ鬮ｴ隨ｬ・ｯ雋ｻ・ｽ・ｿ繝ｻ・｡",
      body: message.content,
      status: "unread",
      received_at: message.createdAt,
    });

    if (insertError) {
      console.error("[sales-os] inbox insert failed:", insertError.message);
      continue;
    }
    created += 1;
    existingKeys.add(key);
  }

  return created;
}

export async function createManualCompany(input: {
  name: string;
  domain?: string | null;
  industry?: string | null;
  location?: string | null;
  employeeCount?: number | null;
  websiteUrl?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const { findOrCreateAccount } = await import("@/lib/nbos/accounts");
  return findOrCreateAccount({
    name: input.name,
    domain: input.domain,
    websiteUrl: input.websiteUrl,
    industry: input.industry,
    location: input.location,
    employeeCount: input.employeeCount,
    source: "manual",
  });
}

export async function createManualContact(input: {
  companyId: string;
  fullName?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseAdmin();
  const email = text(input.email)?.toLowerCase() ?? null;

  if (email) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing?.id) return { id: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      company_id: input.companyId,
      full_name: text(input.fullName) ?? email,
      email,
      job_title: text(input.jobTitle),
      department: text(input.department),
      phone: text(input.phone),
      source: "manual",
      source_id: email ?? `${input.companyId}:${Date.now()}`,
      data: {},
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id, created: true };
}

export async function ensureCompanyOfferingProspect(input: {
  companyId: string;
  offeringId: string;
}): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from("prospects")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("offering_id", input.offeringId)
    .eq("source", "nbos")
    .is("lead_id", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing?.id) {
    return { id: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      company_id: input.companyId,
      offering_id: input.offeringId,
      contact_id: null,
      lead_id: null,
      status: "new",
      source: "nbos",
      source_id: input.companyId,
      priority: "normal",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { id: data.id, created: true };
}
export async function ensureProspect(input: {
  companyId: string;
  contactId?: string | null;
  leadId?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("prospects")
    .select("id, lead_id")
    .eq("company_id", input.companyId);

  if (input.contactId) {
    query = query.eq("contact_id", input.contactId);
  } else {
    query = query.is("contact_id", null);
  }

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing?.id) {
    if (input.leadId && !existing.lead_id) {
      await supabase
        .from("prospects")
        .update({ lead_id: input.leadId, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return { id: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      company_id: input.companyId,
      contact_id: input.contactId ?? null,
      lead_id: input.leadId ?? null,
      status: "new",
      source: input.leadId ? "lead" : "manual",
      source_id: input.leadId ?? input.contactId ?? input.companyId,
      priority: "normal",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id, created: true };
}

export async function promoteProspectToLead(prospectId: string): Promise<{
  leadId: string;
  created: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const { data: prospect, error } = await supabase
    .from("prospects")
    .select(
      `
      id,
      lead_id,
      company_id,
      contact_id,
      score,
      next_action,
      companies ( name, domain, industry, employee_count ),
      contacts ( email, job_title, department, seniority, full_name )
    `
    )
    .eq("id", prospectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!prospect) throw new Error("Prospect not found");
  if (prospect.lead_id) {
    return { leadId: prospect.lead_id, created: false };
  }

  const company = Array.isArray(prospect.companies)
    ? prospect.companies[0]
    : prospect.companies;
  const contact = Array.isArray(prospect.contacts)
    ? prospect.contacts[0]
    : prospect.contacts;
  const email = text(contact?.email);

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      lead_source: "prospect",
      email,
      company_name: text(company?.name),
      industry: text(company?.industry),
      employee_count: company?.employee_count ?? null,
      job_title: text(contact?.job_title),
      department: text(contact?.department),
      seniority: text(contact?.seniority),
      prospect_id: prospectId,
      score: prospect.score,
      next_action: prospect.next_action,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  await supabase
    .from("prospects")
    .update({
      lead_id: lead.id,
      status: "qualified",
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospectId);

  return { leadId: lead.id, created: true };
}

export async function ensureDefaultSequence(): Promise<{
  id: string;
  created: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from("sequences")
    .select("id")
    .eq("name", "default_outreach_sequence")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (existing?.id) return { id: existing.id, created: false };

  const { data: sequence, error: insertError } = await supabase
    .from("sequences")
    .insert({
      name: "default_outreach_sequence",
      description:
        "AI-generated outreach sequence for new business prospects.",
      status: "draft",
      channel: "email",
      owner: "ai_sales",
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const steps = [
    {
      step_number: 1,
      delay_hours: 0,
      subject_template: "Introduction to {{company}}",
      body_template: "Hello, this is an introduction regarding {{company}}. We would like to share a relevant business opportunity and see whether it may be useful for your team.",
    },
    {
      step_number: 2,
      delay_hours: 72,
      subject_template: "Following up with {{company}}",
      body_template: "Hello, I am following up on my previous message regarding {{company}}. If this is relevant to your current priorities, I would be happy to provide more information.",
    },
    {
      step_number: 3,
      delay_hours: 168,
      subject_template: "One more note for {{company}}",
      body_template: "Hello, I wanted to send one final follow-up regarding {{company}}. Please feel free to reach out if you would like to discuss this further.",
    },
  ];

  const { error: stepError } = await supabase.from("sequence_steps").insert(
    steps.map((step) => ({
      sequence_id: sequence.id,
      channel: "email",
      ai_generated: true,
      ...step,
    }))
  );
  if (stepError) throw new Error(stepError.message);

  return { id: sequence.id, created: true };
}

export async function enrollProspectInSequence(input: {
  prospectId: string;
  sequenceId?: string;
}): Promise<{ sequenceId: string; duplicate: boolean }> {
  const supabase = getSupabaseAdmin();
  const sequenceId = input.sequenceId ?? (await ensureDefaultSequence()).id;

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("id, next_action, metadata")
    .eq("id", input.prospectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!prospect) throw new Error("Prospect not found");

  const metadata = isRecord(prospect.metadata) ? prospect.metadata : {};
  if (metadata.sequence_id === sequenceId) {
    await createSequenceOutreachDrafts({
      prospectId: input.prospectId,
      sequenceId,
    });
    return { sequenceId, duplicate: true };
  }

  const { error: updateError } = await supabase
    .from("prospects")
    .update({
      next_action: "sequence_enrolled_draft_only",
      next_action_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      metadata: { ...metadata, sequence_id: sequenceId, enrolled_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.prospectId);

  if (updateError) throw new Error(updateError.message);

  await createSequenceOutreachDrafts({
    prospectId: input.prospectId,
    sequenceId,
  });

  return { sequenceId, duplicate: false };
}

async function createSequenceOutreachDrafts(input: {
  prospectId: string;
  sequenceId: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: steps, error } = await supabase
    .from("sequence_steps")
    .select("id, step_number, subject_template, body_template")
    .eq("sequence_id", input.sequenceId)
    .order("step_number", { ascending: true });
  if (error) throw new Error(error.message);

  const context = await loadProspectContext(input.prospectId);
  const kinds: OutreachKind[] = ["initial", "followup", "refollow"];

  for (const step of steps ?? []) {
    const kind = kinds[Math.max(0, step.step_number - 1)] ?? "followup";
    const idempotencyKey = `sequence:${input.sequenceId}:step:${step.step_number}:${input.prospectId}`;

    const { data: existing, error: existingError } = await supabase
      .from("outreach_messages")
      .select("id")
      .eq("prospect_id", input.prospectId)
      .eq("sequence_step_id", step.id)
      .limit(1);
    if (existingError) throw new Error(existingError.message);
    if (existing && existing.length > 0) continue;

    const draft = context
      ? await generateOutreachDraft({
          kind,
          companyName: context.companyName,
          domain: context.domain,
          industry: context.industry,
          contactName: context.contactName,
          jobTitle: context.jobTitle,
          email: context.email,
          score: context.score,
          nextAction: context.nextAction,
          conversation: context.conversation,
        })
      : null;

    const { error: insertError } = await supabase.from("outreach_messages").insert({
      sequence_id: input.sequenceId,
      sequence_step_id: step.id,
      prospect_id: input.prospectId,
      contact_id: context?.contactId ?? null,
      channel: "email",
      direction: "outbound",
      subject: draft?.subject ?? step.subject_template ?? "驍ｵ・ｺ騾搾ｽｲ繝ｻ・｡闔・･郢晢ｽｻ",
      body: `${draft?.body ?? step.body_template ?? ""}\n\n[idempotency:${idempotencyKey}]`,
      status: "draft",
    });
    if (insertError) throw new Error(insertError.message);
  }
}

export interface CompanyResearchContext {
  company: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    location: string | null;
    employee_count: number | null;
    revenue_range: string | null;
    description: string | null;
    website_url: string | null;
  };
  contacts: Array<{
    id: string;
    full_name: string | null;
    job_title: string | null;
    department: string | null;
    email: string | null;
  }>;
  prospects: Array<{
    id: string;
    lead_id: string | null;
    score: number | null;
    next_action: string | null;
    status: string;
  }>;
  leads: Array<{
    id: string;
    email: string | null;
    category_name: string | null;
    score: number | null;
    next_action: string | null;
    conversation: ConversationMessage[];
  }>;
}

export async function loadCompanyResearchContext(
  companyId: string
): Promise<CompanyResearchContext | null> {
  const supabase = getSupabaseAdmin();
  const { data: company, error } = await supabase
    .from("companies")
    .select(
      "id, name, domain, industry, location, employee_count, revenue_range, description, website_url"
    )
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!company) return null;

  const [{ data: contacts }, { data: prospects }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, job_title, department, email")
      .eq("company_id", companyId),
    supabase
      .from("prospects")
      .select("id, lead_id, score, next_action, status")
      .eq("company_id", companyId),
  ]);

  const leadIds = (prospects ?? [])
    .map((row) => row.lead_id)
    .filter((value): value is string => typeof value === "string");

  let leads: CompanyResearchContext["leads"] = [];
  if (leadIds.length > 0) {
    const { data: leadRows, error: leadError } = await supabase
      .from("leads")
      .select("id, email, category_name, score, next_action, conversation")
      .in("id", leadIds);
    if (leadError) throw new Error(leadError.message);
    leads = (leadRows ?? []).map((row) => ({
      id: row.id,
      email: row.email ?? null,
      category_name: row.category_name ?? null,
      score: typeof row.score === "number" ? row.score : null,
      next_action: row.next_action ?? null,
      conversation: parseConversation(row.conversation),
    }));
  }

  return {
    company,
    contacts: contacts ?? [],
    prospects: prospects ?? [],
    leads,
  };
}

export async function loadProspectContext(prospectId: string): Promise<{
  prospectId: string;
  companyId: string;
  contactId: string | null;
  leadId: string | null;
  companyName: string | null;
  domain: string | null;
  industry: string | null;
  contactName: string | null;
  jobTitle: string | null;
  email: string | null;
  score: number | null;
  nextAction: string | null;
  conversation: ConversationMessage[];
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("prospects")
    .select(
      `
      id,
      company_id,
      contact_id,
      lead_id,
      score,
      next_action,
      companies ( name, domain, industry ),
      contacts ( full_name, job_title, email )
    `
    )
    .eq("id", prospectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;
  const contact = Array.isArray(data.contacts) ? data.contacts[0] : data.contacts;
  let conversation: ConversationMessage[] = [];
  if (data.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("conversation")
      .eq("id", data.lead_id)
      .maybeSingle();
    conversation = parseConversation(lead?.conversation);
  }

  return {
    prospectId: data.id,
    companyId: data.company_id,
    contactId: data.contact_id,
    leadId: data.lead_id,
    companyName: company?.name ?? null,
    domain: company?.domain ?? null,
    industry: company?.industry ?? null,
    contactName: contact?.full_name ?? null,
    jobTitle: contact?.job_title ?? null,
    email: contact?.email ?? null,
    score: typeof data.score === "number" ? data.score : null,
    nextAction: data.next_action ?? null,
    conversation,
  };
}
