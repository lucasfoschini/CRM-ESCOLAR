"use client";

import { FileDown } from "lucide-react";
import { btn } from "./ui";

/** Abre a impressão do navegador ("Salvar como PDF"); força o tema claro só durante a impressão. */
export function PrintButton() {
  return (
    <button
      type="button"
      className={`${btn.secondary} print:hidden`}
      onClick={() => {
        const root = document.documentElement;
        const theme = root.dataset.theme;
        root.dataset.theme = "light";
        window.print();
        if (theme) root.dataset.theme = theme;
        else delete root.dataset.theme;
      }}
    >
      <FileDown aria-hidden className="size-4" /> Exportar PDF
    </button>
  );
}
