"use server";

import ExcelJS from "exceljs";
import { refresh } from "next/cache";
import { z } from "zod";
import type { Prisma, StudentStatus } from "@belo-ramo/db";
import { prisma } from "@/lib/db";
import { fromLocal } from "@/lib/dates";
import { studentStatusLabel } from "@/lib/labels";
import { GUARDIAN_COLUMNS, STUDENT_COLUMNS } from "./planilhas";

// PROTÓTIPO: sem autorização por perfil (Fase 3, D-009).
// Regra: valida a planilha inteira antes de gravar; com qualquer erro nada é importado.

export type ImportState = { error?: string; ok?: string } | undefined;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ERRORS = 10;
const digits = (s: string) => s.replace(/\D/g, "");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

type Row = { line: number; text: (col: string) => string; date: (col: string) => Date | null | "invalid" };

/** Lê a primeira aba do .xlsx enviado; colunas localizadas pelo cabeçalho (ordem livre, acentos ignorados). */
async function readSheet(formData: FormData, columns: readonly string[]): Promise<{ rows: Row[] } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Escolha uma planilha .xlsx." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "Formato não suportado: envie um arquivo .xlsx (Excel)." };
  if (file.size > MAX_BYTES) return { error: "Planilha maior que 5 MB." };

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    return { error: "Não foi possível ler a planilha. Confira se é um .xlsx válido." };
  }
  const ws = wb.worksheets[0];
  if (!ws) return { error: "A planilha está vazia." };

  const index = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => index.set(norm(cell.text), col));
  if (!index.has("nome")) return { error: `Cabeçalho não reconhecido. Use as colunas: ${columns.join(", ")}.` };

  const rows: Row[] = [];
  ws.eachRow((row, line) => {
    if (line === 1) return;
    const cell = (col: string) => {
      const i = index.get(norm(col));
      return i ? row.getCell(i) : undefined;
    };
    const text = (col: string) => cell(col)?.text.trim() ?? "";
    const date = (col: string) => {
      const v = cell(col)?.value;
      // Data digitada como data no Excel chega em UTC à meia-noite.
      if (v instanceof Date) return fromLocal(v.toISOString().slice(0, 10));
      const s = text(col);
      if (!s) return null;
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ?? s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return "invalid";
      const [d, mo, y] = s.includes("/") ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
      const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
      return Number.isNaN(Date.parse(iso)) ? "invalid" : fromLocal(iso);
    };
    if (columns.some((c) => text(c))) rows.push({ line, text, date });
  });
  if (!rows.length) return { error: "Nenhuma linha preenchida abaixo do cabeçalho." };
  return { rows };
}

const errorSummary = (errors: string[]) =>
  `Nada foi importado. Corrija e envie de novo:\n${errors.slice(0, MAX_ERRORS).join("\n")}${errors.length > MAX_ERRORS ? `\n… e mais ${errors.length - MAX_ERRORS} erro(s).` : ""}`;

/** Telefones ativos já cadastrados (dígitos → responsável), para não duplicar responsável (RN-015). */
async function phoneIndex(tx: Prisma.TransactionClient) {
  const contacts = await tx.contact.findMany({ where: { kind: "PHONE", active: true }, select: { value: true, guardianId: true } });
  return new Map(contacts.map((c) => [digits(c.value), c.guardianId]));
}

// ---------- Alunos ----------

const statusByLabel = new Map(Object.entries(studentStatusLabel).map(([k, v]) => [norm(v), k as StudentStatus]));

