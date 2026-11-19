import Link from "next/link";
import { CalendarClock, Phone } from "lucide-react";
import { fmtDate, fmtDateTime, startOfDay } from "@/lib/dates";
import { priorityLabel, taskTypeLabel } from "@/lib/labels";
import type { TaskWithRelations } from "@/modules/tarefas/queries";
import { TaskActions } from "./task-actions";
import { Badge, EmptyState } from "./ui";

const priorityTone = { BAIXA: "neutral", MEDIA: "neutral", ALTA: "alerta", URGENTE: "perigo" } as const;

export function TaskList({ tasks, now, emptyTitle = "Nenhuma tarefa aqui", showApplication = true }: { tasks: TaskWithRelations[]; now: Date; emptyTitle?: string; showApplication?: boolean }) {
  if (!tasks.length) return <EmptyState title={emptyTitle} />;
  const today = startOfDay(now);
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-card">
      {tasks.map((t) => {
        const overdue = t.status === "OPEN" && t.dueAt < today;
        const phone = t.interlocutor?.contacts[0]?.value;
        return (
          <li key={t.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-medium ${t.status !== "OPEN" ? "text-muted line-through" : "text-ink"}`}>{t.title}</span>
                <Badge>{taskTypeLabel[t.type]}</Badge>
                {t.priority === "ALTA" || t.priority === "URGENTE" ? <Badge tone={priorityTone[t.priority]}>{priorityLabel[t.priority]}</Badge> : null}
                {t.status === "DONE" ? <Badge tone="ramo">Concluída</Badge> : t.status === "CANCELED" ? <Badge>Cancelada</Badge> : null}
                {t.noContactCount > 0 ? <Badge tone="alerta">{t.noContactCount}× sem contato</Badge> : null}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-alerta" : ""}`}>
                  <CalendarClock aria-hidden className="size-3.5" />
                  {t.hasTime ? fmtDateTime(t.dueAt) : fmtDate(t.dueAt)}
                  {overdue ? " · atrasada" : ""}
                </span>
                {t.interlocutor ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone aria-hidden className="size-3.5" />
                    {t.interlocutor.name}
                    {phone ? ` · ${phone}` : ""}
                  </span>
                ) : null}
                {showApplication && t.application ? (
                  <Link href={`/atendimentos/${t.application.id}`} className="text-ramo-700 underline-offset-2 hover:underline">
                    {t.application.title}
                  </Link>
                ) : null}
                {t.assignees.length ? <span>· {t.assignees.map((a) => a.user.name.split(" ")[0]).join(", ")}</span> : null}
              </p>
              {t.report ? <p className="mt-1 text-sm text-ink">Relato: {t.report}</p> : null}
            </div>
            {t.status === "OPEN" ? <TaskActions taskId={t.id} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
