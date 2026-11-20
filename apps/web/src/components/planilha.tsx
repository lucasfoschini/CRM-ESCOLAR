"use client";

import { useActionState, useRef } from "react";
import { Download, Upload } from "lucide-react";
import type { ImportState } from "@/modules/cadastro/import-actions";
import { btn } from "./ui";

type Action = (prev: ImportState, fd: FormData) => Promise<ImportState>;

/** Botões "Exportar Excel" e "Importar Excel" do cabeçalho das listas de cadastro. */
export function PlanilhaActions({ exportHref, importAction }: { exportHref: string; importAction: Action }) {
  const [state, action, pending] = useActionState(importAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <a href={exportHref} className={btn.secondary} download>
          <Download aria-hidden className="size-4" /> Exportar Excel
        </a>
        <form ref={form} action={action}>
          <label className={`${btn.primary} cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
            <Upload aria-hidden className="size-4" /> {pending ? "Importando…" : "Importar Excel"}
            <input
              type="file"
              name="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={pending}
              onChange={(e) => e.currentTarget.files?.length && form.current?.requestSubmit()}
            />
          </label>
        </form>
      </div>
      {state?.error ? (
        <p role="alert" className="max-w-md whitespace-pre-line rounded-lg border border-perigo/20 bg-perigo-bg px-3 py-2 text-sm text-perigo">
          {state.error}
        </p>
      ) : state?.ok ? (
        <p role="status" className="rounded-lg border border-line bg-ramo-50 px-3 py-2 text-sm text-ink">
          {state.ok}
        </p>
      ) : null}
      <p className="text-xs text-muted">Dica: exporte, edite e importe a mesma planilha. Linha sem ID cadastra novo.</p>
    </div>
  );
}
