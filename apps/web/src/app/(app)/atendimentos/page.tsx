import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge, Loading, PageHeader, Tabs, btn, field } from "@/components/ui";
import { daysBetween, fmtDate, now, startOfDay } from "@/lib/dates";
import { contactTypeLabel } from "@/lib/labels";
import { getCaptacaoOptions, getPipeline, type PipelineApplication } from "@/modules/captacao/queries";

export const metadata = { title: "Atendimentos" };

function NextAction({ app, today }: { app: PipelineApplication; today: Date }) {
  const task = app.tasks[0];
  if (!task) return <Badge tone="alerta">Sem próxima ação</Badge>;
  const overdue = task.dueAt < today;
  return <span className={`text-xs ${overdue ? "font-semibold text-alerta" : "text-muted"}`}>{`${task.title} · ${fmtDate(task.dueAt)}${overdue ? " (atrasada)" : ""}`}</span>;
}

function Assignees({ app }: { app: PipelineApplication }) {
  if (!app.assignees.length) return <Badge tone="alerta">Sem atendente</Badge>;
  return <span className="text-xs text-muted">{app.assignees.map((a) => a.user.name.split(" ")[0]).join(", ")}</span>;
}

async function Pipeline({ searchParams }: { searchParams: PageProps<"/atendimentos">["searchParams"] }) {
  const sp = await searchParams;
  const view = sp.view === "tabela" ? "tabela" : "kanban";
  const atendente = typeof sp.atendente === "string" ? sp.atendente : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : undefined;
  const [ref, { stages, applications }, { attendants }] = await Promise.all([now(), getPipeline({ atendente, q }), getCaptacaoOptions()]);
  const today = startOfDay(ref);
  const keep = new URLSearchParams({ ...(atendente ? { atendente } : {}), ...(q ? { q } : {}) });

  return (
    <>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value={view} />
        <div>
          <label htmlFor="q" className={field.label}>
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Criança ou responsável" className={field.input} />
        </div>
        <div>
          <label htmlFor="atendente" className={field.label}>
            Atendente
          </label>
          <select id="atendente" name="atendente" defaultValue={atendente ?? ""} className={field.input}>
            <option value="">Todos</option>
            <option value="sem">Sem atendente</option>
            {attendants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={btn.secondary}>
          Filtrar
        </button>
      </form>

      <Tabs
        current={view}
        items={[
          { key: "kanban", label: "Funil", href: `/atendimentos?${new URLSearchParams({ ...Object.fromEntries(keep), view: "kanban" })}`, count: applications.length },
          { key: "tabela", label: "Tabela", href: `/atendimentos?${new URLSearchParams({ ...Object.fromEntries(keep), view: "tabela" })}` },
        ]}
      />

      {view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((s) => {
            const cards = applications.filter((a) => a.stageId === s.id);
            return (
              <section key={s.id} className="flex w-72 shrink-0 flex-col rounded-xl bg-ramo-50/70 p-2">
                <h2 className="flex items-center justify-between px-2 py-1 text-sm font-semibold text-ink">
                  {s.name}
                  <span className="text-xs font-medium text-muted">{cards.length}</span>
                </h2>
                <ul className="mt-1 space-y-2">
                  {cards.map((a) => {
                    const g = a.guardians[0]?.guardian;
                    return (
                      <li key={a.id}>
                        <Link href={`/atendimentos/${a.id}`} className="block space-y-1.5 rounded-lg border border-line bg-card p-3 hover:border-ramo-200">
                          <p className="font-medium text-ink">{a.title}</p>
                          {g ? (
                            <p className="text-xs text-muted">
                              {g.name}
                              {g.contacts[0] ? ` · ${g.contacts[0].value}` : ""}
                            </p>
                          ) : null}
                          <NextAction app={a} today={today} />
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <Assignees app={a} />
                            <span className="text-xs text-muted">{daysBetween(a.stageChangedAt, ref)}d na etapa</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                  {!cards.length ? <li className="px-2 py-4 text-center text-xs text-muted">Nenhum atendimento</li> : null}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Atendimento</th>
                <th className="px-4 py-2 font-medium">Etapa</th>
                <th className="px-4 py-2 font-medium">Próxima ação</th>
                <th className="px-4 py-2 font-medium">Dias na etapa</th>
                <th className="px-4 py-2 font-medium">Canal / origem</th>
                <th className="px-4 py-2 font-medium">Atendentes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {applications.map((a) => (
                <tr key={a.id} className="hover:bg-ramo-50/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/atendimentos/${a.id}`} className="font-medium text-ramo-700 hover:underline">
                      {a.title}
                    </Link>
                    <span className="block text-xs text-muted">{a.guardians[0]?.guardian.name}</span>
                  </td>
                  <td className="px-4 py-2.5">{a.stage.name}</td>
                  <td className="px-4 py-2.5">
                    <NextAction app={a} today={today} />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{daysBetween(a.stageChangedAt, ref)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {a.contactType ? contactTypeLabel[a.contactType] : "—"} / {a.source ?? <span className="text-alerta">sem origem</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Assignees app={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AtendimentosPage({ searchParams }: PageProps<"/atendimentos">) {
  return (
    <>
      <PageHeader
        title="Atendimentos"
        description="Interessados em matrícula, do primeiro contato até a matrícula. Para mudar de etapa, abra o atendimento."
        actions={
          <Link href="/atendimentos/novo" className={btn.primary}>
            <Plus aria-hidden className="size-4" /> Novo atendimento
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <Pipeline searchParams={searchParams} />
      </Suspense>
    </>
  );
}
