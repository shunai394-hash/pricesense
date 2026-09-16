import { getCompatibleAiConfig } from "@/lib/server/env";

export type AiFailureKind =
  | "timeout"
  | "rate_limit"
  | "quota"
  | "empty_response"
  | "invalid_json"
  | "api_error"
  | "not_configured";

export class AiUnavailableError extends Error {
  readonly code = "AI_UNAVAILABLE";
  readonly kind: AiFailureKind;
  retryable = false;
  retryAfterMs?: number;

  constructor(message: string, kind: AiFailureKind = "api_error") {
    super(message);
    this.name = "AiUnavailableError";
    this.kind = kind;
  }
}

export interface ChatCompletionInput {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  json?: boolean;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractContent(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = choices[0] && typeof choices[0] === "object"
    ? (choices[0] as { message?: { content?: unknown }; text?: unknown })
    : null;
  const content = message?.message?.content ?? message?.text;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return typeof part.text === "string" ? part.text : "";
        }
        return "";
      })
      .join("")
      .trim();
    return joined || null;
  }
  return null;
}

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function requestOnce(
  input: ChatCompletionInput,
  attempt: number
): Promise<string> {
  const config = getCompatibleAiConfig();
  if (!config) {
    throw new AiUnavailableError("AI API is not configured", "not_configured");
  }

  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxTokens ?? 800,
        ...(input.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });

    if (!response.ok) {
      let bodyText = "";
      try {
        bodyText = (await response.text()).slice(0, 400).toLowerCase();
      } catch {
        bodyText = "";
      }
      const retryable = RETRYABLE_STATUS.has(response.status);
      const retryAfter = Number(response.headers.get("retry-after") ?? "");
      const quota =
        response.status === 429 &&
        (bodyText.includes("insufficient_quota") || bodyText.includes("quota"));
      const kind: AiFailureKind = quota
        ? "quota"
        : response.status === 429
          ? "rate_limit"
          : "api_error";
      const error = new AiUnavailableError(
        `AI API returned ${response.status}`,
        kind
      );
      error.retryable = retryable && kind !== "quota";
      error.retryAfterMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : attempt === 0
            ? 750
            : 1500;
      throw error;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AiUnavailableError(
        "AI API returned malformed JSON",
        "invalid_json"
      );
    }

    const content = extractContent(payload);
    if (!content) {
      throw new AiUnavailableError(
        "AI API returned an empty response",
        "empty_response"
      );
    }
    return content;
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiUnavailableError("AI API timed out", "timeout");
    }
    throw new AiUnavailableError(
      error instanceof Error ? error.message : "AI API request failed",
      "api_error"
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function completeChatText(
  input: ChatCompletionInput
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestOnce(input, attempt);
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof AiUnavailableError && error.retryable;
      if (!retryable || attempt === 1) break;
      const wait = error.retryAfterMs ?? 750;
      await sleep(wait);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new AiUnavailableError("AI API request failed");
}

export async function completeChatJson<T>(
  input: ChatCompletionInput,
  fallback: T
): Promise<{
  data: T;
  usedFallback: boolean;
  raw: string | null;
  failureKind: AiFailureKind | null;
}> {
  try {
    let raw: string;
    try {
      raw = await completeChatText({ ...input, json: true });
    } catch (error) {
      if (
        error instanceof AiUnavailableError &&
        (error.kind === "api_error" || error.kind === "invalid_json")
      ) {
        raw = await completeChatText({ ...input, json: false });
      } else {
        throw error;
      }
    }
    const parsed = extractJsonObject(raw);
    if (!parsed || typeof parsed !== "object") {
      return {
        data: fallback,
        usedFallback: true,
        raw,
        failureKind: "invalid_json",
      };
    }
    return {
      data: { ...fallback, ...(parsed as object) } as T,
      usedFallback: false,
      raw,
      failureKind: null,
    };
  } catch (error) {
    const failureKind =
      error instanceof AiUnavailableError ? error.kind : "api_error";
    return { data: fallback, usedFallback: true, raw: null, failureKind };
  }
}

export function isAiConfigured(): boolean {
  return getCompatibleAiConfig() !== null;
}

export function aiModelName(): string | null {
  return getCompatibleAiConfig()?.model ?? null;
}
