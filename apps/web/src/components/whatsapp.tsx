"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Filter, Headset, Mic, Paperclip, Plus, Search, SendHorizontal, Smile, StickyNote, Zap } from "lucide-react";
import { markRead, sendMessage, simulateIncoming } from "@/modules/whatsapp/actions";
import { fillTemplate, unresolvedVars } from "@/modules/whatsapp/templates";
import { btn, field } from "./ui";

export const iconBtn = "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-ramo-50 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent";

/** Cria uma mensagem "recebida" (D-027: simulação, não há webhook). */
export function SimulateIncomingForm() {
  const [state, action, pending] = useActionState(simulateIncoming, undefined);
  return (
    <details className="relative">
      <summary
        aria-label="Simular mensagem recebida"
        title="Simular mensagem recebida"
        className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-lg bg-acao text-acao-ink hover:bg-acao-hover"
      >
        <Plus aria-hidden className="size-5" />
      </summary>
      <form action={action} className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-line bg-card p-4 shadow-lg">
        <p className="text-sm font-semibold text-ink">Simular mensagem recebida</p>
        <div>
          <label htmlFor="sim-phone" className={field.label}>
            Telefone de quem escreve
          </label>
          <input id="sim-phone" name="phone" inputMode="tel" defaultValue={state?.values?.phone} placeholder="(11) 91234-5678" className={field.input} />
          <p className={field.hint}>Se o telefone já estiver no cadastro, a conversa é associada ao responsável.</p>
        </div>
        <div>
          <label htmlFor="sim-body" className={field.label}>
            Mensagem
          </label>
          <textarea id="sim-body" name="body" rows={3} defaultValue={state?.values?.body} className={field.input} placeholder="Olá, gostaria de saber sobre vagas…" />
        </div>
        {state?.error ? (
          <p role="alert" className={field.error}>
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={`${btn.primary} w-full`}>
          {pending ? "Recebendo…" : "Receber mensagem"}
        </button>
      </form>
    </details>
  );
}

/** Cabeçalho da lista: título, filtro por atendente (funil), simulação, busca. Estado na URL (GET). */
export function InboxToolbar({ agents, tab, q, a }: { agents: { id: string; name: string }[]; tab: string; q?: string; a?: string }) {
  const pathname = usePathname();
  const [showFilter, setShowFilter] = useState(Boolean(a));
  return (
    <div className="space-y-3 px-3 pb-2 pt-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-ink">Conversas</h1>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowFilter((v) => !v)} aria-pressed={showFilter} aria-label="Filtros" title="Filtros" className={`${iconBtn} ${showFilter || a ? "bg-ramo-50 text-ink" : ""}`}>
            <Filter aria-hidden className="size-4" />
          </button>
          <SimulateIncomingForm />
        </div>
      </div>
      <form action={pathname} role="search" className="space-y-2">
        <input type="hidden" name="f" value={tab} />
        <label className="relative block">
          <span className="sr-only">Buscar por nome, telefone ou mensagem</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input type="search" name="q" defaultValue={q} placeholder="Nome, telefone ou mensagem" className={`${field.input} mt-0 min-h-9 pl-9`} />
        </label>
        {showFilter ? (
          <label className="block">
            <span className="sr-only">Atendente</span>
            <select name="a" defaultValue={a ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className={`${field.input} mt-0 min-h-9`}>
              <option value="">Todos os atendentes</option>
              {agents.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        ) : a ? (
          <input type="hidden" name="a" value={a} />
        ) : null}
      </form>
    </div>
  );
}

/** Zera o contador ao abrir a conversa no navegador. */
export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    void markRead(conversationId);
  }, [conversationId]);
  return null;
}

type Template = { id: string; shortcut: string; name: string; body: string };

