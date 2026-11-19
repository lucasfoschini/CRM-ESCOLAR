import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardTitle, Loading, btn } from "@/components/ui";
import { ageInYears, now } from "@/lib/dates";
import { getClass } from "@/modules/cadastro/queries";

async function Detail({ params }: { params: PageProps<"/turmas/[id]">["params"] }) {
  const { id } = await params;
  const [c, ref] = await Promise.all([getClass(id), now()]);
  if (!c) notFound();
  return (
    <>
      <Link href="/turmas" className={`${btn.ghost} mb-3`}>
        <ArrowLeft aria-hidden className="size-4" /> Turmas
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{c.name}</h1>
        <p className="text-sm text-muted">
          {c.stage} · {c.shift} · {c.academicYear.label} · {c.enrollments.length}
          {c.capacity ? ` de ${c.capacity}` : ""} alunos · {c.teachers.map((t) => `${t.user.name} (${t.role})`).join(", ")}
        </p>
      </header>
      <Card>
        <CardTitle>Alunos da turma</CardTitle>
        <ul className="divide-y divide-line text-sm">
          {c.enrollments.map(({ student }) => {
            const g = student.guardians[0]?.guardian;
            return (
              <li key={student.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <Link href={`/alunos/${student.id}`} className="font-medium text-ramo-700 hover:underline">
                  {student.name}
                </Link>
                <span className="text-muted">
                  {student.birthDate ? `${ageInYears(student.birthDate, ref)} anos · ` : ""}
                  {g ? `${g.name}${g.contacts[0] ? ` · ${g.contacts[0].value}` : ""}` : "sem responsável"}
                </span>
              </li>
            );
          })}
          {!c.enrollments.length ? <li className="px-4 py-3 text-muted">Nenhum aluno nesta turma.</li> : null}
        </ul>
      </Card>
    </>
  );
}

export default function TurmaPage({ params }: PageProps<"/turmas/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Detail params={params} />
    </Suspense>
  );
}
