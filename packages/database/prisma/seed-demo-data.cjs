const { loadRootEnv } = require("./load-root-env.cjs");

loadRootEnv();

const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

const demoTenantTaxId = "20999999991";
const demoPassword = "Demo123456!";
const demoUsers = [
  {
    email: "owner@demo.bogaap.local",
    fullName: "Martina Demo",
    dni: "30123456",
    phone: "3815551001",
    roleCode: "owner"
  },
  {
    email: "abogado@demo.bogaap.local",
    fullName: "Nicolas Demo",
    dni: "32123456",
    phone: "3815551002",
    roleCode: "lawyer"
  },
  {
    email: "paralegal@demo.bogaap.local",
    fullName: "Sofia Demo",
    dni: "33123456",
    phone: "3815551003",
    roleCode: "paralegal"
  }
];

async function seedDemoData() {
  await clearPreviousDemoData();

  const passwordHash = await hash(demoPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.currency.upsert({
      where: { code: "ARS" },
      update: { active: true, name: "Peso argentino", symbol: "$" },
      create: { active: true, code: "ARS", name: "Peso argentino", symbol: "$" }
    });

    const [province, ownerRole, lawyerRole, paralegalRole, practiceTemplates] = await Promise.all([
      tx.province.findUnique({
        where: { code: "ar-tucuman" },
        select: { id: true }
      }),
      tx.role.findUnique({ where: { code: "owner" }, select: { id: true } }),
      tx.role.findUnique({ where: { code: "lawyer" }, select: { id: true } }),
      tx.role.findUnique({ where: { code: "paralegal" }, select: { id: true } }),
      tx.practiceAreaTemplate.findMany({
        where: {
          active: true,
          code: { in: ["derecho-civil", "derecho-laboral", "derecho-familia"] }
        },
        orderBy: { displayOrder: "asc" },
        select: { id: true, code: true, description: true, name: true }
      })
    ]);

    if (!province || !ownerRole || !lawyerRole || !paralegalRole || practiceTemplates.length < 3) {
      throw new Error("Faltan catalogos base. Ejecuta npm run db:prepare antes de sembrar demo.");
    }

    const [capitalCivilForum, familiaForum, laboralForum] = await Promise.all([
      tx.forumTemplate.findUnique({
        where: { code: "ar-tucuman-civil-comercial-comun" },
        select: { id: true }
      }),
      tx.forumTemplate.findUnique({
        where: { code: "ar-tucuman-civil-familia-sucesiones" },
        select: { id: true }
      }),
      tx.forumTemplate.findUnique({
        where: { code: "ar-tucuman-civil-trabajo" },
        select: { id: true }
      })
    ]);

    if (!capitalCivilForum || !familiaForum || !laboralForum) {
      throw new Error("Faltan fueros demo de Tucuman. Ejecuta npm run db:seed:legal-catalogs.");
    }

    const [capitalCivilCenterForum, familiaCenterForum, laboralCenterForum] = await Promise.all([
      findJudicialCenterForum(tx, capitalCivilForum.id),
      findJudicialCenterForum(tx, familiaForum.id),
      findJudicialCenterForum(tx, laboralForum.id)
    ]);

    if (!capitalCivilCenterForum || !familiaCenterForum || !laboralCenterForum) {
      throw new Error(
        "Faltan centros judiciales demo de Tucuman. Ejecuta npm run db:seed:legal-catalogs."
      );
    }

    const tenant = await tx.tenant.create({
      data: {
        name: "Demo BogApp - Estudio Norte",
        legalName: "Demo BogApp Estudio Juridico Norte",
        taxId: demoTenantTaxId,
        status: "active",
        profile: {
          create: {
            address: "San Martin 450",
            city: "San Miguel de Tucuman",
            country: "Argentina",
            mainPracticeAreas: ["derecho-civil", "derecho-laboral", "derecho-familia"],
            province: "Tucuman",
            referralSource: "demo-data",
            size: "small",
            website: "https://demo.bogaap.local"
          }
        },
        settings: {
          create: {
            caseNumberingMode: "manual",
            defaultCurrencyCode: "ARS",
            defaultRoleForInvites: "lawyer",
            documentStorageMode: "local",
            timezone: "America/Argentina/Buenos_Aires"
          }
        }
      }
    });

    await tx.tenantCurrency.upsert({
      where: {
        tenantId_currencyCode: {
          currencyCode: "ARS",
          tenantId: tenant.id
        }
      },
      update: { active: true },
      create: {
        currencyCode: "ARS",
        tenantId: tenant.id
      }
    });

    await tx.practiceArea.createMany({
      data: practiceTemplates.map((template) => ({
        description: template.description,
        name: template.name,
        templateId: template.id,
        tenantId: tenant.id
      })),
      skipDuplicates: true
    });

    const practiceAreas = await tx.practiceArea.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true }
    });
    const practiceAreaByName = new Map(practiceAreas.map((area) => [area.name, area.id]));

    const memberships = [];
    for (const userSeed of demoUsers) {
      const user = await tx.user.create({
        data: {
          dni: userSeed.dni,
          email: userSeed.email,
          emailVerifiedAt: new Date(),
          fullName: userSeed.fullName,
          passwordHash,
          phone: userSeed.phone,
          status: "active"
        }
      });

      const roleId = getRoleId(userSeed.roleCode, { lawyerRole, ownerRole, paralegalRole });
      const membership = await tx.tenantMembership.create({
        data: {
          joinedAt: new Date(),
          roleId,
          status: "active",
          tenantId: tenant.id,
          userId: user.id
        },
        select: { id: true, userId: true }
      });
      memberships.push({ ...membership, roleCode: userSeed.roleCode });
    }

    const lawyerMembership = memberships.find((membership) => membership.roleCode === "lawyer");
    const paralegalMembership = memberships.find(
      (membership) => membership.roleCode === "paralegal"
    );

    await tx.tenantMembershipPracticeArea.createMany({
      data: [
        ...practiceAreas.map((area) => ({
          practiceAreaId: area.id,
          tenantMembershipId: lawyerMembership.id
        })),
        {
          practiceAreaId: practiceAreaByName.get("Derecho Civil"),
          tenantMembershipId: paralegalMembership.id
        }
      ].filter((assignment) => assignment.practiceAreaId),
      skipDuplicates: true
    });

    const clients = await createDemoClients(tx, tenant.id);
    await createDemoCases(tx, {
      clients,
      forumIds: {
        civil: capitalCivilForum.id,
        familia: familiaForum.id,
        laboral: laboralForum.id
      },
      judicialCenterForumIds: {
        civil: capitalCivilCenterForum.id,
        familia: familiaCenterForum.id,
        laboral: laboralCenterForum.id
      },
      practiceAreaByName,
      provinceId: province.id,
      responsibleMembershipId: lawyerMembership.id,
      tenantId: tenant.id
    });
  });
}

