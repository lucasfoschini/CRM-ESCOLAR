import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Archive, ArchiveRestore, ArrowLeft, Check, EllipsisVertical, Headset, ListTodo, Mail, PanelRight, RotateCcw, Target, UserCog, UserRound, X } from "lucide-react";
import { Badge, Loading, PendingNote, btn, field } from "@/components/ui";
import { Composer, MarkRead, iconBtn } from "@/components/whatsapp";
import { fmtDate, fmtDateTime, fmtTime, now, startOfDay } from "@/lib/dates";
import { conversationStatusLabel, conversationStatusTone } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";
import { assignConversation, claimConversation, linkGuardian, markUnread, setArchived, setConversationStatus } from "@/modules/whatsapp/actions";
import { getConversation, listAgents, listGuardianOptions, listTemplates } from "@/modules/whatsapp/queries";
import { InboxList, InboxShell, inboxQuery, parseInboxParams, relativeDay } from "../inbox";

const firstName = (s?: string) => s?.split(" ")[0];
const menuItem = "flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-ink hover:bg-ramo-50";
const sectionTitle = "mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted";

async function Detail({ params, searchParams }: PageProps<"/whatsapp/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams.then(parseInboxParams)]);
  const today = await now();
  const [c, templates, user, agents] = await Promise.all([getConversation(id), listTemplates(), getCurrentUser(), listAgents()]);
  if (!c) notFound();
  const g = c.contact?.guardian;
  const student = g?.students[0]?.student;
  const [focus, ...others] = g?.applications.map((a) => a.application) ?? [];
  // RF-WPP-012: dados para as variáveis dos modelos; o que faltar bloqueia o envio.
  const vars = {
    responsavel: firstName(g?.name),
    aluno: firstName(student?.name ?? focus?.prospect.childName),
    turma: student?.enrollments[0]?.class.name,
    data: focus?.visitAt ? fmtDate(focus.visitAt) : undefined,
    hora: focus?.visitAt ? fmtTime(focus.visitAt) : undefined,
  };
  const guardians = g ? [] : await listGuardianOptions();
  const ctxOpen = sp.ctx === "1";
  const ctxHref = `/whatsapp/${c.id}${inboxQuery(sp, { ctx: ctxOpen ? undefined : "1" })}`;
  const resolved = c.status === "RESOLVED";
  const stageIdx = focus ? c.stages.findIndex((s) => s.id === focus.stageId) : -1;
  const hidden = <input type="hidden" name="conversationId" value={c.id} />;

  return (
    <InboxShell hasActive list={<InboxList sp={sp} activeId={c.id} />}>
      <MarkRead conversationId={c.id} />
      <header className="flex min-h-16 items-center gap-2 border-b border-line bg-card px-3 py-2 lg:px-4">
        <Link href={`/whatsapp${inboxQuery(sp, { ctx: undefined })}`} aria-label="Voltar para a lista" className={`${iconBtn} lg:hidden`}>
          <ArrowLeft aria-hidden className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-ink">{g?.name ?? c.phone}</h2>
            {c.assignee ? null : <Badge tone="alerta">Sem atendente</Badge>}
            <Badge tone={conversationStatusTone[c.status]}>{conversationStatusLabel[c.status]}</Badge>
            {c.archived ? <Badge>Arquivada</Badge> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="tabular-nums">{c.phone}</span>
            {c.assignee ? <span>· Atendente: {c.assignee.id === user.id ? "você" : c.assignee.name}</span> : null}
            {focus ? (
              <Link href={`/atendimentos/${focus.id}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line px-2 py-0.5 hover:bg-ramo-50">
                <Target aria-hidden className="size-3" />
                <span className="truncate">{focus.title}</span>
                <span className="font-medium text-ramo-700">· {focus.stage.name}</span>
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {c.assignee?.id !== user.id ? (
            <form action={claimConversation}>
              {hidden}
              <button type="submit" className={`${btn.primary} min-h-9 px-3`}>
                <Headset aria-hidden className="size-4" /> Atender
              </button>
            </form>
          ) : null}
          <Link href={ctxHref} aria-label="Contexto: atendimento, tarefas e responsável" title="Contexto" className={`${iconBtn} ${ctxOpen ? "bg-ramo-50 text-ink" : ""}`}>
            <PanelRight aria-hidden className="size-4" />
          </Link>
          <button type="button" popoverTarget="conv-menu" aria-label="Mais ações da conversa" title="Mais ações" className={iconBtn}>
            <EllipsisVertical aria-hidden className="size-4" />
          </button>
          {/* Popover nativo: fecha com Esc e clique fora, sem JavaScript. Silenciar, etiquetas e excluir ficaram de fora (RF-WPP-008 sem lista; exclusão depende da retenção LGPD). */}
          <div id="conv-menu" popover="auto" className="fixed inset-auto right-4 top-36 m-0 w-64 rounded-xl border border-line bg-card p-1 shadow-lg">
            <form action={setConversationStatus}>
              {hidden}
              <input type="hidden" name="status" value={resolved ? "OPEN" : "RESOLVED"} />
              <button type="submit" className={menuItem}>
                {resolved ? <RotateCcw aria-hidden className="size-4" /> : <Check aria-hidden className="size-4" />} {resolved ? "Reabrir" : "Finalizar"}
              </button>
            </form>
            <Link href={ctxHref} className={menuItem}>
              <PanelRight aria-hidden className="size-4" /> Contexto
            </Link>
            <form action={assignConversation} className="space-y-1 px-3 py-2">
              {hidden}
              <label htmlFor="assigneeId" className="flex items-center gap-2 text-sm text-ink">
                <UserCog aria-hidden className="size-4" /> Trocar responsável
              </label>
              <div className="flex gap-1">
                <select id="assigneeId" name="assigneeId" defaultValue={c.assignee?.id ?? ""} className={`${field.input} mt-0 min-h-9`}>
                  <option value="">Sem atendente</option>
                  {agents.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className={`${btn.secondary} min-h-9 px-3`}>
                  OK
                </button>
              </div>
            </form>
            <form action={markUnread}>
              {hidden}
              <button type="submit" className={menuItem}>
                <Mail aria-hidden className="size-4" /> Marcar como não lida
              </button>
            </form>
            <hr className="my-1 border-line" />
            <form action={setArchived}>
              {hidden}
              <input type="hidden" name="archived" value={String(!c.archived)} />
              <button type="submit" className={menuItem}>
                {c.archived ? <ArchiveRestore aria-hidden className="size-4" /> : <Archive aria-hidden className="size-4" />} {c.archived ? "Desarquivar conversa" : "Arquivar conversa"}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <ol aria-label="Mensagens" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 lg:px-8">
            {c.messages.map((m, i) => {
              const newDay = i === 0 || startOfDay(m.createdAt).getTime() !== startOfDay(c.messages[i - 1].createdAt).getTime();
              const separator = newDay ? (
                <li key={`d-${m.id}`} className="flex justify-center py-2">
                  <span className="rounded-full border border-line bg-card px-3 py-0.5 text-xs text-muted">{relativeDay(m.createdAt, today)}</span>
                </li>
              ) : null;
              if (m.direction === "NOTE")
                return [
                  separator,
                  <li key={m.id} className="mx-auto max-w-xl rounded-lg border border-alerta/30 bg-alerta-bg px-3 py-2 text-sm">
                    <span className="block text-xs font-medium text-alerta">
                      Nota interna · {m.author?.name ?? "Equipe"} · {fmtTime(m.createdAt)}
                    </span>
                    <span className="whitespace-pre-wrap text-ink">{m.body}</span>
                  </li>,
                ];
              const out = m.direction === "OUT";
              return [
                separator,
                <li key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl border px-3 py-1.5 text-sm shadow-xs ${out ? "rounded-br-sm border-ramo-100 bg-ramo-50" : "rounded-bl-sm border-line bg-card"}`}>
                    <span className="whitespace-pre-wrap text-ink">{m.body}</span>
                    <span className="mt-0.5 block text-right text-[11px] text-muted tabular-nums">
                      {out ? `${m.author?.name ?? "Equipe"} · ` : ""}
                      {fmtTime(m.createdAt)}
                    </span>
                  </div>
                </li>,
              ];
            })}
            {!c.messages.length ? <li className="py-6 text-center text-sm text-muted">Nenhuma mensagem ainda.</li> : null}
          </ol>
          <Composer key={c.id} conversationId={c.id} templates={templates} vars={vars} unassigned={!c.assignee} />
        </div>

        {ctxOpen ? (
          <aside aria-label="Contexto" className="absolute inset-y-0 right-0 z-10 w-80 max-w-full overflow-y-auto border-l border-line bg-card shadow-lg xl:static xl:shadow-none">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Contexto</h2>
              <Link href={ctxHref} aria-label="Fechar contexto" className={iconBtn}>
                <X aria-hidden className="size-4" />
              </Link>
            </div>
            {g ? (
              <>
                <section className="border-b border-line px-4 py-3 text-sm">
                  <h3 className={sectionTitle}>
                    <Target aria-hidden className="size-3.5" /> Atendimento em foco
                  </h3>
                  {focus ? (
                    <>
                      <Link href={`/atendimentos/${focus.id}`} className="font-medium text-ramo-700 hover:underline">
                        {focus.title}
                      </Link>
                      <ol aria-label="Etapas do funil" className="mt-2 flex gap-1">
                        {c.stages.map((s, i) => (
                          <li key={s.id} title={s.name} className={`h-1.5 flex-1 rounded-full ${i <= stageIdx ? "bg-ramo-600" : "bg-line"}`}>
                            <span className="sr-only">
                              {s.name}
                              {i === stageIdx ? " (etapa atual)" : ""}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-1 text-xs text-muted">Etapa: {focus.stage.name}</p>
                      {others.length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted">Outros atendimentos do responsável ({others.length})</summary>
                          <ul className="mt-1 space-y-1">
                            {others.map((a) => (
                              <li key={a.id}>
                                <Link href={`/atendimentos/${a.id}`} className="text-ramo-700 hover:underline">
                                  {a.title}
                                </Link>
                                <span className="text-xs text-muted"> · {a.stage.name}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-muted">Nenhum atendimento em aberto.</p>
                  )}
                </section>
                <section className="border-b border-line px-4 py-3 text-sm">
                  <h3 className={sectionTitle}>
                    <ListTodo aria-hidden className="size-3.5" /> Tarefas desta conversa
                  </h3>
                  {c.tasks.length ? (
                    <ul className="space-y-1">
                      {c.tasks.map((t) => (
                        <li key={t.id}>
                          <span className="text-ink">{t.title}</span>
                          <span className="block text-xs text-muted">{fmtDateTime(t.dueAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">Nenhuma tarefa aberta com este responsável.</p>
                  )}
                </section>
                <section className="border-b border-line px-4 py-3 text-sm">
                  <h3 className={sectionTitle}>
                    <UserRound aria-hidden className="size-3.5" /> Responsável
                  </h3>
                  <Link href={`/responsaveis/${g.id}`} className="font-medium text-ramo-700 hover:underline">
                    {g.name}
                  </Link>
                  {g.family ? <span className="block text-xs text-muted">{g.family.label}</span> : null}
                  <span className="block text-xs text-muted tabular-nums">{c.phone}</span>
                  <p className="mt-2 text-xs font-medium text-muted">Alunos</p>
                  <ul>
                    {g.students.map(({ student: s, relationship }) => (
                      <li key={s.id}>
                        <Link href={`/alunos/${s.id}`} className="text-ramo-700 hover:underline">
                          {s.name}
                        </Link>
                        <span className="text-xs text-muted">
                          {" "}
                          · {relationship}
                          {s.enrollments[0] ? ` · ${s.enrollments[0].class.name}` : ""}
                        </span>
                      </li>
                    ))}
                    {!g.students.length ? <li className="text-muted">Nenhum aluno matriculado.</li> : null}
                  </ul>
                </section>
              </>
            ) : (
              <form action={linkGuardian} className="space-y-3 border-b border-line px-4 py-3">
                {hidden}
                <h3 className={sectionTitle}>
                  <UserRound aria-hidden className="size-3.5" /> Contato não identificado
                </h3>
                <p className="text-sm text-muted">Nenhum responsável tem este telefone, ou mais de um tem. Associe manualmente depois de confirmar quem é.</p>
                <div>
                  <label htmlFor="guardianId" className={field.label}>
                    Responsável
                  </label>
                  <select id="guardianId" name="guardianId" required defaultValue="" className={field.input}>
                    <option value="" disabled>
                      Escolha
                    </option>
                    {guardians.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className={`${btn.secondary} w-full`}>
                  Associar
                </button>
              </form>
            )}
            <div className="px-4 py-3">
              <PendingNote>como confirmar a identidade quando o telefone é compartilhado ou mudou (roteiro E2).</PendingNote>
            </div>
          </aside>
        ) : null}
      </div>
    </InboxShell>
  );
}

export default function ConversaPage(props: PageProps<"/whatsapp/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Detail {...props} />
    </Suspense>
  );
}
