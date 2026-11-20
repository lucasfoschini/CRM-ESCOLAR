import Link from "next/link";
import type { ReactNode } from "react";
import { UserX } from "lucide-react";
import { Tabs } from "@/components/ui";
import { InboxToolbar } from "@/components/whatsapp";
import { fmtDayLong, fmtDayMonth, fmtTime, now, startOfDay } from "@/lib/dates";
import { DEFAULT_TAB, INBOX_TABS, listAgents, listConversations } from "@/modules/whatsapp/queries";

// Tela no modelo do WhatsApp do SIG (observada em 2026-11-20): lista à esquerda, conversa ao centro, contexto à direita.

export type InboxParams = { f?: string; q?: string; a?: string; ctx?: string };

export function parseInboxParams(sp: Record<string, string | string[] | undefined>): InboxParams {
  const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  return { f: one(sp.f), q: one(sp.q)?.trim() || undefined, a: one(sp.a), ctx: one(sp.ctx) };
}

/** Query string preservando filtros, busca e painel ao trocar de conversa ou aba. */
export function inboxQuery(sp: InboxParams, patch: Partial<InboxParams> = {}) {
  const merged = { ...sp, ...patch };
  const u = new URLSearchParams();
  for (const k of ["f", "q", "a", "ctx"] as const) if (merged[k]) u.set(k, merged[k]);
  const s = u.toString();
  return s ? `?${s}` : "";
}

export function initials(name: string) {
  const words = name.match(/\p{L}+/gu) ?? [];
  if (!words.length) return "#";
  return (words[0]!.charAt(0) + (words.length > 1 ? words.at(-1)!.charAt(0) : "")).toUpperCase();
}

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span
      aria-hidden
      title={small ? name : undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ramo-100 font-semibold text-ramo-700 ${small ? "size-5 text-[10px]" : "size-10 text-sm"}`}
    >
      {initials(name)}
    </span>
  );
}

/** "Hoje"/"Ontem"/"11 de novembro" (separadores) ou hora/"ontem"/"11 de nov." (lista). */
export function relativeDay(d: Date, today: Date, short = false) {
  const day = startOfDay(d).getTime();
  if (day === startOfDay(today).getTime()) return short ? fmtTime(d) : "Hoje";
  if (day === startOfDay(today, -1).getTime()) return short ? "ontem" : "Ontem";
  return short ? fmtDayMonth(d) : fmtDayLong(d);
}

export function InboxShell({ list, children, hasActive = false }: { list: ReactNode; children: ReactNode; hasActive?: boolean }) {
  return (
    <div data-fullbleed className="flex h-[calc(100dvh-5.375rem)] min-h-[32rem] overflow-hidden bg-card">
      <aside aria-label="Conversas" className={`${hasActive ? "hidden lg:flex" : "flex"} w-full shrink-0 flex-col border-r border-line lg:w-80`}>
        {list}
      </aside>
      <section className={`${hasActive ? "flex" : "hidden lg:flex"} relative min-w-0 flex-1 flex-col bg-surface`}>{children}</section>
    </div>
  );
}

export async function InboxList({ sp, activeId }: { sp: InboxParams; activeId?: string }) {
  const tab = INBOX_TABS.find((t) => t.key === sp.f)?.key ?? DEFAULT_TAB;
  const today = await now();
  const [items, agents] = await Promise.all([listConversations({ tab, q: sp.q, assigneeId: sp.a }), listAgents()]);
  const base = activeId ? `/whatsapp/${activeId}` : "/whatsapp";
  return (
    <>
      <InboxToolbar agents={agents} tab={tab} q={sp.q} a={sp.a} />
      <Tabs
        className="px-2 [scrollbar-width:none]"
        current={tab}
        items={INBOX_TABS.map((t) => ({ key: t.key, label: t.label, href: `${base}${inboxQuery(sp, { f: t.key === DEFAULT_TAB ? undefined : t.key })}` }))}
      />
      <ul className="min-h-0 flex-1 overflow-y-auto py-1">
        {items.map((c) => {
          const name = c.contact?.guardian.name ?? c.phone;
          const last = c.messages[0];
          const active = c.id === activeId;
          return (
            <li key={c.id} className="px-1.5">
              <Link
                href={`/whatsapp/${c.id}${inboxQuery(sp)}`}
                aria-current={active ? "page" : undefined}
                className={`flex gap-3 rounded-lg px-2 py-2.5 ${active ? "bg-ramo-50" : "hover:bg-ramo-50/60"}`}
              >
                <Avatar name={name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm text-ink ${c.unread ? "font-semibold" : "font-medium"}`}>{name}</span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">{relativeDay(c.lastMessageAt, today, true)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">
                      {last ? `${last.direction === "OUT" ? "Você: " : ""}${last.body}` : "Sem mensagens"}
                    </span>
                    {!c.contact ? <UserX aria-label="Contato não identificado" className="size-3.5 shrink-0 text-alerta" /> : null}
                    {c.assignee ? <Avatar name={c.assignee.name} small /> : null}
                    {c.unread ? (
                      <span className="min-w-5 shrink-0 rounded-full bg-acao px-1.5 text-center text-[11px] font-semibold leading-5 text-acao-ink tabular-nums">
                        <span className="sr-only">Não lidas: </span>
                        {c.unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {!items.length ? <li className="px-4 py-10 text-center text-sm text-muted">Nenhuma conversa neste filtro.</li> : null}
      </ul>
    </>
  );
}