async function clearPreviousDemoData() {
  await prisma.$transaction(async (tx) => {
    const demoTenant = await tx.tenant.findFirst({
      where: { taxId: demoTenantTaxId, name: { startsWith: "Demo BogApp" } },
      select: { id: true }
    });

    if (demoTenant) {
      await tx.tenant.delete({ where: { id: demoTenant.id } });
    }

    await tx.user.deleteMany({
      where: {
        email: { endsWith: "@demo.bogaap.local" },
        memberships: { none: {} },
        expenseAttachments: { none: {} }
      }
    });
  });
}

async function findJudicialCenterForum(tx, forumTemplateId) {
  return tx.judicialCenterForum.findFirst({
    orderBy: { displayOrder: "asc" },
    where: {
      active: true,
      forumTemplateId,
      judicialCenter: { active: true, code: "ar-tucuman-centro-judicial-capital" }
    },
    select: { id: true }
  });
}

function getRoleId(roleCode, roles) {
  const roleByCode = {
    lawyer: roles.lawyerRole.id,
    owner: roles.ownerRole.id,
    paralegal: roles.paralegalRole.id
  };

  return roleByCode[roleCode];
}

async function createDemoClients(tx, tenantId) {
  await tx.client.createMany({
    data: [
      {
        address: "Av. Sarmiento 1120",
        age: 42,
        dni: "28765432",
        email: "luciana.perez@example.test",
        firstName: "Luciana",
        lastName: "Perez",
        notes: "[DEMO] Cliente simulado para pruebas.",
        phone: "5438155512345",
        status: "active",
        tenantId,
        type: "human"
      },
      {
        address: "25 de Mayo 820",
        age: 36,
        dni: "30999888",
        email: "mariano.gomez@example.test",
        firstName: "Mariano",
        lastName: "Gomez",
        notes: "[DEMO] Cliente simulado para pruebas.",
        phone: "5438155522222",
        status: "active",
        tenantId,
        type: "human"
      },
      {
        address: "Ruta 9 Km 1287",
        businessName: "Servicios del Norte Demo SRL",
        cuit: "30711222334",
        email: "administracion@example.test",
        notes: "[DEMO] Persona juridica simulada para pruebas.",
        phone: "5438155533333",
        status: "active",
        tenantId,
        type: "legal_entity"
      }
    ]
  });

  return tx.client.findMany({
    where: { tenantId },
    select: { businessName: true, firstName: true, id: true, lastName: true, type: true }
  });
}

