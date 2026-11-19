"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createApplication } from "@/modules/captacao/actions";
import { contactTypeLabel, requiredFieldLabel, sourceOptions } from "@/lib/labels";
import { btn, field } from "../ui";

type Props = { attendants: { id: string; name: string }[]; currentUserId: string; firstStage: { name: string; requiredFields: string[] } };

export function NewApplicationForm({ attendants, currentUserId, firstStage }: Props) {
  const [state, action, pending] = useActionState(createApplication, undefined);
  const err = state?.fieldErrors ?? {};
  const v = state?.values ?? {}; // repreenche após erro (o React reseta o form depois da action)
  const req = (f: string) => firstStage.requiredFields.includes(f);
  const errOf = (name: string) => (err[name] ? <p className={field.error}>{err[name]}</p> : null);

  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <fieldset className="space-y-3 rounded-xl border border-line bg-card p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Criança interessada</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="childName" className={field.label}>
              Nome da criança
            </label>
            <input id="childName" name="childName" defaultValue={v.childName} className={field.input} aria-invalid={Boolean(err.childName)} />
            {errOf("childName")}
          </div>
          <div>
            <label htmlFor="desiredGrade" className={field.label}>
              Turma/etapa pretendida
            </label>
            <input id="desiredGrade" name="desiredGrade" defaultValue={v.desiredGrade} className={field.input} placeholder="Ex.: Maternal II" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-line bg-card p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Responsável (contato principal)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="guardianName" className={field.label}>
              Nome
            </label>
            <input id="guardianName" name="guardianName" defaultValue={v.guardianName} className={field.input} aria-invalid={Boolean(err.guardianName)} />
            {errOf("guardianName")}
          </div>
          <div>
            <label htmlFor="relationship" className={field.label}>
              Parentesco
            </label>
            <input id="relationship" name="relationship" defaultValue={v.relationship} className={field.input} placeholder="Ex.: Mãe" />
          </div>
          <div>
            <label htmlFor="phone" className={field.label}>
              Telefone (WhatsApp)
            </label>
            <input id="phone" name="phone" defaultValue={v.phone} inputMode="tel" className={field.input} placeholder="(11) 91234-5678" aria-invalid={Boolean(err.phone)} />
            {errOf("phone")}
          </div>
          <div>
            <label htmlFor="email" className={field.label}>
              E-mail (opcional)
            </label>
            <input id="email" name="email" defaultValue={v.email} type="email" className={field.input} aria-invalid={Boolean(err.email)} />
            {errOf("email")}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-line bg-card p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Atendimento</legend>
        <p className="text-xs text-muted">
          Entra na etapa <strong>{firstStage.name}</strong>
          {firstStage.requiredFields.length ? `, que exige: ${firstStage.requiredFields.map((f) => requiredFieldLabel[f] ?? f).join(", ")}` : ""}.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="contactType" className={field.label}>
              Tipo de contato{req("contactType") ? " *" : ""}
            </label>
            <select id="contactType" name="contactType" defaultValue={v.contactType ?? "WHATSAPP"} className={field.input}>
              {Object.entries(contactTypeLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="source" className={field.label}>
              Como conheceu a escola{req("source") ? " *" : ""}
            </label>
            <select id="source" name="source" defaultValue={v.source ?? ""} className={field.input}>
              <option value="">Não informado</option>
              {sourceOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assigneeId" className={field.label}>
              Atendente
            </label>
            <select id="assigneeId" name="assigneeId" defaultValue={v.assigneeId ?? currentUserId} className={field.input}>
              <option value="">Sem atendente</option>
              {attendants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className={field.label}>
              Observações
            </label>
            <textarea id="description" name="description" defaultValue={v.description} rows={3} className={field.input} />
          </div>
        </div>
      </fieldset>

      {state?.error ? (
        <p role="alert" className="rounded-lg border border-perigo/20 bg-perigo-bg px-3 py-2 text-sm text-perigo">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Criando…" : "Criar atendimento"}
        </button>
        <Link href="/atendimentos" className={btn.secondary}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
