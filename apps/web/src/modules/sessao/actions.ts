"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { VIEW_AS_COOKIE } from "@/lib/session";

// PROTÓTIPO: troca o usuário da demonstração. Não é login (Fase 3).
export async function setViewAs(formData: FormData) {
  const id = z.string().min(1).parse(formData.get("userId"));
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return;
  (await cookies()).set(VIEW_AS_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  refresh();
}
