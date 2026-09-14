import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { GoogleCalendarTokenService } from "../src/integrations/google-calendar-token.service";

const previousKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;

describe("GoogleCalendarTokenService", () => {
  afterEach(() => {
    if (previousKey === undefined) delete process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
    else process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = previousKey;
  });

  it("encrypts and decrypts tokens with the dedicated key", () => {
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = "test-google-calendar-secret";
    const service = new GoogleCalendarTokenService();
    const encrypted = service.encrypt("refresh-token-value");

    assert.notEqual(encrypted, "refresh-token-value");
    assert.equal(service.decrypt(encrypted), "refresh-token-value");
  });

  it("rejects malformed encrypted values", () => {
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = "test-google-calendar-secret";
    const service = new GoogleCalendarTokenService();

    assert.throws(() => service.decrypt("not-a-token"));
  });
});