async function createDemoCases(tx, context) {
  const luciana = context.clients.find((client) => client.firstName === "Luciana");
  const mariano = context.clients.find((client) => client.firstName === "Mariano");
  const empresa = context.clients.find((client) => client.businessName?.startsWith("Servicios"));

  const civilCase = await createCase(tx, {
    caption: "Perez Luciana c/ Gomez Mariano s/ danos y perjuicios",
    caseNumber: "DEMO-EXP-001/2026",
    description:
      "[DEMO] Expediente simulado para pruebas de tablero, participantes, tareas y gastos.",
    filingDate: new Date("2026-07-10T00:00:00.000Z"),
    forumTemplateId: context.forumIds.civil,
    judicialCenterForumId: context.judicialCenterForumIds.civil,
    participants: [
      {
        clientId: luciana.id,
        displayName: "Luciana Perez",
        document: "28765432",
        participantKind: "client",
        phone: "5438155512345",
        role: "claimant"
      },
      {
        displayName: "Mariano Gomez",
        document: "30999888",
        participantKind: "opposing_party",
        phone: "5438155522222",
        role: "defendant"
      }
    ],
    practiceAreaId: context.practiceAreaByName.get("Derecho Civil"),
    primaryClientId: luciana.id,
    provinceId: context.provinceId,
    responsibleMembershipId: context.responsibleMembershipId,
    status: "open",
    subject: "Reclamo por accidente de transito",
    tenantId: context.tenantId
  });

  const laborCase = await createCase(tx, {
    caption: "Gomez Mariano c/ Servicios del Norte Demo SRL s/ despido",
    caseNumber: "DEMO-EXP-002/2026",
    description: "[DEMO] Expediente laboral simulado con vencimientos y pagos pendientes.",
    filingDate: new Date("2026-06-18T00:00:00.000Z"),
    forumTemplateId: context.forumIds.laboral,
    judicialCenterForumId: context.judicialCenterForumIds.laboral,
    participants: [
      {
        clientId: mariano.id,
        displayName: "Mariano Gomez",
        document: "30999888",
        participantKind: "client",
        phone: "5438155522222",
        role: "claimant"
      },
      {
        clientId: empresa.id,
        displayName: "Servicios del Norte Demo SRL",
        document: "71122233",
        participantKind: "opposing_party",
        phone: "5438155533333",
        role: "defendant"
      }
    ],
    practiceAreaId: context.practiceAreaByName.get("Derecho Laboral"),
    primaryClientId: mariano.id,
    provinceId: context.provinceId,
    responsibleMembershipId: context.responsibleMembershipId,
    status: "paused",
    subject: "Despido sin causa",
    tenantId: context.tenantId
  });

  await createCase(tx, {
    caption: "Perez Luciana s/ alimentos",
    caseNumber: "DEMO-EXP-003/2026",
    description: "[DEMO] Expediente de familia simulado.",
    filingDate: new Date("2026-07-22T00:00:00.000Z"),
    forumTemplateId: context.forumIds.familia,
    judicialCenterForumId: context.judicialCenterForumIds.familia,
    participants: [
      {
        clientId: luciana.id,
        displayName: "Luciana Perez",
        document: "28765432",
        participantKind: "client",
        phone: "5438155512345",
        role: "client"
      },
      {
        displayName: "Roberto Salas",
        document: "25666111",
        participantKind: "opposing_party",
        phone: "5438155544444",
        role: "opposing_party"
      }
    ],
    practiceAreaId: context.practiceAreaByName.get("Derecho de Familia"),
    primaryClientId: luciana.id,
    provinceId: context.provinceId,
    responsibleMembershipId: context.responsibleMembershipId,
    status: "open",
    subject: "Cuota alimentaria",
    tenantId: context.tenantId
  });

  await createTasksAndExpenses(tx, context.tenantId, civilCase.id, laborCase.id);
}

