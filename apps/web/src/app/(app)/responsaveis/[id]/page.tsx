import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, CardTitle, Loading, btn } from "@/components/ui";
import { applicationStatusLabel } from "@/lib/labels";
import { getGuardian } from "@/modules/cadastro/queries";

async function Detail({ params }: { params: PageProps<"/responsaveis/[id]">["params"] }) {
  const { id } = await params;
  const g = await getGuardian(id);
  if (!g) notFound();
  return (
    <>
      <Link href="/responsaveis" className={`${btn.ghost} mb-3`}>
        <ArrowLeft aria-hidden className="size-4" /> Responsáveis
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{g.name}</h1>
        {g.family ? <p className="text-sm text-muted">{g.family.label}</p> : null}
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle>Contatos</CardTitle>
          <ul className="divide-y divide-line text-sm">
            {g.contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2">
                <span className={c.active ? "text-ink" : "text-muted line-through"}>{c.value}</span>
                <span className="flex gap-1">
                  {c.isWhatsApp ? <Badge tone="ramo">WhatsApp</Badge> : null}
                  {!c.active ? <Badge>Antigo</Badge> : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Alunos vinculados</CardTitle>
          <ul className="divide-y divide-line text-sm">
            {g.students.map(({ student, relationship, isPrimaryContact }) => (
              <li key={student.id} className="px-4 py-2">
                <Link href={`/alunos/${student.id}`} className="font-medium text-ramo-700 hover:underline">
                  {student.name}
                </Link>
                <span className="block text-xs text-muted">
                  {relationship}
                  {isPrimaryContact ? " · contato principal" : ""}
                  {student.enrollments[0] ? ` · ${student.enrollments[0].class.name}` : ""}
                </span>
              </li>
            ))}
            {!g.students.length ? <li className="px-4 py-3 text-muted">Nenhum aluno matriculado.</li> : null}
          </ul>
        </Card>
        <Card>
          <CardTitle>Atendimentos</CardTitle>
          <ul className="divide-y divide-line text-sm">
            {g.applications.map(({ application: a }) => (
              <li key={a.id} className="px-4 py-2">
                <Link href={`/atendimentos/${a.id}`} className="font-medium text-ramo-700 hover:underline">
                  {a.title}
                </Link>
                <span className="block text-xs text-muted">
                  {a.status === "OPEN" ? a.stage.name : applicationStatusLabel[a.status]}
                </span>
              </li>
            ))}
            {!g.applications.length ? <li className="px-4 py-3 text-muted">Nenhum atendimento de captação.</li> : null}
          </ul>
        </Card>
      </div>
    </>
  );
}

export default function ResponsavelPage({ params }: PageProps<"/responsaveis/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Detail params={params} />
    </Suspense>
  );
}
