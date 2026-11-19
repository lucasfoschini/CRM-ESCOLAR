import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader, PendingNote } from "@/components/ui";
import { listClasses } from "@/modules/cadastro/queries";

export const metadata = { title: "Turmas" };

async function Grid() {
  const classes = await listClasses();
  const years = [...new Set(classes.map((c) => c.academicYear.label))];
  return (
    <div className="space-y-8">
      {years.map((y) => {
        const items = classes.filter((c) => c.academicYear.label === y);
        return (
          <section key={y}>
            <h2 className="mb-3 font-semibold text-ink">Ano letivo {y}</h2>
            {items.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((c) => {
                  const full = c.capacity ? c._count.enrollments / c.capacity : 0;
                  return (
                    <li key={c.id}>
                      <Link href={`/turmas/${c.id}`} className="block rounded-xl border border-line bg-card p-4 hover:border-ramo-200">
                        <p className="font-semibold text-ink">{c.name}</p>
                        <p className="text-sm text-muted">
                          {c.stage} · {c.shift}
                        </p>
                        <p className="mt-3 text-sm">
                          <span className="font-semibold tabular-nums">{c._count.enrollments}</span>
                          {c.capacity ? <span className="text-muted"> de {c.capacity} vagas</span> : " alunos"}
                        </p>
                        {c.capacity ? (
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ramo-50" aria-hidden>
                            <div className={`h-full rounded-full ${full >= 1 ? "bg-alerta" : "bg-ramo-600"}`} style={{ width: `${Math.min(100, full * 100)}%` }} />
                          </div>
                        ) : null}
                        <p className="mt-3 text-xs text-muted">{c.teachers.map((t) => t.user.name).join(", ") || "Sem professora vinculada"}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhuma turma cadastrada para {y}.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function TurmasPage() {
  return (
    <>
      <PageHeader title="Turmas" description="Turmas por ano letivo, com vagas ocupadas e professoras." />
      <div className="mb-4">
        <PendingNote>as turmas abaixo são exemplos. Etapas, nomes, períodos e vagas reais da escola (A1, A2, A5, A8).</PendingNote>
      </div>
      <Suspense fallback={<Loading />}>
        <Grid />
      </Suspense>
    </>
  );
}
