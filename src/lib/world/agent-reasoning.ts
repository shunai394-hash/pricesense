import { completeChatJson } from "@/lib/ai/chat";
import type { WorldAgent } from "@/lib/world/agents";
import type { WorldEvent } from "@/lib/world/events";
import type { WorldPost } from "@/lib/world/posts";

export type AgentReasoningResult = {
  content: string;
  stance: WorldPost["stance"];
  reasoningSummary: string;
  signalsToWatch: string[];
  likelyEffects: string[];
};

export async function reasonAboutWorldEvent(input: {
  agent: WorldAgent;
  event: WorldEvent;
  previousPosts: WorldPost[];
}): Promise<AgentReasoningResult> {
  const { agent, event, previousPosts } = input;

  const previousDiscussion = previousPosts
    .slice(-8)
    .map(
      (post) =>
        `[${post.stance}] ${post.content}\n理由: ${post.reasoning_summary ?? ""}`
    )
    .join("\n\n");

  const fallback: AgentReasoningResult = {
    content: `${agent.name}は「${event.title}」について${agent.role}の視点から分析する。`,
    stance: "neutral",
    reasoningSummary: "十分なAI応答を取得できなかったため、中立的な初期判断を保持した。",
    signalsToWatch: [],
    likelyEffects: [],
  };

  const result = await completeChatJson<AgentReasoningResult>(
    {
      system: `
あなたはPriceSense AI Worldの仮想市場エージェントです。

あなたは「${agent.name}」という人格を持つ。
役割: ${agent.role}
人格: ${agent.persona}
関心領域: ${agent.interests.join(", ")}
地域: ${agent.region_code}
リスク許容度: ${agent.risk_profile}

あなたの仕事は、現実世界で起きた出来事について、
自分の立場から独立して判断することです。

重要:
- 事実と推測を混同しない
- 他のエージェントと同じ結論に合わせない
- 自分の役割・関心・リスク許容度を判断に反映する
- 不確実な場合は不確実だと判断する
- 投資助言ではなくシナリオ分析として考える
- 短く具体的に書く

JSONのみ返してください。

必要なJSON:
{
  "content": "エージェント本人の分析・発言",
  "stance": "support | oppose | skeptical | neutral | curious",
  "reasoningSummary": "判断理由",
  "signalsToWatch": ["今後観測すべきシグナル"],
  "likelyEffects": ["想定される影響"]
}
      `.trim(),
      user: `
今回のWorld Event:

タイトル:
${event.title}

確認された事実:
${event.fact}

仮説:
${event.hypothesis ?? "なし"}

イベント種別:
${event.event_type}

重要度:
${event.importance}

情報源:
${event.source_url ?? "なし"}

現在までのWorld内の議論:
${previousDiscussion || "まだ他の議論はありません。"}

この出来事について、あなた自身の判断をしてください。
      `.trim(),
      temperature: 0.7,
      maxTokens: 900,
    },
    fallback,
  );

  return result.data;
}
