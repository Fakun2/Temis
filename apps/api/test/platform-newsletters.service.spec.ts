import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  newsletterContentSchema,
  newsletterInputSchema
} from "../src/platform/platform-newsletters.schemas";
import { NewslettersService } from "../src/announcements/newsletters.service";
import { PlatformNewslettersService } from "../src/platform/platform-newsletters.service";

describe("newsletter contracts and tenant access", () => {
  it("accepts a styled description and rejects unsupported description nodes", () => {
    const content = {
      version: 2,
      theme: {
        width: "standard",
        fontFamily: "sans",
        backgroundColor: "#ffffff",
        textColor: "#071827",
        accentColor: "#073061"
      },
      blocks: [],
      description: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Novedades",
                marks: [{ type: "textStyle", attrs: { fontSize: "20px" } }]
              }
            ]
          }
        ]
      }
    };
    assert.equal(newsletterContentSchema.safeParse(content).success, true);
    assert.equal(
      newsletterContentSchema.safeParse({
        ...content,
        description: { type: "doc", content: [{ type: "html", text: "<script>" }] }
      }).success,
      false
    );
  });
  it("accepts media placement only in the supported newsletter sections", () => {
    const content = {
      version: 2,
      theme: {
        width: "standard",
        fontFamily: "sans",
        backgroundColor: "#ffffff",
        textColor: "#071827",
        accentColor: "#073061"
      },
      blocks: [
        {
          type: "video",
          provider: "youtube",
          videoId: "abcdefghijk",
          title: "Video",
          width: "full",
          align: "center",
          section: "header"
        }
      ]
    };
    assert.equal(newsletterContentSchema.safeParse(content).success, true);
    assert.equal(
      newsletterContentSchema.safeParse({
        ...content,
        blocks: [{ ...content.blocks[0], section: "outside" }]
      }).success,
      false
    );
    assert.equal(
      newsletterContentSchema.safeParse({
        ...content,
        blocks: [{ ...content.blocks[0], section: undefined }]
      }).success,
      true
    );
  });
  it("allows one media background per header or footer and rejects body backgrounds", () => {
    const video = {
      type: "video",
      provider: "youtube",
      videoId: "abcdefghijk",
      title: "Video",
      width: "full",
      align: "center",
      section: "header",
      background: true
    };
    const content = {
      version: 2,
      theme: {
        width: "standard",
        fontFamily: "sans",
        backgroundColor: "#ffffff",
        textColor: "#071827",
        accentColor: "#073061"
      },
      blocks: [video, { ...video, section: "footer" }]
    };
    assert.equal(newsletterContentSchema.safeParse(content).success, true);
    assert.equal(
      newsletterContentSchema.safeParse({ ...content, blocks: [{ ...video, section: "body" }] })
        .success,
      false
    );
    assert.equal(
      newsletterContentSchema.safeParse({ ...content, blocks: [video, video] }).success,
      false
    );
  });
  it("rejects unsafe links, forged video IDs, unknown blocks and oversized datasets", () => {
    const doc = (block: unknown) => ({ version: 1, blocks: [block] });
    assert.equal(
      newsletterContentSchema.safeParse(
        doc({ type: "cta", label: "Abrir", url: "javascript:alert(1)" })
      ).success,
      false
    );
    assert.equal(
      newsletterContentSchema.safeParse(doc({ type: "cta", label: "Abrir", url: "//evil.test" }))
        .success,
      false
    );
    assert.equal(
      newsletterContentSchema.safeParse(
        doc({ type: "video", provider: "youtube", videoId: "../../bad", title: "Video" })
      ).success,
      false
    );
    assert.equal(
      newsletterContentSchema.safeParse(doc({ type: "html", html: "<script/>" })).success,
      false
    );
    assert.equal(
      newsletterContentSchema.safeParse(
        doc({
          type: "chart",
          title: "Datos",
          chartType: "bar",
          data: Array.from({ length: 31 }, () => ({ label: "A", value: 1 }))
        })
      ).success,
      false
    );
    assert.equal(
      newsletterContentSchema.safeParse(
        doc({ type: "video", provider: "youtube", videoId: "abcdefghijk", title: "Video" })
      ).success,
      true
    );
  });
  it("requires selected tenants and valid dates", () => {
    assert.equal(
      newsletterInputSchema.safeParse({
        title: "Título",
        excerpt: "Resumen",
        newsletterCategory: "release",
        audience: "selected_tenants",
        targetTenantIds: [],
        startsAt: null,
        endsAt: null,
        content: { version: 1, blocks: [] }
      }).success,
      false
    );
  });
  it("counts reads per user and revision with audience and time filters", async () => {
    let query: unknown;
    const service = new NewslettersService(
      {
        platformAnnouncement: {
          findMany: async (args: unknown) => {
            query = args;
            return [
              { id: "old", revision: 2, reads: [{ revision: 1 }] },
              { id: "new", revision: 1, reads: [{ revision: 1 }] }
            ];
          }
        }
      } as never,
      {} as never
    );
    assert.deepEqual(await service.summary("tenant-a", "user-a"), {
      unreadCount: 1,
      oldestUnreadId: "old",
      latestId: "new"
    });
    const serialized = JSON.stringify(query);
    assert.match(serialized, /tenant-a/);
    assert.match(serialized, /user-a/);
    assert.match(serialized, /published/);
    assert.match(serialized, /newsletter/);
  });
  it("does not register reads for a publication outside the active tenant", async () => {
    let written = false;
    const service = new NewslettersService(
      {
        platformAnnouncement: { findFirst: async () => null },
        platformAnnouncementRead: {
          upsert: async () => {
            written = true;
          }
        }
      } as never,
      {} as never
    );
    await assert.rejects(service.read("tenant-b", "user", "announcement"), /no está disponible/);
    assert.equal(written, false);
  });
  it("records reading idempotently for the visible revision", async () => {
    let input: unknown;
    const service = new NewslettersService(
      {
        platformAnnouncement: { findFirst: async () => ({ id: "announcement", revision: 3 }) },
        platformAnnouncementRead: {
          upsert: async (value: unknown) => {
            input = value;
          }
        }
      } as never,
      {} as never
    );
    await service.read("tenant-a", "user-a", "announcement");
    assert.deepEqual((input as { where: unknown }).where, {
      announcementId_userId_revision: {
        announcementId: "announcement",
        userId: "user-a",
        revision: 3
      }
    });
  });
  it("rejects an image whose declared MIME does not match its actual bytes", async () => {
    const service = new PlatformNewslettersService({} as never, {} as never);
    service.detail = async () => ({ status: "draft" }) as never;
    await assert.rejects(
      service.upload("draft", "actor", {
        buffer: Buffer.from("not a png"),
        size: 9,
        mimetype: "image/png"
      }),
      /imagen está dañada/
    );
  });
  it("does not edit an already published newsletter", async () => {
    const service = new PlatformNewslettersService({} as never, {} as never);
    service.detail = async () => ({ status: "published" }) as never;
    await assert.rejects(
      service.update("id", "actor", {} as never),
      /Solo se pueden editar borradores/
    );
  });
  it("does not serve an image that is not referenced by the visible publication", async () => {
    let accessed = false;
    const service = new NewslettersService(
      {
        platformAnnouncementAsset: {
          findUnique: async () => ({
            announcementId: "id",
            storageKey: "private",
            mimeType: "image/png"
          })
        },
        platformAnnouncement: { findFirst: async () => ({ content: { version: 1, blocks: [] } }) }
      } as never,
      {
        getObject: async () => {
          accessed = true;
        }
      } as never
    );
    await assert.rejects(service.asset("tenant", "image"), /no está disponible/);
    assert.equal(accessed, false);
  });
});
