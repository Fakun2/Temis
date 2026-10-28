import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSafeNewsletterHref,
  parseNewsletterVideoUrl
} from "../components/newsletter/newsletter-utils";

describe("newsletter media utilities", () => {
  it("normalizes only approved YouTube and Vimeo HTTPS URLs", () => {
    assert.deepEqual(parseNewsletterVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), {
      provider: "youtube",
      videoId: "dQw4w9WgXcQ"
    });
    assert.deepEqual(parseNewsletterVideoUrl("https://vimeo.com/123456"), {
      provider: "vimeo",
      videoId: "123456"
    });
    assert.equal(
      parseNewsletterVideoUrl("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"),
      null
    );
    assert.equal(parseNewsletterVideoUrl("http://youtube.com/watch?v=dQw4w9WgXcQ"), null);
  });
  it("allows only internal paths and HTTPS calls to action", () => {
    assert.equal(isSafeNewsletterHref("/admin/cases"), true);
    assert.equal(isSafeNewsletterHref("https://temis.ar/release"), true);
    assert.equal(isSafeNewsletterHref("//evil.test"), false);
    assert.equal(isSafeNewsletterHref("javascript:alert(1)"), false);
  });
});
