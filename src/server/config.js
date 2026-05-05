import fs from "node:fs/promises";
import crypto from "node:crypto";
import {
  normalizeBaseUrl,
  normalizeString,
  parseBoolean,
  parseEnvFile,
  parseNonNegativeInteger,
  parsePositiveInteger,
  quoteEnvValue
} from "./config-schema.js";
import { envPath } from "./paths.js";

async function loadLocalEnv() {
  try {
    const env = parseEnvFile(await fs.readFile(envPath, "utf8"));
    for (const [key, value] of Object.entries(env)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // First deployment can start without .env; the setup guide will create it.
  }
}

await loadLocalEnv();

function defaultImageProxyPublicBaseUrl() {
  const port = parsePositiveInteger(process.env.IMAGE_PROXY_PORT, 4101);
  const explicit = normalizeBaseUrl(process.env.IMAGE_PROXY_PUBLIC_BASE_URL, "");
  if (explicit) return explicit;

  const source =
    process.env.REMOTE_AUTH_BASE_URL ||
    process.env.NODEBB_PUBLIC_BASE_URL ||
    process.env.NODEBB_BASE_URL ||
    "";
  if (source) {
    try {
      const url = new URL(source);
      url.port = String(port);
      url.pathname = "";
      url.search = "";
      url.hash = "";
      return normalizeBaseUrl(url.toString(), "");
    } catch {
      // Fall through to localhost for local development.
    }
  }
  return `http://localhost:${port}`;
}

export const config = {
  port: parsePositiveInteger(process.env.PORT, 4100),
  imageProxyPort: parsePositiveInteger(process.env.IMAGE_PROXY_PORT, 4101),
  imageProxyPublicBaseUrl: defaultImageProxyPublicBaseUrl(),
  nodebbBaseUrl: normalizeBaseUrl(process.env.NODEBB_BASE_URL, "http://149.104.21.74:4567"),
  nodebbPublicBaseUrl: normalizeBaseUrl(process.env.NODEBB_PUBLIC_BASE_URL || process.env.NODEBB_BASE_URL, "http://149.104.21.74:4567"),
  nodebbToken: normalizeString(process.env.NODEBB_API_TOKEN, ""),
  nodebbUid: parsePositiveInteger(process.env.NODEBB_UID, 2),
  nodebbCid: parsePositiveInteger(process.env.NODEBB_CID, 2),
  nodebbChannelCid: parsePositiveInteger(process.env.NODEBB_CHANNEL_CID || process.env.NODEBB_CID, 2),
  nodebbChannelCidConfigured: Boolean(process.env.NODEBB_CHANNEL_CID),
  nodebbChannelTopicTid: parseNonNegativeInteger(process.env.NODEBB_CHANNEL_TOPIC_TID, 0),
  cloudinaryUrl: normalizeString(process.env.CLOUDINARY_URL, ""),
  adminToken: normalizeString(process.env.ADMIN_TOKEN, ""),
  mailFrom: normalizeString(process.env.MAIL_FROM, ""),
  resendApiKey: normalizeString(process.env.RESEND_API_KEY, ""),
  smtpHost: normalizeString(process.env.SMTP_HOST, ""),
  smtpPort: parsePositiveInteger(process.env.SMTP_PORT, 587),
  smtpUser: normalizeString(process.env.SMTP_USER, ""),
  smtpPass: normalizeString(process.env.SMTP_PASS, ""),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  aiPostPreviewMode: normalizeString(process.env.AI_POST_PREVIEW_MODE, "").toLowerCase(),
  mimoApiKey: normalizeString(process.env.MIMO_API_KEY, ""),
  mimoBaseUrl: normalizeBaseUrl(process.env.MIMO_BASE_URL, "https://api.xiaomimimo.com/v1"),
  mimoModel: normalizeString(process.env.MIMO_MODEL, "mimo-v2.5"),
  remoteAuthBaseUrl: normalizeBaseUrl(process.env.REMOTE_AUTH_BASE_URL, "http://149.104.21.74:4100")
};

export function isSetupRequired() {
  return !config.nodebbToken;
}

export async function saveSetupConfig(payload = {}, onSaved = null) {
  const next = {
    PORT: String(parsePositiveInteger(payload.port || config.port, 4100)),
    IMAGE_PROXY_PORT: String(parsePositiveInteger(payload.imageProxyPort || config.imageProxyPort, 4101)),
    IMAGE_PROXY_PUBLIC_BASE_URL: normalizeBaseUrl(payload.imageProxyPublicBaseUrl || config.imageProxyPublicBaseUrl, ""),
    NODEBB_BASE_URL: normalizeBaseUrl(payload.nodebbBaseUrl || config.nodebbBaseUrl, ""),
    NODEBB_PUBLIC_BASE_URL: normalizeBaseUrl(payload.nodebbPublicBaseUrl || config.nodebbPublicBaseUrl || payload.nodebbBaseUrl || config.nodebbBaseUrl, ""),
    NODEBB_API_TOKEN: normalizeString(payload.nodebbToken || "", ""),
    NODEBB_UID: String(parsePositiveInteger(payload.nodebbUid || config.nodebbUid, 2)),
    NODEBB_CID: String(parsePositiveInteger(payload.nodebbCid || config.nodebbCid, 2)),
    CLOUDINARY_URL: normalizeString(payload.cloudinaryUrl || config.cloudinaryUrl, ""),
    ADMIN_TOKEN: normalizeString(payload.adminToken || config.adminToken || crypto.randomBytes(24).toString("hex"), ""),
    MAIL_FROM: normalizeString(payload.mailFrom || config.mailFrom, ""),
    RESEND_API_KEY: normalizeString(payload.resendApiKey || config.resendApiKey, ""),
    SMTP_HOST: normalizeString(payload.smtpHost || config.smtpHost, ""),
    SMTP_PORT: String(parsePositiveInteger(payload.smtpPort || config.smtpPort, 587)),
    SMTP_USER: normalizeString(payload.smtpUser || config.smtpUser, ""),
    SMTP_PASS: normalizeString(payload.smtpPass || config.smtpPass, ""),
    SMTP_SECURE: String(parseBoolean(payload.smtpSecure ?? config.smtpSecure ?? false, false))
  };

  if (!next.NODEBB_BASE_URL) throw new Error("NODEBB_BASE_URL is required");
  if (!next.NODEBB_PUBLIC_BASE_URL) throw new Error("NODEBB_PUBLIC_BASE_URL is required");
  if (!next.NODEBB_API_TOKEN) throw new Error("NODEBB_API_TOKEN is required");
  const lines = [
    "# lian-mobile-web local deployment config",
    "# Generated by the first-run setup guide.",
    `PORT=${next.PORT}`,
    `IMAGE_PROXY_PORT=${next.IMAGE_PROXY_PORT}`,
    `IMAGE_PROXY_PUBLIC_BASE_URL=${quoteEnvValue(next.IMAGE_PROXY_PUBLIC_BASE_URL)}`,
    `NODEBB_BASE_URL=${quoteEnvValue(next.NODEBB_BASE_URL)}`,
    `NODEBB_PUBLIC_BASE_URL=${quoteEnvValue(next.NODEBB_PUBLIC_BASE_URL)}`,
    `NODEBB_API_TOKEN=${quoteEnvValue(next.NODEBB_API_TOKEN)}`,
    `NODEBB_UID=${next.NODEBB_UID}`,
    `NODEBB_CID=${next.NODEBB_CID}`,
    `CLOUDINARY_URL=${quoteEnvValue(next.CLOUDINARY_URL)}`,
    `ADMIN_TOKEN=${quoteEnvValue(next.ADMIN_TOKEN)}`,
    `MAIL_FROM=${quoteEnvValue(next.MAIL_FROM)}`,
    `RESEND_API_KEY=${quoteEnvValue(next.RESEND_API_KEY)}`,
    `SMTP_HOST=${quoteEnvValue(next.SMTP_HOST)}`,
    `SMTP_PORT=${next.SMTP_PORT}`,
    `SMTP_USER=${quoteEnvValue(next.SMTP_USER)}`,
    `SMTP_PASS=${quoteEnvValue(next.SMTP_PASS)}`,
    `SMTP_SECURE=${next.SMTP_SECURE}`
  ];
  await fs.writeFile(envPath, `${lines.join("\n")}\n`, "utf8");

  config.port = parsePositiveInteger(next.PORT, 4100);
  config.imageProxyPort = parsePositiveInteger(next.IMAGE_PROXY_PORT, 4101);
  config.imageProxyPublicBaseUrl = next.IMAGE_PROXY_PUBLIC_BASE_URL;
  config.nodebbBaseUrl = next.NODEBB_BASE_URL;
  config.nodebbPublicBaseUrl = next.NODEBB_PUBLIC_BASE_URL;
  config.nodebbToken = next.NODEBB_API_TOKEN;
  config.nodebbUid = parsePositiveInteger(next.NODEBB_UID, 2);
  config.nodebbCid = parsePositiveInteger(next.NODEBB_CID, 2);
  config.cloudinaryUrl = next.CLOUDINARY_URL;
  config.adminToken = next.ADMIN_TOKEN;
  config.mailFrom = next.MAIL_FROM;
  config.resendApiKey = next.RESEND_API_KEY;
  config.smtpHost = next.SMTP_HOST;
  config.smtpPort = parsePositiveInteger(next.SMTP_PORT, 587);
  config.smtpUser = next.SMTP_USER;
  config.smtpPass = next.SMTP_PASS;
  config.smtpSecure = parseBoolean(next.SMTP_SECURE, false);
  onSaved?.();
}
