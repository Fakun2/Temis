import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { validateNewsletterImage } from "../src/platform/platform-newsletter-assets";

async function animatedGif(frames: number) {
  const width = 32;
  const height = 200;
  const pixels = Buffer.alloc(width * height * frames * 4);
  for (let frame = 0; frame < frames; frame++) {
    for (let pixel = 0; pixel < width * height; pixel++) {
      const offset = (frame * width * height + pixel) * 4;
      pixels[offset] = frame % 2 === 0 ? 0 : 255;
      pixels[offset + 1] = 100;
      pixels[offset + 2] = 200;
      pixels[offset + 3] = 255;
    }
  }
  return sharp(pixels, { raw: { width, height: height * frames, channels: 4, pageHeight: height } })
    .gif({ delay: Array(frames).fill(40), loop: 0 })
    .toBuffer();
}

describe("newsletter image validation", () => {
  it("accepts a 24-frame GIF when its individual frames fit the dimensions", async () => {
    const buffer = await animatedGif(24);
    const result = await validateNewsletterImage({ buffer, size: buffer.length, mimetype: "image/gif" });
    assert.ok(result.poster);
    const metadata = await sharp(result.file.buffer, { animated: true }).metadata();
    assert.equal(metadata.pages, 24);
    assert.equal(metadata.pageHeight, 200);
  });

  it("rejects GIFs with more than 120 frames", async () => {
    const buffer = await animatedGif(121);
    await assert.rejects(
      validateNewsletterImage({ buffer, size: buffer.length, mimetype: "image/gif" })
    );
  });
});
