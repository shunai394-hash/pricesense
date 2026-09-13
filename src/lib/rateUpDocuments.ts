import {
  formatYen,
  type DiagnosisLevel,
  type JobCategory,
} from "@/lib/calculator";
import type { NegotiationParams, NegotiationResult } from "@/lib/negotiation";

export type RateUpTab = "negotiation" | "application" | "resume" | "interview";

export const RATE_UP_TABS: { id: RateUpTab; label: string }[] = [
  { id: "negotiation", label: "単価交渉文" },
  { id: "application", label: "案件応募文" },
  { id: "resume", label: "職務経歴書" },
  { id: "interview", label: "面談対策" },
];

export interface RateUpDocuments {
  application: NegotiationResult;
  resume: NegotiationResult;
  interview: NegotiationResult;
}

function gapContext(params: NegotiationParams): string {
  const { userRate, marketRate, diagnosisLevel } = params;
  if (diagnosisLevel === "significantly_low" || diagnosisLevel === "below_market") {
    return `現在の日単価${formatYen(userRate)}は、${params.category.label}の市場平均${formatYen(marketRate)}を下回っています。`;
  }
  if (diagnosisLevel === "at_market") {
    return `現在の日単価${formatYen(userRate)}は市場平均付近です。上位帯（目標${formatYen(params.targetRate)}）を意識して書きます。`;
  }
  return `現在の日単価${formatYen(userRate)}は市場平均を上回る水準です。品質と継続価値を軸に書きます。`;
}

function applicationTips(level: DiagnosisLevel, category: JobCategory): string[] {
  return [
    `${category.skillExamples}の実績を、案件要件に合わせて1〜2点だけ具体化してください`,
    "希望単価は先に断言しすぎず、診断の目標単価を上限目安にしてください",
    level === "significantly_low" || level === "below_market"
      ? "単価の安さではなく、対応範囲と成果で選ばれる書き方にしてください"
      : "即戦力として入れる範囲を明確にすると通過率が上がります",
  ];
}

export function generateApplicationMessage(
  params: NegotiationParams
): NegotiationResult {
  const { category, userRate, targetRate } = params;
  const subject = `${category.label}案件の参画ご相談（${category.description}）`;

  const body = [
    "お世話になっております。",
    `${category.label}として、${category.description}の領域で参画のご相談です。`,
    "",
    "【対応できること】",
    `・${category.skillExamples}`,
    `・${category.marketTrend}`,
    "",
    "【希望条件の目安】",
    `現在の稼働単価は${formatYen(userRate)}/日です。`,
    `今回は${formatYen(targetRate)}/日を目安にご相談できればと考えています。`,
    "",
    gapContext(params),
    "ご要件に合う場合は、稼働日数やリモート条件も含めて調整可能です。",
    "ご多忙のところ恐れ入りますが、ご検討のほどよろしくお願いいたします。",
  ].join("\n");

  return {
    subject,
    body,
    fullText: `件名：${subject}\n\n${body}`,
    tips: applicationTips(params.diagnosisLevel, category),
  };
}

export function generateResumeImprovement(
  params: NegotiationParams
): NegotiationResult {
  const { category, userRate, targetRate, marketRate } = params;
  const subject = `${category.label} 職務経歴書の改善ポイント`;

  const body = [
    `診断結果（${category.label} / 現在${formatYen(userRate)}/日）に合わせた、職務経歴書の直し方です。`,
    "",
    "1. 見出しを市場が読む言葉にする",
    `「${category.description}」を職種見出しの近くに置き、${category.skillExamples}をスキル欄の先頭にしてください。`,
    "",
    "2. 実績は単価交渉に使える数字へ",
    "「担当した」ではなく、期間・役割・成果（品質、納期、規模、改善）を1行で書いてください。",
    `市場平均は${formatYen(marketRate)}/日、目標は${formatYen(targetRate)}/日です。この差を説明できる実績が必要です。`,
    "",
    "3. 単価に見合う対応範囲を明示する",
    `上流〜実装、レビュー、コミュニケーション範囲など、${category.label}として任せられる境界を書いてください。`,
    "",
    "4. 削るもの",
    "古いツール名の羅列、責任範囲が曖昧な併記、単価と結びつかない学習歴は短くしてください。",
    "",
    gapContext(params),
  ].join("\n");

  return {
    subject,
    body,
    fullText: `${subject}\n\n${body}`,
    tips: [
      "職務経歴は新しい順、1社（1案件）あたり3〜5行が読みやすいです",
      "希望単価は職務経歴書本文に直接書かず、面談か応募文で伝えてください",
      `${category.marketTrend}に触れると、今の市場との接点が伝わります`,
    ],
  };
}

export function generateInterviewPrep(
  params: NegotiationParams
): NegotiationResult {
  const { category, userRate, targetRate, marketRate } = params;
  const subject = `${category.label} 単価・条件面談の話法`;

  const body = [
    "面談で単価を伝えるときの骨子です。数字は診断結果に合わせています。",
    "",
    "■ 冒頭（30秒）",
    `「${category.label}として${category.description}を担当し、${category.skillExamples}を中心に成果を出してきました。」`,
    "",
    "■ 単価の伝え方",
    `「現在は${formatYen(userRate)}/日です。今回は${formatYen(targetRate)}/日を目安にご相談できます。」`,
    `市場平均の参考値は${formatYen(marketRate)}/日です。相場そのものを押しつけるのではなく、対応範囲とセットで話してください。`,
    "",
    "■ 聞かれたとき",
    "Q. なぜその単価か",
    `A. 担当範囲（${category.description}）と、${category.skillExamples}で品質・スピードを担保できるためです。`,
    "",
    "Q. 下げられるか",
    "A. 稼働日数や範囲を調整する余地はあります。単価だけを先に下げるのではなく、範囲とセットで相談します。",
    "",
    "Q. 他案件との比較",
    `A. ${category.marketTrend}を踏まえ、継続しやすい条件を優先しています。`,
    "",
    gapContext(params),
  ].join("\n");

  return {
    subject,
    body,
    fullText: `${subject}\n\n${body}`,
    tips: [
      "希望単価は先に言い切り、理由を続けてください",
      "沈黙が来ても、自分から値下げ案を出さないでください",
      "数字は『確定』ではなく『ご相談の目安』と添えると話が続きやすいです",
    ],
  };
}

export function generateRateUpDocuments(
  params: NegotiationParams
): RateUpDocuments {
  return {
    application: generateApplicationMessage(params),
    resume: generateResumeImprovement(params),
    interview: generateInterviewPrep(params),
  };
}
