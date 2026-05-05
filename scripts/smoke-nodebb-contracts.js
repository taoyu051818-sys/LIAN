#!/usr/bin/env node

// NodeBB contract smoke tests - diagnostic, read-only by default.
// Usage: node scripts/smoke-nodebb-contracts.js
// Write mode: NODEBB_SMOKE_WRITE=1 node scripts/smoke-nodebb-contracts.js

import { config } from "../src/server/config.js";
import {
  nodebbFetchBearerResult,
  nodebbFetchResult,
  withNodebbUid
} from "../src/server/nodebb-client.js";

const DEFAULT_UID = config.nodebbUid;
const WRITE_MODE = process.env.NODEBB_SMOKE_WRITE === "1";

let passed = 0;
let failed = 0;

function ok(name) { console.log(`  ✓ ${name}`); passed += 1; }
function fail(name, detail) { console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); failed += 1; }
function info(label, value) { console.log(`  ℹ ${label}: ${value}`); }

function redact(str) {
  return String(str || "")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/x-api-token:\s*\S+/gi, "x-api-token: [REDACTED]");
}

function shapeSummary(data, depth = 0) {
  if (depth > 2) return "...";
  if (data === null || data === undefined) return String(data);
  if (Array.isArray(data)) {
    if (!data.length) return "[]";
    return `[${shapeSummary(data[0], depth + 1)}] (len=${data.length})`;
  }
  if (typeof data === "object") {
    const keys = Object.keys(data).slice(0, 15);
    const entries = keys.map((key) => `${key}: ${shapeSummary(data[key], depth + 1)}`);
    if (Object.keys(data).length > 15) entries.push("...");
    return `{ ${entries.join(", ")} }`;
  }
  if (typeof data === "string") return data.length > 60 ? `"${data.slice(0, 60)}..."` : JSON.stringify(data);
  return String(data);
}

async function nodebbResultWithBearerFallback(apiPath, options = {}) {
  const first = await nodebbFetchResult(apiPath, options);
  if (first.ok || first.status !== 401) return { result: first, authMethod: "x-api-token" };
  const second = await nodebbFetchBearerResult(apiPath, options);
  return { result: second, authMethod: "Bearer" };
}

async function expectNodebbOk(label, apiPath, options = {}) {
  const { result, authMethod } = await nodebbResultWithBearerFallback(apiPath, options);
  if (result.ok) {
    ok(`${label} → ${result.status} (auth: ${authMethod})`);
    return result.data;
  }
  fail(`${label} → ${result.status}`, `auth: ${authMethod}; ${redact(result.data?.error || result.data?.message)}`);
  return null;
}

async function expectNodebbWriteOk(label, apiPath, options = {}) {
  const result = await nodebbFetchBearerResult(apiPath, options);
  if (result.ok) {
    ok(`${label} → ${result.status}`);
    return result.data;
  }
  fail(`${label} → ${result.status}`, redact(result.data?.error || result.data?.message));
  return null;
}

