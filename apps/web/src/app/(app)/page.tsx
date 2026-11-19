import Link from "next/link";
import { Suspense } from "react";
import { Card, CardTitle, Loading, PageHeader, Tabs } from "@/components/ui";
import { TaskList } from "@/components/task-list";
import { prisma } from "@/lib/db";
import { daysBetween, now, startOfDay } from "@/lib/dates";
import { getCurrentUser } from "@/lib/session";
import { taskInclude } from "@/modules/tarefas/queries";

export const metadata = { title: "Hoje" };

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "alerta" }) {
  return (
    <Link href={href} className="rounded-xl border border-line bg-card p-4 hover:border-ramo-200">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tone === "alerta" && value > 0 ? "text-alerta" : "text-ink"}`}>{value}</p>
    </Link>
  );
}

async function Today({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { escopo } = await searchParams;
  const [ref, user] = await Promise.all([now(), getCurrentUser()]);
  const mine = escopo === "minhas" ? { assignees: { some: { userId: user.id } } } : {};
  const today = startOfDay(ref);
  const tomorrow = startOfDay(ref, 1);

  const [overdue, dueToday, unassigned, noNextAction] = await Promise.all([
    prisma.task.findMany({ where: { status: "OPEN", dueAt: { lt: today }, ...mine }, include: taskInclude, orderBy: { dueAt: "asc" } }),
    prisma.task.findMany({ where: { status: "OPEN", dueAt: { gte: today, lt: tomorrow }, ...mine }, include: taskInclude, orderBy: { dueAt: "asc" } }),
    prisma.enrollmentApplication.count({ where: { status: "OPEN", assignees: { none: {} } } }),
    prisma.enrollmentApplication.findMany({
      where: { status: "OPEN", tasks: { none: { status: "OPEN" } }, ...(escopo === "minhas" ? { assignees: { some: { userId: user.id } } } : {}) },
      include: { stage: true },
      orderBy: { stageChangedAt: "asc" },
    }),
  ]);

  return (
    <>
      <Tabs
        current={escopo === "minhas" ? "minhas" : "todas"}
        items={[
          { key: "todas", label: "Toda a equipe", href: "/" },
          { key: "minhas", label: `Só de ${user.name.split(" ")[0]}`, href: "/?escopo=minhas" },
        ]}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tarefas atrasadas" value={overdue.length} href="/tarefas?aba=atrasadas" tone="alerta" />
        <Stat label="Tarefas para hoje" value={dueToday.length} href="/tarefas?aba=hoje" />
        <Stat label="Atendimentos sem atendente" value={unassigned} href="/atendimentos?atendente=sem" tone="alerta" />
        <Stat label="Sem próxima ação" value={noNextAction.length} href="#sem-proxima-acao" tone="alerta" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-semibold text-ink">Atrasadas</h2>
            <TaskList tasks={overdue} now={ref} emptyTitle="Nenhuma tarefa atrasada." />
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-ink">Para hoje</h2>
            <TaskList tasks={dueToday} now={ref} emptyTitle="Nada marcado para hoje." />
          </section>
        </div>
        <Card className="h-fit">
          <div id="sem-proxima-acao">
            <CardTitle>Atendimentos sem próxima ação</CardTitle>
          </div>
          {noNextAction.length ? (
            <ul className="divide-y divide-line">
              {noNextAction.map((a) => (
                <li key={a.id}>
                  <Link href={`/atendimentos/${a.id}`} className="block px-4 py-2.5 hover:bg-ramo-50">
                    <span className="block text-sm font-medium text-ink">{a.title}</span>
                    <span className="text-xs text-muted">
                      {a.stage.name} · {daysBetween(a.stageChangedAt, ref)} dias na etapa
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">Todos os atendimentos têm uma próxima ação.</p>
          )}
        </Card>
      </div>
    </>
  );
}

export default function HojePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Hoje" description="O que precisa de ação agora: tarefas vencidas, tarefas do dia e atendimentos parados." />
      <Suspense fallback={<Loading />}>
        <Today searchParams={searchParams} />
      </Suspense>
    </>
  );
}
