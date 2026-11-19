import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, CardTitle, Loading, PendingNote, btn } from "@/components/ui";
import { ageInYears, fmtDate, now } from "@/lib/dates";
import { studentStatusLabel } from "@/lib/labels";
import { getStudent } from "@/modules/cadastro/queries";

async function Detail({ params }: { params: PageProps<"/alunos/[id]">["params"] }) {
  const { id } = await params;
  const [student, ref] = await Promise.all([getStudent(id), now()]);
  if (!student) notFound();
  const active = student.enrollments.find((e) => e.status === "ACTIVE");
  const siblings = student.family?.students.filter((s) => s.id !== student.id) ?? [];

  return (
    <>
      <Link href="/alunos" className={`${btn.ghost} mb-3`}>
        <ArrowLeft aria-hidden className="size-4" /> Alunos
      </Link>
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{student.name}</h1>
        <Badge tone={student.status === "ACTIVE" ? "ramo" : "neutral"}>{studentStatusLabel[student.status]}</Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Dados do aluno</CardTitle>
          <dl className="divide-y divide-line text-sm">
            <div className="flex justify-between px-4 py-2">
              <dt className="text-muted">Nascimento</dt>
              <dd>{student.birthDate ? `${fmtDate(student.birthDate)} (${ageInYears(student.birthDate, ref)} anos)` : "—"}</dd>
            </div>
            <div className="flex justify-between px-4 py-2">
              <dt className="text-muted">Turma atual</dt>
              <dd>
                {active ? (
                  <Link href={`/turmas/${active.classId}`} className="text-ramo-700 hover:underline">
                    {active.class.name} · {active.academicYear.label}
                  </Link>
                ) : (
                  "Sem turma"
                )}
              </dd>
            </div>
            <div className="flex justify-between px-4 py-2">
              <dt className="text-muted">Família</dt>
              <dd>{student.family?.label ?? "—"}</dd>
            </div>
            {siblings.length ? (
              <div className="flex justify-between gap-4 px-4 py-2">
                <dt className="text-muted">Irmãos na escola</dt>
                <dd className="text-right">
                  {siblings.map((s) => (
                    <Link key={s.id} href={`/alunos/${s.id}`} className="block text-ramo-700 hover:underline">
                      {s.name}
                    </Link>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="border-t border-line p-4">
            <PendingNote>quais dados a ficha deve ter (ficha de matrícula da escola, Roteiro C5). Saúde, retirada e uso de imagem estão fora do protótipo (D-014).</PendingNote>
          </div>
        </Card>

        <Card>
          <CardTitle>Responsáveis</CardTitle>
          <ul className="divide-y divide-line">
            {student.guardians.map(({ guardian, relationship, isPrimaryContact, authorized }) => (
              <li key={guardian.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/responsaveis/${guardian.id}`} className="font-medium text-ramo-700 hover:underline">
                    {guardian.name}
                  </Link>
                  <span className="text-muted">{relationship}</span>
                  {isPrimaryContact ? <Badge tone="ramo">Contato principal</Badge> : null}
                  {!authorized ? <Badge tone="perigo">Sem autorização</Badge> : null}
                </div>
                <ul className="mt-1 text-muted">
                  {guardian.contacts.map((c) => (
                    <li key={c.id}>{c.value}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-4">
            <PendingNote>quem pode ser cadastrado como responsável, que documento comprova, e como tratar guarda e restrições de acesso (E1–E4).</PendingNote>
          </div>
        </Card>

        <Card>
          <CardTitle>Histórico de turmas</CardTitle>
          <ul className="divide-y divide-line text-sm">
            {student.enrollments.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 px-4 py-2">
                <span>
                  {e.class.name} · {e.academicYear.label}
                </span>
                <span className="text-muted">
                  desde {fmtDate(e.startDate)}
                  {e.endDate ? ` até ${fmtDate(e.endDate)}` : ""}
                </span>
              </li>
            ))}
            {!student.enrollments.length ? <li className="px-4 py-3 text-muted">Ainda sem matrícula em turma.</li> : null}
          </ul>
        </Card>

        <Card>
          <CardTitle>Atendimento de origem</CardTitle>
          <ul className="divide-y divide-line text-sm">
            {student.applications.map((a) => (
              <li key={a.id} className="px-4 py-2">
                <Link href={`/atendimentos/${a.id}`} className="text-ramo-700 hover:underline">
                  {a.title}
                </Link>
                {a.closedAt ? <span className="text-muted"> · matriculado em {fmtDate(a.closedAt)}</span> : null}
              </li>
            ))}
            {!student.applications.length ? <li className="px-4 py-3 text-muted">Aluno cadastrado antes do CRM (dados fictícios de exemplo).</li> : null}
          </ul>
        </Card>
      </div>
    </>
  );
}

export default function AlunoPage({ params }: PageProps<"/alunos/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Detail params={params} />
    </Suspense>
  );
}
