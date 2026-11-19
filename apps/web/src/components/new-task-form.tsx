"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createTask } from "@/modules/tarefas/actions";
import { taskTypeLabel, priorityLabel } from "@/lib/labels";
import { btn, field } from "./ui";

type Props = { attendants: { id: string; name: string }[]; currentUserId: string; defaultDate: string; applicationId?: string; label?: string };

export function NewTaskForm({ attendants, currentUserId, defaultDate, applicationId, label = "Nova tarefa" }: Props) {
  const [open, setOpen] = useState(false);
  // Fecha o formulário quando a action termina sem erro.
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof createTask>>, fd: FormData) => {
    const result = await createTask(prev, fd);
    if (!result?.error) setOpen(false);
    return result;
  }, undefined);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={btn.secondary}>
        <Plus aria-hidden className="size-4" /> {label}
      </button>
    );

  const err = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="w-full space-y-3 rounded-xl border border-line bg-card p-4 sm:max-w-xl">
      {applicationId ? <input type="hidden" name="applicationId" value={applicationId} /> : null}
      <div>
        <label htmlFor="t-title" className={field.label}>
          Título
        </label>
        <input id="t-title" name="title" required defaultValue={v.title} className={field.input} placeholder="Ex.: Ligar para confirmar a visita" />
        {err.title ? <p className={field.error}>{err.title}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="t-type" className={field.label}>
            Tipo
          </label>
          <select id="t-type" name="type" defaultValue="LIGAR" className={field.input}>
            {Object.entries(taskTypeLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="t-priority" className={field.label}>
            Prioridade
          </label>
          <select id="t-priority" name="priority" defaultValue="MEDIA" className={field.input}>
            {Object.entries(priorityLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="t-date" className={field.label}>
            Data
          </label>
          <input id="t-date" name="dueDate" type="date" required defaultValue={v.dueDate ?? defaultDate} className={field.input} />
          {err.dueDate ? <p className={field.error}>{err.dueDate}</p> : null}
        </div>
        <div>
          <label htmlFor="t-time" className={field.label}>
            Horário (opcional)
          </label>
          <input id="t-time" name="dueTime" type="time" defaultValue={v.dueTime} className={field.input} />
          <p className={field.hint}>Com horário, aparece na grade da agenda.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="t-assignee" className={field.label}>
            Responsável pela tarefa
          </label>
          <select id="t-assignee" name="assigneeId" defaultValue={currentUserId} className={field.input}>
            {attendants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state?.error ? <p className={field.error}>{state.error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Salvando…" : "Criar tarefa"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
