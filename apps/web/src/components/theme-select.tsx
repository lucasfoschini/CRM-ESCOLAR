"use client";

import { useSyncExternalStore } from "react";

/** Mesma chave e mesma função global do script inline em app/layout.tsx. */
export const THEME_KEY = "br_tema";
export const themeScript = `(function(){var m=matchMedia("(prefers-color-scheme: dark)");function a(){var p;try{p=localStorage.getItem("${THEME_KEY}")}catch(e){}var d=p==="escuro"||(p!=="claro"&&m.matches);document.documentElement.dataset.theme=d?"dark":"light"}a();m.addEventListener("change",a);window.__aplicarTema=a})()`;

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function read() {
  try {
    return localStorage.getItem(THEME_KEY) ?? "sistema";
  } catch {
    return "sistema";
  }
}

export function ThemeSelect() {
  const value = useSyncExternalStore(subscribe, read, () => "sistema");
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tema" className="text-xs font-medium text-muted">
        Tema
      </label>
      <select
        id="tema"
        value={value}
        onChange={(e) => {
          try {
            localStorage.setItem(THEME_KEY, e.target.value);
          } catch {}
          (window as unknown as { __aplicarTema?: () => void }).__aplicarTema?.();
          listeners.forEach((l) => l());
        }}
        className="min-h-9 rounded-lg border border-line bg-card px-2 text-sm"
      >
        <option value="sistema">Sistema</option>
        <option value="claro">Claro</option>
        <option value="escuro">Escuro</option>
      </select>
    </div>
  );
}
