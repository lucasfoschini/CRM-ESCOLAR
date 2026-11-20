import "server-only";
import { prisma } from "@/lib/db";

/** Números do painel de relatórios a partir de `since` (início do período). */
export async function getReports(since: Date, today: Date) {
  const closedInPeriod = { closedAt: { gte: since }, status: { not: "OPEN" as const } };

  const [stages, created, closed, bySource, losses, lossReasons, team, doneTasks, tasksByType, overdue, students, classes] = await Promise.all([
    prisma.pipelineStage.findMany({
      orderBy: { position: "asc" },
      select: { id: true, name: true, _count: { select: { applications: { where: { status: "OPEN" } } } } },
    }),
    prisma.enrollmentApplication.count({ where: { createdAt: { gte: since } } }),
    prisma.enrollmentApplication.groupBy({ by: ["status"], where: closedInPeriod, _count: true }),
    prisma.enrollmentApplication.groupBy({ by: ["source", "status"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.enrollmentApplication.groupBy({ by: ["lossReasonId"], where: { ...closedInPeriod, status: { in: ["LOST", "DISQUALIFIED"] } }, _count: true }),
    prisma.lossReason.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            applications: { where: { application: { status: "OPEN" } } },
            tasks: { where: { task: { status: "OPEN", dueAt: { lt: today } } } },
          },
        },
        // Prisma não tem alias: o segundo filtro de cada relação vem como lista de ids.
        applications: { where: { application: { status: "ENROLLED", closedAt: { gte: since } } }, select: { applicationId: true } },
        tasks: { where: { task: { status: "DONE", completedAt: { gte: since } } }, select: { taskId: true } },
      },
    }),
    prisma.task.findMany({ where: { status: "DONE", completedAt: { gte: since } }, select: { dueAt: true, completedAt: true } }),
    prisma.task.groupBy({ by: ["type"], where: { status: "DONE", completedAt: { gte: since } }, _count: true }),
    prisma.task.count({ where: { status: "OPEN", dueAt: { lt: today } } }),
    prisma.student.groupBy({ by: ["status"], _count: true }),
    prisma.schoolClass.findMany({
      where: { academicYear: { isCurrent: true } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, capacity: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
    }),
  ]);

  const closedCount = (s: string) => closed.find((c) => c.status === s)?._count ?? 0;
  const enrolled = closedCount("ENROLLED");
  const lost = closedCount("LOST") + closedCount("DISQUALIFIED");

  const sources = new Map<string, { total: number; enrolled: number }>();
  for (const r of bySource) {
    const key = r.source ?? "Não informado";
    const s = sources.get(key) ?? { total: 0, enrolled: 0 };
    s.total += r._count;
    if (r.status === "ENROLLED") s.enrolled += r._count;
    sources.set(key, s);
  }

  const reasonName = new Map(lossReasons.map((r) => [r.id, r.name]));
  // Tarefa sem hora vence no fim do dia; 1 dia de folga evita marcar como atrasada quem concluiu no próprio dia.
  const onTime = doneTasks.filter((t) => t.completedAt && t.completedAt.getTime() < t.dueAt.getTime() + 86_400_000).length;

  return {
    funnel: stages.map((s) => ({ label: s.name, value: s._count.applications })),
    captacao: { created, enrolled, lost, conversion: enrolled + lost ? enrolled / (enrolled + lost) : null },
    sources: [...sources].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.total - a.total),
    losses: losses.map((l) => ({ label: (l.lossReasonId && reasonName.get(l.lossReasonId)) || "Sem motivo", value: l._count })).sort((a, b) => b.value - a.value),
    team: team.map((u) => ({
      id: u.id,
      name: u.name,
      openApplications: u._count.applications,
      overdueTasks: u._count.tasks,
      won: u.applications.length,
      tasksDone: u.tasks.length,
    })),
    tasks: { done: doneTasks.length, onTime, overdue, byType: tasksByType.map((t) => ({ key: t.type, value: t._count })) },
    students: students.map((s) => ({ key: s.status, value: s._count })),
    classes: classes.map((c) => ({ id: c.id, name: c.name, capacity: c.capacity, enrolled: c._count.enrollments })),
  };
}
