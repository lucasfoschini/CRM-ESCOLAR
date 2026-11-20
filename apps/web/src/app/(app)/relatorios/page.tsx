import Link from "next/link";
import { Suspense } from "react";
import { Card, CardTitle, Loading, PageHeader, Tabs } from "@/components/ui";
import { now, startOfDay } from "@/lib/dates";
import { studentStatusLabel, taskTypeLabel } from "@/lib/labels";
import { getReports } from "@/modules/relatorios/queries";

export const metadata = { title: "Relatórios" };

const PERIODS = { "30": "Últimos 30 dias", "90": "Últimos 90 dias", "365": "Últimos 12 meses" } as const;
type Period = keyof typeof PERIODS;

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "alerta" }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tone === "alerta" && value !== 0 ? "text-alerta" : "text-ink"}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Barras horizontais em CSS: o valor fica sempre escrito, a barra é só apoio visual. */
function Bars({ items, empty }: { items: { label: string; value: number; note?: string }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => i.value === 0)) return <p className="px-4 py-6 text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3 p-4">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="text-ink">{i.label}</span>
            <span className="tabular-nums text-muted">
              <strong className="font-semibold text-ink">{i.value}</strong>
              {i.note ? ` · ${i.note}` : null}
            </span>
          </div>
          <div aria-hidden className="h-2 rounded-full bg-surface">
            <div className="h-2 rounded-full bg-ramo-600" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/relatorios">["searchParams"] }) {
  const { periodo } = await searchParams;
  const period: Period = typeof periodo === "string" && periodo in PERIODS ? (periodo as Period) : "30";
  const ref = await now();
  const today = startOfDay(ref);
  const r = await getReports(startOfDay(ref, -Number(period)), today);
  const t = r.tasks;

  return (
    <>
      <Tabs current={period} items={Object.entries(PERIODS).map(([key, label]) => ({ key, label, href: `/relatorios?periodo=${key}` }))} />

      <h2 className="mb-2 font-semibold text-ink">Captação</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Novos atendimentos" value={r.captacao.created} />
        <Stat label="Matrículas" value={r.captacao.enrolled} hint="atendimentos fechados como matriculado" />
        <Stat label="Perdidos" value={r.captacao.lost} hint="desinteresse + desqualificado" />
        <Stat label="Taxa de conversão" value={pct(r.captacao.conversion)} hint="matrículas ÷ atendimentos encerrados" />
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Funil hoje (em andamento)</CardTitle>
          <Bars items={r.funnel} empty="Nenhum atendimento em andamento." />
        </Card>
        <Card>
          <CardTitle>Como conheceu</CardTitle>
          <Bars
            items={r.sources.map((s) => ({ label: s.label, value: s.total, note: `${s.enrolled} matr.` }))}
            empty="Nenhum atendimento novo no período."
          />
        </Card>
        <Card>
          <CardTitle>Motivos de perda</CardTitle>
          <Bars items={r.losses} empty="Nenhuma perda no período." />
        </Card>
      </div>

      <h2 className="mb-2 font-semibold text-ink">Tarefas</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Concluídas" value={t.done} />
        <Stat label="Concluídas no prazo" value={pct(t.done ? t.onTime / t.done : null)} hint={`${t.onTime} de ${t.done}`} />
        <Stat label="Atrasadas agora" value={t.overdue} tone="alerta" />
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card>
          <CardTitle>Concluídas por tipo</CardTitle>
          <Bars items={t.byType.map((x) => ({ label: taskTypeLabel[x.key], value: x.value }))} empty="Nenhuma tarefa concluída no período." />
        </Card>
        <Card className="overflow-x-auto">
          <CardTitle>Equipe</CardTitle>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Pessoa</th>
                <th className="px-4 py-2 text-right font-medium">Atendimentos abertos</th>
                <th className="px-4 py-2 text-right font-medium">Matrículas</th>
                <th className="px-4 py-2 text-right font-medium">Tarefas concluídas</th>
                <th className="px-4 py-2 text-right font-medium">Tarefas atrasadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {r.team.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-ink">{u.name}</td>
                  <td className="px-4 py-2 text-right">{u.openApplications}</td>
                  <td className="px-4 py-2 text-right">{u.won}</td>
                  <td className="px-4 py-2 text-right">{u.tasksDone}</td>
                  <td className={`px-4 py-2 text-right ${u.overdueTasks ? "font-semibold text-alerta" : ""}`}>{u.overdueTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <h2 className="mb-2 font-semibold text-ink">Escola</h2>
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card>
          <CardTitle>Alunos por situação</CardTitle>
          <Bars items={r.students.map((s) => ({ label: studentStatusLabel[s.key], value: s.value }))} empty="Nenhum aluno cadastrado." />
        </Card>
        <Card>
          <CardTitle action={<Link href="/turmas" className="text-xs font-medium text-ramo-700 hover:underline">Ver turmas</Link>}>
            Ocupação das turmas (ano atual)
          </CardTitle>
          <Bars
            items={r.classes.map((c) => ({
              label: c.name,
              value: c.enrolled,
              note: c.capacity ? `${pct(c.enrolled / c.capacity)} de ${c.capacity}` : "sem limite",
            }))}
            empty="Nenhuma turma no ano letivo atual."
          />
        </Card>
      </div>
    </>
  );
}

export default function RelatoriosPage({ searchParams }: PageProps<"/relatorios">) {
  return (
    <>
      <PageHeader title="Relatórios" description="Captação, tarefas e ocupação da escola no período escolhido." />
      <Suspense fallback={<Loading />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
