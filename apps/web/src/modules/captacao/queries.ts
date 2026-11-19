import "server-only";
import { prisma } from "@/lib/db";
import { taskInclude } from "@/modules/tarefas/queries";

const cardInclude = {
  prospect: true,
  stage: true,
  assignees: { include: { user: { select: { id: true, name: true } } } },
  guardians: { where: { isPrimary: true }, include: { guardian: { include: { contacts: { where: { active: true, kind: "PHONE" } } } } } },
  tasks: { where: { status: "OPEN" }, orderBy: { dueAt: "asc" }, take: 1 },
} as const;

export async function getPipeline(filters: { atendente?: string; q?: string }) {
  const where = {
    status: "OPEN" as const,
    ...(filters.atendente === "sem" ? { assignees: { none: {} } } : filters.atendente ? { assignees: { some: { userId: filters.atendente } } } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { prospect: { childName: { contains: filters.q, mode: "insensitive" as const } } },
            { guardians: { some: { guardian: { name: { contains: filters.q, mode: "insensitive" as const } } } } },
          ],
        }
      : {}),
  };
  const [stages, applications] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { kind: "OPEN" }, orderBy: { position: "asc" } }),
    prisma.enrollmentApplication.findMany({ where, include: cardInclude, orderBy: { stageChangedAt: "asc" } }),
  ]);
  return { stages, applications };
}
export type PipelineApplication = Awaited<ReturnType<typeof getPipeline>>["applications"][number];

export async function getApplication(id: string) {
  return prisma.enrollmentApplication.findUnique({
    where: { id },
    include: {
      prospect: true,
      stage: true,
      lossReason: true,
      student: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true } } } },
      guardians: { include: { guardian: { include: { contacts: { where: { active: true } } } } }, orderBy: { isPrimary: "desc" } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], include: taskInclude },
      timeline: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
}
export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplication>>>;

export async function getCaptacaoOptions() {
  const [stages, attendants, lossReasons, classes] = await Promise.all([
    prisma.pipelineStage.findMany({ orderBy: { position: "asc" } }),
    prisma.user.findMany({ where: { active: true, role: { name: { in: ["Direção", "Secretaria", "Coordenação"] } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.lossReason.findMany({ orderBy: { name: "asc" } }),
    prisma.schoolClass.findMany({ where: { academicYear: { isCurrent: true } }, orderBy: { name: "asc" }, select: { id: true, name: true, stage: true } }),
  ]);
  return { stages, attendants, lossReasons, classes };
}
