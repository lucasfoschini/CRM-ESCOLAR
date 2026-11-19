"use client";

import { useActionState, useState } from "react";
import { cancelTask, completeTask, noContact } from "@/modules/tarefas/actions";
import { btn, field } from "./ui";

/** Concluir (com relato), Sem contato, Cancelar. Relato vai para a timeline (RN-020). */
export function TaskActions({ taskId }: { taskId: string }) {
  const [concluding, setConcluding] = useState(false);
  const [state, action, pending] = useActionState(completeTask, undefined);

  if (concluding)
    return (
      <form action={action} className="mt-3 w-full space-y-2 rounded-lg border border-line bg-surface p-3">
        <input type="hidden" name="taskId" value={taskId} />
        <label htmlFor={`relato-${taskId}`} className={field.label}>
          Relato (vai para a linha do tempo)
        </label>
        <textarea id={`relato-${taskId}`} name="report" rows={2} className={field.input} placeholder="Ex.: mãe vai visitar na quinta às 9h" />
        {state?.error ? <p className={field.error}>{state.error}</p> : null}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={btn.primary}>
            {pending ? "Concluindo…" : "Concluir tarefa"}
          </button>
          <button type="button" onClick={() => setConcluding(false)} className={btn.secondary}>
            Voltar
          </button>
        </div>
      </form>
    );

  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" onClick={() => setConcluding(true)} className={btn.ghost}>
        Concluir
      </button>
      <form action={noContact}>
        <input type="hidden" name="taskId" value={taskId} />
        <button type="submit" className={btn.ghost} title="Reagenda para o dia seguinte">
          Sem contato
        </button>
      </form>
      <form action={cancelTask}>
        <input type="hidden" name="taskId" value={taskId} />
        <button type="submit" className="inline-flex min-h-9 items-center rounded-md px-2 text-sm font-medium text-muted hover:bg-perigo-bg hover:text-perigo">
          Cancelar
        </button>
      </form>
    </div>
  );
}