/** Barra de resposta no modelo do SIG: Anotar (RF-WPP-007), mensagens rápidas por ⚡ ou "/" (RF-WPP-011), modelos com variáveis (RF-WPP-012). */
export function Composer({
  conversationId,
  templates,
  vars,
  unassigned,
}: {
  conversationId: string;
  templates: Template[];
  vars: Record<string, string | undefined>;
  unassigned: boolean;
}) {
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof sendMessage>>, fd: FormData) => {
    const result = await sendMessage(prev, fd);
    // O React limpa o form após a action; o estado acompanha (volta para mensagem comum).
    if (!result?.error) {
      setText("");
      setInternal(false);
    }
    return result;
  }, undefined);

  const query = text.startsWith("/") ? text.slice(1).toLowerCase() : showQuick ? "" : null;
  const suggestions = query === null ? [] : templates.filter((t) => t.shortcut.startsWith(query) || t.name.toLowerCase().includes(query));
  const missing = internal ? [] : unresolvedVars(text);
  const unavailable = "Indisponível no protótipo (D-027)";

  return (
    <form action={action} className="space-y-2 border-t border-line bg-card px-4 py-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      {internal ? <input type="hidden" name="internal" value="on" /> : null}
      {internal ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-alerta">
          <StickyNote aria-hidden className="size-3.5" /> Nota interna: só a equipe vê, nunca é enviada ao responsável.
        </p>
      ) : unassigned ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Headset aria-hidden className="size-3.5" /> Conversa sem atendente: ao responder, você assume o atendimento.
        </p>
      ) : null}
      {suggestions.length ? (
        <ul aria-label="Mensagens rápidas" className="max-h-48 overflow-y-auto rounded-lg border border-line bg-card">
          {suggestions.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setText(fillTemplate(t.body, vars));
                  setShowQuick(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-ramo-50"
              >
                <span className="font-medium text-ink">/{t.shortcut}</span> <span className="text-muted">· {t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={`flex items-end gap-1 rounded-xl border px-1.5 py-1 ${internal ? "border-alerta/40 bg-alerta-bg" : "border-line bg-surface"}`}>
        <button
          type="button"
          aria-pressed={internal}
          onClick={() => setInternal((v) => !v)}
          title="Anotar no atendimento (nota interna)"
          className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium ${internal ? "bg-alerta/10 text-alerta" : "text-muted hover:bg-ramo-50 hover:text-ink"}`}
        >
          <StickyNote aria-hidden className="size-4" /> Anotar
        </button>
        <button type="button" disabled aria-label={`Enviar arquivo: ${unavailable}`} title={unavailable} className={iconBtn}>
          <Paperclip aria-hidden className="size-4" />
        </button>
        <button type="button" disabled aria-label={`Emojis: ${unavailable}`} title={unavailable} className={iconBtn}>
          <Smile aria-hidden className="size-4" />
        </button>
        <button type="button" aria-pressed={showQuick} onClick={() => setShowQuick((v) => !v)} aria-label="Mensagens rápidas" title="Mensagens rápidas (ou digite /)" className={`${iconBtn} ${showQuick ? "bg-ramo-50 text-ink" : ""}`}>
          <Zap aria-hidden className="size-4" />
        </button>
        <label htmlFor="msg" className="sr-only">
          {internal ? "Nota interna" : "Mensagem"}
        </label>
        <textarea
          id="msg"
          name="body"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={internal ? "Nota para a equipe…" : "Escreva uma mensagem"}
          className="field-sizing-content max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        {text.trim() ? (
          <button type="submit" disabled={pending} aria-label={internal ? "Salvar nota" : "Enviar (simulado)"} title={internal ? "Salvar nota" : "Enviar (simulado)"} className={`${iconBtn} text-ramo-700`}>
            <SendHorizontal aria-hidden className="size-4" />
          </button>
        ) : (
          <button type="button" disabled aria-label={`Gravar áudio: ${unavailable}`} title={unavailable} className={iconBtn}>
            <Mic aria-hidden className="size-4" />
          </button>
        )}
      </div>
      {missing.length ? <p className={field.hint}>Falta preencher: {missing.map((v) => `{{${v}}}`).join(", ")}</p> : null}
      {state?.error ? (
        <p role="alert" className={field.error}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