export async function importStudents(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const sheet = await readSheet(formData, STUDENT_COLUMNS);
  if ("error" in sheet) return sheet;

  const [existing, classes] = await Promise.all([
    prisma.student.findMany({ select: { id: true } }),
    prisma.schoolClass.findMany({ where: { academicYear: { isCurrent: true } }, select: { id: true, name: true, academicYearId: true } }),
  ]);
  const ids = new Set(existing.map((s) => s.id));
  const classByName = new Map(classes.map((c) => [norm(c.name), c]));

  const errors: string[] = [];
  const parsed = sheet.rows.map((r) => {
    const fail = (msg: string) => errors.push(`Linha ${r.line}: ${msg}`);
    const id = r.text("ID");
    const name = r.text("Nome");
    const birthDate = r.date("Data de nascimento");
    const statusText = r.text("Situação");
    const status = statusText ? statusByLabel.get(norm(statusText)) : undefined;
    const turma = r.text("Turma");
    const cls = turma ? classByName.get(norm(turma)) : undefined;
    const guardianName = r.text("Responsável principal");
    const phone = r.text("Telefone do responsável");

    if (id && !ids.has(id)) fail("ID não encontrado (deixe em branco para cadastrar um aluno novo).");
    if (name.length < 2) fail("informe o nome do aluno.");
    if (birthDate === "invalid") fail("data de nascimento inválida (use dd/mm/aaaa).");
    if (statusText && !status) fail(`situação "${statusText}" não existe (${Object.values(studentStatusLabel).join(", ")}).`);
    if (turma && !cls) fail(`turma "${turma}" não existe no ano letivo atual.`);
    if (phone && digits(phone).length < 10) fail("telefone do responsável com DDD, ex.: (11) 91234-5678.");
    if (phone && !guardianName) fail("telefone informado sem o nome do responsável.");

    return {
      id: id || undefined,
      data: { name, birthDate: birthDate === "invalid" ? null : birthDate, notes: r.text("Observações") || null, ...(status ? { status } : {}) },
      cls,
      guardian: guardianName ? { name: guardianName, relationship: r.text("Parentesco"), phone } : undefined,
    };
  });
  if (errors.length) return { error: errorSummary(errors) };

  let created = 0;
  let updated = 0;
  await prisma.$transaction(
    async (tx) => {
      const phones = await phoneIndex(tx);
      for (const p of parsed) {
        const student = p.id ? await tx.student.update({ where: { id: p.id }, data: p.data }) : await tx.student.create({ data: p.data });
        if (p.id) updated++;
        else created++;

        // RN-021: troca de turma encerra a matrícula anterior, não apaga.
        if (p.cls) {
          const active = await tx.enrollment.findMany({ where: { studentId: student.id, status: "ACTIVE" } });
          if (!active.some((e) => e.classId === p.cls!.id)) {
            await tx.enrollment.updateMany({ where: { studentId: student.id, status: "ACTIVE" }, data: { status: "ENDED", endDate: new Date() } });
            await tx.enrollment.create({ data: { studentId: student.id, classId: p.cls.id, academicYearId: p.cls.academicYearId } });
          }
        }

        if (p.guardian) {
          const g = p.guardian;
          const guardianId =
            (g.phone && phones.get(digits(g.phone))) ||
            (await tx.guardian.findFirst({ where: { name: { equals: g.name, mode: "insensitive" } }, select: { id: true } }))?.id ||
            (await tx.guardian.create({ data: { name: g.name, contacts: g.phone ? { create: { kind: "PHONE", value: g.phone } } : undefined } })).id;
          if (g.phone) phones.set(digits(g.phone), guardianId);
          await tx.studentGuardian.updateMany({ where: { studentId: student.id, guardianId: { not: guardianId } }, data: { isPrimaryContact: false } });
          await tx.studentGuardian.upsert({
            where: { studentId_guardianId: { studentId: student.id, guardianId } },
            create: { studentId: student.id, guardianId, relationship: g.relationship || "Responsável", isPrimaryContact: true },
            update: { isPrimaryContact: true, ...(g.relationship ? { relationship: g.relationship } : {}) },
          });
        }
      }
    },
    { timeout: 60_000 },
  );
  refresh();
  return { ok: `Importação concluída: ${created} aluno(s) novo(s), ${updated} atualizado(s).` };
}

// ---------- Responsáveis ----------

const email = z.email();

export async function importGuardians(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const sheet = await readSheet(formData, GUARDIAN_COLUMNS);
  if ("error" in sheet) return sheet;

  const ids = new Set((await prisma.guardian.findMany({ select: { id: true } })).map((g) => g.id));
  const errors: string[] = [];
  const parsed = sheet.rows.map((r) => {
    const fail = (msg: string) => errors.push(`Linha ${r.line}: ${msg}`);
    const id = r.text("ID");
    const name = r.text("Nome");
    const phone = r.text("Telefone");
    const mail = r.text("E-mail");
    if (id && !ids.has(id)) fail("ID não encontrado (deixe em branco para cadastrar um responsável novo).");
    if (name.length < 2) fail("informe o nome do responsável.");
    if (phone && digits(phone).length < 10) fail("telefone com DDD, ex.: (11) 91234-5678.");
    if (mail && !email.safeParse(mail).success) fail(`e-mail "${mail}" inválido.`);
    return { id: id || undefined, name, phone, mail };
  });
  if (errors.length) return { error: errorSummary(errors) };

  let created = 0;
  let updated = 0;
  await prisma.$transaction(
    async (tx) => {
      const phones = await phoneIndex(tx);
      for (const p of parsed) {
        // Sem ID, o telefone identifica quem já existe (RN-015).
        const id = p.id ?? (p.phone ? phones.get(digits(p.phone)) : undefined);
        if (!id) {
          const g = await tx.guardian.create({ data: { name: p.name } });
          if (p.phone) await tx.contact.create({ data: { guardianId: g.id, kind: "PHONE", value: p.phone } });
          if (p.mail) await tx.contact.create({ data: { guardianId: g.id, kind: "EMAIL", value: p.mail } });
          if (p.phone) phones.set(digits(p.phone), g.id);
          created++;
          continue;
        }
        await tx.guardian.update({ where: { id }, data: { name: p.name } });
        // RN-013: contato trocado vira histórico (inativo), não é apagado. Célula vazia não mexe no contato.
        const current = await tx.contact.findMany({ where: { guardianId: id, active: true } });
        for (const [kind, value, same] of [
          ["PHONE", p.phone, (v: string) => digits(v) === digits(p.phone)],
          ["EMAIL", p.mail, (v: string) => v.toLowerCase() === p.mail.toLowerCase()],
        ] as const) {
          if (!value || current.some((c) => c.kind === kind && same(c.value))) continue;
          await tx.contact.updateMany({ where: { guardianId: id, kind, active: true }, data: { active: false } });
          await tx.contact.create({ data: { guardianId: id, kind, value } });
        }
        if (p.phone) phones.set(digits(p.phone), id);
        updated++;
      }
    },
    { timeout: 60_000 },
  );
  refresh();
  return { ok: `Importação concluída: ${created} responsável(is) novo(s), ${updated} atualizado(s).` };
}
