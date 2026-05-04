import { createClient } from "redis";

function clean(value = "") {
  return String(value || "").trim();
}

const redisConfig = {
  driver: clean(process.env.LIAN_DB_DRIVER || ""),
  host: clean(process.env.LIAN_REDIS_HOST || "127.0.0.1"),
  port: Number(process.env.LIAN_REDIS_PORT || 6379),
  password: process.env.LIAN_REDIS_PASSWORD || "",
  database: Number(process.env.LIAN_REDIS_DB || 2),
  keyPrefix: clean(process.env.LIAN_REDIS_KEY_PREFIX || "lian:"),
  storageMode: clean(process.env.LIAN_STORAGE_MODE || "file").toLowerCase(),
  allowFileFallback: clean(process.env.LIAN_STORAGE_MIGRATION_ALLOW_FILE_FALLBACK || "false").toLowerCase() === "true"
};

function isRedisStorageEnabled() {
  return redisConfig.storageMode === "db" || redisConfig.storageMode === "redis";
}

let clientPromise = null;

function createRedisClient() {
  const socket = {
    host: redisConfig.host,
    port: redisConfig.port
  };
  const options = {
    socket,
    database: redisConfig.database
  };
  if (redisConfig.password) options.password = redisConfig.password;
  return createClient(options);
}

async function getRedisClient() {
  if (!clientPromise) {
    const client = createRedisClient();
    client.on("error", (error) => {
      console.error("[redis]", error?.message || error);
    });
    clientPromise = client.connect().then(() => client).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

function redisKey(name = "") {
  return `${redisConfig.keyPrefix}${name}`;
}

async function closeRedisClient() {
  if (!clientPromise) return;
  const client = await clientPromise;
  clientPromise = null;
  await client.quit();
}

export { closeRedisClient, getRedisClient, isRedisStorageEnabled, redisConfig, redisKey };
