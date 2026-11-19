import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageHeader, PendingNote } from "@/components/ui";
import { SeatGrid, SeatLegend } from "@/components/seat-grid";
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
                  const n = c._count.enrollments;
                  const free = c.capacity ? c.capacity - n : null;
                  return (
                    <li key={c.id}>
                      <Link href={`/turmas/${c.id}`} className="block space-y-3 rounded-2xl border border-line bg-card p-4 hover:border-ramo-200">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-lg font-bold text-ink">{c.name}</p>
                          <p className="text-sm text-muted">
                            <span className="text-base font-bold tabular-nums text-ink">{n}</span>
                            {c.capacity ? ` de ${c.capacity}` : " alunos"}
                          </p>
                        </div>
                        <SeatGrid enrolled={n} capacity={c.capacity} />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <SeatLegend />
                          {free !== null ? (
                            <span className={`text-xs font-medium ${free <= 0 ? "text-alerta" : "text-ramo-700"}`}>
                              {free <= 0 ? "Turma cheia" : `${free} vaga${free > 1 ? "s" : ""} livre${free > 1 ? "s" : ""}`}
                            </span>
                          ) : null}
                        </div>
                        <p className="border-t border-line pt-3 text-xs text-muted">
                          {c.stage} · {c.shift} · {c.teachers.map((t) => t.user.name).join(", ") || "sem professora vinculada"}
                        </p>
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
