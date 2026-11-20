// Seed FICTÍCIO (D-011). Nenhum dado real. Nomes, telefones e e-mails gerados pelo faker.
// Turmas e etapas do funil são EXEMPLOS: a estrutura real será definida nas demonstrações (D-024).

import { fakerPT_BR as faker } from "@faker-js/faker";
import { prisma, type TaskType, type ContactType } from "../src/index";

faker.seed(42);
const now = new Date();
const day = 86_400_000;
const at = (offsetDays: number, hour?: number, min = 0) => {
  const d = new Date(now.getTime() + offsetDays * day);
  if (hour === undefined) d.setHours(12, 0, 0, 0);
  else d.setHours(hour, min, 0, 0);
  return d;
};
const pick = <T,>(arr: readonly T[]) => faker.helpers.arrayElement(arr);
const phone = () => `(11) 9${faker.string.numeric(4)}-${faker.string.numeric(4)}`;

async function reset() {
  // Ordem respeita as chaves estrangeiras.
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.messageTemplate.deleteMany(),
    prisma.timelineEntry.deleteMany(),
    prisma.taskAssignee.deleteMany(),
    prisma.task.deleteMany(),
    prisma.applicationAssignee.deleteMany(),
    prisma.applicationGuardian.deleteMany(),
    prisma.enrollmentApplication.deleteMany(),
    prisma.prospect.deleteMany(),
    prisma.lossReason.deleteMany(),
    prisma.pipelineStage.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.classTeacher.deleteMany(),
    prisma.schoolClass.deleteMany(),
    prisma.academicYear.deleteMany(),
    prisma.studentGuardian.deleteMany(),
    prisma.student.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.guardian.deleteMany(),
    prisma.family.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.institutionSettings.deleteMany(),
  ]);
}

