import { NextResponse } from "next/server"
import {
  SESSION_COOKIE_NAME,
  extractSessionCookie,
  fetchNodeBB,
  fetchNodeBBCsrf,
} from "@/lib/nodebb-server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const cookieHeader = extractSessionCookie(request.headers.get("cookie"))

    if (cookieHeader) {
      const csrfToken = await fetchNodeBBCsrf(cookieHeader)
      await fetchNodeBB("/logout", {
        method: "POST",
        cookieHeader,
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-csrf-token": csrfToken,
        },
        body: new URLSearchParams({
          _csrf: csrfToken,
        }),
      }).catch(() => undefined)
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      expires: new Date(0),
    })
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 }
    )
  }
}
