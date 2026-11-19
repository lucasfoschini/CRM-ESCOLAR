import "server-only";
import { prisma } from "@/lib/db";

const contains = (q?: string) => (q ? { contains: q, mode: "insensitive" as const } : undefined);

export async function listStudents(q?: string, classId?: string) {
  return prisma.student.findMany({
    where: {
      ...(q ? { OR: [{ name: contains(q) }, { guardians: { some: { guardian: { name: contains(q) } } } }] } : {}),
      ...(classId ? { enrollments: { some: { classId, status: "ACTIVE" } } } : {}),
    },
    include: {
      enrollments: { where: { status: "ACTIVE" }, include: { class: { select: { id: true, name: true } } } },
      guardians: { where: { isPrimaryContact: true }, include: { guardian: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
    take: 300,
  });
}

export async function getStudent(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      family: { include: { students: { select: { id: true, name: true } } } },
      guardians: { include: { guardian: { include: { contacts: { where: { active: true } } } } }, orderBy: { isPrimaryContact: "desc" } },
      enrollments: { include: { class: true, academicYear: true }, orderBy: { startDate: "desc" } },
      applications: { select: { id: true, title: true, closedAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listGuardians(q?: string) {
  return prisma.guardian.findMany({
    where: q ? { OR: [{ name: contains(q) }, { contacts: { some: { value: contains(q) } } }] } : {},
    include: {
      contacts: { where: { active: true, kind: "PHONE" }, take: 1 },
      students: { include: { student: { select: { id: true, name: true } } } },
      _count: { select: { applications: true } },
    },
    orderBy: { name: "asc" },
    take: 300,
  });
}

export async function getGuardian(id: string) {
  return prisma.guardian.findUnique({
    where: { id },
    include: {
      family: true,
      contacts: { orderBy: [{ active: "desc" }, { createdAt: "desc" }] },
      students: { include: { student: { include: { enrollments: { where: { status: "ACTIVE" }, include: { class: true } } } } } },
      applications: { include: { application: { include: { stage: true } } } },
    },
  });
}

export async function listClasses() {
  return prisma.schoolClass.findMany({
    include: {
      academicYear: true,
      teachers: { include: { user: { select: { name: true } } } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ academicYear: { label: "asc" } }, { name: "asc" }],
  });
}

export async function getClass(id: string) {
  return prisma.schoolClass.findUnique({
    where: { id },
    include: {
      academicYear: true,
      teachers: { include: { user: { select: { name: true } } } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: { include: { guardians: { where: { isPrimaryContact: true }, include: { guardian: { include: { contacts: { where: { active: true, kind: "PHONE" }, take: 1 } } } } } } } },
        orderBy: { student: { name: "asc" } },
      },
    },
  });
}
