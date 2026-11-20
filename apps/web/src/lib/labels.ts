import type { ApplicationStatus, ContactType, ConversationStatus, TaskPriority, TaskType, StudentStatus } from "@belo-ramo/db";

// RF-WPP-006: valores provisórios (CTR-11), a validar com a escola.
export const conversationStatusLabel: Record<ConversationStatus, string> = {
  OPEN: "Aberta",
  PENDING: "Pendente",
  WAITING: "Aguardando cliente",
  RESOLVED: "Finalizada",
};
export const conversationStatusTone = { OPEN: "info", PENDING: "alerta", WAITING: "neutral", RESOLVED: "ramo" } as const satisfies Record<ConversationStatus, string>;

export const taskTypeLabel: Record<TaskType, string> = {
  LIGAR: "Ligar",
  EMAIL: "E-mail",
  REUNIAO: "Reunião",
  TAREFA: "Tarefa",
  VISITA: "Visita",
  WHATSAPP: "WhatsApp",
};

export const priorityLabel: Record<TaskPriority, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente" };

export const contactTypeLabel: Record<ContactType, string> = {
  PRESENCIAL: "Presencial",
  TELEFONE: "Telefone",
  WHATSAPP: "WhatsApp",
  SITE: "Site",
  EMAIL: "E-mail",
};

export const applicationStatusLabel: Record<ApplicationStatus, string> = {
  OPEN: "Em andamento",
  ENROLLED: "Matriculado",
  LOST: "Desinteresse",
  DISQUALIFIED: "Desqualificado",
};

export const studentStatusLabel: Record<StudentStatus, string> = {
  PRE_ENROLLED: "Pré-matriculado",
  ACTIVE: "Ativo",
  TRANSFERRED: "Transferido",
  INACTIVE: "Inativo",
};

/** Campos que uma etapa pode exigir (RF-CAP-003) e como mostrá-los. */
export const requiredFieldLabel: Record<string, string> = {
  contactType: "Tipo de contato",
  source: "Como conheceu",
  visitAt: "Data da visita",
  expectedCloseDate: "Previsão de fechamento",
  description: "Descrição",
};

export const sourceOptions = ["Instagram", "Google", "Facebook", "Foi indicado", "Fachada", "Site", "Folheto", "Outro"];
