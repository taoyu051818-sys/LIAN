#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  buildPlaceRefFromMetadata,
  buildPlaceSheetDto
} from "../src/server/place-sheet-service.js";

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

console.log("═══ PlaceRef Stable ID Contract Tests ═══\n");

console.log("▶ metadata place identity");
test("PlaceRef resolves only from known stable locationId or placeId", () => {
  assert.equal(buildPlaceRefFromMetadata({ locationId: "canteen" }, knownLocations).id, "canteen");
  assert.equal(buildPlaceRefFromMetadata({ placeId: "canteen" }, knownLocations).id, "canteen");
  assert.equal(buildPlaceRefFromMetadata({ locationArea: "食堂" }, knownLocations), undefined);
  assert.equal(buildPlaceRefFromMetadata({ name: "食堂" }, knownLocations), undefined);
  assert.equal(buildPlaceRefFromMetadata({ sourceProvider: "lian", provider: "gaode" }, knownLocations), undefined);
  assert.equal(buildPlaceRefFromMetadata({ locationId: "missing", locationArea: "食堂" }, knownLocations), undefined);
});

console.log("");
console.log("▶ place sheet relation identity");
test("PlaceSheet relation accepts locationId and placeId stable aliases", () => {
  const sheet = buildPlaceSheetDto(
    knownLocations[0],
    {
      "100": { title: "locationId 绑定", locationId: "canteen", visibility: "public" },
      "101": { title: "placeId 绑定", placeId: "canteen", visibility: "public" },
      "102": { title: "错误 id 不绑定", placeId: "missing", locationArea: "食堂", visibility: "public" }
    },
    null
  );

  assert.equal(sheet.stats.postCount, 2);
  assert.deepEqual(sheet.recentPosts.map((post) => post.tid).sort(), [100, 101]);
});

test("PlaceSheet relation ignores fallback text and source/provider hints", () => {
  const sheet = buildPlaceSheetDto(
    knownLocations[0],
    {
      "200": {
        title: "只有手填地点文本",
        locationArea: "食堂",
        name: "食堂",
        sourceProvider: "lian",
        provider: "gaode",
        status: "active",
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
  console.log("\nPlaceRef stable id contract failed. Keep PlaceSheet relations bound only by locationId/placeId stable ids.");
  process.exit(1);
}

console.log("\nAll PlaceRef stable id contract checks passed.");
