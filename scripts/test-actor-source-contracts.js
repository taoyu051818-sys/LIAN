#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  buildActorSourcePair,
  normalizeIdentityTag,
  normalizeSourceProvider
} from "../src/server/post-actor-dto-service.js";
import { normalizeChannelEvent } from "../src/server/app/handlers/channel-handlers.js";
import { normalizeTabs, toFeedItemDto, toPostDetailDto } from "../src/server/app/handlers/feed-handlers.js";

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
  assert.equal(normalizeIdentityTag("official"), "");
  assert.equal(normalizeIdentityTag("source"), "");
  assert.equal(normalizeIdentityTag("provider"), "");
  assert.equal(normalizeIdentityTag("fallback"), "");
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

test("source labels stay in source and never become actor identity", () => {
  const pair = buildActorSourcePair(
    { displayName: "官方账号", identityTag: "official", avatarText: "官" },
    { sourceProvider: "official", sourceLabel: "官方导入", sourceVisible: true }
  );

  assert.equal(pair.actor.displayName, "官方账号");
  assert.equal(pair.actor.identityTag, "");
  assert.deepEqual(pair.source, { provider: "official", label: "官方导入", visible: true });
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
console.log("▶ feed item dto contract");
test("feed item exposes canonical actor/source and legacy author object derived from actor", () => {
  const item = toFeedItemDto({
    tid: 250,
    title: "Feed 合同",
    bodyPreview: "hello",
    author: {
      nodebbUid: 42,
      displayName: "官方账号",
      avatarUrl: "https://example.com/avatar.png",
      avatarText: "官",
      identityTag: "provider"
    },
    metadata: {
      sourceProvider: "official",
      sourceLabel: "官方导入",
      sourceVisible: true
    }
  });

  assert.equal(item.actor.displayName, "官方账号");
  assert.equal(item.actor.identityTag, "");
  assert.deepEqual(item.source, { provider: "official", label: "官方导入", visible: true });
  assert.deepEqual(item.author, {
    nodebbUid: 42,
    displayName: item.actor.displayName,
    avatarUrl: item.actor.avatarUrl,
    identityTag: item.actor.identityTag,
    source: item.source.provider
  });
});

console.log("");
console.log("▶ post detail dto contract");
test("post detail exposes canonical actor/source and legacy author fields derived from actor", () => {
  const detail = toPostDetailDto({
    tid: 300,
    title: "官方来源帖",
    contentHtml: "hello",
    author: {
      displayName: "官方账号",
      avatarUrl: "https://example.com/avatar.png",
      avatarText: "官",
      identityTag: "provider"
    },
    metadata: {
      sourceProvider: "official",
      sourceLabel: "官方导入",
      sourceVisible: true
    },
    topic: { posts: [] }
  });

  assert.equal(detail.actor.displayName, "官方账号");
  assert.equal(detail.actor.identityTag, "");
  assert.deepEqual(detail.source, { provider: "official", label: "官方导入", visible: true });
  assert.equal(detail.author, detail.actor.displayName);
  assert.equal(detail.authorAvatarUrl, detail.actor.avatarUrl);
  assert.equal(detail.authorIdentityTag, detail.actor.identityTag);
});

test("post detail replies expose compatibility fields derived from reply actor", () => {
  const detail = toPostDetailDto({
    tid: 301,
    title: "回复合同",
    contentHtml: "hello",
    author: { displayName: "楼主", identityTag: "校友认证" },
    topic: {
      posts: [
        { pid: 1, content: "main" },
        {
          pid: 2,
          content: "reply",
          timestampISO: "2026-05-06T00:00:01.000Z",
          user: {
            uid: 42,
            displayname: "回复同学",
            picture: "/assets/avatar.png"
          }
        }
      ]
    }
  });

  assert.equal(detail.replies.length, 1);
  const reply = detail.replies[0];
  assert.equal(reply.actor.displayName, "回复同学");
  assert.equal(reply.source, undefined);
  assert.equal(reply.author, reply.actor.displayName);
  assert.equal(reply.authorAvatarUrl, reply.actor.avatarUrl);
  assert.equal(reply.authorIdentityTag, reply.actor.identityTag);
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
