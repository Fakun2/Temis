import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TemisFooter } from "@temis/brand-ui";
import { IncidentCard } from "../components/incident-card";
import type { StatusIncident } from "../lib/status.types";

test("shared footer links the product and public status site", () => {
  const html = renderToStaticMarkup(
    createElement(TemisFooter, { mainSiteUrl: "https://temis.ar" })
  );
  assert.match(html, /https:\/\/status\.temis\.ar/);
  assert.match(html, /Estado del servicio/);
  assert.match(html, /https:\/\/temis\.ar/);
});

test("incident cards expose a stable detail route and affected services", () => {
  const incident: StatusIncident = {
    componentIds: ["api"],
    componentNames: ["API"],
    id: "incident 123",
    impact: "degraded",
    resolvedAt: null,
    startedAt: "2026-10-24T12:00:00Z",
    status: "investigating",
    title: "Demoras en la API",
    updatedAt: "2026-10-24T12:05:00Z",
    updates: [
      {
        id: "u1",
        message: "Estamos investigando.",
        publishedAt: "2026-10-24T12:05:00Z",
        status: "investigating"
      }
    ]
  };
  const html = renderToStaticMarkup(createElement(IncidentCard, { incident }));
  assert.match(html, /\/incidentes\/incident%20123/);
  assert.match(html, /Servicios afectados/);
  assert.match(html, /Investigando/);
});
