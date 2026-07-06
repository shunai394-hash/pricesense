import { formatYen, type JobCategory } from "@/lib/calculator";

interface NegotiationParams {
  category: JobCategory;
  userRate: number;
  marketRate: number;
}

function roundToThousands(value: number): number {
  return Math.round(value / 1000) * 1000;
}

function proposedRate(userRate: number, marketRate: number): number {
  if (userRate >= marketRate) {
    return roundToThousands(userRate * 1.05);
  }
  const midpoint = (userRate + marketRate) / 2;
  return roundToThousands(Math.max(midpoint, userRate + 5000));
}

export function generateNegotiationMessage({
  category,
  userRate,
  marketRate,
}: NegotiationParams): string {
  const target = proposedRate(userRate, marketRate);
  const gap = marketRate - userRate;
  const gapPercent =
    userRate > 0 ? Math.round((gap / userRate) * 100) : 0;

  if (userRate >= marketRate) {
    return `件名：契約更新に伴う単価改定のご相談

お世話になっております。

平素より${category.label}業務にお任せいただき、誠にありがとうございます。
引き続き高品質な成果の提供に努めてまいりました。

近時の市場調査では、${category.label}（${category.description}）の
標準的な日単価は${formatYen(marketRate)}前後となっており、
現在の${formatYen(userRate)}は市場水準に見合った設定となっております。

今後の物価上昇およびスキルアップに伴い、
次回契約更新に際しまして日単価を${formatYen(target)}へ
改定させていただけますと幸いです。

引き続き、プロジェクトの成功に向けて全力で取り組んでまいります。
ご検討のほど、何卒よろしくお願いいたします。`;
  }

  return `件名：単価改定のご相談

お世話になっております。

平素より${category.label}業務にお任せいただき、誠にありがとうございます。
これまでのプロジェクトにおいて、成果物の品質向上および
納期遵守に努めてまいりました。

近時、同業他社および市場相場を調査したところ、
${category.label}（${category.description}）の標準的な日単価は
${formatYen(marketRate)}前後となっており、
現状の${formatYen(userRate)}と比較して約${Math.abs(gapPercent)}%の
乖離がある状況でございます。

つきましては、スキル・経験・実績に見合った適正単価として、
次回契約更新に際し日単価を${formatYen(target)}へ
改定させていただけますと幸いです。

改定後も引き続き、品質と成果の維持・向上に努めてまいります。
ご多忙のところ恐れ入りますが、ご検討のほど
何卒よろしくお願いいたします。`;
}
