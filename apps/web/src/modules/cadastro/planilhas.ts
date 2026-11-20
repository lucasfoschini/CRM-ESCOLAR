import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { studentStatusLabel } from "@/lib/labels";

// Mesmo cabeçalho na exportação e na importação: a planilha exportada volta editada sem ajustes.
export const STUDENT_COLUMNS = ["ID", "Nome", "Data de nascimento", "Situação", "Turma", "Responsável principal", "Parentesco", "Telefone do responsável", "Observações"] as const;
export const GUARDIAN_COLUMNS = ["ID", "Nome", "Telefone", "E-mail", "Alunos"] as const;

function sheet(name: string, columns: readonly string[], rows: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((header) => ({
    header,
    width: header === "ID" ? 28 : Math.max(14, header.length + 4),
    style: header.startsWith("Data") ? { numFmt: "dd/mm/yyyy" } : {},
  }));
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF344C73" } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return wb.xlsx.writeBuffer();
}

export async function exportStudents() {
  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    include: {
      enrollments: { where: { status: "ACTIVE" }, include: { class: { select: { name: true } } } },
      guardians: { where: { isPrimaryContact: true }, include: { guardian: { include: { contacts: { where: { active: true, kind: "PHONE" }, take: 1 } } } } },
    },
  });
  return sheet(
    "Alunos",
    STUDENT_COLUMNS,
    students.map((s) => {
      const g = s.guardians[0];
      // Excel não tem fuso: grava o dia de São Paulo como meia-noite UTC.
      const birth = s.birthDate && new Date(`${toDateInput(s.birthDate)}T00:00:00Z`);
      return [s.id, s.name, birth,studentStatusLabel[s.status], s.enrollments[0]?.class.name, g?.guardian.name, g?.relationship, g?.guardian.contacts[0]?.value, s.notes];
    }),
  );
}

export async function exportGuardians() {
  const guardians = await prisma.guardian.findMany({
    orderBy: { name: "asc" },
    include: { contacts: { where: { active: true } }, students: { include: { student: { select: { name: true } } } } },
  });
  return sheet(
    "Responsáveis",
    GUARDIAN_COLUMNS,
    guardians.map((g) => [
      g.id,
      g.name,
      g.contacts.find((c) => c.kind === "PHONE")?.value,
      g.contacts.find((c) => c.kind === "EMAIL")?.value,
      g.students.map((s) => s.student.name).join(", "),
    ]),
  );
}

/** Resposta de download .xlsx. */
export function xlsxResponse(buf: ArrayBuffer | Buffer, name: string) {
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
