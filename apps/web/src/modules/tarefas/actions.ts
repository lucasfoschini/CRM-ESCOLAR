"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fromLocal, startOfDay } from "@/lib/dates";
import { getCurrentUser } from "@/lib/session";
import { formValues, optional, type FormState } from "@/lib/forms";

// PROTÓTIPO: sem autorização por perfil (Fase 3, D-009).


const createSchema = z.object({
  title: z.string().trim().min(2, "Dê um título à tarefa."),
  type: z.enum(["LIGAR", "EMAIL", "REUNIAO", "TAREFA", "VISITA", "WHATSAPP"]),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data."),
  dueTime: optional(z.string().regex(/^\d{2}:\d{2}$/)),
  durationMin: optional(z.string()),
  description: optional(z.string().trim().max(2000)),
  applicationId: optional(z.string()),
  assigneeId: optional(z.string()),
});

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Revise os campos destacados.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values: formValues(formData) };
  }
  const d = parsed.data;
  const user = await getCurrentUser();
  const app = d.applicationId
    ? await prisma.enrollmentApplication.findUnique({ where: { id: d.applicationId }, include: { guardians: { where: { isPrimary: true } } } })
    : null;
  await prisma.$transaction(async (tx) => {
    await tx.task.create({
      data: {
        title: d.title,
        type: d.type,
        priority: d.priority,
        dueAt: fromLocal(d.dueDate, d.dueTime),
        hasTime: Boolean(d.dueTime),
        durationMin: d.dueTime && d.durationMin ? Number(d.durationMin) : null,
        reminderMin: d.dueTime ? 30 : null,
        description: d.description,
        applicationId: app?.id,
        interlocutorId: app?.guardians[0]?.guardianId,
        assignees: { create: { userId: d.assigneeId ?? user.id } },
      },
    });
    if (app) await tx.timelineEntry.create({ data: { applicationId: app.id, type: "TASK_CREATED", body: `Tarefa criada: ${d.title}`, authorId: user.id } });
  });
  refresh();
  return {};
}

/** Concluir com relato (RF-TAR-002, RN-020). */
export async function completeTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ taskId: z.string().min(1), report: z.string().trim().max(2000).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos." };
  const user = await getCurrentUser();
  const task = await prisma.task.update({ where: { id: parsed.data.taskId, status: "OPEN" }, data: { status: "DONE", completedAt: new Date(), report: parsed.data.report || null } });
  if (task.applicationId)
    await prisma.timelineEntry.create({
      data: { applicationId: task.applicationId, type: "TASK_DONE", authorId: user.id, body: `Tarefa concluída: ${task.title}${task.report ? ` — Relato: ${task.report}` : ""}` },
    });
  refresh();
  return {};
}

/** "Sem contato": reagenda para o dia seguinte (RF-TAR-003, RN-019). */
export async function noContact(formData: FormData) {
  const taskId = z.string().min(1).parse(formData.get("taskId"));
  const user = await getCurrentUser();
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (task.status !== "OPEN") return;
  // Com horário: mesmo horário no dia seguinte (a partir de hoje). Sem horário: amanhã.
  const next = task.hasTime ? new Date(Math.max(task.dueAt.getTime(), Date.now()) + 86_400_000) : startOfDay(new Date(), 1);
  const updated = await prisma.task.update({ where: { id: taskId }, data: { dueAt: next, noContactCount: { increment: 1 } } });
  if (task.applicationId)
    await prisma.timelineEntry.create({
      data: { applicationId: task.applicationId, type: "TASK_NO_CONTACT", authorId: user.id, body: `Sem contato em "${task.title}" (tentativa ${updated.noContactCount}); reagendada para o dia seguinte` },
    });
  refresh();
}

export async function cancelTask(formData: FormData) {
  const taskId = z.string().min(1).parse(formData.get("taskId"));
  const user = await getCurrentUser();
  const task = await prisma.task.update({ where: { id: taskId, status: "OPEN" }, data: { status: "CANCELED", completedAt: new Date() } });
  if (task.applicationId)
    await prisma.timelineEntry.create({ data: { applicationId: task.applicationId, type: "TASK_CANCELED", authorId: user.id, body: `Tarefa cancelada: ${task.title}` } });
  refresh();
}
