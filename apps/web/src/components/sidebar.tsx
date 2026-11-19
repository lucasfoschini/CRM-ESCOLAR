"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, GraduationCap, Kanban, LayoutDashboard, Menu, School, Sprout, Users, X } from "lucide-react";
import { Suspense, useState } from "react";

const groups = [
  {
    label: "Atendimento",
    items: [
      { href: "/", label: "Hoje", icon: LayoutDashboard },
      { href: "/atendimentos", label: "Atendimentos", icon: Kanban },
      { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Escola",
    items: [
      { href: "/alunos", label: "Alunos", icon: GraduationCap },
      { href: "/responsaveis", label: "Responsáveis", icon: Users },
      { href: "/turmas", label: "Turmas", icon: School },
    ],
  },
];

// usePathname é dado de URL: com Cache Components precisa ficar dentro de <Suspense>.
// O fallback (sem item ativo) entra no shell estático.
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList isActive={() => false} onNavigate={onNavigate} />}>
      <ActiveNavList onNavigate={onNavigate} />
    </Suspense>
  );
}

function ActiveNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavList onNavigate={onNavigate} isActive={(href) => (href === "/" ? pathname === "/" : pathname.startsWith(href))} />;
}

function NavList({ onNavigate, isActive }: { onNavigate?: () => void; isActive: (href: string) => boolean }) {
  return (
    <nav aria-label="Principal" className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-1 text-xs font-medium text-ramo-100/80">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                    isActive(href) ? "bg-white/15 text-white" : "text-ramo-50 hover:bg-white/10"
                  }`}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-3 text-white">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-white/15">
        <Sprout className="size-5" />
      </span>
      <span className="font-bold leading-tight">
        Belo Ramo
        <span className="block text-xs font-medium text-ramo-100">CRM escolar</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col gap-8 bg-ramo-800 px-3 py-5 lg:flex">
        <Brand />
        <NavLinks />
      </aside>

      <div className="flex items-center justify-between bg-ramo-800 px-4 py-3 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="grid size-11 place-items-center rounded-lg text-white hover:bg-white/10"
        >
          <Menu aria-hidden />
        </button>
      </div>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-40 lg:hidden" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-72 flex-col gap-8 bg-ramo-800 px-3 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" autoFocus onClick={() => setOpen(false)} aria-label="Fechar menu" className="grid size-11 place-items-center rounded-lg text-white hover:bg-white/10">
                <X aria-hidden />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
