"use client";

import { useActionState, useState } from "react";
import { closeApplication, enrollApplication, moveStage, addNote } from "@/modules/captacao/actions";
import { contactTypeLabel, requiredFieldLabel, sourceOptions } from "@/lib/labels";
import { btn, field } from "../ui";

type Stage = { id: string; name: string; position: number; kind: "OPEN" | "WON"; requiredFields: string[] };
type Current = { id: string; stageId: string; contactType: string | null; source: string | null; visitDate: string; visitTime: string; childName: string };

function ErrorBox({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="rounded-lg border border-perigo/20 bg-perigo-bg px-3 py-2 text-sm text-perigo">
      {message}
    </p>
  ) : null;
}

/** Barra de etapas + mudança de etapa pedindo os campos obrigatórios da etapa destino (RF-CAP-003). */
export function StageMover({ stages, current }: { stages: Stage[]; current: Current }) {
  const [target, setTarget] = useState<Stage | null>(null);
  // Fecha o formulário quando a mudança de etapa dá certo.
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof moveStage>>, fd: FormData) => {
    const result = await moveStage(prev, fd);
    if (!result?.error) setTarget(null);
    return result;
  }, undefined);
  const open = stages.filter((s) => s.kind === "OPEN");
  const currentPos = stages.find((s) => s.id === current.stageId)?.position ?? 0;

  return (
    <div>
      <ol aria-label="Etapas do funil" className="flex flex-wrap gap-1">
        {open.map((s) => {
          const done = s.position < currentPos;
          const isCurrent = s.id === current.stageId;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={isCurrent}
                onClick={() => setTarget(s)}
                aria-current={isCurrent ? "step" : undefined}
                className={`min-h-10 rounded-lg border px-3 text-sm font-medium ${
                  isCurrent ? "border-ramo-600 bg-ramo-600 text-white" : done ? "border-ramo-200 bg-ramo-50 text-ramo-700 hover:bg-ramo-100" : "border-line bg-card text-muted hover:bg-ramo-50"
                }`}
              >
                {s.name}
              </button>
            </li>
          );
        })}
      </ol>

      {target ? (
        <form action={action} className="mt-3 space-y-3 rounded-xl border border-line bg-surface p-4">
          <input type="hidden" name="applicationId" value={current.id} />
          <input type="hidden" name="stageId" value={target.id} />
          <p className="text-sm text-ink">
            Mover para <strong>{target.name}</strong>
            {target.requiredFields.length ? <> — exige: {target.requiredFields.map((f) => requiredFieldLabel[f] ?? f).join(", ")}</> : null}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {target.requiredFields.includes("contactType") ? (
              <div>
                <label htmlFor="mv-ct" className={field.label}>
                  Tipo de contato
                </label>
                <select id="mv-ct" name="contactType" defaultValue={current.contactType ?? ""} className={field.input}>
                  <option value="">Escolha</option>
                  {Object.entries(contactTypeLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {target.requiredFields.includes("source") ? (
              <div>
                <label htmlFor="mv-src" className={field.label}>
                  Como conheceu a escola
                </label>
                <select id="mv-src" name="source" defaultValue={current.source ?? ""} className={field.input}>
                  <option value="">Escolha</option>
                  {sourceOptions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {target.requiredFields.includes("visitAt") ? (
              <>
                <div>
                  <label htmlFor="mv-vd" className={field.label}>
                    Data da visita
                  </label>
                  <input id="mv-vd" name="visitDate" type="date" defaultValue={current.visitDate} className={field.input} />
                </div>
                <div>
                  <label htmlFor="mv-vt" className={field.label}>
                    Horário
                  </label>
                  <input id="mv-vt" name="visitTime" type="time" defaultValue={current.visitTime} className={field.input} />
                </div>
              </>
            ) : null}
          </div>
          <ErrorBox message={state?.error} />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={btn.primary}>
              {pending ? "Movendo…" : `Mover para ${target.name}`}
            </button>
            <button type="button" onClick={() => setTarget(null)} className={btn.secondary}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

type Reason = { id: string; name: string; kind: "DISINTEREST" | "DISQUALIFIED" };

/** Marcar matriculado (converte em aluno) / desinteresse / desqualificado (RN-018). */
export function CloseActions({ applicationId, childName, reasons, classes }: { applicationId: string; childName: string; reasons: Reason[]; classes: { id: string; name: string }[] }) {
  const [mode, setMode] = useState<"enroll" | "LOST" | "DISQUALIFIED" | null>(null);
  const [enrollState, enrollAction, enrolling] = useActionState(enrollApplication, undefined);
  const [closeState, closeAction, closing] = useActionState(closeApplication, undefined);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("enroll")} className={btn.primary}>
          Marcar matriculado
        </button>
        <button type="button" onClick={() => setMode("LOST")} className={btn.secondary}>
          Desinteresse
        </button>
        <button type="button" onClick={() => setMode("DISQUALIFIED")} className={btn.secondary}>
          Desqualificar
        </button>
      </div>

      {mode === "enroll" ? (
        <form action={enrollAction} className="space-y-3 rounded-xl border border-ramo-200 bg-ramo-50 p-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="text-sm text-ink">O interessado vira aluno. Os responsáveis do atendimento são vinculados ao aluno, sem duplicar cadastro.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="en-name" className={field.label}>
                Nome completo da criança
              </label>
              <input id="en-name" name="studentName" defaultValue={childName} className={field.input} />
            </div>
            <div>
              <label htmlFor="en-class" className={field.label}>
                Turma
              </label>
              <select id="en-class" name="classId" defaultValue="" className={field.input}>
                <option value="">Definir depois (pré-matriculado)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ErrorBox message={enrollState?.error} />
          <div className="flex gap-2">
            <button type="submit" disabled={enrolling} className={btn.primary}>
              {enrolling ? "Matriculando…" : "Confirmar matrícula"}
            </button>
            <button type="button" onClick={() => setMode(null)} className={btn.secondary}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {mode === "LOST" || mode === "DISQUALIFIED" ? (
        <form action={closeAction} className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="kind" value={mode} />
          <p className="text-sm text-ink">
            {mode === "LOST"
              ? "Desinteresse: a família não seguiu com a matrícula. Conta nos relatórios."
              : "Desqualificado: não era um interessado real (ex.: erro de contato). Sai do funil e dos relatórios."}
          </p>
          <div>
            <label htmlFor="cl-reason" className={field.label}>
              Motivo
            </label>
            <select id="cl-reason" name="lossReasonId" defaultValue="" className={field.input}>
              <option value="">Escolha o motivo</option>
              {reasons
                .filter((r) => r.kind === (mode === "LOST" ? "DISINTEREST" : "DISQUALIFIED"))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="cl-note" className={field.label}>
              Observação (opcional)
            </label>
            <textarea id="cl-note" name="lossNote" rows={2} className={field.input} />
          </div>
          <ErrorBox message={closeState?.error} />
          <div className="flex gap-2">
            <button type="submit" disabled={closing} className={btn.danger}>
              {closing ? "Salvando…" : mode === "LOST" ? "Registrar desinteresse" : "Desqualificar"}
            </button>
            <button type="button" onClick={() => setMode(null)} className={btn.secondary}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function NoteForm({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(addNote, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label htmlFor="note" className="sr-only">
        Nova nota
      </label>
      <textarea id="note" name="body" rows={2} className={field.input} placeholder="Escreva uma nota para a equipe…" />
      {state?.error ? <p className={field.error}>{state.error}</p> : null}
      <button type="submit" disabled={pending} className={btn.secondary}>
        {pending ? "Salvando…" : "Adicionar nota"}
      </button>
    </form>
  );
}
