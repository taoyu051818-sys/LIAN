function parseEnvFile(text = "") {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

function normalizeBaseUrl(value, fallback = "") {
  const raw = String(value ?? "").trim() || fallback;
  return String(raw ?? "").trim().replace(/\/+$/, "");
}

function normalizeString(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function quoteEnvValue(value = "") {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export {
  normalizeBaseUrl,
  normalizeString,
  parseBoolean,
  parseEnvFile,
  parseNonNegativeInteger,
  parsePositiveInteger,
  quoteEnvValue
};
