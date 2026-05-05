#!/usr/bin/env node

// 重写 [推荐测试] 帖子：去掉标题前缀，去掉测试标签。
// 用法: node scripts/rewrite-test-posts.js

import { config } from "../src/server/config.js";
import { nodebbFetchBearerJson } from "../src/server/nodebb-client.js";

const REMOVE_TAGS = ["推荐测试", "系统测试"];
const MAX_PAGES = 10;

async function main() {
  if (!config.nodebbToken) {
    console.error("错误: NodeBB token 未设置。请先完成后端 .env 配置。");
    process.exit(1);
  }

  console.log("扫描 NodeBB 帖子...");
  const testPosts = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await nodebbFetchBearerJson(`/api/recent?page=${page}`);
    const topics = data.topics || [];
    for (const topic of topics) {
      const tags = (topic.tags || []).map((tag) => tag.value || tag.name || tag);
      if (tags.includes("推荐测试") || (topic.title || "").includes("[推荐测试]")) {
        testPosts.push({ tid: topic.tid, title: topic.title, tags });
      }
    }
    if (topics.length < 20) break;
  }

  console.log(`找到 ${testPosts.length} 条 [推荐测试] 帖子\n`);

  let ok = 0;
  let fail = 0;

  for (const post of testPosts) {
    const tid = post.tid;
    const oldTitle = post.title;
    const newTitle = oldTitle.replace(/^\[推荐测试\]\s*/, "") || oldTitle;
    const newTags = post.tags.filter((tag) => !REMOVE_TAGS.includes(tag));
    const titleChanged = newTitle !== oldTitle;
    const tagsChanged = newTags.length !== post.tags.length;

    if (!titleChanged && !tagsChanged) {
      console.log(`  tid ${tid}: 无需修改`);
      continue;
    }

    try {
      if (titleChanged) {
        const topic = await nodebbFetchBearerJson(`/api/topic/${tid}`);
        const mainPost = topic.posts?.[0];
        if (!mainPost?.pid) throw new Error("无法获取主帖 pid");
        await nodebbFetchBearerJson(`/api/v3/posts/${mainPost.pid}`, {
          method: "PUT",
          body: JSON.stringify({ title: newTitle, content: mainPost.content })
        });
      }

      if (tagsChanged) {
        await nodebbFetchBearerJson(`/api/v3/topics/${tid}/tags`, {
          method: "PUT",
          body: JSON.stringify({ tags: newTags })
        });
      }

      const changes = [];
      if (titleChanged) changes.push(`标题: "${oldTitle}" → "${newTitle}"`);
      if (tagsChanged) changes.push(`标签: [${newTags.join(", ")}]`);
      console.log(`  tid ${tid}: OK - ${changes.join(" | ")}`);
      ok += 1;
    } catch (error) {
      console.error(`  tid ${tid}: FAIL - ${error.message}`);
      fail += 1;
    }
  }

  console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
  if (fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
