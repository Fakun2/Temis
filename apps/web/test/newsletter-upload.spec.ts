import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { uploadNewsletterAssetWithProgress } from "../app/superadmin/(console)/newsletters/_api/newsletters.api";

const original = Object.getOwnPropertyDescriptor(globalThis, "XMLHttpRequest");
afterEach(() => {
  if (original) Object.defineProperty(globalThis, "XMLHttpRequest", original);
  else Reflect.deleteProperty(globalThis, "XMLHttpRequest");
});

describe("newsletter upload", () => {
  it("reports upload progress and returns the asset after server confirmation", async () => {
    class FakeRequest {
      upload: {
        onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void;
      } = {};
      onload?: () => void;
      status = 201;
      responseText = JSON.stringify({ id: "asset-1" });
      open() {}
      send() {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "XMLHttpRequest", { configurable: true, value: FakeRequest });
    const progress: number[] = [];
    const result = await uploadNewsletterAssetWithProgress(
      "draft",
      new File(["data"], "image.png", { type: "image/png" }),
      (value) => progress.push(value)
    );
    assert.deepEqual(progress, [99]);
    assert.equal(result.id, "asset-1");
  });
  it("surfaces server errors instead of reporting success", async () => {
    class FakeRequest {
      upload = {};
      onload?: () => void;
      status = 400;
      responseText = JSON.stringify({ message: "Archivo inválido" });
      open() {}
      send() {
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "XMLHttpRequest", { configurable: true, value: FakeRequest });
    await assert.rejects(
      uploadNewsletterAssetWithProgress("draft", new File(["data"], "bad.png"), () => {}),
      /Archivo inválido/
    );
  });
});
