import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PlatformObservabilityHistory } from "../app/superadmin/(console)/_api/platform.api";
import { ObservabilityHistoryTable } from "../app/superadmin/(console)/observability/_components/observability-history-table";
import { ObservabilityOverview } from "../app/superadmin/(console)/observability/_components/observability-overview";

const statuses = ["healthy", "degraded", "unavailable", "no_data"] as const;
const components = ["api", "postgresql", "redis", "rabbitmq", "worker"] as const;
const names = ["API", "PostgreSQL", "Redis", "RabbitMQ", "Worker"];

describe("ObservabilityHistoryTable", () => {
  it("renders 30 accessible daily cells for each of the five components", () => {
    const html = renderToStaticMarkup(
      createElement(ObservabilityHistoryTable, {
        history: historyFixture(),
        isError: false,
        isLoading: false,
        onRetry: () => undefined
      })
    );

    assert.equal((html.match(/<button/g) ?? []).length, 150);
    assert.match(html, /Operativo/);
    assert.match(html, /Degradado/);
    assert.match(html, /No disponible/);
    assert.match(html, /Sin datos/);
    assert.match(html, /99\.5% uptime/);
    assert.match(html, /overflow-x-auto/);
  });

  it("renders loading and error states independently", () => {
    const loading = renderToStaticMarkup(
      createElement(ObservabilityHistoryTable, {
        isError: false,
        isLoading: true,
        onRetry: () => undefined
      })
    );
    const error = renderToStaticMarkup(
      createElement(ObservabilityHistoryTable, {
        isError: true,
        isLoading: false,
        onRetry: () => undefined
      })
    );

    assert.match(loading, /Cargando historial/);
    assert.match(error, /El estado en vivo sigue disponible/);
    assert.match(error, /Reintentar/);
  });

  it("explains an empty history without inventing availability", () => {
    const history = historyFixture();
    history.components.forEach((component) => {
      component.uptimePercent = null;
      component.days.forEach((day) => {
        day.samples = 0;
        day.status = "no_data";
        day.uptimePercent = null;
      });
    });
    const html = renderToStaticMarkup(
      createElement(ObservabilityHistoryTable, {
        history,
        isError: false,
        isLoading: false,
        onRetry: () => undefined
      })
    );

    assert.match(html, /Todavía no hay muestras históricas/);
    assert.doesNotMatch(html, /100% uptime/);
  });
});

describe("ObservabilityOverview metric grid", () => {
  it("renders the nine metric cards with one height and one desktop column span", () => {
    const html = renderToStaticMarkup(
      createElement(ObservabilityOverview, {
        historyError: false,
        historyLoading: false,
        onRetryHistory: () => undefined,
        summary: {
          checks: [],
          generatedAt: "2026-10-23T12:00:00.000Z",
          outbox: { failed: 0, oldestPendingAt: null, pending: 0 },
          requests: {
            averageLatencyMs: 509,
            clientErrorRate: 0,
            errorRate: 7.69,
            p95LatencyMs: 3831,
            servedRate: 92.31,
            total: 13,
            windowMinutes: 15
          },
          status: "healthy"
        }
      })
    );

    assert.equal((html.match(/h-\[94px\]/g) ?? []).length, 9);
    assert.equal((html.match(/xl:col-span-2/g) ?? []).length, 9);
    assert.equal((html.match(/xl:grid-cols-10/g) ?? []).length, 2);
  });
});

function historyFixture(): PlatformObservabilityHistory {
  return {
    components: components.map((key, componentIndex) => ({
      currentLatencyMs: componentIndex,
      currentStatus: statuses[componentIndex % statuses.length]!,
      days: Array.from({ length: 30 }, (_, dayIndex) => ({
        date: new Date(Date.UTC(2026, 8, 23 + dayIndex)).toISOString().slice(0, 10),
        samples: dayIndex % 4 === 3 ? 0 : 288,
        status: statuses[dayIndex % statuses.length]!,
        uptimePercent: dayIndex % 4 === 3 ? null : 100
      })),
      key,
      name: names[componentIndex]!,
      uptimePercent: 99.5
    })),
    days: 30,
    from: "2026-09-23",
    generatedAt: "2026-10-22T12:00:00.000Z",
    timeZone: "America/Argentina/Buenos_Aires",
    to: "2026-10-22"
  };
}
