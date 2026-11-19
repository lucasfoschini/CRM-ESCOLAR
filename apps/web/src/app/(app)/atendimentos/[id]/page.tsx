import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, CardTitle, Loading, btn } from "@/components/ui";
import { CloseActions, NoteForm, StageMover } from "@/components/captacao/application-actions";
import { NewTaskForm } from "@/components/new-task-form";
import { TaskList } from "@/components/task-list";
import { daysBetween, fmtDate, fmtDateTime, fmtTime, now, toDateInput } from "@/lib/dates";
import { applicationStatusLabel, contactTypeLabel } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";
import { addAssignee } from "@/modules/captacao/actions";
import { getApplication, getCaptacaoOptions } from "@/modules/captacao/queries";

const statusTone = { OPEN: "info", ENROLLED: "ramo", LOST: "perigo", DISQUALIFIED: "neutral" } as const;
const timelineTone: Record<string, string> = { AUTOMATION: "border-info", STATUS_CHANGE: "border-ramo-600", NOTE: "border-alerta", TASK_NO_CONTACT: "border-alerta" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}

async function Detail({ params }: { params: PageProps<"/atendimentos/[id]">["params"] }) {
  const { id } = await params;
  const [app, options, ref, user] = await Promise.all([getApplication(id), getCaptacaoOptions(), now(), getCurrentUser()]);
  if (!app) notFound();
  const isOpen = app.status === "OPEN";
  const others = options.attendants.filter((a) => !app.assignees.some((x) => x.userId === a.id));

  return (
    <>
      <Link href="/atendimentos" className={`${btn.ghost} mb-3`}>
        <ArrowLeft aria-hidden className="size-4" /> Atendimentos
      </Link>
      <header className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{app.title}</h1>
          <Badge tone={statusTone[app.status]}>{applicationStatusLabel[app.status]}</Badge>
          {isOpen ? <span className="text-sm text-muted">{daysBetween(app.stageChangedAt, ref)} dias em “{app.stage.name}”</span> : null}
        </div>
        {isOpen ? (
          <StageMover
            stages={options.stages}
            current={{
              id: app.id,
              stageId: app.stageId,
              contactType: app.contactType,
              source: app.source,
              visitDate: app.visitAt ? toDateInput(app.visitAt) : "",
              visitTime: app.visitAt ? fmtTime(app.visitAt) : "",
              childName: app.prospect.childName,
            }}
          />
        ) : (
          <p className="text-sm text-muted">
            Encerrado em {app.closedAt ? fmtDate(app.closedAt) : "—"}
            {app.lossReason ? ` · Motivo: ${app.lossReason.name}` : ""}
            {app.student ? (
              <>
                {" · "}
                <Link href={`/alunos/${app.student.id}`} className="font-medium text-ramo-700 hover:underline">
                  Ver ficha do aluno
                </Link>
              </>
            ) : null}
          </p>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {isOpen ? (
            <Card className="p-4">
              <CloseActions applicationId={app.id} childName={app.prospect.childName} reasons={options.lossReasons} classes={options.classes} />
            </Card>
          ) : null}

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-ink">Tarefas</h2>
              {isOpen ? <NewTaskForm attendants={options.attendants} currentUserId={user.id} defaultDate={toDateInput(ref)} applicationId={app.id} label="Nova tarefa" /> : null}
            </div>
            <TaskList tasks={app.tasks} now={ref} showApplication={false} emptyTitle="Nenhuma tarefa. Crie a próxima ação." />
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-ink">Linha do tempo</h2>
            <Card className="p-4">
              <NoteForm applicationId={app.id} />
              <ol className="mt-5 space-y-3">
                {app.timeline.map((e) => (
                  <li key={e.id} className={`border-l-2 pl-3 ${timelineTone[e.type] ?? "border-line"}`}>
                    <p className="text-sm text-ink">{e.body}</p>
                    <p className="text-xs text-muted">
                      {fmtDateTime(e.createdAt)}
                      {e.author ? ` · ${e.author.name}` : e.type === "AUTOMATION" ? " · automação" : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardTitle>Dados do atendimento</CardTitle>
            <dl className="divide-y divide-line">
              <Row label="Criança">{app.prospect.childName}</Row>
              <Row label="Turma pretendida">{app.prospect.desiredGrade ?? "—"}</Row>
              <Row label="Tipo de contato">{app.contactType ? contactTypeLabel[app.contactType] : "—"}</Row>
              <Row label="Como conheceu">{app.source ?? <span className="text-alerta">Não informado</span>}</Row>
              <Row label="Visita">{app.visitAt ? fmtDateTime(app.visitAt) : "—"}</Row>
              <Row label="Criado em">{fmtDate(app.createdAt)}</Row>
            </dl>
            {app.description ? <p className="border-t border-line px-4 py-3 text-sm text-ink">{app.description}</p> : null}
          </Card>

          <Card>
            <CardTitle>Responsáveis</CardTitle>
            <ul className="divide-y divide-line">
              {app.guardians.map(({ guardian, isPrimary, relationship }) => (
                <li key={guardian.id} className="px-4 py-3 text-sm">
                  <Link href={`/responsaveis/${guardian.id}`} className="font-medium text-ramo-700 hover:underline">
                    {guardian.name}
                  </Link>
                  {isPrimary ? <Badge tone="ramo">Principal</Badge> : null}
                  {relationship ? <span className="ml-1 text-muted">· {relationship}</span> : null}
                  <ul className="mt-1 text-muted">
                    {guardian.contacts.map((c) => (
                      <li key={c.id}>
                        {c.value}
                        {c.isWhatsApp ? " · WhatsApp" : ""}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle>Atendentes</CardTitle>
            <div className="space-y-3 px-4 py-3 text-sm">
              {app.assignees.length ? (
                <ul className="space-y-1">
                  {app.assignees.map((a) => (
                    <li key={a.userId}>{a.user.name}</li>
                  ))}
                </ul>
              ) : (
                <Badge tone="alerta">Sem atendente</Badge>
              )}
              {isOpen && others.length ? (
                <form action={addAssignee} className="flex gap-2">
                  <input type="hidden" name="applicationId" value={app.id} />
                  <label htmlFor="add-assignee" className="sr-only">
                    Adicionar atendente
                  </label>
                  <select id="add-assignee" name="userId" className="min-h-10 flex-1 rounded-lg border border-line bg-card px-2 text-sm">
                    {others.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={btn.secondary}>
                    Adicionar
                  </button>
                </form>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function AtendimentoPage({ params }: PageProps<"/atendimentos/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Detail params={params} />
    </Suspense>
  );
}
