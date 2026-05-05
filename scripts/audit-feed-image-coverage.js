#!/usr/bin/env node

// Read-only Feed image coverage audit.
// It verifies the business fact that home/feed metadata contains enough cover images.
// This does not mutate Redis, NodeBB, or local JSON files.

import { loadMetadata } from "../src/server/data-store.js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const minCoverage = Number(args.get("min-coverage") || 0);
const sampleSize = Number(args.get("sample") || 30);

function hasImageUrls(meta = {}) {
  return Array.isArray(meta.imageUrls) && meta.imageUrls.some((url) => typeof url === "string" && url.trim());
}

function summarizePost([tid, meta]) {
  return {
    tid,
    title: meta?.title || "",
    timeLabel: meta?.timeLabel || "",
    startsAt: meta?.startsAt || "",
    channel: meta?.channel || meta?.category || "",
    locationName: meta?.locationName || meta?.location?.name || ""
  };
}

const metadata = await loadMetadata();
const entries = Object.entries(metadata || {});
const withImages = entries.filter(([, meta]) => hasImageUrls(meta));
const withoutImages = entries.filter(([, meta]) => !hasImageUrls(meta));
const coverage = entries.length ? withImages.length / entries.length : 0;

const report = {
  ok: minCoverage ? coverage >= minCoverage : true,
  total: entries.length,
  withImages: withImages.length,
  withoutImages: withoutImages.length,
  imageCoverage: Number((coverage * 100).toFixed(2)),
  minCoverage: minCoverage ? Number((minCoverage * 100).toFixed(2)) : null,
  sampleWithoutImages: withoutImages.slice(0, sampleSize).map(summarizePost)
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error(
    `[audit-feed-image-coverage] image coverage ${report.imageCoverage}% is below required ${report.minCoverage}%`
  );
  process.exit(1);
}
