import test from "node:test";
import assert from "node:assert/strict";

import {
  diversifyItems,
  feedFeatureEnabled,
  legacyScoreItem,
  momentScoreItem,
  scoreBreakdown,
  scoreItem,
  scoringRules
} from "../src/server/feed-scoring.js";

const FIXED_NOW = Date.parse("2026-05-05T00:00:00.000Z");
const FIXED_ISO = new Date(FIXED_NOW).toISOString();

function withFixedNow(fn) {
  const originalNow = Date.now;
  Date.now = () => FIXED_NOW;
  try {
    fn();
  } finally {
    Date.now = originalNow;
  }
}

const enhancedRules = {
  feedFeatures: {
    enhancedScoring: true,
    diversity: true
  },
  pinnedTids: [42],
  tagWeights: {
    food: 5,
    hot: 3
  },
  recencyHalfLifeHours: 96,
  coverBonus: 11,
  scoring: {
    readPenalty: -60,
    qualityWeight: 40,
    imageImpactWeight: 24,
    riskPenalty: -220,
    officialHomePenalty: -35,
    missingLocationAreaPenalty: -6,
    contentTypeWeights: {
      event: 9
    },
    vibeWeights: {
      "真实": 12,
      hot: 2
    },
    sceneWeights: {
      "夜宵": 4
    }
  }
};

const scoredItem = {
  tid: 42,
  tag: "food",
  tags: ["food", "hot"],
  vibeTags: ["真实", "hot"],
  sceneTags: ["夜宵"],
  timestampISO: FIXED_ISO,
  cover: "https://example.test/cover.jpg",
  priority: 7,
  qualityScore: 0.5,
  imageImpactScore: 0.25,
  riskScore: 0.1,
  officialScore: 0.2,
  contentType: "event",
  locationArea: ""
};

test("feedFeatureEnabled and scoringRules expose safe defaults with overrides", () => {
  assert.equal(feedFeatureEnabled(enhancedRules, "enhancedScoring"), true);
  assert.equal(feedFeatureEnabled(enhancedRules, "missingFeature"), false);

  const scoring = scoringRules({ scoring: { readPenalty: -12, custom: 99 } });
  assert.equal(scoring.readPenalty, -12);
  assert.equal(scoring.qualityWeight, 40);
  assert.equal(scoring.riskHideThreshold, 0.7);
  assert.equal(scoring.custom, 99);
});

test("legacyScoreItem keeps existing pin, tag, recency, cover, and priority math", () => {
  withFixedNow(() => {
    assert.equal(legacyScoreItem(scoredItem, enhancedRules), 1083);
  });
});

test("scoreItem and scoreBreakdown stay aligned for enhanced home scoring", () => {
  withFixedNow(() => {
    const readTids = new Set([42]);
    assert.equal(scoreItem(scoredItem, enhancedRules, { readTids, surface: "home" }), 1044);

    assert.deepEqual(scoreBreakdown(scoredItem, enhancedRules, { readTids, surface: "home" }), {
      legacy: 1083,
      tag: 3,
      vibe: 14,
      scene: 4,
      quality: 20,
      imageImpact: 6,
      risk: -22,
      official: -7,
      contentType: 9,
      locationArea: -6,
      read: -60,
      final: 1044
    });
  });
});

test("scoreItem falls back to legacy scoring when enhancedScoring is disabled", () => {
  withFixedNow(() => {
    const legacyOnlyRules = {
      ...enhancedRules,
      feedFeatures: { enhancedScoring: false }
    };
    assert.equal(scoreItem(scoredItem, legacyOnlyRules, { readTids: new Set([42]) }), 1083);
  });
});

test("diversifyItems delays over-limit items without dropping them", () => {
  const items = [
    { id: "a", contentType: "event", locationArea: "north", tag: "food" },
    { id: "b", contentType: "event", locationArea: "south", tag: "study" },
    { id: "c", contentType: "deal", locationArea: "south", tag: "study" },
    { id: "d", contentType: "deal", locationArea: "east", tag: "night" }
  ];
  const rules = {
    feedFeatures: { diversity: true },
    diversity: {
      maxSameContentType: 1,
      maxSameLocationArea: 1,
      maxSamePrimaryTag: 1
    }
  };

  assert.deepEqual(diversifyItems(items, rules).map((item) => item.id), ["a", "c", "b", "d"]);
});

test("momentScoreItem preserves moment-specific scoring factors", () => {
  withFixedNow(() => {
    const item = {
      tid: 7,
      timestampISO: FIXED_ISO,
      qualityScore: 1,
      imageImpactScore: 1,
      replyCount: 2,
      priority: 5,
      tags: ["真实", "夜宵"],
      contentType: "event",
      locationArea: ""
    };
    const rules = {
      recencyHalfLifeHours: 48,
      scoring: {
        momentContentTypeWeights: { event: 8 },
        momentMissingLocationAreaPenalty: -4
      }
    };

    assert.equal(momentScoreItem(item, rules), 196);
  });
});
