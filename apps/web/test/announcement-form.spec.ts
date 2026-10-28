import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  announcementFormSchema,
  createAnnouncementDraft,
  toAnnouncementInput
} from "../app/superadmin/(console)/announcements/_utils/announcement-form";

describe("announcement form policy", () => {
  it("keeps frontend date and link validation aligned with the API contract", () => {
    const parsed = announcementFormSchema.safeParse({
      ...createAnnouncementDraft("incident"),
      body: "Ventana operativa",
      deliveryMode: "draft",
      linkLabel: "Ver detalle",
      linkUrl: "http://insecure.example",
      title: "Mantenimiento"
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) assert.match(parsed.error.issues[0]?.message ?? "", /HTTPS/i);
  });

  it("maps selected tenants without leaking UI-only fields", () => {
    const draft = {
      ...createAnnouncementDraft("general"),
      audience: "selected_tenants" as const,
      body: "Mensaje",
      title: "Aviso"
    };
    const input = toAnnouncementInput(draft, [
      { id: "00000000-0000-0000-0000-000000000001", name: "Estudio", status: "active" }
    ]);

    assert.deepEqual(input.targetTenantIds, ["00000000-0000-0000-0000-000000000001"]);
    assert.equal("deliveryMode" in input, false);
  });
});
