#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  buildPlaceRef,
  buildPlaceRefFromMetadata,
  buildPlaceSheetDto,
  normalizePlaceStatus,
  normalizePlaceType
} from "../src/server/place-sheet-service.js";
import { toPostDetailDto } from "../src/server/app/handlers/feed-handlers.js";
import { matchRoute } from "../src/server/route-matcher.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    failed += 1;
  }
}

const knownLocations = [
  {
    id: "canteen",
    name: "食堂",
    type: "food",
    status: "active",
    lat: 18.3997424,
    lng: 110.0244927
  }
];

console.log("═══ PlaceSheet Contract Tests ═══\n");

console.log("▶ route contract");
test("GET /api/place-sheets/:id maps to place-sheet route", () => {
  assert.deepEqual(matchRoute("GET", "/api/place-sheets/canteen"), {
    routeId: "place-sheet",
    params: { placeId: "canteen" }
  });
});

test("place sheet route accepts safe stable ids only", () => {
  assert.equal(matchRoute("GET", "/api/place-sheets/canteen/extra"), null);
  assert.equal(matchRoute("POST", "/api/place-sheets/canteen"), null);
});

console.log("");
console.log("▶ place ref contract");
test("PlaceRefDto contains stable id, display name, type/status, and optional coordinates", () => {
  const ref = buildPlaceRef(knownLocations[0]);
  assert.deepEqual(ref, {
    id: "canteen",
    name: "食堂",
    type: "merchant",
    status: "confirmed",
    lat: 18.3997424,
    lng: 110.0244927
  });
});

test("unknown place type/status normalize to safe server-owned values", () => {
  assert.equal(normalizePlaceType("weird-provider-text"), "unknown");
  assert.equal(normalizePlaceStatus("random-ui-color"), "confirmed");
  assert.equal(normalizePlaceStatus("ai-organized"), "ai-organized");
});

test("metadata place ref only resolves known place ids", () => {
  assert.deepEqual(buildPlaceRefFromMetadata({ locationId: "canteen" }, knownLocations), {
    id: "canteen",
    name: "食堂",
    type: "merchant",
    status: "confirmed",
    lat: 18.3997424,
    lng: 110.0244927
  });
  assert.equal(buildPlaceRefFromMetadata({ placeId: "canteen" }, knownLocations).id, "canteen");
  assert.equal(buildPlaceRefFromMetadata({ locationArea: "食堂" }, knownLocations), undefined);
  assert.equal(buildPlaceRefFromMetadata({ locationId: "missing", locationArea: "食堂" }, knownLocations), undefined);
});

console.log("");
console.log("▶ post detail place contract");
test("PostDetailDto exposes place when metadata has a known locationId", () => {
  const detail = toPostDetailDto(
    {
      tid: 100,
      title: "今天食堂二楼很好吃",
      contentHtml: "hello",
      locationArea: "食堂",
      metadata: { locationId: "canteen", locationArea: "食堂" },
      topic: { posts: [] }
    },
    { locations: knownLocations }
  );
  assert.equal(detail.locationArea, "食堂");
  assert.equal(detail.place.id, "canteen");
  assert.equal(detail.place.name, "食堂");
});

test("PostDetailDto keeps manual locationArea as fallback without inferring place", () => {
  const detail = toPostDetailDto(
    {
      tid: 101,
      title: "只有手填地点文本",
      contentHtml: "hello",
      locationArea: "食堂",
      metadata: { locationArea: "食堂" },
      topic: { posts: [] }
    },
    { locations: knownLocations }
  );
  assert.equal(detail.locationArea, "食堂");
  assert.equal(Object.prototype.hasOwnProperty.call(detail, "place"), false);
});

console.log("");
console.log("▶ place sheet dto contract");
test("PlaceSheetDto exposes place, server-owned status/source, stats, summary, and preview posts", () => {
  const sheet = buildPlaceSheetDto(
    knownLocations[0],
    {
      "100": {
        title: "今天食堂二楼很好吃",
        locationId: "canteen",
        locationArea: "食堂",
        imageUrls: ["https://example.com/cover.jpg"],
        primaryTag: "#美食",
        createdAt: "2026-05-06T01:00:00.000Z",
        visibility: "public"
      },
      "101": {
        title: "图书馆学习角",
        locationId: "library",
        locationArea: "图书馆",
        visibility: "public"
      }
    },
    null
  );

  assert.equal(sheet.place.id, "canteen");
  assert.equal(sheet.place.name, "食堂");
  assert.equal(sheet.status, "confirmed");
  assert.deepEqual(sheet.source, { provider: "lian", label: "LIAN 地点库", visible: false });
  assert.equal(sheet.stats.postCount, 1);
  assert.equal(sheet.summary.aiGenerated, false);
  assert.equal(sheet.summary.sourceCount, 1);
  assert.equal(sheet.recentPosts.length, 1);
  assert.equal(sheet.recentPosts[0].tid, 100);
  assert.equal(sheet.recentPosts[0].title, "今天食堂二楼很好吃");
});

test("PlaceSheetDto keeps recentPosts as a small preview", () => {
  const metadata = {};
  for (let i = 1; i <= 10; i += 1) {
    metadata[String(i)] = {
      title: `帖子 ${i}`,
      locationId: "canteen",
      visibility: "public",
      createdAt: `2026-05-06T00:00:${String(i).padStart(2, "0")}.000Z`
    };
  }
  const sheet = buildPlaceSheetDto(knownLocations[0], metadata, null);
  assert.equal(sheet.stats.postCount, 10);
  assert.equal(sheet.recentPosts.length, 6);
  assert.equal(sheet.recentPosts[0].title, "帖子 10");
});

test("manual legacy locationArea without known place id is not inferred into PlaceSheet relation", () => {
  const sheet = buildPlaceSheetDto(
    knownLocations[0],
    {
      "200": {
        title: "只有手填地点文本",
        locationArea: "食堂",
        visibility: "public"
      }
    },
    null
  );
  assert.equal(sheet.stats.postCount, 0);
  assert.equal(sheet.summary, undefined);
  assert.deepEqual(sheet.recentPosts, []);
});

console.log("");
console.log("═══ Result ═══");
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  console.log("\nPlaceSheet contract failed. Keep #59 route, PlaceRefDto, PlaceSheetDto, detail place, and legacy location fallback semantics stable.");
  process.exit(1);
}

console.log("\nAll PlaceSheet contract checks passed.");
