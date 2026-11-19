"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import type { ContactType, Prisma } from "@belo-ramo/db";
import { prisma } from "@/lib/db";
import { fromLocal } from "@/lib/dates";
import { requiredFieldLabel } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";

// PROTÓTIPO: sem autorização por perfil (Fase 3, D-009). Toda action valida a entrada com Zod.

import { formValues, optional, type FormState } from "@/lib/forms";

const contactTypes = ["PRESENCIAL", "TELEFONE", "WHATSAPP", "SITE", "EMAIL"] as const;
const digits = (s: string) => s.replace(/\D/g, "");

/** RF-CAP-003: devolve os rótulos dos campos exigidos pela etapa que estão vazios. */
function missingFields(required: string[], values: Record<string, unknown>) {
  return required.filter((f) => values[f] === undefined || values[f] === null || values[f] === "").map((f) => requiredFieldLabel[f] ?? f);
}

/** RF-AUT-001: automação simples ao entrar na etapa. */
async function runStageAutomation(tx: Prisma.TransactionClient, app: { id: string; visitAt: Date | null }, stage: { name: string; autoTaskTitle: string | null; autoTaskType: Prisma.TaskCreateInput["type"] | null }, assigneeIds: string[], interlocutorId?: string) {
  if (!stage.autoTaskTitle) return;
  const dueAt = app.visitAt ?? new Date(Date.now() + 86_400_000);
  await tx.task.create({
    data: {
      title: stage.autoTaskTitle,
      type: stage.autoTaskType ?? "TAREFA",
      priority: "ALTA",
      dueAt,
      hasTime: Boolean(app.visitAt),
      durationMin: app.visitAt ? 60 : null,
      reminderMin: app.visitAt ? 30 : null,
      applicationId: app.id,
      interlocutorId,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
    },
  });
  await tx.timelineEntry.create({ data: { applicationId: app.id, type: "AUTOMATION", body: `Automação da etapa "${stage.name}": tarefa "${stage.autoTaskTitle}" criada` } });
}

// ---------- Novo atendimento ----------

const newSchema = z.object({
  childName: z.string().trim().min(2, "Informe o nome da criança."),
  desiredGrade: optional(z.string().trim()),
  guardianName: z.string().trim().min(2, "Informe o nome do responsável."),
  relationship: optional(z.string().trim()),
  phone: z.string().trim().refine((v) => digits(v).length >= 10, "Telefone com DDD, ex.: (11) 91234-5678."),
  email: optional(z.string().trim().email("E-mail inválido.")),
  contactType: z.enum(contactTypes).optional(),
  source: optional(z.string().trim()),
  description: optional(z.string().trim().max(2000)),
  assigneeId: optional(z.string()),
});

export async function createApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { error: "Revise os campos destacados.", fieldErrors, values: formValues(formData) };
  }
  const d = parsed.data;
  const firstStage = await prisma.pipelineStage.findFirstOrThrow({ where: { kind: "OPEN" }, orderBy: { position: "asc" } });
  const missing = missingFields(firstStage.requiredFields, d);
  if (missing.length) return { error: `A etapa "${firstStage.name}" exige: ${missing.join(", ")}.`, values: formValues(formData) };

  const user = await getCurrentUser();
  // RF-CAD-006 (duplicidade forte por telefone): reaproveita o responsável em vez de duplicar (RN-015).
  const phoneDigits = digits(d.phone);
  const contacts = await prisma.contact.findMany({ where: { kind: "PHONE", active: true }, select: { value: true, guardianId: true } });
  const existingGuardianId = contacts.find((c) => digits(c.value) === phoneDigits)?.guardianId;

  const app = await prisma.$transaction(async (tx) => {
    const guardianId =
      existingGuardianId ??
      (
        await tx.guardian.create({
          data: {
            name: d.guardianName,
            contacts: { create: [{ kind: "PHONE", value: d.phone, isWhatsApp: true }, ...(d.email ? [{ kind: "EMAIL" as const, value: d.email }] : [])] },
          },
        })
      ).id;
    const prospect = await tx.prospect.create({ data: { childName: d.childName, desiredGrade: d.desiredGrade } });
    const created = await tx.enrollmentApplication.create({
      data: {
        title: `${d.childName.split(" ")[0]}${d.desiredGrade ? ` — ${d.desiredGrade}` : ""}`,
        prospectId: prospect.id,
        stageId: firstStage.id,
        contactType: d.contactType as ContactType | undefined,
        source: d.source,
        description: d.description,
        guardians: { create: { guardianId, isPrimary: true, relationship: d.relationship } },
        assignees: d.assigneeId ? { create: { userId: d.assigneeId } } : undefined,
        timeline: {
          create: [
            { type: "CREATED", body: "Atendimento criado", authorId: user.id },
            ...(existingGuardianId ? [{ type: "NOTE" as const, body: "Telefone já cadastrado: responsável existente vinculado (sem duplicar cadastro).", authorId: user.id }] : []),
          ],
        },
      },
    });
    await runStageAutomation(tx, created, firstStage, d.assigneeId ? [d.assigneeId] : [], guardianId);
    return created;
  });
  redirect(`/atendimentos/${app.id}`);
}

