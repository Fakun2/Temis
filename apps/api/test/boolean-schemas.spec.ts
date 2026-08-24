import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listDocumentCategoriesQuerySchema } from "../src/cases/cases.schemas";
import { listCategoriesQuerySchema } from "../src/categories/categories.schemas";
import { listCurrenciesQuerySchema } from "../src/currencies/currencies.schemas";
import { listForumsQuerySchema } from "../src/forums/forums.schemas";
import {
  listNotificationsQuerySchema,
  notificationSettingsSchema
} from "../src/notifications/notifications.schemas";

describe("boolean input schemas", () => {
  it("parses false-like notification query strings as false", () => {
    assert.equal(listNotificationsQuerySchema.parse({ unreadOnly: "false" }).unreadOnly, false);
    assert.equal(listNotificationsQuerySchema.parse({ unreadOnly: "0" }).unreadOnly, false);
    assert.equal(listNotificationsQuerySchema.parse({ unreadOnly: "no" }).unreadOnly, false);
    assert.equal(listNotificationsQuerySchema.parse({ unreadOnly: "off" }).unreadOnly, false);
  });

  it("uses defaults for omitted boolean inputs", () => {
    assert.equal(listNotificationsQuerySchema.parse({}).unreadOnly, true);
    assert.equal(notificationSettingsSchema.parse({}).notificationEnabled, false);
    assert.equal(listForumsQuerySchema.parse({}).includeInactive, false);
  });

  it("parses optional boolean query filters explicitly", () => {
    assert.equal(listCategoriesQuerySchema.parse({ active: "false" }).active, false);
    assert.equal(listCurrenciesQuerySchema.parse({ active: "0" }).active, false);
    assert.equal(listDocumentCategoriesQuerySchema.parse({ active: "no" }).active, false);
  });

  it("does not require notification dates when notificationEnabled is a false-like string", () => {
    const parsed = notificationSettingsSchema.parse({
      notificationEnabled: "false",
      notificationRecipientMode: "self"
    });

    assert.equal(parsed.notificationEnabled, false);
  });

  it("rejects invalid notification date strings before persistence", () => {
    assert.equal(
      notificationSettingsSchema.safeParse({
        notificationDate: "hola",
        notificationEnabled: true,
        notificationRecipientMode: "self",
        notificationTime: "09:30"
      }).success,
      false
    );
    assert.equal(
      notificationSettingsSchema.safeParse({
        notificationDate: "2026-02-31",
        notificationEnabled: true,
        notificationRecipientMode: "self",
        notificationTime: "09:30"
      }).success,
      false
    );
  });

  it("rejects ambiguous boolean strings", () => {
    assert.equal(listNotificationsQuerySchema.safeParse({ unreadOnly: "sometimes" }).success, false);
    assert.equal(listCategoriesQuerySchema.safeParse({ active: "maybe" }).success, false);
  });
});
