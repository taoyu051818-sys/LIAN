import "server-only"

const NODEBB_URL =
  process.env.NODEBB_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_NODEBB_URL ||
  "http://localhost:4567"
const SESSION_COOKIE_NAME = "express.sid"

export function extractSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return ""
  }

  return cookieHeader
    .split(/;\s*/)
    .filter((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    .join("; ")
}

export async function fetchNodeBB(
  path: string,
  init: RequestInit & { cookieHeader?: string } = {}
) {
  const headers = new Headers(init.headers)
  if (init.cookieHeader) {
    headers.set("cookie", init.cookieHeader)
  }

  return fetch(`${NODEBB_URL}${path}`, {
    ...init,
    headers,
    redirect: "follow",
    cache: "no-store",
  })
}

export async function fetchNodeBBCsrf(cookieHeader: string) {
  const response = await fetchNodeBB("/api/config", {
    cookieHeader,
  })

  if (!response.ok) {
    throw new Error(`Failed to load csrf token: ${response.status}`)
  }

  const data = await response.json()
  return data?.csrf_token || data?.config?.csrf_token || ""
}

export function parseSetCookie(setCookieHeader: string) {
  const [cookiePair, ...parts] = setCookieHeader.split(";").map((part) => part.trim())
  const [name, ...valueParts] = cookiePair.split("=")
  const value = valueParts.join("=")
  const attrs = new Map<string, string | true>()

  parts.forEach((part) => {
    const [key, ...rest] = part.split("=")
    attrs.set(key.toLowerCase(), rest.length ? rest.join("=") : true)
  })

  return { name, value, attrs }
}

export { NODEBB_URL, SESSION_COOKIE_NAME }