// ---------- Mudar de etapa ----------

const moveSchema = z.object({
  applicationId: z.string().min(1),
  stageId: z.string().min(1),
  contactType: z.enum(contactTypes).optional().or(z.literal("").transform(() => undefined)),
  source: optional(z.string().trim()),
  visitDate: optional(z.string()),
  visitTime: optional(z.string()),
});

export async function moveStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos." };
  const d = parsed.data;
  const [app, stage, user] = await Promise.all([
    prisma.enrollmentApplication.findUnique({ where: { id: d.applicationId }, include: { assignees: true, guardians: { where: { isPrimary: true } } } }),
    prisma.pipelineStage.findUnique({ where: { id: d.stageId } }),
    getCurrentUser(),
  ]);
  if (!app || !stage || app.status !== "OPEN") return { error: "Atendimento não encontrado ou já encerrado." };
  if (stage.kind === "WON") return { error: 'Use "Marcar matriculado" para concluir a matrícula.' };
  if (stage.id === app.stageId) return { error: "O atendimento já está nesta etapa." };

  const visitAt = d.visitDate ? fromLocal(d.visitDate, d.visitTime) : app.visitAt;
  const values = { contactType: d.contactType ?? app.contactType, source: d.source ?? app.source, visitAt, expectedCloseDate: app.expectedCloseDate, description: app.description };
  const missing = missingFields(stage.requiredFields, values);
  if (missing.length) return { error: `Para ir para "${stage.name}", preencha: ${missing.join(", ")}.`, fieldErrors: { missing: stage.requiredFields.join(",") } };

  await prisma.$transaction(async (tx) => {
    const updated = await tx.enrollmentApplication.update({
      where: { id: app.id },
      data: { stageId: stage.id, stageChangedAt: new Date(), contactType: values.contactType, source: values.source, visitAt },
    });
    await tx.timelineEntry.create({ data: { applicationId: app.id, type: "STAGE_CHANGE", body: `Etapa alterada para "${stage.name}"`, authorId: user.id } });
    await runStageAutomation(tx, updated, stage, app.assignees.map((a) => a.userId), app.guardians[0]?.guardianId);
  });
  refresh();
}

// ---------- Encerrar: desinteresse / desqualificado (RN-018) ----------

const closeSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(["LOST", "DISQUALIFIED"]),
  lossReasonId: z.string().min(1, "Escolha o motivo."),
  lossNote: optional(z.string().trim().max(1000)),
});

