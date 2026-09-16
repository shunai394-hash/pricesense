"use client";

import { useCallback, useState } from "react";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";

interface NegotiationAdvice {
  category: string;
  classification: string;
  utterance: string;
  confirmedFacts: string[];
  unknowns: string[];
  recommendedQuestions: string[];
  replyDraft: string;
  nextAction: string;
  matchedPhrases: string[];
  caution: string;
  usedAi: boolean;
}

export function NegotiationWorkspace() {
  const { token, setToken, persist } = useAdminToken();
  const [leadId, setLeadId] = useState("");
  const [prospectId, setProspectId] = useState("");
  const [message, setMessage] = useState("");
  const [advice, setAdvice] = useState<NegotiationAdvice | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async () => {
    if (!token || !message.trim()) return;
    setLoading(true);
    setError("");
    setAdvice(null);
    try {
      const response = await fetch("/api/ai/negotiate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: leadId.trim() || undefined,
          prospect_id: prospectId.trim() || undefined,
          message: message.trim(),
        }),
      });
      const json = (await response.json()) as {
        error?: string;
        advice?: NegotiationAdvice;
      };
      if (!response.ok || !json.advice) {
        setError(json.error || `分析に失敗しました（${response.status}）`);
        return;
      }
      persist(token);
      setAdvice(json.advice);
    } catch {
      setError("交渉分析を実行できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [leadId, message, persist, prospectId, token]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="交渉支援"
        description="相手の発言・確認済み事実・不明点・確認事項・返信案・次アクションを分けます。心理の断定や架空の価格・競合は出しません。"
      />

      <AdminSessionBar
        token={token}
        onTokenChange={setToken}
        onSubmit={() => void analyze()}
        loading={loading}
        submitLabel="分析する"
      />

      <form
        className="mb-6 space-y-3 rounded-xl border border-border/80 bg-surface/60 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void analyze();
        }}
      >
        <input
          value={leadId}
          onChange={(event) => setLeadId(event.target.value)}
          placeholder="Lead ID（任意）"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={prospectId}
          onChange={(event) => setProspectId(event.target.value)}
          placeholder="Prospect ID（任意）"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="相手の発言（例: 社内で検討します / 予算がありません）"
          className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!token || !message.trim() || loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
        >
          {loading ? "分析中…" : "交渉を整理する"}
        </button>
      </form>

      {error ? (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      ) : null}
      {loading ? (
        <div className="mb-6">
          <LoadingState label="交渉内容を整理しています…" />
        </div>
      ) : null}

      {advice ? (
        <div className="grid gap-4">
          <Card>
            <p className="text-xs text-muted">
              {advice.usedAi ? "AI提案" : "AI未使用の分類"} / {advice.category} /{" "}
              {advice.classification}
            </p>
            <h2 className="mt-2 font-display text-xl">相手の発言</h2>
            <p className="mt-2 text-sm">{advice.utterance}</p>
            {advice.matchedPhrases.length > 0 ? (
              <p className="mt-2 text-xs text-muted">
                一致した表現: {advice.matchedPhrases.join("、")}
              </p>
            ) : null}
          </Card>
          <Card>
            <h2 className="font-display text-xl">確認できている事実</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {advice.confirmedFacts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="font-display text-xl">不明点</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {advice.unknowns.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="font-display text-xl">推奨する確認事項</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {advice.recommendedQuestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="font-display text-xl">返信案</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{advice.replyDraft}</p>
            <p className="mt-3 text-xs text-muted">送信は人間が確認してから行います。</p>
          </Card>
          <Card>
            <h2 className="font-display text-xl">次の営業アクション</h2>
            <p className="mt-2 text-sm">{advice.nextAction}</p>
            <p className="mt-3 text-xs text-muted">{advice.caution}</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