async function main() {
  console.log("═══ NodeBB Contract Smoke Tests ═══");
  console.log(`Base: ${config.nodebbBaseUrl}`);
  console.log(`Default UID: ${DEFAULT_UID}`);
  console.log(`Write mode: ${WRITE_MODE ? "ON" : "OFF (set NODEBB_SMOKE_WRITE=1 to enable)"}`);
  console.log(`Token: ${config.nodebbToken ? "(set)" : "(missing)"}`);
  console.log("");

  if (!config.nodebbToken) {
    console.error("错误: NODEBB_API_TOKEN 未设置。请在 .env 中配置。");
    process.exit(1);
  }

  console.log("▶ Notifications");
  const notifications = await expectNodebbOk("GET /api/notifications", "/api/notifications");
  if (notifications) {
    info("shape", shapeSummary(notifications));
    const notifs = notifications?.notifications || notifications?.items || [];
    if (notifs.length > 0) info("first notification keys", Object.keys(notifs[0]).join(", "));
    else info("notifications", "empty (no notifications for this uid)");
  }
  console.log("");

  console.log("▶ Topic Detail");
  let sampleTid = null;
  let samplePid = null;
  try {
    const recent = await expectNodebbOk("GET /api/recent", "/api/recent?page=1");
    const topics = recent?.topics || [];
    if (topics.length > 0) {
      sampleTid = topics[0].tid;
      info("sample tid", sampleTid);
    }
  } catch (error) {
    fail("GET /api/recent (to find sample tid)", error.message);
  }

  if (sampleTid) {
    const topic = await expectNodebbOk(`GET /api/topic/${sampleTid}`, `/api/topic/${sampleTid}`);
    if (topic) {
      const posts = topic?.posts || [];
      if (posts.length > 0) {
        samplePid = posts[0].pid;
        info("first post pid", samplePid);
        info("first post keys", Object.keys(posts[0]).join(", "));
        info("upvoted", String(posts[0].upvoted));
        info("bookmarked", String(posts[0].bookmarked));
        info("votes", String(posts[0].votes));
        const images = (posts[0].content || "").match(/!\[.*?\]\(.*?\)/g) || [];
        info("image count in first post", String(images.length));
      }
      info("topic title", topic?.title || "(none)");
      info("topic postcount", String(topic?.postcount));
    }
  }
  console.log("");

  console.log("▶ User Bookmarks");
  let userSlug = "";
  const me = await expectNodebbOk(`GET /api/user/uid/${DEFAULT_UID}`, `/api/user/uid/${DEFAULT_UID}`);
  userSlug = me?.userslug || me?.slug || "";
  if (userSlug) {
    info("user slug", userSlug);
    const bookmarks = await expectNodebbOk(`GET /api/user/${userSlug}/bookmarks`, `/api/user/${userSlug}/bookmarks`);
    if (bookmarks) info("shape", shapeSummary(bookmarks));
  } else {
    fail("resolve user slug", `uid ${DEFAULT_UID} slug not found`);
  }
  console.log("");

  console.log("▶ User Upvoted");
  if (userSlug) {
    const upvoted = await expectNodebbOk(`GET /api/user/${userSlug}/upvoted`, `/api/user/${userSlug}/upvoted`);
    if (upvoted) info("shape", shapeSummary(upvoted));
  }
  console.log("");

  console.log("▶ Reply Endpoint (dry-run shape)");
  if (sampleTid) {
    info("target endpoint", withNodebbUid(`/api/v3/topics/${sampleTid}`, DEFAULT_UID));
    info("fallback endpoint", withNodebbUid(`/api/v3/topics/${sampleTid}/posts`, DEFAULT_UID));
    info("auth", "Authorization: Bearer [TOKEN]");
    if (!WRITE_MODE) info("status", "skipped (read-only mode)");
  }
  console.log("");

  console.log("▶ Vote Endpoint (dry-run shape)");
  if (samplePid) {
    info("target endpoint", withNodebbUid(`/api/v3/posts/${samplePid}/vote`, DEFAULT_UID));
    info("unvote endpoint", withNodebbUid(`/api/v3/posts/${samplePid}/vote`, DEFAULT_UID));
    info("auth", "Authorization: Bearer [TOKEN]");
    if (!WRITE_MODE) info("status", "skipped (read-only mode)");
  }
  console.log("");

  console.log("▶ Bookmark Endpoint (dry-run shape)");
  if (samplePid) {
    info("target endpoint", withNodebbUid(`/api/v3/posts/${samplePid}/bookmark`, DEFAULT_UID));
    info("unbookmark endpoint", withNodebbUid(`/api/v3/posts/${samplePid}/bookmark`, DEFAULT_UID));
    info("auth", "Authorization: Bearer [TOKEN]");
    if (!WRITE_MODE) info("status", "skipped (read-only mode)");
  }
  console.log("");

  console.log("▶ Flag/Report Endpoint (dry-run shape)");
  if (samplePid) {
    info("target endpoint", withNodebbUid(`/api/v3/posts/${samplePid}/flag`, DEFAULT_UID));
    info("auth", "Authorization: Bearer [TOKEN]");
    if (!WRITE_MODE) info("status", "skipped (read-only mode)");
  }
  console.log("");

  if (WRITE_MODE && sampleTid) {
    console.log("═══ Write Mode Tests ═══\n");

    console.log("▶ Test Reply");
    let testReplyPid = null;
    const replyBody = JSON.stringify({ content: "[LIAN SMOKE TEST] This is an automated test reply. Please ignore and delete." });
    const reply = await expectNodebbWriteOk(`POST /api/v3/topics/${sampleTid}`, `/api/v3/topics/${sampleTid}`, {
      method: "POST",
      body: replyBody
    });
    if (reply) {
      testReplyPid = reply?.pid || reply?.data?.pid;
      info("shape", shapeSummary(reply));
    } else {
      const fallback = await expectNodebbWriteOk(`POST /api/v3/topics/${sampleTid}/posts`, `/api/v3/topics/${sampleTid}/posts`, {
        method: "POST",
        body: replyBody
      });
      testReplyPid = fallback?.pid || fallback?.data?.pid;
      if (fallback) info("shape", shapeSummary(fallback));
    }

    if (samplePid) {
      console.log("\n▶ Test Vote/Unvote");
      const vote = await expectNodebbWriteOk(`PUT /api/v3/posts/${samplePid}/vote`, `/api/v3/posts/${samplePid}/vote`, {
        method: "PUT",
        body: JSON.stringify({ delta: 1 })
      });
      if (vote) {
        info("shape", shapeSummary(vote));
        await expectNodebbWriteOk(`DELETE /api/v3/posts/${samplePid}/vote`, `/api/v3/posts/${samplePid}/vote`, { method: "DELETE" });
      }

      console.log("\n▶ Test Bookmark/Unbookmark");
      const bookmark = await expectNodebbWriteOk(`PUT /api/v3/posts/${samplePid}/bookmark`, `/api/v3/posts/${samplePid}/bookmark`, { method: "PUT" });
      if (bookmark) {
        info("shape", shapeSummary(bookmark));
        await expectNodebbWriteOk(`DELETE /api/v3/posts/${samplePid}/bookmark`, `/api/v3/posts/${samplePid}/bookmark`, { method: "DELETE" });
      }

      console.log("\n▶ Test Flag/Report");
      if (testReplyPid) {
        const flag = await expectNodebbWriteOk(`POST /api/v3/posts/${testReplyPid}/flag`, `/api/v3/posts/${testReplyPid}/flag`, {
          method: "POST",
          body: JSON.stringify({ reason: "[LIAN SMOKE TEST] Automated test report. Please dismiss." })
        });
        if (flag) info("shape", shapeSummary(flag));
      } else {
        info("flag", "skipped (no test reply pid)");
      }

      console.log("\n▶ Cleanup");
      if (testReplyPid) {
        info("cleanup", `Delete test reply pid=${testReplyPid} via DELETE /api/v3/posts/${testReplyPid}`);
        info("note", "Or delete via NodeBB admin UI. Test reply is labeled [LIAN SMOKE TEST].");
      }
    }
  }

  console.log("");
  console.log("═══ 结果 ═══");
  console.log(`通过: ${passed}, 失败: ${failed}`);
  if (failed > 0) process.exit(1);
  console.log("\n全部通过！");
}

main().catch((error) => {
  console.error("致命错误:", error.message);
  process.exit(1);
});
