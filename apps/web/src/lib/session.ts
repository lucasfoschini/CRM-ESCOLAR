import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";

// PROTÓTIPO: "ver como" escolhe o usuário da demonstração. NÃO é autenticação.
// Login real, sessões e permissões entram na Fase 3 (D-008, D-009; RSC-022).
export const VIEW_AS_COOKIE = "br_ver_como";

export async function getCurrentUser() {
  const id = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  const user = id ? await prisma.user.findUnique({ where: { id }, include: { role: true } }) : null;
  return user ?? (await prisma.user.findFirstOrThrow({ where: { role: { name: "Direção" } }, include: { role: true } }));
}
