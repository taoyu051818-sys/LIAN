import { isProductionMode } from "./security-mode.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEFAULT_ALLOWED_ORIGINS = ["https://lian.nat100.top"];

function firstHeaderValue(value = "") {
  return String(value || "").split(",")[0].trim();
}

function configuredAllowedOrigins() {
  const configured = String(process.env.LIAN_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin), ...configured]);
}

function getRequestOrigin(req = {}) {
  const host = firstHeaderValue(req.headers?.["x-forwarded-host"] || req.headers?.host || "");
  if (!host) return "";
  const proto = firstHeaderValue(req.headers?.["x-forwarded-proto"] || "http").toLowerCase() || "http";
  return `${proto}://${host}`;
}

function normalizeOrigin(value = "") {
  try {
    const parsed = new URL(String(value || ""));
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return "";
  }
}

function getRequestSourceOrigin(req = {}) {
  const origin = normalizeOrigin(req.headers?.origin || "");
  if (origin) return origin;
  const referer = normalizeOrigin(req.headers?.referer || "");
  return referer;
}

function isAllowedSourceOrigin(source = "") {
  const normalized = normalizeOrigin(source);
  return Boolean(normalized && configuredAllowedOrigins().has(normalized));
}

function isSameOriginRequest(req = {}) {
  const source = getRequestSourceOrigin(req);
  if (!source) return true;
  if (isAllowedSourceOrigin(source)) return true;
  const expected = normalizeOrigin(getRequestOrigin(req));
  return Boolean(expected && source === expected);
}

function requireSameOrigin(req = {}) {
  if (!isProductionMode()) return;
  if (SAFE_METHODS.has(String(req.method || "GET").toUpperCase())) return;
  if (isSameOriginRequest(req)) return;
  const error = new Error("cross-origin state-changing request blocked");
  error.status = 403;
  throw error;
}

export {
  getRequestOrigin,
  getRequestSourceOrigin,
  isAllowedSourceOrigin,
  isSameOriginRequest,
  normalizeOrigin,
  requireSameOrigin
};
