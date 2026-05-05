#!/usr/bin/env node

// Removes all audience test data created by setup-audience-test.js.
// Usage: node scripts/cleanup-audience-test.js

import fs from "node:fs";
import path from "node:path";

import { config } from "../src/server/config.js";
import { nodebbFetchBearerJson } from "../src/server/nodebb-client.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, "data", "auth-users.json");
const META_PATH = path.join(ROOT, "data", "post-metadata.json");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const TEST_USERNAMES = [
  "test_linxiaoyu", "test_wanghaoran", "test_chensiqi",
  "test_zhaotianyu", "test_liujiayi", "test_teacher_yang",
  "test_zhangsan", "test_liwenjing", "test_zhouzixuan", "test_huangyuxuan"
];

const TEST_TITLE_FRAGMENTS = [
  "五一假期图书馆开放时间调整",
  "试验区首届草地音乐节来啦",
  "食堂二楼新窗口测评",
  "中传选课系统即将开放",
  "北邮实验室招助研",
  "民大期末考试安排已出",
  "学生会全体大会通知",
  "摄影社外拍活动报名",
  "篮球社友谊赛对手征集",
  "学生会四月财务公示",
  "给小雨的生日惊喜",
  "校园卡充值链接",
  "转让一台iPad",
  "旧版帖子-无audience字段",
  "旧版帖子-仅有visibility"
];

async function main() {
  console.log("=== 受众系统测试环境清理 ===\n");

  console.log("▶ 清理测试帖子元数据...");
  const metadata = loadJson(META_PATH);
  let removedPosts = 0;
  for (const [tid, meta] of Object.entries(metadata)) {
    if (TEST_TITLE_FRAGMENTS.some((fragment) => (meta.title || "").includes(fragment))) {
      delete metadata[tid];
      removedPosts += 1;
      console.log(`  移除 tid ${tid}: ${meta.title}`);
    }
  }
  saveJson(META_PATH, metadata);
  console.log(`  共移除 ${removedPosts} 条\n`);

  console.log("▶ 清理测试用户...");
  const authStore = loadJson(AUTH_PATH);
  let removedUsers = 0;
  authStore.users = authStore.users.filter((user) => {
    if (TEST_USERNAMES.includes(user.username)) {
      console.log(`  移除 ${user.username} (${user.id})`);
      removedUsers += 1;
      return false;
    }
    return true;
  });
  for (const [token, session] of Object.entries(authStore.sessions || {})) {
    if (!authStore.users.some((user) => user.id === session.userId)) {
      delete authStore.sessions[token];
    }
  }
  saveJson(AUTH_PATH, authStore);
  console.log(`  共移除 ${removedUsers} 个用户\n`);

  if (config.nodebbToken) {
    console.log("▶ 清理 NodeBB 测试帖子...");
    let deleted = 0;
    try {
      for (let page = 1; page <= 10; page += 1) {
        const data = await nodebbFetchBearerJson(`/api/recent?page=${page}`);
        const topics = data.topics || [];
        for (const topic of topics) {
          if (TEST_TITLE_FRAGMENTS.some((fragment) => (topic.title || "").includes(fragment))) {
            try {
              await nodebbFetchBearerJson(`/api/v3/topics/${topic.tid}/state`, {
                method: "PUT",
                body: "{}"
              });
              console.log(`  删除 tid ${topic.tid}: ${topic.title}`);
              deleted += 1;
            } catch (error) {
              console.log(`  跳过 tid ${topic.tid}: ${error.message}`);
            }
          }
        }
        if (topics.length < 20) break;
      }
    } catch (error) {
      console.log(`  NodeBB 清理失败: ${error.message}`);
    }
    console.log(`  共删除 ${deleted} 条\n`);
  } else {
    console.log("▶ 跳过 NodeBB 清理 (无 API Token)\n");
  }

  console.log("=== 清理完成 ===");
}

main().catch((error) => {
  console.error("致命错误:", error.message);
  process.exit(1);
});
