import { JOB_CATEGORY_COUNT } from "@/data/jobCategories";

const features = [
  {
    highlighted: true,
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
    title: "次の一手まで出す",
    description:
      "市場より低ければ高単価案件、今の仕事を続けるなら単価交渉。診断結果から、収入を上げやすい行動を先に提示します。",
  },
  {
    highlighted: false,
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
    title: "単価交渉を作れる",
    description:
      "今の案件を続ける人向け。市場との差を根拠にした交渉文を作成。Premiumで全文、応募文、職務経歴書改善、面談対策まで利用できます。",
  },
  {
    highlighted: false,
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    title: `${JOB_CATEGORY_COUNT}職種の相場データ`,
    description:
      "IT・デザイン・AI・士業など100職種以上の日単価（最低・平均・上位25%・上位10%）を参照。算出基準と更新日を明示。",
  },
  {
    highlighted: false,
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
        />
      </svg>
    ),
    title: "年間インパクト可視化",
    description:
      "市場との差額を220稼働日で換算した参考値として表示。値上げの根拠が数字で伝わる。",
  },
];

export function Features() {
  return (
    <section className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="text-xs font-medium tracking-widest text-accent">
            PriceSenseの特徴
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            診断から、次の一手まで
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted">
            相場を知るだけでなく、今やるべき一手までつながります。
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group rounded-2xl border p-8 transition-all ${
                feature.highlighted
                  ? "border-accent/30 bg-accent/5 hover:border-accent/40 hover:bg-accent/10"
                  : "border-border bg-surface/50 hover:border-accent/20 hover:bg-surface"
              }`}
            >
              {feature.highlighted && (
                <span className="mb-4 inline-flex rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                  差別化ポイント
                </span>
              )}
              <div
                className={`mb-5 inline-flex rounded-xl border p-3 transition-colors ${
                  feature.highlighted
                    ? "border-accent/30 bg-accent/10 text-accent group-hover:bg-accent/15"
                    : "border-accent/20 bg-accent/5 text-accent group-hover:bg-accent/10"
                }`}
              >
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
