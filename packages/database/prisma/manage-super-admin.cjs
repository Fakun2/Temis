const { PrismaClient } = require("@prisma/client");
const { compare, hash } = require("bcryptjs");
const { createHash, randomBytes } = require("node:crypto");
const readline = require("node:readline");
const { z } = require("zod");

let mode = process.argv[2];

const prisma = new PrismaClient();

const emailSchema = z.string().trim().toLowerCase().email("Email invalido.");
const fullNameSchema = z.string().trim().min(2, "Nombre invalido.");
const passwordSchema = z
  .string()
  .min(16, "La contraseña debe tener al menos 16 caracteres.")
  .max(72, "La contraseña no puede superar 72 caracteres.")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.");

function question(prompt, { hidden = false, trim = true } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });
    if (hidden) {
      rl._writeToOutput = () => rl.output.write("*");
    }
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(trim ? answer.trim() : answer);
    });
  });
}

async function main() {
  if (!mode) {
    mode = (
      await question(
        "Operación (provision/verify-password/revoke/bootstrap-security/recover-device/revoke-sessions/revoke-device/readiness): "
      )
    ).toLowerCase();
  }
  if (
    ![
      "provision",
      "verify-password",
      "revoke",
      "bootstrap-security",
      "recover-device",
      "revoke-sessions",
      "revoke-device",
      "readiness"
    ].includes(mode)
  ) {
    throw new Error("Operación inválida. Usá provision o revoke.");
  }

  await assertPlatformSchemaIsAvailable();
  if (mode === "readiness") {
    const assignments = await prisma.platformRoleAssignment.findMany({
      where: { status: "active" },
      include: {
        user: {
          include: {
            platformAuthenticators: { where: { status: "active" } },
            platformDevices: { where: { status: "active" } }
          }
        }
      }
    });
    let ready = true;
    for (const assignment of assignments) {
      const authenticators = assignment.user.platformAuthenticators.length;
      const compliantDevices = assignment.user.platformDevices.filter(
        (device) => device.lastCompliantAt
      ).length;
      const userReady = authenticators >= 2 && compliantDevices >= 1;
      ready &&= userReady;
      console.log(
        `${assignment.user.email}: ${userReady ? "READY" : "NOT READY"} (${authenticators} llaves, ${compliantDevices} dispositivos conformes)`
      );
    }
    if (!ready || assignments.length === 0) process.exitCode = 2;
    return;
  }
  const email = parseOrThrow(emailSchema, await question("Email: "));

  if (mode === "verify-password") {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        _count: { select: { memberships: true } },
        passwordHash: true,
        platformRoleAssignment: { select: { status: true } },
        status: true
      }
    });
    if (!user || user.status !== "active" || user.platformRoleAssignment?.status !== "active") {
      throw new Error("No existe una cuenta Super Admin activa con ese email.");
    }
    if (!user.passwordHash) throw new Error("La cuenta no tiene una contraseña configurada.");
    if (user._count.memberships > 0) {
      throw new Error("La cuenta tiene membresías tenant y el login de plataforma la rechazará.");
    }
    const password = await question("Contraseña: ", { hidden: true, trim: false });
    const matches = await compare(password, user.passwordHash);
    console.log(matches ? "Contraseña válida para el login de Super Admin." : "La contraseña no coincide.");
    if (!matches) process.exitCode = 2;
    return;
  }

  if (["bootstrap-security", "recover-device", "revoke-sessions", "revoke-device"].includes(mode)) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { platformRoleAssignment: true }
    });
    if (!user || user.platformRoleAssignment?.status !== "active") {
      throw new Error("No existe una cuenta Super Admin activa con ese email.");
    }

    if (mode === "revoke-sessions") {
      const result = await prisma.platformSession.updateMany({
        where: { userId: user.id, status: "active" },
        data: { revokedAt: new Date(), status: "revoked" }
      });
      console.log(`${result.count} sesiones revocadas para ${email}.`);
      return;
    }

    if (mode === "revoke-device") {
      const devices = await prisma.platformDevice.findMany({
        where: { userId: user.id, status: "active" },
        select: { id: true, name: true }
      });
      devices.forEach((device) => console.log(`${device.id}  ${device.name}`));
      const deviceId = await question("ID del dispositivo a revocar: ");
      if (!devices.some((device) => device.id === deviceId))
        throw new Error("Dispositivo inválido.");
      await prisma.$transaction([
        prisma.platformDevice.update({
          where: { id: deviceId },
          data: { revokedAt: new Date(), status: "revoked" }
        }),
        prisma.platformSession.updateMany({
          where: { deviceId, status: "active" },
          data: { revokedAt: new Date(), status: "revoked" }
        })
      ]);
      console.log(`Dispositivo ${deviceId} y sus sesiones fueron revocados.`);
      return;
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await prisma.$transaction(async (tx) => {
      await tx.platformBootstrapToken.deleteMany({ where: { userId: user.id, consumedAt: null } });
      if (mode === "recover-device") {
        const now = new Date();
        await tx.platformSession.updateMany({
          where: { userId: user.id, status: "active" },
          data: { revokedAt: now, status: "revoked" }
        });
        await tx.platformDevice.updateMany({
          where: { userId: user.id, status: "active" },
          data: { revokedAt: now, status: "revoked" }
        });
        await tx.platformAuthenticator.updateMany({
          where: { userId: user.id, status: { in: ["active", "pending"] } },
          data: { revokedAt: now, status: "revoked" }
        });
        await tx.user.update({
          where: { id: user.id },
          data: { sessionVersion: { increment: 1 } }
        });
      }
      await tx.platformBootstrapToken.create({ data: { expiresAt, tokenHash, userId: user.id } });
      await tx.platformSecurityEvent.create({
        data: { eventType: mode, outcome: "success", reason: "vps_cli", userId: user.id }
      });
    });
    console.log(`Token de un solo uso (vence ${expiresAt.toISOString()}): ${rawToken}`);
    console.log(
      "Abrí /superadmin/enroll desde el equipo administrado. El token no volverá a mostrarse."
    );
    return;
  }

  if (mode === "revoke") {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (!user) throw new Error("No existe una cuenta con ese email.");
      const assignment = await tx.platformRoleAssignment.findUnique({ where: { userId: user.id } });
      if (!assignment || assignment.status !== "active")
        throw new Error("La cuenta no es Super Admin activa.");
      await tx.platformRoleAssignment.update({
        where: { userId: user.id },
        data: { status: "revoked", revokedAt: new Date() }
      });
      await tx.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
      return user;
    });
    console.log(`Super Admin revocado para ${email} (${result.id}).`);
    return;
  }

  const fullName = parseOrThrow(fullNameSchema, await question("Nombre completo: "));
  const password = parseOrThrow(
    passwordSchema,
    await question("Contraseña: ", { hidden: true, trim: false })
  );
  const passwordConfirmation = await question("Repetir contraseña: ", { hidden: true, trim: false });
  if (password !== passwordConfirmation) throw new Error("Las contraseñas no coinciden.");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
      select: { id: true, status: true }
    });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            fullName,
            passwordHash: await hash(password, 12),
            sessionVersion: { increment: 1 },
            status: "active"
          }
        })
      : await tx.user.create({
          data: { email, fullName, passwordHash: await hash(password, 12), status: "active" }
        });
    const memberships = await tx.tenantMembership.count({ where: { userId: user.id } });
    if (memberships > 0)
      throw new Error("La cuenta ya pertenece a uno o mas estudios y no puede ser Super Admin.");
    await tx.platformRoleAssignment.upsert({
      where: { userId: user.id },
      update: {
        provisionedAt: new Date(),
        revokedAt: null,
        roleCode: "super_admin",
        status: "active"
      },
      create: { userId: user.id, roleCode: "super_admin", status: "active" }
    });
    await tx.passwordResetCode.updateMany({
      where: { userId: user.id, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() }
    });
    return user;
  });
  console.log(`Super Admin aprovisionado para ${email} (${result.id}).`);
}

async function assertPlatformSchemaIsAvailable() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT to_regclass('public.platform_role_assignments')::text AS table_name
    `;
    if (!rows[0]?.table_name) {
      throw new Error(
        "Falta aplicar la migración de Super Admin. Ejecutá npm run db:prepare antes de aprovisionar cuentas."
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Falta aplicar")) throw error;
    throw new Error(
      "No se pudo verificar el esquema de base de datos. Confirmá que la base esté disponible y migrada."
    );
  }
}

function parseOrThrow(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Valor invalido.");
  return parsed.data;
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "No se pudo administrar el Super Admin."
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
