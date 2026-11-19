import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Loading, PageHeader, PendingNote, btn } from "@/components/ui";
import { fmtDayMonth, fmtTime, fmtWeekday, now, startOfDay, startOfWeek } from "@/lib/dates";
import { taskTypeLabel } from "@/lib/labels";
import { getTasksBetween } from "@/modules/tarefas/queries";

export const metadata = { title: "Agenda" };

async function Week({ searchParams }: { searchParams: PageProps<"/agenda">["searchParams"] }) {
  const sp = await searchParams;
  const offset = Number.parseInt(String(sp.semana ?? "0"), 10) || 0;
  const ref = await now();
  const monday = startOfDay(startOfWeek(ref), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => startOfDay(monday, i));
  const tasks = await getTasksBetween(monday, startOfDay(monday, 7));
  const todayKey = startOfDay(ref).getTime();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/agenda?semana=${offset - 1}`} className={btn.secondary} aria-label="Semana anterior">
          <ChevronLeft aria-hidden className="size-4" />
        </Link>
        <Link href="/agenda" className={btn.secondary}>
          Esta semana
        </Link>
        <Link href={`/agenda?semana=${offset + 1}`} className={btn.secondary} aria-label="Próxima semana">
          <ChevronRight aria-hidden className="size-4" />
        </Link>
        <span className="ml-2 font-semibold text-ink">
          {fmtDayMonth(days[0])} a {fmtDayMonth(days[6])}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const end = startOfDay(d, 1);
          const items = tasks.filter((t) => t.dueAt >= d && t.dueAt < end);
          const timed = items.filter((t) => t.hasTime);
          const allDay = items.filter((t) => !t.hasTime);
          const isToday = d.getTime() === todayKey;
          return (
            <section key={d.toISOString()} className={`min-h-40 rounded-xl border bg-card ${isToday ? "border-ramo-600" : "border-line"}`}>
              <h2 className={`border-b border-line px-3 py-2 text-sm font-semibold capitalize ${isToday ? "text-ramo-700" : "text-ink"}`}>
                {fmtWeekday(d)}
                {isToday ? " · hoje" : ""}
              </h2>
              <div className="space-y-2 p-2">
                {timed.map((t) => (
                  <Link
                    key={t.id}
                    href={t.application ? `/atendimentos/${t.application.id}` : "/tarefas"}
                    className={`block rounded-lg border-l-4 px-2 py-1.5 text-xs hover:bg-ramo-50 ${t.type === "VISITA" ? "border-ramo-600 bg-ramo-50/60" : "border-info bg-info-bg/50"} ${t.status === "DONE" ? "opacity-60" : ""}`}
                  >
                    <span className="block font-semibold text-ink">
                      {fmtTime(t.dueAt)} · {t.title}
                    </span>
                    {t.application ? <span className="text-muted">{t.application.title}</span> : null}
                  </Link>
                ))}
                {allDay.length ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer px-1 py-1 text-muted">
                      {allDay.length} no dia (sem horário)
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {allDay.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-1 px-1">
                          <span className={t.status === "DONE" ? "text-muted line-through" : "text-ink"}>{t.title}</span>
                          <Badge>{taskTypeLabel[t.type]}</Badge>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {!items.length ? <p className="px-1 py-2 text-xs text-muted">Livre</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export default function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  return (
    <>
      <PageHeader title="Agenda" description="Visitas, reuniões e tarefas com prazo. Tarefas com horário aparecem na grade; sem horário ficam em “no dia”." />
      <div className="mb-4">
        <PendingNote>no protótipo, a agenda mostra tarefas (como no SIG). O calendário escolar e eventos por turma ainda não estão aqui (D-023, H4).</PendingNote>
      </div>
      <Suspense fallback={<Loading />}>
        <Week searchParams={searchParams} />
      </Suspense>
    </>
  );
}
