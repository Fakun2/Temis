const { loadRootEnv } = require("./load-root-env.cjs");

loadRootEnv();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const demoTenantTaxId = "20999999991";
const demoEmailDomain = "@demo.bogaap.local";

async function clearDemoData() {
  await prisma.$transaction(async (tx) => {
    const demoTenant = await tx.tenant.findFirst({
      where: {
        taxId: demoTenantTaxId,
        OR: [{ name: { startsWith: "Demo Temis" } }, { name: { startsWith: "Demo BogApp" } }]
      },
      select: { id: true }
    });

    if (demoTenant) {
      await tx.tenant.delete({ where: { id: demoTenant.id } });
    }

    await tx.user.deleteMany({
      where: {
        email: { endsWith: demoEmailDomain },
        memberships: { none: {} },
        expenseAttachments: { none: {} }
      }
    });
  });
}

clearDemoData()
  .then(() => {
    console.log("Demo data cleared.");
  })
  .catch((error) => {
    console.error("Demo data cleanup failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
