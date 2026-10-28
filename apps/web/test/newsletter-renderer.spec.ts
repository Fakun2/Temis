import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NewsletterContentView } from "../components/newsletter/newsletter-content-v2";
import { ThemeProvider } from "../lib/theme/theme-provider";

describe("newsletter renderer", () => {
  it("renders legacy blocks and preserves safe links", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        initialVariant: "light",
        children: createElement(NewsletterContentView, {
          assetPrefix: "/assets",
          content: {
            version: 1,
            blocks: [
              { type: "heading", text: "Versión anterior" },
              { type: "cta", label: "Abrir", url: "/admin" }
            ]
          }
        })
      })
    );
    assert.match(html, /Versión anterior/);
    assert.match(html, /href="\/admin"/);
  });
  it("renders header, body and footer with the selected appearance", () => {
    const document = (text: string) => ({
      type: "doc" as const,
      content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }]
    });
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        initialVariant: "light",
        children: createElement(NewsletterContentView, {
          appearance: "dark",
          assetPrefix: "/assets",
          title: "Título",
          content: {
            version: 2,
            theme: {
              width: "standard",
              fontFamily: "sans",
              backgroundColor: "#ffffff",
              textColor: "#071827",
              accentColor: "#073061"
            },
            header: document("Encabezado"),
            footer: document("Pie"),
            blocks: [{ type: "richText", document: document("Cuerpo") }]
          }
        })
      })
    );
    assert.ok(html.indexOf("Encabezado") < html.indexOf("Cuerpo"));
    assert.ok(html.indexOf("Cuerpo") < html.indexOf("Pie"));
    assert.match(html, /background-color:#292929/);
  });
  it("renders header and footer backgrounds with their section text", () => {
    const document = (text: string) => ({
      type: "doc" as const,
      content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }]
    });
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        initialVariant: "light",
        children: createElement(NewsletterContentView, {
          assetPrefix: "/assets",
          compactPadding: true,
          content: {
            version: 2,
            theme: {
              width: "standard",
              fontFamily: "sans",
              backgroundColor: "#ffffff",
              textColor: "#071827",
              accentColor: "#073061"
            },
            header: document("Texto del encabezado"),
            footer: document("Texto del pie"),
            blocks: [
              {
                type: "image",
                assetId: "header-id",
                alt: "Fondo del encabezado",
                caption: "",
                width: "full",
                align: "center",
                section: "header",
                background: true
              },
              {
                type: "gif",
                assetId: "footer-id",
                alt: "Fondo del pie",
                caption: "",
                width: "full",
                align: "center",
                section: "footer",
                background: true
              }
            ]
          }
        })
      })
    );
    assert.match(html, /src="\/assets\/header-id"/);
    assert.match(html, /src="\/assets\/footer-id\?variant=poster"/);
    assert.ok(html.indexOf("header-id") < html.indexOf("Texto del encabezado"));
    assert.ok(html.indexOf("footer-id") < html.indexOf("Texto del pie"));
    assert.match(html, /object-cover/);
    assert.match(html, /overflow-hidden rounded-2xl/);
    assert.match(html, /pt-0 pb-0/);
  });
  it("does not load a background video until the reader requests it", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        initialVariant: "light",
        children: createElement(NewsletterContentView, {
          assetPrefix: "/assets",
          content: {
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
                title: "Presentación",
                width: "full",
                align: "center",
                section: "header",
                background: true
              }
            ]
          }
        })
      })
    );
    assert.match(html, /Ver video: Presentación/);
    assert.doesNotMatch(html, /<iframe/);
  });
});
