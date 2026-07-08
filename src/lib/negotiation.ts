import {
  formatYen,
  type DiagnosisLevel,
  type JobCategory,
} from "@/lib/calculator";

export type NegotiationTone = "formal" | "direct";

export interface NegotiationParams {
  category: JobCategory;
  userRate: number;
  marketRate: number;
  targetRate: number;
  diagnosisLevel: DiagnosisLevel;
  tone?: NegotiationTone;
}

export interface NegotiationResult {
  subject: string;
  body: string;
  fullText: string;
  tips: string[];
}

function roundToThousands(value: number): number {
  return Math.round(value / 1000) * 1000;
}

export function getProposedRate(userRate: number, marketRate: number): number {
  if (userRate >= marketRate) {
    return roundToThousands(userRate * 1.05);
  }
  const midpoint = (userRate + marketRate) / 2;
  return roundToThousands(Math.max(midpoint, userRate + 5000));
}

function getGreeting(tone: NegotiationTone): string {
  return tone === "formal"
    ? "お世話になっております。"
    : "いつもお世話になっております。";
}

function getClosing(tone: NegotiationTone): string {
  return tone === "formal"
    ? "ご多忙のところ恐れ入りますが、ご検討のほど何卒よろしくお願いいたします。"
    : "ご確認いただけますと幸いです。よろしくお願いいたします。";
}

function getNegotiationTips(
  level: DiagnosisLevel,
  category: JobCategory
): string[] {
  const baseTips = [
    "送信前に具体的な成果（数値・事例）を1〜2点追記すると説得力が上がります",
    "契約更新の1〜2ヶ月前に提案すると成功率が高い傾向があります",
  ];

  switch (level) {
    case "significantly_low":
      return [
        `まずは中間地点（${category.label}の市場中央値との中間）を目標に段階的に交渉しましょう`,
        "過去の納期遵守・品質向上の具体例を添えると効果的です",
        ...baseTips,
      ];
    case "below_market":
      return [
        `${category.skillExamples}の実績を交渉材料にしましょう`,
        "市場相場の根拠として、本診断のデータを参考に提示できます",
        ...baseTips,
      ];
    case "at_market":
      return [
        "現行単価が適正であることを示した上で、+5%の改定を提案しましょう",
        `${category.marketTrend}という文脈を交渉材料にできます`,
        ...baseTips,
      ];
    case "above_market":
    case "premium":
      return [
        "現行単価の維持と、次期の小幅改定（+5%）をセットで提案しましょう",
        "長期継続のメリット（ナレッジ蓄積・品質安定）を強調すると効果的です",
        ...baseTips,
      ];
  }
}

function generateSignificantlyLowTemplate(
  params: NegotiationParams,
  gapPercent: number,
  tone: NegotiationTone
): NegotiationResult {
  const { category, userRate, marketRate, targetRate } = params;
  const subject = "単価改定のご相談（市場相場との整合）";

  const body = `${getGreeting(tone)}

平素より${category.label}業務にお任せいただき、誠にありがとうございます。
これまでのプロジェクトにおいて、${category.skillExamples}の領域で
成果物の品質向上および納期遵守に努めてまいりました。

近時、同業他社および市場相場を調査したところ、
${category.label}（${category.description}）の標準的な日単価は
${formatYen(marketRate)}前後となっており、
現状の${formatYen(userRate)}と比較して約${Math.abs(gapPercent)}%の
乖離がある状況でございます。

スキル・経験・実績に見合った適正単価として、
次回契約更新に際し日単価を${formatYen(targetRate)}へ
段階的に改定させていただけますと幸いです。

改定後も引き続き、品質と成果の維持・向上に努めてまいります。
${getClosing(tone)}`;

  return {
    subject,
    body,
    fullText: `件名：${subject}\n\n${body}`,
    tips: getNegotiationTips("significantly_low", category),
  };
}

