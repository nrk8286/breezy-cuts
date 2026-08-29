import assert from "node:assert/strict";
import test from "node:test";

import {
  crawlablePageContent,
  dynamicRobots,
  knownPageRoute,
  pageMetadata,
  sitemap
} from "../src/index.mjs";

const publicRoutes = ["/", "/services", "/barbers", "/booking", "/queue"];

test("every public route has one crawlable H1 and unique metadata", () => {
  const titles = new Set();
  for (const route of publicRoutes) {
    assert.equal(knownPageRoute(route), true);
    const html = crawlablePageContent(route);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /Breezy|Breon|fresher|Barber/i);
    const metadata = pageMetadata(route);
    assert.ok(metadata.title.length > 20);
    assert.ok(metadata.description.length > 50);
    titles.add(metadata.title);
  }
  assert.equal(titles.size, publicRoutes.length);
});

test("private routes remain crawlable for users but excluded from indexing", () => {
  for (const route of ["/portal", "/admin"]) {
    assert.equal(knownPageRoute(route), true);
    assert.equal((crawlablePageContent(route).match(/<h1\b/g) || []).length, 1);
  }
  const robots = dynamicRobots("https://breezycutz.shop");
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Disallow: \/portal/);
});

test("unknown routes receive dedicated 404 content", () => {
  assert.equal(knownPageRoute("/missing"), false);
  assert.match(crawlablePageContent("/missing"), /<h1 class="page-title">Page not found<\/h1>/);
});

test("sitemap contains only the five public canonical routes", () => {
  const xml = sitemap("https://breezycutz.shop");
  for (const route of publicRoutes) assert.match(xml, new RegExp(`<loc>https://breezycutz\\.shop${route === "/" ? "\\/" : route}<\\/loc>`));
  assert.doesNotMatch(xml, /\/admin|\/portal/);
});
