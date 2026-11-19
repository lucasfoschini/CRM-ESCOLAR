import { Suspense } from "react";
import { Loading, PageHeader, Tabs } from "@/components/ui";
import { TaskList } from "@/components/task-list";
import { NewTaskForm } from "@/components/new-task-form";
import { now, toDateInput } from "@/lib/dates";
import { getCurrentUser } from "@/lib/session";
import { getTaskOptions, getTasks, TASK_TABS, type TaskTab } from "@/modules/tarefas/queries";

export const metadata = { title: "Tarefas" };

const tabLabels: Record<TaskTab, string> = {
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  proximos: "Próximos 7 dias",
  depois: "Depois",
  encerradas: "Encerradas",
  todas: "Todas abertas",
};

async function Content({ searchParams }: { searchParams: PageProps<"/tarefas">["searchParams"] }) {
  const sp = await searchParams;
  const tab = (TASK_TABS as readonly string[]).includes(String(sp.aba)) ? (sp.aba as TaskTab) : "hoje";
  const mine = sp.escopo === "minhas";
  const [ref, user, attendants] = await Promise.all([now(), getCurrentUser(), getTaskOptions()]);
  const { tasks, counts } = await getTasks(tab, ref, mine ? user.id : undefined);
  const qs = (aba: string) => `/tarefas?aba=${aba}${mine ? "&escopo=minhas" : ""}`;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Tabs
          current={mine ? "minhas" : "todas"}
          items={[
            { key: "todas", label: "Toda a equipe", href: `/tarefas?aba=${tab}` },
            { key: "minhas", label: `Só de ${user.name.split(" ")[0]}`, href: `/tarefas?aba=${tab}&escopo=minhas` },
          ]}
        />
        <NewTaskForm attendants={attendants} currentUserId={user.id} defaultDate={toDateInput(ref)} />
      </div>
      <Tabs current={tab} items={TASK_TABS.map((t) => ({ key: t, label: tabLabels[t], href: qs(t), count: counts[t] }))} />
      <TaskList tasks={tasks} now={ref} emptyTitle={`Nenhuma tarefa em "${tabLabels[tab]}".`} />
    </>
  );
}

export default function TarefasPage({ searchParams }: PageProps<"/tarefas">) {
  return (
    <>
      <PageHeader title="Tarefas" description='Acompanhamento dos atendimentos. "Sem contato" reagenda sozinho para o dia seguinte.' />
      <Suspense fallback={<Loading />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
