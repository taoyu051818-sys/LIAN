import { NextResponse } from "next/server"
import { fetchNodeBB, parseSetCookie } from "@/lib/nodebb-server"

export const runtime = "nodejs"

function getSetCookiesFromResponse(response: Response) {
  return typeof (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
    ? (response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
    : response.headers.get("set-cookie")
      ? [response.headers.get("set-cookie") as string]
      : []
}

function splitCombinedSetCookie(raw: string) {
  return raw
    .split(/,(?=\s*[^;=,\s]+=[^;]+)/g)
    .map((part) => part.trim())
    .filter(Boolean)
}

function buildCookieHeader(setCookies: string[]) {
  return setCookies
    .map((cookieHeader) => {
      const parsed = parseSetCookie(cookieHeader)
      return parsed?.name && parsed?.value ? `${parsed.name}=${parsed.value}` : ""
    })
    .filter(Boolean)
    .join("; ")
}

export async function POST(request: Request) {
  try {
    const { username, password, remember } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Missing username or password" }, { status: 400 })
    }

    const body = new URLSearchParams()
    body.set("username", String(username))
    body.set("password", String(password))
    if (remember) {
      body.set("remember", "on")
    }

    const configRes = await fetchNodeBB("/api/config", {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!configRes.ok) {
      return NextResponse.json({ error: "Failed to initialize login session" }, { status: 500 })
    }

    const configPayload = await configRes.json().catch(() => ({}))
    const csrfToken = String(configPayload?.csrf_token || "")
    const initialCookies = getSetCookiesFromResponse(configRes)
    const cookieHeader = buildCookieHeader(initialCookies)
    if (!csrfToken || !cookieHeader) {
      return NextResponse.json({ error: "Failed to obtain csrf/session" }, { status: 500 })
    }

    body.set("_csrf", csrfToken)

    const response = await fetchNodeBB("/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-csrf-token": csrfToken,
        cookie: cookieHeader,
      },
      body,
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error || payload.message || "Login failed" },
        { status: response.status }
      )
    }

    const result = NextResponse.json({ ok: true, next: payload.next || "/" })
    const rawSetCookies = getSetCookiesFromResponse(response)
    const normalizedSetCookies = rawSetCookies.flatMap((header) => splitCombinedSetCookie(header))

    // Forward NodeBB cookies as-is to avoid losing attributes/signatures.
    normalizedSetCookies.forEach((cookieHeader) => {
      result.headers.append("set-cookie", cookieHeader)
    })

    return result
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    )
  }
}
