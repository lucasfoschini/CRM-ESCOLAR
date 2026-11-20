// RF-WPP-012: variáveis {{nome}} nos modelos. Puro: usado no servidor e no navegador.

const VAR = /\{\{\s*(\w+)\s*\}\}/g;

/** Troca as variáveis conhecidas; as sem dado ficam como {{nome}} para bloquear o envio. */
export const fillTemplate = (body: string, vars: Record<string, string | undefined>) => body.replace(VAR, (m, k: string) => vars[k] || m);

export const unresolvedVars = (body: string) => [...new Set([...body.matchAll(VAR)].map((m) => m[1]))];
