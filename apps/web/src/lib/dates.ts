import { connection } from "next/server";

export const TZ = "America/Sao_Paulo";
// shortcut: Brasil sem horário de verão desde 2019, offset fixo -03:00; trocar por lib de fuso se isso mudar.
const OFFSET = "-03:00";

/** Agora, marcando a renderização como dinâmica (Cache Components exige isso antes de new Date()). */
export async function now() {
  await connection();
  return new Date();
}

function ymd(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p; // AAAA-MM-DD
}

/** Início do dia (00:00 em São Paulo), deslocado em `offsetDays`. */
export function startOfDay(d: Date, offsetDays = 0) {
  const base = new Date(`${ymd(d)}T00:00:00${OFFSET}`);
  return new Date(base.getTime() + offsetDays * 86_400_000);
}

/** Segunda-feira da semana de `d` (00:00 em São Paulo). */
export function startOfWeek(d: Date) {
  const start = startOfDay(d);
  const weekday = new Date(`${ymd(d)}T12:00:00${OFFSET}`).getUTCDay(); // 0 = domingo
  return startOfDay(start, weekday === 0 ? -6 : 1 - weekday);
}

/** Converte "AAAA-MM-DD" e "HH:MM" (horário de São Paulo) em Date. */
export function fromLocal(date: string, time?: string) {
  return new Date(`${date}T${time || "12:00"}:00${OFFSET}`);
}

/** Data em "AAAA-MM-DD" no fuso de São Paulo (para inputs type=date). */
export function toDateInput(d: Date) {
  return ymd(d);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts });
export const fmtDate = (d: Date) => fmt({ day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
export const fmtDayMonth = (d: Date) => fmt({ day: "2-digit", month: "short" }).format(d);
export const fmtTime = (d: Date) => fmt({ hour: "2-digit", minute: "2-digit" }).format(d);
export const fmtDateTime = (d: Date) => fmt({ day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
export const fmtDayLong = (d: Date) => fmt({ day: "numeric", month: "long" }).format(d);
export const fmtWeekday = (d: Date) => fmt({ weekday: "short", day: "2-digit", month: "2-digit" }).format(d);

/** Dias inteiros entre duas datas (para "dias na etapa"). */
export const daysBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));

export function ageInYears(birth: Date, ref: Date) {
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
