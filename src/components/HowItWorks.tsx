import { JOB_CATEGORY_COUNT } from "@/data/jobCategories";

const STEPS = [
  {
    n: "01",
    title: "診断",
    body: "職種と日単価を入力するだけ。登録なしで市場相場と比較できます。",
  },
  {
    n: "02",
    title: "結果確認",
    body: "差額・年間インパクト・次に取るべき行動が、その場で分かります。",
  },
  {
    n: "03",
    title: "Lead登録",
    body: "PDF保存時にメールを登録すると、診断結果がLeadとして保存されます。",
  },
  {
    n: "04",
    title: "AI分析とNext Action",
    body: "営業ワークスペースで管理者がLeadを開くと、AIがスコア・意図・次アクションを提案します。実行は人間が確認します。",
  },
  {
    n: "05",
    title: "営業活動（人間確認）",
    body: "フォローアップ・商談・提案・見積は下書きまたは管理者が確認して実行します。自動で営業メールは送りません。",
  },
  {
    n: "06",
    title: "Dealと分析",
    body: "成約・失注・失敗したアクションは履歴に残り、RevOpsでLeadから売上までの流れを確認できます。",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium tracking-widest text-accent">
            使い方
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            診断から、営業オペレーションまで
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            PriceSenseは{JOB_CATEGORY_COUNT}
            職種の単価診断を入口に、Lead・AI提案・人間確認・分析をつなぐWebサービスです。スマートフォン向けアプリの配信はありません。
          </p>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-border/80 bg-surface/50 p-6"
            >
              <p className="text-xs font-medium tracking-widest text-accent">
                {step.n}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
