import Link from "next/link";
import { Suspense } from "react";
import { PlanilhaActions } from "@/components/planilha";
import { Badge, EmptyState, Loading, PageHeader, btn, field } from "@/components/ui";
import { ageInYears, now } from "@/lib/dates";
import { studentStatusLabel } from "@/lib/labels";
import { importStudents } from "@/modules/cadastro/import-actions";
import { listClasses, listStudents } from "@/modules/cadastro/queries";

export const metadata = { title: "Alunos" };

async function List({ searchParams }: { searchParams: PageProps<"/alunos">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : undefined;
  const turma = typeof sp.turma === "string" && sp.turma ? sp.turma : undefined;
  const [ref, students, classes] = await Promise.all([now(), listStudents(q, turma), listClasses()]);
  return (
    <>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className={field.label}>
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Aluno ou responsável" className={field.input} />
        </div>
        <div>
          <label htmlFor="turma" className={field.label}>
            Turma
          </label>
          <select id="turma" name="turma" defaultValue={turma ?? ""} className={field.input}>
            <option value="">Todas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear.label})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={btn.secondary}>
          Filtrar
        </button>
        <span className="pb-3 text-sm text-muted">{students.length} aluno(s)</span>
      </form>
      {students.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Aluno</th>
                <th className="px-4 py-2 font-medium">Idade</th>
                <th className="px-4 py-2 font-medium">Turma</th>
                <th className="px-4 py-2 font-medium">Responsável principal</th>
                <th className="px-4 py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-ramo-50/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/alunos/${s.id}`} className="font-medium text-ramo-700 hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{s.birthDate ? `${ageInYears(s.birthDate, ref)} anos` : "—"}</td>
                  <td className="px-4 py-2.5">{s.enrollments[0]?.class.name ?? <Badge tone="alerta">Sem turma</Badge>}</td>
                  <td className="px-4 py-2.5">{s.guardians[0]?.guardian.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={s.status === "ACTIVE" ? "ramo" : "neutral"}>{studentStatusLabel[s.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum aluno encontrado">Tente outro nome ou limpe o filtro de turma.</EmptyState>
      )}
    </>
  );
}

export default function AlunosPage({ searchParams }: PageProps<"/alunos">) {
  return (
    <>
      <PageHeader
        title="Alunos"
        description="Alunos matriculados. Novos alunos entram pela matrícula de um atendimento ou pela importação de planilha Excel."
        actions={<PlanilhaActions exportHref="/alunos/exportar" importAction={importStudents} />}
      />
      <Suspense fallback={<Loading />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}
