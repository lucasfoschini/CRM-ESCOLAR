import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ThemeSelect } from "@/components/theme-select";
import { ViewAsSelect } from "@/components/view-as";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

async function TopBar() {
  const [current, users, settings] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({ where: { active: true, role: { name: { not: "Professor" } } }, include: { role: true }, orderBy: { name: "asc" } }),
    prisma.institutionSettings.findUnique({ where: { id: 1 } }),
  ]);
  return (
    <>
      <span className="text-sm font-semibold text-ink">{settings?.name}</span>
      <div className="flex flex-wrap items-center gap-4">
        <ViewAsSelect currentId={current.id} users={users.map((u) => ({ id: u.id, label: `${u.name} (${u.role.name})` }))} />
        <ThemeSelect />
      </div>
    </>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="contents print:hidden">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-alerta/20 bg-alerta-bg px-4 py-1.5 print:hidden text-center text-xs font-medium text-alerta">
          Protótipo para demonstração · todos os dados são fictícios
        </div>
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-line bg-card px-4 lg:px-8 print:hidden">
          <Suspense fallback={<span className="text-sm text-muted">…</span>}>
            <TopBar />
          </Suspense>
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 print:max-w-none print:p-0 has-[[data-fullbleed]]:max-w-none has-[[data-fullbleed]]:p-0">{children}</main>
      </div>
    </div>
  );
}
