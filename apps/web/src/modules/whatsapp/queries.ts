import "server-only";
import type { Prisma } from "@belo-ramo/db";
import { prisma } from "@/lib/db";

// PROTÓTIPO (D-027): inbox simulada, sem filtro de escopo por atendente (Fase 3, D-009).

// Abas no modelo do SIG (RF-WPP-003); valores provisórios (CTR-11).
export const INBOX_TABS = [
  { key: "ALL", label: "Tudo" },
  { key: "OPEN", label: "Em aberto" },
  { key: "UNASSIGNED", label: "Sem atendente" },
  { key: "REPLY", label: "Aguardando resposta" },
  { key: "CLIENT", label: "Aguardando cliente" },
  { key: "RESOLVED", label: "Finalizadas" },
  { key: "ARCHIVED", label: "Arquivadas" },
  { key: "UNKNOWN", label: "Não identificadas" },
] as const;
export type InboxFilter = (typeof INBOX_TABS)[number]["key"];
export const DEFAULT_TAB: InboxFilter = "OPEN";

const notResolved = { status: { not: "RESOLVED" } } as const;
const tabWhere: Record<InboxFilter, Prisma.ConversationWhereInput> = {
  ALL: { archived: false },
  OPEN: { archived: false, ...notResolved },
  UNASSIGNED: { archived: false, assigneeId: null, ...notResolved },
  REPLY: { archived: false, status: "OPEN" },
  CLIENT: { archived: false, status: "WAITING" },
  RESOLVED: { archived: false, status: "RESOLVED" },
  ARCHIVED: { archived: true },
  UNKNOWN: { archived: false, contactId: null },
};

export async function listConversations({ tab, q, assigneeId }: { tab: InboxFilter; q?: string; assigneeId?: string }) {
  const search: Prisma.ConversationWhereInput = q
    ? {
        OR: [
          { phone: { contains: q } },
          { contact: { guardian: { name: { contains: q, mode: "insensitive" } } } },
          { messages: { some: { direction: { not: "NOTE" }, body: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};
  return prisma.conversation.findMany({
    where: { ...tabWhere[tab], ...search, ...(assigneeId ? { assigneeId } : {}) },
    include: {
      contact: { include: { guardian: { select: { id: true, name: true } } } },
      assignee: { select: { name: true } },
      messages: { where: { direction: { not: "NOTE" } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
  });
}

export const listAgents = () =>
  prisma.user.findMany({ where: { active: true, role: { name: { not: "Professor" } } }, select: { id: true, name: true }, orderBy: { name: "asc" } });

/** Conversa com o contexto da família (RF-WPP-014): alunos, turmas, atendimentos e tarefas em aberto. */
export async function getConversation(id: string) {
  const c = await prisma.conversation.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      messages: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      contact: {
        include: {
          guardian: {
            include: {
              family: true,
              students: {
                where: { active: true },
                include: { student: { include: { enrollments: { where: { status: "ACTIVE" }, include: { class: true } } } } },
              },
              applications: {
                where: { application: { status: "OPEN" } },
                include: { application: { include: { stage: true, prospect: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!c) return null;
  const g = c.contact?.guardian;
  const [stages, tasks] = await Promise.all([
    prisma.pipelineStage.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    g
      ? prisma.task.findMany({
          where: { status: "OPEN", OR: [{ interlocutorId: g.id }, { applicationId: { in: g.applications.map((a) => a.applicationId) } }] },
          orderBy: { dueAt: "asc" },
          take: 10,
        })
      : [],
  ]);
  return { ...c, stages, tasks };
}

export const listTemplates = () => prisma.messageTemplate.findMany({ orderBy: { shortcut: "asc" } });

export const listGuardianOptions = () => prisma.guardian.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
