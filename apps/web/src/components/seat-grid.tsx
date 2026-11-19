/** Cadeira escolar (desenho próprio): encosto, assento e pernas. */
function Chair({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 28" aria-hidden className={`h-9 w-8 ${filled ? "text-ramo-600" : "text-muted/35"}`}>
      <rect x="5" y="2" width="14" height="11" rx="2.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="18" height="4" rx="1.5" fill="currentColor" />
      <path d="M6 18v8M18 18v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Vagas da turma: uma cadeira por vaga, ocupadas "acesas". Sem capacidade definida, mostra só as ocupadas. */
export function SeatGrid({ enrolled, capacity }: { enrolled: number; capacity: number | null }) {
  const seats = Math.max(capacity ?? enrolled, enrolled);
  return (
    <div role="img" aria-label={`${enrolled} ${capacity ? `de ${capacity} vagas ocupadas` : "alunos matriculados"}`} className="grid grid-cols-5 justify-items-center gap-x-2 gap-y-3 rounded-xl bg-surface p-4">
      {Array.from({ length: seats }, (_, i) => (
        <Chair key={i} filled={i < enrolled} />
      ))}
    </div>
  );
}

export function SeatLegend() {
  return (
    <p className="flex gap-4 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-sm bg-ramo-600" /> matriculada
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-sm border-2 border-muted/35" /> livre
      </span>
    </p>
  );
}
