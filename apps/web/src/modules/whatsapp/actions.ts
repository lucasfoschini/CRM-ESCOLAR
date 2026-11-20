"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { getCurrentUser } from "@/lib/session";
import { unresolvedVars } from "./templates";

// PROTÓTIPO (D-027): WhatsApp SIMULADO. Nada é enviado nem recebido pela API (RN-023, RN-034).
// Sem autorização por perfil (Fase 3, D-009). Toda action valida a entrada com Zod.

const digits = (s: string) => s.replace(/\D/g, "");
const phoneSchema = z.string().trim().refine((v) => digits(v).length >= 10, "Telefone com DDD, ex.: (11) 91234-5678.");

/** RF-WPP-004: associa só com correspondência confiável (um único responsável com esse telefone ativo). */
async function matchContact(phone: string) {
  const contacts = await prisma.contact.findMany({ where: { kind: "PHONE", active: true }, select: { id: true, value: true, guardianId: true } });
  const matches = contacts.filter((c) => digits(c.value) === digits(phone));
  return new Set(matches.map((c) => c.guardianId)).size === 1 ? matches[0].id : null;
}

export async function simulateIncoming(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ phone: phoneSchema, body: z.string().trim().min(1, "Escreva a mensagem.").max(4000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values: { phone: String(formData.get("phone") ?? ""), body: String(formData.get("body") ?? "") } };
  const { phone, body } = parsed.data;

  const existing = (await prisma.conversation.findMany({ select: { id: true, phone: true } })).find((c) => digits(c.phone) === digits(phone));
  const conversation =
    existing ?? (await prisma.conversation.create({ data: { phone, contactId: await matchContact(phone) } }));
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId: conversation.id, direction: "IN", body } }),
    prisma.conversation.update({ where: { id: conversation.id }, data: { status: "OPEN", lastMessageAt: new Date(), unread: { increment: 1 }, archived: false } }),
  ]);
  redirect(`/whatsapp/${conversation.id}`);
}

export async function sendMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ conversationId: z.string().min(1), body: z.string().trim().min(1, "Escreva a mensagem.").max(4000), internal: z.literal("on").optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values: { body: String(formData.get("body") ?? "") } };
  const { conversationId, body, internal } = parsed.data;

  // RF-WPP-012: variável sem dado bloqueia o envio (nota interna pode ficar como está).
  const missing = unresolvedVars(body);
  if (!internal && missing.length) return { error: `Preencha antes de enviar: ${missing.map((v) => `{{${v}}}`).join(", ")}.`, values: { body } };

  const user = await getCurrentUser();
  const { assigneeId } = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId }, select: { assigneeId: true } });
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId, direction: internal ? "NOTE" : "OUT", body, authorId: user.id } }),
    // Como no SIG: responder conversa sem atendente assume o atendimento.
    ...(internal
      ? []
      : [prisma.conversation.update({ where: { id: conversationId }, data: { status: "WAITING", lastMessageAt: new Date(), unread: 0, assigneeId: assigneeId ?? user.id } })]),
  ]);
  refresh();
}

export async function setConversationStatus(formData: FormData) {
  const d = z.object({ conversationId: z.string().min(1), status: z.enum(["OPEN", "PENDING", "WAITING", "RESOLVED"]) }).parse(Object.fromEntries(formData));
  await prisma.conversation.update({ where: { id: d.conversationId }, data: { status: d.status } });
  refresh();
}

/** RF-WPP-004: associação manual. Cria o telefone no cadastro do responsável se ainda não existir. */
export async function linkGuardian(formData: FormData) {
  const d = z.object({ conversationId: z.string().min(1), guardianId: z.string().min(1) }).parse(Object.fromEntries(formData));
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: d.conversationId } });
  const contacts = await prisma.contact.findMany({ where: { guardianId: d.guardianId, kind: "PHONE", active: true } });
  const contact =
    contacts.find((c) => digits(c.value) === digits(conversation.phone)) ??
    (await prisma.contact.create({ data: { guardianId: d.guardianId, kind: "PHONE", value: conversation.phone, isWhatsApp: true } }));
  await prisma.conversation.update({ where: { id: conversation.id }, data: { contactId: contact.id } });
  refresh();
}

/** Abre a conversa de um contato do cadastro (cria se ainda não houver). */
export async function openConversation(formData: FormData) {
  const { contactId } = z.object({ contactId: z.string().min(1) }).parse(Object.fromEntries(formData));
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  const conversation =
    (await prisma.conversation.findFirst({ where: { contactId }, orderBy: { lastMessageAt: "desc" } })) ??
    (await prisma.conversation.create({ data: { phone: contact.value, contactId, status: "RESOLVED" } }));
  redirect(`/whatsapp/${conversation.id}`);
}

const idSchema = z.object({ conversationId: z.string().min(1) });

/** Botão "Atender": o usuário atual assume a conversa (RF-WPP-005, simulado). */
export async function claimConversation(formData: FormData) {
  const { conversationId } = idSchema.parse(Object.fromEntries(formData));
  const user = await getCurrentUser();
  await prisma.conversation.update({ where: { id: conversationId }, data: { assigneeId: user.id } });
  refresh();
}

/** "Trocar responsável": vazio deixa a conversa sem atendente. Sem histórico de atribuições no protótipo. */
export async function assignConversation(formData: FormData) {
  const d = idSchema.extend({ assigneeId: z.string() }).parse(Object.fromEntries(formData));
  await prisma.conversation.update({ where: { id: d.conversationId }, data: { assigneeId: d.assigneeId || null } });
  refresh();
}

export async function setArchived(formData: FormData) {
  const d = idSchema.extend({ archived: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  await prisma.conversation.update({ where: { id: d.conversationId }, data: { archived: d.archived === "true" } });
  refresh();
}

export async function markUnread(formData: FormData) {
  const { conversationId } = idSchema.parse(Object.fromEntries(formData));
  await prisma.conversation.update({ where: { id: conversationId }, data: { unread: 1 } });
  redirect("/whatsapp");
}

/** Chamado ao abrir a conversa no navegador (não na renderização, para o prefetch não marcar como lida). */
export async function markRead(conversationId: string) {
  const { count } = await prisma.conversation.updateMany({ where: { id: z.string().min(1).parse(conversationId), unread: { gt: 0 } }, data: { unread: 0 } });
  if (count) refresh();
}