export async function closeApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = closeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const reason = await prisma.lossReason.findUnique({ where: { id: d.lossReasonId } });
  const expected = d.kind === "LOST" ? "DISINTEREST" : "DISQUALIFIED";
  if (!reason || reason.kind !== expected) return { error: "Motivo inválido para este tipo de encerramento." };
  const user = await getCurrentUser();
  await prisma.$transaction(async (tx) => {
    await tx.enrollmentApplication.update({ where: { id: d.applicationId, status: "OPEN" }, data: { status: d.kind, lossReasonId: reason.id, lossNote: d.lossNote, closedAt: new Date() } });
    // A validar com a escola: tarefas abertas são canceladas ao encerrar (comportamento do SIG não observado).
    const canceled = await tx.task.updateMany({ where: { applicationId: d.applicationId, status: "OPEN" }, data: { status: "CANCELED" } });
    const label = d.kind === "LOST" ? "Desinteresse" : "Desqualificado";
    await tx.timelineEntry.create({
      data: { applicationId: d.applicationId, type: "STATUS_CHANGE", authorId: user.id, body: `${label}: ${reason.name}${d.lossNote ? ` — ${d.lossNote}` : ""}${canceled.count ? ` (${canceled.count} tarefa(s) aberta(s) cancelada(s))` : ""}` },
    });
  });
  refresh();
}

// ---------- Marcar matriculado: conversão em aluno (RF-CAP-007, D-021, RN-015) ----------

const enrollSchema = z.object({
  applicationId: z.string().min(1),
  studentName: z.string().trim().min(2, "Informe o nome completo da criança."),
  classId: optional(z.string()),
});

export async function enrollApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = enrollSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const [app, wonStage, user] = await Promise.all([
    prisma.enrollmentApplication.findUnique({ where: { id: d.applicationId }, include: { guardians: true, prospect: true } }),
    prisma.pipelineStage.findFirstOrThrow({ where: { kind: "WON" } }),
    getCurrentUser(),
  ]);
  if (!app || app.status !== "OPEN") return { error: "Atendimento não encontrado ou já encerrado." };
  const cls = d.classId ? await prisma.schoolClass.findUnique({ where: { id: d.classId } }) : null;

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name: d.studentName,
        birthDate: app.prospect.birthDate,
        status: cls ? "ACTIVE" : "PRE_ENROLLED",
        guardians: { create: app.guardians.map((g) => ({ guardianId: g.guardianId, relationship: g.relationship ?? "Responsável", isPrimaryContact: g.isPrimary })) },
        enrollments: cls ? { create: { classId: cls.id, academicYearId: cls.academicYearId } } : undefined,
      },
    });
    await tx.enrollmentApplication.update({ where: { id: app.id }, data: { status: "ENROLLED", stageId: wonStage.id, stageChangedAt: new Date(), studentId: student.id, closedAt: new Date() } });
    await tx.task.updateMany({ where: { applicationId: app.id, status: "OPEN" }, data: { status: "CANCELED" } });
    await tx.timelineEntry.create({
      data: { applicationId: app.id, type: "STATUS_CHANGE", authorId: user.id, body: `Matriculado. Aluno criado${cls ? ` na turma ${cls.name}` : " como pré-matriculado (sem turma)"}; responsáveis vinculados sem duplicar cadastro.` },
    });
  });
  refresh();
}

// ---------- Nota e atendentes ----------

export async function addNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ applicationId: z.string().min(1), body: z.string().trim().min(1, "Escreva a nota.").max(2000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const user = await getCurrentUser();
  await prisma.timelineEntry.create({ data: { applicationId: parsed.data.applicationId, type: "NOTE", body: parsed.data.body, authorId: user.id } });
  refresh();
}

export async function addAssignee(formData: FormData) {
  const d = z.object({ applicationId: z.string().min(1), userId: z.string().min(1) }).parse(Object.fromEntries(formData));
  const [assignee, user] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { id: d.userId } }), getCurrentUser()]);
  await prisma.$transaction([
    prisma.applicationAssignee.upsert({ where: { applicationId_userId: d }, create: d, update: {} }),
    prisma.timelineEntry.create({ data: { applicationId: d.applicationId, type: "ASSIGNEE_ADDED", body: `${assignee.name} entrou como atendente`, authorId: user.id } }),
  ]);
  refresh();
}
