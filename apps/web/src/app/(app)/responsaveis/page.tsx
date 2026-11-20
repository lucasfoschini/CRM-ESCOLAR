import Link from "next/link";
import { Suspense } from "react";
import { PlanilhaActions } from "@/components/planilha";
import { Badge, EmptyState, Loading, PageHeader, btn, field } from "@/components/ui";
import { importGuardians } from "@/modules/cadastro/import-actions";
import { listGuardians } from "@/modules/cadastro/queries";

export const metadata = { title: "Responsáveis" };

async function List({ searchParams }: { searchParams: PageProps<"/responsaveis">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : undefined;
  const guardians = await listGuardians(q);
  return (
    <>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className={field.label}>
            Buscar
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Nome ou telefone" className={field.input} />
        </div>
        <button type="submit" className={btn.secondary}>
          Buscar
        </button>
        <span className="pb-3 text-sm text-muted">{guardians.length} responsável(is)</span>
      </form>
      {guardians.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Responsável</th>
                <th className="px-4 py-2 font-medium">Telefone</th>
                <th className="px-4 py-2 font-medium">Alunos</th>
                <th className="px-4 py-2 font-medium">Atendimentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {guardians.map((g) => (
                <tr key={g.id} className="hover:bg-ramo-50/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/responsaveis/${g.id}`} className="font-medium text-ramo-700 hover:underline">
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{g.contacts[0]?.value ?? "—"}</td>
                  <td className="px-4 py-2.5">{g.students.length ? g.students.map((s) => s.student.name.split(" ")[0]).join(", ") : <Badge>Interessado</Badge>}</td>
                  <td className="px-4 py-2.5 tabular-nums">{g._count.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum responsável encontrado" />
      )}
    </>
  );
}

export default function ResponsaveisPage({ searchParams }: PageProps<"/responsaveis">) {
  return (
    <>
      <PageHeader
        title="Responsáveis"
        description="Um único cadastro por pessoa: serve para os alunos matriculados e para os atendimentos de captação."
        actions={<PlanilhaActions exportHref="/responsaveis/exportar" importAction={importGuardians} />}
      />
      <Suspense fallback={<Loading />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}
