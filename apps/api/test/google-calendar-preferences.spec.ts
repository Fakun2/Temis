import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { googleCalendarSyncPreferencesSchema } from "../src/integrations/google-calendar.schemas";

describe("Google Calendar sync preferences", () => {
  it("accepts global synchronization without custom sources", () => {
    assert.deepEqual(googleCalendarSyncPreferencesSchema.parse({ syncMode: "global" }), {
      syncMode: "global",
      syncSources: []
    });
  });

  it("requires at least one source in custom mode", () => {
    const result = googleCalendarSyncPreferencesSchema.safeParse({ syncMode: "custom", syncSources: [] });
    assert.equal(result.success, false);
  });

  it("accepts multiple custom sources", () => {
    const result = googleCalendarSyncPreferencesSchema.parse({
      syncMode: "custom",
      syncSources: ["my_tasks", "participating_hearings"]
    });
    assert.deepEqual(result.syncSources, ["my_tasks", "participating_hearings"]);
  });
});