function generateBelowMarketTemplate(
  params: NegotiationParams,
  gapPercent: number,
  tone: NegotiationTone
): NegotiationResult {
  const { category, userRate, marketRate, targetRate } = params;
  const subject = "単価改定のご相談";

  const body = `${getGreeting(tone)}

平素より${category.label}業務にお任せいただき、誠にありがとうございます。
これまでのプロジェクトにおいて、成果物の品質向上および
納期遵守に努めてまいりました。

市場調査の結果、${category.label}（${category.description}）の
標準的な日単価は${formatYen(marketRate)}前後となっており、
現状の${formatYen(userRate)}と比較して約${Math.abs(gapPercent)}%の
差がある状況です。

つきましては、スキル・経験・実績に見合った適正単価として、
次回契約更新に際し日単価を${formatYen(targetRate)}へ
改定させていただけますと幸いです。

改定後も引き続き、${category.skillExamples}の領域で
品質と成果の維持・向上に努めてまいります。
${getClosing(tone)}`;

  return {
    subject,
    body,
    fullText: `件名：${subject}\n\n${body}`,
    tips: getNegotiationTips("below_market", category),
  };
}

function generateAtMarketTemplate(
  params: NegotiationParams,
  tone: NegotiationTone
): NegotiationResult {
  const { category, userRate, marketRate, targetRate } = params;
  const subject = "契約更新に伴う単価改定のご相談";

  const body = `${getGreeting(tone)}

平素より${category.label}業務にお任せいただき、誠にありがとうございます。
引き続き高品質な成果の提供に努めてまいりました。

市場調査では、${category.label}（${category.description}）の
標準的な日単価は${formatYen(marketRate)}前後となっており、
現在の${formatYen(userRate)}は市場水準に見合った設定となっております。

一方で、${category.marketTrend}。
今後の物価上昇およびスキルアップに伴い、
次回契約更新に際しまして日単価を${formatYen(targetRate)}へ
改定させていただけますと幸いです。

引き続き、プロジェクトの成功に向けて全力で取り組んでまいります。
${getClosing(tone)}`;

  return {
    subject,
    body,
    fullText: `件名：${subject}\n\n${body}`,
    tips: getNegotiationTips("at_market", category),
  };
}

function generateAboveMarketTemplate(
  params: NegotiationParams,
  tone: NegotiationTone
): NegotiationResult {
  const { category, userRate, marketRate, targetRate } = params;
  const subject = "契約更新に伴う単価改定のご相談";

  const body = `${getGreeting(tone)}

平素より${category.label}業務にお任せいただき、誠にありがとうございます。
${category.skillExamples}の領域において、
継続的に高品質な成果をお届けできていると認識しております。

市場調査では、${category.label}の標準的な日単価は
${formatYen(marketRate)}前後ですが、現在の${formatYen(userRate)}は
それを上回る水準で運用させていただいております。

今後も同水準の品質を維持しつつ、
次回契約更新に際しまして日単価を${formatYen(targetRate)}へ
改定させていただけますと幸いです。

引き続き、プロジェクトの成功に向けて全力で取り組んでまいります。
${getClosing(tone)}`;

  return {
    subject,
    body,
    fullText: `件名：${subject}\n\n${body}`,
    tips: getNegotiationTips("above_market", category),
  };
}

export function generateNegotiationMessage(
  params: NegotiationParams
): NegotiationResult {
  const { userRate, marketRate, diagnosisLevel, tone = "formal" } = params;
  const gap = marketRate - userRate;
  const gapPercent = userRate > 0 ? Math.round((gap / userRate) * 100) : 0;

  switch (diagnosisLevel) {
    case "significantly_low":
      return generateSignificantlyLowTemplate(params, gapPercent, tone);
    case "below_market":
      return generateBelowMarketTemplate(params, gapPercent, tone);
    case "at_market":
      return generateAtMarketTemplate(params, tone);
    case "above_market":
    case "premium":
      return generateAboveMarketTemplate(params, tone);
  }
}
