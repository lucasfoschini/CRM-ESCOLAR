import Link from "next/link";
import type { ReactNode } from "react";

/** Classes de botão. Variantes explícitas em vez de props booleanas. */
export const btn = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ramo-600 px-4 text-sm font-semibold text-white hover:bg-ramo-700 disabled:opacity-60",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 text-sm font-semibold text-ink hover:bg-ramo-50 disabled:opacity-60",
  danger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-perigo/30 bg-card px-4 text-sm font-semibold text-perigo hover:bg-perigo-bg disabled:opacity-60",
  ghost: "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ramo-700 hover:bg-ramo-50",
};

export const field = {
  label: "block text-sm font-medium text-ink",
  input:
    "mt-1 block min-h-11 w-full rounded-lg border border-line bg-card px-3 text-sm text-ink placeholder:text-muted focus:border-ramo-600 focus:outline-none focus:ring-2 focus:ring-ramo-100",
  hint: "mt-1 text-xs text-muted",
  error: "mt-1 text-xs font-medium text-perigo",
};

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-prose text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-card ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

const tones = {
  neutral: "bg-surface text-muted border-line",
  ramo: "bg-ramo-50 text-ramo-700 border-ramo-100",
  alerta: "bg-alerta-bg text-alerta border-alerta/20",
  perigo: "bg-perigo-bg text-perigo border-perigo/20",
  info: "bg-info-bg text-info border-info/20",
} as const;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-card px-6 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-muted">
      {label}
    </p>
  );
}

/** Abas por link (estado na URL, funciona sem JavaScript). */
export function Tabs({ items, current }: { items: { href: string; label: string; key: string; count?: number }[]; current: string }) {
  return (
    <nav aria-label="Filtros" className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
      {items.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active ? "border-ramo-600 text-ramo-700" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.count !== undefined ? <span className="ml-1.5 text-xs text-muted">{t.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Aviso de que um ponto da tela ainda depende de definição da escola (D-024). */
export function PendingNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-info/20 bg-info-bg px-3 py-2 text-xs text-info">
      <strong className="font-semibold">A validar com a escola: </strong>
      {children}
    </p>
  );
}
