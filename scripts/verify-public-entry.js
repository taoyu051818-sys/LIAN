#!/usr/bin/env node

// Public entry smoke checks for the edge gateway and deployed services.
// This intentionally uses GET, not HEAD, because backend routes are method-specific.
// Usage:
//   npm run verify:public
//   LIAN_PUBLIC_BASE_URL=https://example.com npm run verify:public

import {
  DEFAULT_PUBLIC_BASE_URL,
  DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS,
  parsePositiveInteger,
  runPublicEntryChecks
} from "../src/server/public-entry-checks.js";

const baseUrl = process.env.LIAN_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL;
const timeoutMs = parsePositiveInteger(process.env.LIAN_PUBLIC_TIMEOUT_MS, DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS);

const report = await runPublicEntryChecks({ baseUrl, timeoutMs });

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error("[verify-public-entry] public entry smoke checks failed");
  process.exit(1);
}
