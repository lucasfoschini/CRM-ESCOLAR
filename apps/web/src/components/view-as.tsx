"use client";

import { setViewAs } from "@/modules/sessao/actions";

export function ViewAsSelect({ users, currentId }: { users: { id: string; label: string }[]; currentId: string }) {
  return (
    <form action={setViewAs} className="flex items-center gap-2">
      <label htmlFor="ver-como" className="text-xs font-medium text-muted">
        Ver como
      </label>
      <select
        id="ver-como"
        name="userId"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-9 max-w-56 rounded-lg border border-line bg-card px-2 text-sm"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-sm underline">
          Trocar
        </button>
      </noscript>
    </form>
  );
}