async function main() {
  await reset();

  await prisma.institutionSettings.create({
    data: { name: "Escola Belo Ramo", currentYearLabel: "2026", officialEmail: "contato@exemplo.invalid" },
  });

  const roles = Object.fromEntries(
    await Promise.all(
      ["Direção", "Secretaria", "Coordenação", "Professor"].map(async (name) => [name, await prisma.role.create({ data: { name } })] as const),
    ),
  );
  const mkUser = (role: string) => {
    const first = faker.person.firstName("female");
    const last = faker.person.lastName();
    return prisma.user.create({
      data: { name: `${first} ${last}`, email: faker.internet.email({ firstName: first, lastName: last, provider: "exemplo.invalid" }).toLowerCase(), roleId: roles[role].id },
    });
  };
  const direcao = await mkUser("Direção");
  const secretaria = [await mkUser("Secretaria"), await mkUser("Secretaria")];
  await mkUser("Coordenação");
  const professoras = await Promise.all(Array.from({ length: 6 }, () => mkUser("Professor")));
  const atendentes = [direcao, ...secretaria];

  // ---------- Turmas (exemplo) ----------
  const year = await prisma.academicYear.create({ data: { label: "2026", isCurrent: true } });
  await prisma.academicYear.create({ data: { label: "2027" } });
  const classDefs = [
    ["Berçário A", "Berçário", "Integral"],
    ["Maternal I A", "Maternal I", "Manhã"],
    ["Maternal I B", "Maternal I", "Tarde"],
    ["Maternal II A", "Maternal II", "Manhã"],
    ["Jardim I A", "Jardim I", "Manhã"],
    ["Jardim II A", "Jardim II", "Tarde"],
  ] as const;
  const classes = [];
  for (const [i, [name, stage, shift]] of classDefs.entries()) {
    const c = await prisma.schoolClass.create({ data: { name, stage, shift, capacity: 18, academicYearId: year.id } });
    await prisma.classTeacher.create({ data: { classId: c.id, userId: professoras[i].id } });
    classes.push(c);
  }

  // ---------- Famílias, responsáveis, alunos ----------
  const rel = ["Mãe", "Pai", "Avó", "Avô", "Tia", "Responsável legal"] as const;
  const mkGuardian = async (familyId: string | null, lastName: string, sex: "female" | "male") => {
    const name = `${faker.person.firstName(sex)} ${lastName}`;
    const g = await prisma.guardian.create({ data: { name, familyId } });
    await prisma.contact.create({ data: { kind: "PHONE", value: phone(), isWhatsApp: true, guardianId: g.id } });
    if (faker.datatype.boolean(0.7))
      await prisma.contact.create({ data: { kind: "EMAIL", value: faker.internet.email({ provider: "exemplo.invalid" }).toLowerCase(), guardianId: g.id } });
    return g;
  };

  for (let f = 0; f < 42; f++) {
    const lastName = faker.person.lastName();
    const family = await prisma.family.create({ data: { label: `Família ${lastName}` } });
    const g1 = await mkGuardian(family.id, lastName, "female");
    const g2 = faker.datatype.boolean(0.6) ? await mkGuardian(family.id, faker.person.lastName(), "male") : null;
    const kids = faker.datatype.boolean(0.2) ? 2 : 1;
    for (let k = 0; k < kids; k++) {
      const cls = pick(classes);
      const student = await prisma.student.create({
        data: {
          name: `${faker.person.firstName()} ${lastName}`,
          birthDate: faker.date.birthdate({ min: 1, max: 6, mode: "age" }),
          familyId: family.id,
          status: "ACTIVE",
        },
      });
      await prisma.studentGuardian.create({ data: { studentId: student.id, guardianId: g1.id, relationship: "Mãe", isPrimaryContact: true } });
      if (g2) await prisma.studentGuardian.create({ data: { studentId: student.id, guardianId: g2.id, relationship: pick(["Pai", "Pai", "Avô"]) } });
      await prisma.enrollment.create({ data: { studentId: student.id, classId: cls.id, academicYearId: year.id, startDate: at(-200) } });
    }
  }

  // ---------- Funil (exemplo baseado no SIG "Padrão Rabbit") ----------
  const stageDefs: { name: string; required: string[]; kind?: "WON"; autoTaskTitle?: string; autoTaskType?: TaskType }[] = [
    { name: "Novo lead", required: ["contactType"] },
    { name: "1º contato", required: ["source"] },
    { name: "Agendamento", required: ["visitAt"], autoTaskTitle: "Visita do responsável", autoTaskType: "VISITA" },
    { name: "Pós-atendimento", required: [] },
    { name: "Matriculado", required: [], kind: "WON" },
  ];
  const stages = [];
  for (const [i, s] of stageDefs.entries())
    stages.push(
      await prisma.pipelineStage.create({
        data: { name: s.name, position: i, requiredFields: s.required, kind: s.kind ?? "OPEN", autoTaskTitle: s.autoTaskTitle, autoTaskType: s.autoTaskType },
      }),
    );
  const lossReasons = await Promise.all([
    ...["Valor da mensalidade", "Distância", "Horário", "Sem vaga na turma", "Escolheu outra escola", "Outros"].map((name) =>
      prisma.lossReason.create({ data: { name, kind: "DISINTEREST" } }),
    ),
    ...["Erro de contato", "Mensagem sem relação com matrícula", "Duplicado"].map((name) => prisma.lossReason.create({ data: { name, kind: "DISQUALIFIED" } })),
  ]);
  const sources = ["Instagram", "Google", "Foi indicado", "Fachada", "Facebook", "Site", "Folheto"];
  const contactTypes: ContactType[] = ["WHATSAPP", "WHATSAPP", "WHATSAPP", "TELEFONE", "PRESENCIAL", "SITE"];
  const grades = ["Berçário", "Maternal I", "Maternal II", "Jardim I", "Jardim II"];

  const leads: { guardianId: string; childName: string; visitAt: Date | null }[] = [];
  for (let a = 0; a < 38; a++) {
    const lastName = faker.person.lastName();
    const childName = `${faker.person.firstName()} ${lastName}`;
    const guardian = await mkGuardian(null, lastName, "female");
    const prospect = await prisma.prospect.create({ data: { childName, desiredGrade: pick(grades), birthDate: faker.date.birthdate({ min: 1, max: 5, mode: "age" }) } });
    const createdAt = at(-faker.number.int({ min: 0, max: 25 }), faker.number.int({ min: 8, max: 17 }));
    const roll = a / 38;
    const stageIdx = roll < 0.3 ? 0 : roll < 0.55 ? 1 : roll < 0.7 ? 2 : 3;
    const status = a % 9 === 0 ? "LOST" : a % 13 === 0 ? "DISQUALIFIED" : a % 11 === 0 ? "ENROLLED" : "OPEN";
    const stage = status === "ENROLLED" ? stages[4] : stages[stageIdx];
    const hasAssignee = a % 3 !== 0;
    const app = await prisma.enrollmentApplication.create({
      data: {
        title: `${childName.split(" ")[0]} — ${prospect.desiredGrade}`,
        prospectId: prospect.id,
        stageId: stage.id,
        status,
        stageChangedAt: new Date(createdAt.getTime() + day),
        contactType: pick(contactTypes),
        source: stageIdx >= 1 ? pick(sources) : faker.datatype.boolean(0.3) ? pick(sources) : null,
        visitAt: stageIdx >= 2 ? at(faker.number.int({ min: -3, max: 6 }), faker.number.int({ min: 8, max: 16 })) : null,
        lossReasonId: status === "LOST" ? pick(lossReasons.filter((r) => r.kind === "DISINTEREST")).id : status === "DISQUALIFIED" ? pick(lossReasons.filter((r) => r.kind === "DISQUALIFIED")).id : null,
        closedAt: status === "OPEN" ? null : at(-1),
        createdAt,
        guardians: { create: { guardianId: guardian.id, isPrimary: true, relationship: "Mãe" } },
        assignees: hasAssignee ? { create: { userId: pick(atendentes).id } } : undefined,
        timeline: { create: { type: "CREATED", body: "Atendimento criado", createdAt } },
      },
    });
    if (status === "OPEN") leads.push({ guardianId: guardian.id, childName, visitAt: app.visitAt });
    if (stageIdx > 0)
      await prisma.timelineEntry.create({ data: { applicationId: app.id, type: "STAGE_CHANGE", body: `Etapa alterada para ${stage.name}`, createdAt: new Date(createdAt.getTime() + day) } });

    if (status === "OPEN" && a % 5 !== 0) {
      const offset = faker.number.int({ min: -4, max: 6 });
      const hasTime = faker.datatype.boolean(0.35);
      await prisma.task.create({
        data: {
          title: pick(["Retornar contato", "Enviar valores", "Confirmar visita", "Ligar para tirar dúvidas"]),
          type: pick(["LIGAR", "WHATSAPP", "WHATSAPP", "TAREFA"] as const),
          priority: pick(["BAIXA", "MEDIA", "MEDIA", "ALTA", "URGENTE"] as const),
          dueAt: hasTime ? at(offset, faker.number.int({ min: 8, max: 17 }), pick([0, 30])) : at(offset),
          hasTime,
          applicationId: app.id,
          interlocutorId: guardian.id,
          assignees: hasAssignee ? { create: { userId: pick(atendentes).id } } : undefined,
        },
      });
    }
    if (stageIdx === 2 && app.visitAt) {
      await prisma.task.create({
        data: {
          title: "Visita do responsável",
          type: "VISITA",
          priority: "ALTA",
          dueAt: app.visitAt,
          hasTime: true,
          durationMin: 60,
          reminderMin: 30,
          applicationId: app.id,
          interlocutorId: guardian.id,
          assignees: { create: { userId: direcao.id } },
        },
      });
    }
  }

  // ---------- WhatsApp simulado (D-027): modelos e conversas de exemplo ----------
  await prisma.messageTemplate.createMany({
    data: [
      { shortcut: "ola", name: "Saudação", body: "Olá, {{responsavel}}! Aqui é da secretaria da escola. Como podemos ajudar?" },
      { shortcut: "visita", name: "Confirmação de visita", body: "Olá, {{responsavel}}! Confirmamos a visita à escola em {{data}} às {{hora}}, em {{local}}. Até lá!" },
      { shortcut: "valores", name: "Envio de valores", body: "{{responsavel}}, segue a tabela de valores para a série de {{aluno}}. Qualquer dúvida, estamos à disposição." },
      { shortcut: "documentos", name: "Documentos para matrícula", body: "Para a matrícula, traga: certidão de nascimento da criança, documento do responsável e comprovante de endereço." },
      { shortcut: "turma", name: "Recado sobre a turma", body: "Olá, {{responsavel}}! Um recado sobre a turma {{turma}} de {{aluno}}:" },
    ],
  });
  const firstName = (s: string) => s.split(" ")[0];
  const inbound = ["Boa tarde! Ainda tem vaga para o ano que vem?", "Olá, gostaria de saber os valores.", "Oi! Podemos remarcar a visita?", "Qual o horário de funcionamento?", "Vocês aceitam criança de 2 anos?"];
  const statuses = ["OPEN", "OPEN", "WAITING", "PENDING", "RESOLVED"] as const;
  for (const [i, lead] of leads.slice(0, 10).entries()) {
    const contact = await prisma.contact.findFirstOrThrow({ where: { guardianId: lead.guardianId, kind: "PHONE" } });
    const status = statuses[i % statuses.length];
    const start = at(-(i % 6), 9 + (i % 8));
    const msgs = [
      { direction: "IN" as const, body: pick(inbound), createdAt: start },
      { direction: "OUT" as const, body: `Olá, ${firstName((await prisma.guardian.findUniqueOrThrow({ where: { id: lead.guardianId } })).name)}! Temos sim. Quer agendar uma visita para conhecer a escola com ${firstName(lead.childName)}?`, authorId: pick(atendentes).id, createdAt: new Date(start.getTime() + 20 * 60_000) },
      ...(status === "WAITING" ? [] : [{ direction: "IN" as const, body: pick(["Quero sim!", "Pode ser na semana que vem?", "Obrigada, vou ver com meu marido.", "Perfeito."]), createdAt: new Date(start.getTime() + 3_600_000) }]),
      ...(i % 3 === 0 ? [{ direction: "NOTE" as const, body: "Mãe prefere contato depois das 17h.", authorId: pick(atendentes).id, createdAt: new Date(start.getTime() + 3_700_000) }] : []),
    ];
    await prisma.conversation.create({
      data: {
        phone: contact.value,
        contactId: contact.id,
        status,
        assigneeId: i % 4 === 0 ? null : pick(atendentes).id,
        unread: status === "OPEN" ? 1 + (i % 3) : 0,
        lastMessageAt: msgs.filter((m) => m.direction !== "NOTE").at(-1)!.createdAt,
        createdAt: start,
        messages: { create: msgs },
      },
    });
  }
  await prisma.conversation.create({
    data: { phone: phone(), status: "OPEN", unread: 1, lastMessageAt: at(0, 8, 15), messages: { create: { direction: "IN", body: "Bom dia, vi o anúncio no Instagram. Como faço para matricular?", createdAt: at(0, 8, 15) } } },
  });

  const counts = await Promise.all([prisma.student.count(), prisma.guardian.count(), prisma.enrollmentApplication.count(), prisma.task.count(), prisma.conversation.count()]);
  console.log(`Seed fictício: ${counts[0]} alunos, ${counts[1]} responsáveis, ${counts[2]} atendimentos, ${counts[3]} tarefas, ${counts[4]} conversas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
