import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasAnnouncementFilters,
  parseAnnouncementQuery
} from "../app/superadmin/(console)/announcements/_utils/announcement-query";

describe("announcement query state", () => {
  it("parses filters and the current cursor from the URL", () => {
    const parsed = parseAnnouncementQuery({
      activity: "active",
      category: "incident",
      cursorStack: "first,second",
      search: "  corte  ",
      severity: "critical"
    });
    assert.deepEqual(parsed.cursorStack, ["first", "second"]);
    assert.equal(parsed.query.cursor, "second");
    assert.equal(parsed.query.search, "corte");
    assert.equal(parsed.query.activity, "active");
    assert.equal(hasAnnouncementFilters(parsed.query), true);
  });

  it("drops unsupported filter values", () => {
    const parsed = parseAnnouncementQuery({
      activity: "future",
      category: "other",
      status: "deleted"
    });
    assert.equal(parsed.query.activity, undefined);
    assert.equal(parsed.query.category, undefined);
    assert.equal(parsed.query.status, undefined);
    assert.equal(hasAnnouncementFilters(parsed.query), false);
  });
});
