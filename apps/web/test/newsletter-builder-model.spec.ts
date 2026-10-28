import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearSectionBackgrounds,
  isNewsletterCanvasEmpty,
  migrateContent,
  moveNewsletterBlock,
  newBlock,
  validateDraft,
  type Draft
} from "../app/superadmin/(console)/newsletters/_lib/newsletter-builder-model";

describe("newsletter builder model", () => {
  it("converts v1 blocks without changing their contents", () => {
    const content = migrateContent({
      version: 1,
      blocks: [
        { type: "paragraph", text: "Novedades" },
        { type: "list", items: ["Primero", "Segundo"] }
      ]
    });
    assert.equal(content.version, 2);
    assert.equal(content.blocks[0]?.type, "richText");
    assert.match(JSON.stringify(content.blocks), /Novedades/);
    assert.match(JSON.stringify(content.blocks), /Segundo/);
  });
  it("reorders blocks without mutating the original and ignores out-of-range moves", () => {
    const blocks = [newBlock("separator"), newBlock("video")];
    const moved = moveNewsletterBlock(blocks, 0, 1);
    assert.equal(moved[0]?.type, "video");
    assert.equal(blocks[0]?.type, "separator");
    assert.equal(moveNewsletterBlock(blocks, 0, -1), blocks);
  });
  it("validates required draft fields and the excerpt length", () => {
    const draft: Draft = {
      title: "Versión",
      excerpt: "Resumen",
      newsletterCategory: "release",
      audience: "all_tenants",
      targetTenantIds: [],
      startsAt: "",
      endsAt: "",
      content: migrateContent(null)
    };
    assert.equal(validateDraft(draft), null);
    assert.match(validateDraft({ ...draft, excerpt: "" }) ?? "", /título, resumen/);
    assert.match(validateDraft({ ...draft, excerpt: "x".repeat(501) }) ?? "", /500/);
  });
  it("recognizes an empty canvas and preserves real content", () => {
    const item = {
      id: "1",
      title: "Newsletter sin título",
      excerpt: "",
      newsletterCategory: null,
      audience: "all_tenants" as const,
      status: "draft" as const,
      startsAt: null,
      endsAt: null,
      revision: 1,
      content: migrateContent(null)
    };
    assert.equal(isNewsletterCanvasEmpty(item), true);
    assert.equal(isNewsletterCanvasEmpty({ ...item, title: "Novedades", content: null }), true);
    assert.equal(isNewsletterCanvasEmpty({ ...item, title: "Novedades" }), false);
    assert.equal(
      isNewsletterCanvasEmpty({
        ...item,
        content: migrateContent({ version: 1, blocks: [{ type: "paragraph", text: "Hola" }] })
      }),
      false
    );
  });
  it("keeps only one background per section without mutating blocks", () => {
    const original = [
      { ...newBlock("image"), section: "header", background: true }
    ] as import("../components/newsletter/newsletter-types").NewsletterBlockV2[];
    const incoming = {
      ...newBlock("image"),
      section: "header",
      background: true
    } as import("../components/newsletter/newsletter-types").NewsletterBlockV2;
    const updated = clearSectionBackgrounds(original, incoming);
    assert.equal("background" in updated[0]! && updated[0].background, false);
    assert.equal("background" in original[0]! && original[0].background, true);
  });
});
