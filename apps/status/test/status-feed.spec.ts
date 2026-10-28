import assert from "node:assert/strict";
import test from "node:test";
import { createUnknownSnapshot, parseOpenStatusFeed, worstStatus } from "../lib/status-feed";

const now = new Date("2026-10-24T15:00:00.000Z");

test("maps OpenStatus components, incidents and maintenance into the public contract", () => {
  const snapshot = parseOpenStatusFeed(
    {
      updatedAt: "2026-10-24T14:59:00.000Z",
      pageComponents: [
        {
          id: "web",
          name: "Aplicación web",
          status: "operational",
          uptimePercent: 99.98,
          days: [{ date: "2026-10-24", status: "operational", uptime: 100 }]
        },
        { id: "api", name: "API", status: "degraded_performance", uptime: 0.995 },
        { id: "internal-db", name: "PostgreSQL", status: "major_outage" }
      ],
      statusReports: [
        {
          id: "incident-1",
          title: "Demoras en la API",
          impact: "partial_outage",
          pageComponents: [{ id: "api", name: "API" }],
          updates: [
            {
              id: "u1",
              status: "investigating",
              message: "Estamos investigando.",
              date: "2026-10-24T14:00:00Z"
            },
            {
              id: "u2",
              status: "monitoring",
              message: "Aplicamos una mitigación.",
              date: "2026-10-24T14:30:00Z"
            }
          ]
        }
      ],
      maintenances: [
        {
          id: "maintenance-1",
          title: "Actualización programada",
          description: "Ventana de mantenimiento.",
          startsAt: "2026-10-25T03:00:00Z",
          endsAt: "2026-10-25T04:00:00Z",
          pageComponents: [{ id: "web", name: "Aplicación web" }]
        }
      ]
    },
    now
  );

  assert.equal(snapshot.components.length, 5);
  assert.equal(snapshot.components[0]?.name, "Aplicación web");
  assert.equal(snapshot.components[0]?.uptimePercent, 99.98);
  assert.equal(snapshot.components[1]?.status, "degraded");
  assert.equal(snapshot.components[2]?.status, "unknown");
  assert.equal(
    snapshot.components.some((component) => component.name === "PostgreSQL"),
    false
  );
  assert.equal(snapshot.overallStatus, "partial_outage");
  assert.equal(snapshot.incidents[0]?.status, "monitoring");
  assert.deepEqual(snapshot.incidents[0]?.componentNames, ["API"]);
  assert.equal(snapshot.maintenances[0]?.title, "Actualización programada");
  assert.equal(snapshot.generatedAt, "2026-10-24T14:59:00.000Z");
});

test("resolved reports do not degrade the current global status", () => {
  const snapshot = parseOpenStatusFeed(
    {
      pageComponents: [
        { id: "web", name: "Aplicación web", status: "operational" },
        { id: "api", name: "API", status: "operational" },
        { id: "auth", name: "Inicio de sesión", status: "operational" },
        { id: "docs", name: "Documentos", status: "operational" },
        { id: "async", name: "Notificaciones e integraciones", status: "operational" }
      ],
      statusReports: [
        {
          id: "resolved",
          title: "Incidente resuelto",
          impact: "major_outage",
          updates: [{ status: "resolved", message: "Resuelto.", date: "2026-10-24T13:00:00Z" }]
        }
      ]
    },
    now
  );

  assert.equal(snapshot.overallStatus, "operational");
  assert.equal(snapshot.incidents[0]?.resolvedAt, "2026-10-24T13:00:00.000Z");
});

test("rejects a malformed feed instead of reporting an operational state", () => {
  assert.throws(() => parseOpenStatusFeed([], now));
  assert.throws(() => parseOpenStatusFeed({ pageComponents: "not-an-array" }, now));
});

test("creates an explicit unknown snapshot when no feed is configured", () => {
  const snapshot = createUnknownSnapshot(now);
  assert.equal(snapshot.overallStatus, "unknown");
  assert.equal(snapshot.components.length, 5);
  assert.equal(
    snapshot.components.every((component) => component.status === "unknown"),
    true
  );
});

test("global status always uses the most severe active state", () => {
  assert.equal(worstStatus(["operational", "maintenance", "degraded"]), "degraded");
  assert.equal(worstStatus(["degraded", "partial_outage", "major_outage"]), "major_outage");
  assert.equal(worstStatus([]), "unknown");
});
