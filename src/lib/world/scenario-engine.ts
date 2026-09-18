import { completeChatJson } from "@/lib/ai/chat";
import type { WorldAgent } from "@/lib/world/agents";
import type { WorldEvent } from "@/lib/world/events";
import type { WorldPost } from "@/lib/world/posts";

export type WorldScenarioResult = {
  scenario: string;
  timeHorizon: string;
  probabilityBand: "low" | "medium" | "high";
  drivers: string[];
  risks: string[];
  affectedIndustries: string[];
  affectedEntities: string[];
};

export async function generateWorldScenarios(input: {
  event: WorldEvent;
  agents: WorldAgent[];
  posts: WorldPost[];
}): Promise<WorldScenarioResult[]> {
  const discussion = input.posts
    .map((post) => {
      const agent = input.agents.find((item) => item.id === post.agent_id);
      return [
        `Agent: ${agent?.name ?? post.agent_id}`,
        `Role: ${agent?.role ?? "unknown"}`,
        `Round: ${post.round}`,
        `Stance: ${post.stance}`,
        `Content: ${post.content}`,
        `Reasoning: ${post.reasoning_summary ?? ""}`,
      ].join("\n");
    })
    .join("\n\n");

  const fallback: WorldScenarioResult[] = [
    {
      scenario: "影響が拡大するシナリオ",
      timeHorizon: "1-4 weeks",
      probabilityBand: "medium",
      drivers: ["市場参加者の反応", "企業行動"],
      risks: ["予想外の外部要因"],
      affectedIndustries: [],
      affectedEntities: [],
    },
    {
      scenario: "影響が限定的に収束するシナリオ",
      timeHorizon: "1-4 weeks",
      probabilityBand: "medium",
      drivers: ["市場の織り込み", "企業の対応"],
      risks: ["追加情報による再評価"],
      affectedIndustries: [],
      affectedEntities: [],
    },
  ];

  const result = await completeChatJson<{ scenarios: WorldScenarioResult[] }>(
    {
      system: `
あなたはPriceSense AI Worldのシナリオ分析エンジンです。

現実世界で発生したイベントと、複数のAIエージェントによる議論を分析し、
「この後、世界がどう進む可能性があるか」を複数シナリオとして生成してください。

重要:
- 単一の未来を断定しない
- 少なくとも2つ、最大4つの異なるシナリオを作る
- Agentの議論に存在する根拠を使う
- 事実と推測を区別する
- probabilityBandは予測上の相対的な強さを表すだけで、確定確率ではない
- 投資助言ではなくシナリオ分析
- affectedIndustriesには、このイベントによって影響を受ける可能性のある具体的な業界を記載する
- affectedEntitiesには、議論やイベント本文に実際に登場する企業・組織・ブランド・サービスのうち、影響を受ける可能性があるものを記載する
- affectedIndustriesは、イベント本文やAgent議論から合理的に判断できる場合は空配列にしない
- affectedEntitiesは根拠がない企業名を絶対に創作しない
- affectedEntitiesはAgent議論に実際に登場した名称を優先する
- 営業・新規開拓への利用を想定し、このイベントによって新しい需要・課題・変化が発生する可能性のある業界を具体的に抽出する
- 事実として確認できる対象と、シナリオ上影響を受ける可能性がある対象を混同しない
- JSONのみ返す

JSON:
{
  "scenarios": [
    {
      "scenario": "シナリオの説明",
      "timeHorizon": "1-4 weeks",
      "probabilityBand": "low | medium | high",
      "drivers": ["主要因"],
      "risks": ["主要リスク"],
      "affectedIndustries": ["影響業界"],
      "affectedEntities": ["影響企業・組織"]
    }
  ]
}
      `.trim(),
      user: `
EVENT

タイトル:
${input.event.title}

事実:
${input.event.fact}

仮説:
${input.event.hypothesis ?? "なし"}

イベント種別:
${input.event.event_type}

重要度:
${input.event.importance}

情報源:
${input.event.source_url ?? "なし"}

WORLD AGENTS DISCUSSION

${discussion}
      `.trim(),
      temperature: 0.4,
      maxTokens: 1800,
    },
    { scenarios: fallback },
  );

  console.log("[world/scenario-engine] AI result:", JSON.stringify({
    usedFallback: result.usedFallback,
    failureKind: result.failureKind,
    raw: result.raw,
    data: result.data,
  }, null, 2));

  const scenarios = Array.isArray(result.data.scenarios)
    ? result.data.scenarios
    : [];

  return scenarios
    .filter(
      (scenario) =>
        scenario &&
        typeof scenario.scenario === "string" &&
        scenario.scenario.trim()
    )
    .slice(0, 4)
    .map((scenario) => ({
      scenario: scenario.scenario.trim(),
      timeHorizon: scenario.timeHorizon || "1-4 weeks",
      probabilityBand:
        scenario.probabilityBand === "high" ||
        scenario.probabilityBand === "medium" ||
        scenario.probabilityBand === "low"
          ? scenario.probabilityBand
          : "medium",
      drivers: Array.isArray(scenario.drivers) ? scenario.drivers : [],
      risks: Array.isArray(scenario.risks) ? scenario.risks : [],
      affectedIndustries: Array.isArray(scenario.affectedIndustries)
        ? scenario.affectedIndustries
        : [],
      affectedEntities: Array.isArray(scenario.affectedEntities)
        ? scenario.affectedEntities
        : [],
    }));
}