async function createCase(tx, input) {
  return tx.case.create({
    data: {
      caption: input.caption,
      caseNumber: input.caseNumber,
      description: input.description,
      filingDate: input.filingDate,
      forumTemplateId: input.forumTemplateId,
      instance: "first",
      judicialCenterForumId: input.judicialCenterForumId,
      practiceAreaId: input.practiceAreaId,
      primaryClientId: input.primaryClientId,
      provinceId: input.provinceId,
      responsibleMembershipId: input.responsibleMembershipId,
      status: input.status,
      subject: input.subject,
      tenantId: input.tenantId,
      participants: {
        create: input.participants.map((participant) => ({
          clientId: participant.clientId,
          displayName: participant.displayName,
          document: participant.document,
          participantKind: participant.participantKind,
          phone: participant.phone,
          role: participant.role
        }))
      }
    },
    select: { id: true }
  });
}

async function createTasksAndExpenses(tx, tenantId, civilCaseId, laborCaseId) {
  const firstTask = await tx.caseTask.create({
    data: {
      caseId: civilCaseId,
      endDate: new Date("2026-08-05T00:00:00.000Z"),
      name: "Preparar demanda inicial",
      notes: "[DEMO] Revisar documentacion respaldatoria.",
      startDate: new Date("2026-07-29T00:00:00.000Z"),
      status: "in_progress",
      tenantId
    },
    select: { id: true }
  });

  await tx.caseTask.createMany({
    data: [
      {
        caseId: civilCaseId,
        endDate: new Date("2026-08-12T00:00:00.000Z"),
        name: "Solicitar informe medico",
        notes: "[DEMO] Tarea simulada.",
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        status: "pending",
        tenantId
      },
      {
        caseId: laborCaseId,
        endDate: new Date("2026-07-31T00:00:00.000Z"),
        name: "Calcular liquidacion laboral",
        notes: "[DEMO] Tarea simulada.",
        startDate: new Date("2026-07-20T00:00:00.000Z"),
        status: "completed",
        tenantId
      }
    ]
  });

  await tx.caseExpense.createMany({
    data: [
      {
        amount: "18500.00",
        caseId: civilCaseId,
        concept: "Tasa judicial",
        currencyCode: "ARS",
        expenseDate: new Date("2026-07-25T00:00:00.000Z"),
        notes: "[DEMO] Gasto simulado.",
        paymentDate: new Date("2026-08-10T00:00:00.000Z"),
        status: "pending",
        taskId: firstTask.id,
        tenantId
      },
      {
        amount: "42000.00",
        caseId: laborCaseId,
        concept: "Pericia contable",
        currencyCode: "ARS",
        expenseDate: new Date("2026-07-12T00:00:00.000Z"),
        notes: "[DEMO] Gasto simulado.",
        paymentDate: new Date("2026-07-19T00:00:00.000Z"),
        status: "paid",
        tenantId
      }
    ]
  });
}

seedDemoData()
  .then(() => {
    console.log("Demo data seed completed.");
    console.log("Login: owner@demo.bogaap.local");
    console.log(`Password: ${demoPassword}`);
  })
  .catch((error) => {
    console.error("Demo data seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
