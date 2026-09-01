require("ts-node").register({
  compilerOptions: {
    module: "CommonJS"
  }
});

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  buildHeatmapItems,
  normalizeDailyUsage
} = require("../app/admin/(workspace)/account/_components/ai-usage/utils.ts");

describe("ai usage heatmap utils", () => {
  it("keeps daily token usage without aggregation", () => {
    const items = buildHeatmapItems(
      normalizeDailyUsage([makeUsageDay("2026-01-01", 100, 50), makeUsageDay("2026-01-02", 0, 0)]),
      "daily"
    );

    assert.equal(items[0]?.totalTokens, 150);
    assert.equal(items[1]?.totalTokens, 0);
  });

  it("builds weekly month-based stair steps from the bottom rows", () => {
    const items = buildHeatmapItems(normalizeDailyUsage(makeJanuaryUsage()), "weekly");
    const firstUsageWeek = items.filter((item) => item.groupKey === "2026-01-04");
    const secondUsageWeek = items.filter((item) => item.groupKey === "2026-01-11");

    assert.equal(firstUsageWeek.filter((item) => item.isPainted).length, 2);
    assert.deepEqual(
      firstUsageWeek.filter((item) => item.isPainted).map((item) => item.key),
      ["2026-01-09", "2026-01-10"]
    );
    assert.equal(secondUsageWeek.filter((item) => item.isPainted).length, 6);
  });

  it("builds accumulated annual stair steps from weekly running totals", () => {
    const items = buildHeatmapItems(normalizeDailyUsage(makeJanuaryUsage()), "accumulated");
    const firstUsageWeek = items.filter((item) => item.groupKey === "2026-01-04");
    const secondUsageWeek = items.filter((item) => item.groupKey === "2026-01-11");

    assert.equal(firstUsageWeek.filter((item) => item.isPainted).length, 2);
    assert.equal(secondUsageWeek.filter((item) => item.isPainted).length, 7);
  });
});

function makeJanuaryUsage() {
  const days = [];

  for (let day = 1; day <= 17; day += 1) {
    const date = `2026-01-${String(day).padStart(2, "0")}`;
    const totalTokens = date === "2026-01-04" ? 25 : date === "2026-01-11" ? 75 : 0;
    days.push(makeUsageDay(date, totalTokens, 0));
  }

  return days;
}

function makeUsageDay(date, inputTokens, outputTokens) {
  return {
    date,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}
