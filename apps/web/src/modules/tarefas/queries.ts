import "server-only";
import type { Prisma } from "@belo-ramo/db";
import { prisma } from "@/lib/db";
import { startOfDay } from "@/lib/dates";

export const taskInclude = {
  application: { select: { id: true, title: true, stage: { select: { name: true } } } },
  interlocutor: { include: { contacts: { where: { active: true, kind: "PHONE" as const }, take: 1 } } },
  assignees: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export const TASK_TABS = ["atrasadas", "hoje", "proximos", "depois", "encerradas", "todas"] as const;
export type TaskTab = (typeof TASK_TABS)[number];

/** Janela de cada aba, relativa ao dia atual em São Paulo (RF-TAR-006). */
function tabWhere(tab: TaskTab, ref: Date): Prisma.TaskWhereInput {
  const today = startOfDay(ref);
  const tomorrow = startOfDay(ref, 1);
  const in8 = startOfDay(ref, 8);
  switch (tab) {
    case "atrasadas":
      return { status: "OPEN", dueAt: { lt: today } };
    case "hoje":
      return { status: "OPEN", dueAt: { gte: today, lt: tomorrow } };
    case "proximos":
      return { status: "OPEN", dueAt: { gte: tomorrow, lt: in8 } };
    case "depois":
      return { status: "OPEN", dueAt: { gte: in8 } };
    case "encerradas":
      return { status: { in: ["DONE", "CANCELED"] } };
    case "todas":
      return { status: "OPEN" };
  }
}

export async function getTasks(tab: TaskTab, ref: Date, userId?: string) {
  const mine = userId ? { assignees: { some: { userId } } } : {};
  const [tasks, counts] = await Promise.all([
    prisma.task.findMany({
      where: { ...tabWhere(tab, ref), ...mine },
      include: taskInclude,
      orderBy: tab === "encerradas" ? { completedAt: "desc" } : { dueAt: "asc" },
      take: 200,
    }),
    Promise.all(TASK_TABS.map((t) => prisma.task.count({ where: { ...tabWhere(t, ref), ...mine } }))),
  ]);
  return { tasks, counts: Object.fromEntries(TASK_TABS.map((t, i) => [t, counts[i]])) as Record<TaskTab, number> };
}

export async function getTasksBetween(from: Date, to: Date) {
  return prisma.task.findMany({ where: { status: { not: "CANCELED" }, dueAt: { gte: from, lt: to } }, include: taskInclude, orderBy: { dueAt: "asc" } });
}

export async function getTaskOptions() {
  return prisma.user.findMany({ where: { active: true, role: { name: { not: "Professor" } } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
