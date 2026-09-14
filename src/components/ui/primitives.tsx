import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "ai" | "human" | "danger" | "hot" | "warm" | "nurture";
}) {
  const tones: Record<string, string> = {
    muted: "border-border/70 bg-surface text-muted",
    accent: "border-accent/40 bg-accent/10 text-accent",
    ai: "border-accent/40 bg-accent/10 text-accent",
    human: "border-border bg-foreground/5 text-foreground",
    danger: "border-red-500/40 bg-red-500/10 text-red-200",
    hot: "border-red-400/40 bg-red-500/10 text-red-200",
    warm: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    nurture: "border-border/70 bg-surface text-muted",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function AiBadge() {
  return <Badge tone="ai">AI提案</Badge>;
}

export function AiDraftBadge() {
  return <Badge tone="ai">AI Draft</Badge>;
}

export function HumanBadge() {
  return <Badge tone="human">人間が確定</Badge>;
}

export function ReviewBadge() {
  return <Badge tone="accent">要確認</Badge>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border/80 bg-surface/70 p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-accent text-background hover:bg-accent/90 disabled:opacity-40",
    secondary:
      "border border-border bg-surface text-foreground hover:border-accent/40 disabled:opacity-40",
    ghost: "text-muted hover:text-foreground disabled:opacity-40",
    danger:
      "border border-red-500/40 bg-red-500/10 text-red-200 disabled:opacity-40",
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface/50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
      role="alert"
    >
      {message}
    </p>
  );
}

export function LoadingState({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border/80 bg-surface/50 px-4 py-6 text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-accent/20 border-t-accent"
        aria-hidden
      />
      {label}
    </div>
  );
}

export function UnauthorizedState() {
  return (
    <EmptyState
      title="認証が必要です"
      description="管理者トークンを入力すると、実データが表示されます。未認証のまま架空の数値は表示しません。"
    />
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/80">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-border/70 bg-surface px-3 py-3 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`border-b border-border/50 px-3 py-3 align-top ${className}`}>
      {children}
    </td>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

export function AiHumanFlow() {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      <li>
        <Badge tone="ai">AI提案</Badge>
      </li>
      <li className="text-muted" aria-hidden>
        →
      </li>
      <li>
        <Badge tone="accent">人間確認</Badge>
      </li>
      <li className="text-muted" aria-hidden>
        →
      </li>
      <li>
        <Badge tone="human">実行</Badge>
      </li>
    </ol>
  );
}
