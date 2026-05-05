import { config } from "./config.js";

function addUid(url, uid = config.nodebbUid) {
  if (url.searchParams.has("_uid")) return url;
  url.searchParams.set("_uid", String(uid || config.nodebbUid));
  return url;
}

function withNodebbUid(apiPath, uid) {
  const url = new URL(apiPath, config.nodebbBaseUrl);
  url.searchParams.set("_uid", String(uid || config.nodebbUid));
  return `${url.pathname}${url.search}`;
}

function withJsonHeaders(options = {}) {
  return {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers
    }
  };
}

function withBearerAuth(options = {}) {
  return {
    ...options,
    headers: {
      authorization: `Bearer ${config.nodebbToken}`,
      ...options.headers
    }
  };
}

async function nodebbFetch(apiPath, options = {}) {
  const url = addUid(new URL(apiPath, config.nodebbBaseUrl), options.uid);
  const headers = {
    accept: "application/json",
    connection: "close",
    ...options.headers
  };
  if (config.nodebbToken && !headers.authorization) {
    headers["x-api-token"] = config.nodebbToken;
  }

  const fetchOptions = { ...options, headers };
  delete fetchOptions.uid;

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (cause) {
    const error = new Error(`LIAN API connection failed: ${url.origin}${url.pathname} - ${cause.message || cause}`);
    error.status = 502;
    error.cause = cause;
    throw error;
  }
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || text || `LIAN HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function nodebbFetchJson(apiPath, options = {}) {
  return nodebbFetch(apiPath, withJsonHeaders(options));
}

async function nodebbFetchBearer(apiPath, options = {}) {
  return nodebbFetch(apiPath, withBearerAuth(options));
}

async function nodebbFetchBearerJson(apiPath, options = {}) {
  return nodebbFetch(apiPath, withBearerAuth(withJsonHeaders(options)));
}

async function nodebbFetchResult(apiPath, options = {}) {
  try {
    const data = await nodebbFetch(apiPath, options);
    return { ok: true, status: 200, data, url: withNodebbUid(apiPath, options.uid) };
  } catch (error) {
    return {
      ok: false,
      status: error.status || 500,
      data: error.data || { error: error.message },
      url: withNodebbUid(apiPath, options.uid),
      error
    };
  }
}

async function nodebbFetchBearerResult(apiPath, options = {}) {
  return nodebbFetchResult(apiPath, withBearerAuth(options));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryApi(task, attempts = 3) {
  let lastError;
  for (let index = 0; index < Math.max(1, attempts); index += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (index < attempts - 1) await delay(450 * (index + 1));
    }
  }
  throw lastError;
}

async function fetchNodebbTopicIndex(maxPages = 8) {
  const pages = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const data = await retryApi(() => nodebbFetch(`/api/recent?page=${page}`));
    const topics = Array.isArray(data?.topics) ? data.topics : [];
    if (!topics.length) break;
    pages.push(data);
  }

  const seen = new Set();
  const topics = [];
  for (const page of pages) {
    for (const topic of page.topics || []) {
      if (!topic?.tid || seen.has(topic.tid)) continue;
      seen.add(topic.tid);
      topics.push(topic);
    }
  }
  return topics;
}

export {
  fetchNodebbTopicIndex,
  nodebbFetch,
  nodebbFetchBearer,
  nodebbFetchBearerJson,
  nodebbFetchBearerResult,
  nodebbFetchJson,
  nodebbFetchResult,
  retryApi,
  withNodebbUid
};
