import { z } from "zod";

/** Campo opcional de formulário: "" vira undefined ANTES de validar (senão `.email()` rejeita campo vazio). */
export const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

/** Estado devolvido pelas Server Actions de formulário. `values` repreenche o formulário após erro. */
export type FormState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | undefined;

/** Valores textuais enviados, para devolver ao formulário quando houver erro. */
export const formValues = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
