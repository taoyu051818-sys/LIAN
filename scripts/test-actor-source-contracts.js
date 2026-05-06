#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  buildActorSourcePair,
  normalizeIdentityTag,
  normalizeSourceProvider
} from "../src/server/post-actor-dto-service.js";
import { normalizeChannelEvent } from "../src/server/app/handlers/channel-handlers.js";
import { normalizeTabs } from "../src/server/app/handlers/feed-handlers.js";

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

console.log("═══ Actor / Source DTO Contract Tests ═══\n");

console.log("▶ identity/source separation");
test("platform labels do not pass through identityTag", () => {
  assert.equal(normalizeIdentityTag("NodeBB"), "");
  assert.equal(normalizeIdentityTag("system"), "");
  assert.equal(normalizeIdentityTag("imported"), "");
  assert.equal(normalizeIdentityTag("校友认证"), "校友认证");
});

test("source provider only accepts explicit provider values", () => {
  assert.equal(normalizeSourceProvider("nodebb"), "nodebb");
  assert.equal(normalizeSourceProvider("official"), "official");
  assert.equal(normalizeSourceProvider("fallback"), "");
  assert.equal(normalizeSourceProvider("校友认证"), "");
});

test("actor/source pair keeps identity and provider separate", () => {
  const pair = buildActorSourcePair(
    { displayName: "小连", identityTag: "NodeBB", avatarText: "XL" },
    { sourceProvider: "nodebb", sourceLabel: "NodeBB", sourceVisible: false }
  );
  assert.equal(pair.actor.displayName, "小连");
  assert.equal(pair.actor.identityTag, "");
  assert.deepEqual(pair.source, { provider: "nodebb", label: "NodeBB", visible: false });
});

console.log("");
console.log("▶ channel dto contract");
test("channel event exposes canonical actor/source and compatibility fields derived from actor", () => {
  const event = normalizeChannelEvent(
    { tid: 100, title: "校园频道", timestampISO: "2026-05-06T00:00:00.000Z" },
    {
      pid: 200,
      content: '<!-- lian-channel-meta {"displayName":"TY","identityTag":"NodeBB","avatarText":"TY","actorSource":"alias"} --> hello',
      timestampISO: "2026-05-06T00:00:01.000Z"
    },
    { items: {} }
  );

  assert.equal(event.actor.displayName, "TY");
  assert.equal(event.actor.identityTag, "");
  assert.equal(event.source.provider, "nodebb");
  assert.equal(event.source.visible, false);
  assert.equal(event.author, event.actor.displayName);
  assert.equal(event.username, event.actor.displayName);
  assert.equal(event.authorIdentityTag, event.actor.identityTag);
  assert.equal(event.identityTag, event.actor.identityTag);
  assert.equal(event.authorAvatarText, event.actor.avatarText);
  assert.equal(event.avatarText, event.actor.avatarText);
});

console.log("");
console.log("▶ feed tabs contract");
test("tabs normalize to { id, label } objects", () => {
  const tabs = normalizeTabs([
    "此刻",
    { id: "library", label: "图书馆学习" },
    { label: "校园活动" },
    { id: "", label: "" }
  ]);

  assert.deepEqual(tabs, [
    { id: "此刻", label: "此刻" },
    { id: "library", label: "图书馆学习" },
    { id: "校园活动", label: "校园活动" }
  ]);
  assert.ok(tabs.every((tab) => typeof tab.id === "string" && typeof tab.label === "string"));
  assert.ok(tabs.every((tab) => String(tab) === "[object Object]"));
});

test("empty tabs fall back to stable default objects", () => {
  assert.deepEqual(normalizeTabs([]), [
    { id: "此刻", label: "此刻" },
    { id: "精选", label: "精选" }
  ]);
});

console.log("");
console.log("═══ Result ═══");
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  console.log("\nActor/source DTO contract failed. Keep display actor, identityTag, and source semantics separate.");
  process.exit(1);
}

console.log("\nAll actor/source DTO contract checks passed.");
