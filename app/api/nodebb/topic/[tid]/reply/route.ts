import { NextResponse } from "next/server"
import { extractSessionCookie, fetchNodeBB, fetchNodeBBCsrf } from "@/lib/nodebb-server"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  context: { params: Promise<{ tid: string }> },
) {
  try {
    const { tid } = await context.params
    const cookieHeader = extractSessionCookie(request.headers.get("cookie"))
    if (!cookieHeader) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const sessionRes = await fetchNodeBB("/api/", { cookieHeader })
    const sessionData = await sessionRes.json().catch(() => ({}))
    if (!sessionData?.loggedIn) {
      return NextResponse.json({ error: "Session expired, please login again" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { content?: string }
    const content = String(body.content || "").trim()
    if (!content) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
    }

    const csrfToken = await fetchNodeBBCsrf(cookieHeader)
    const response = await fetchNodeBB(`/api/v3/topics/${tid}`, {
      method: "POST",
      cookieHeader,
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      const text = await response.text()
      let message = text || "Failed to reply topic"
      try {
        const parsed = JSON.parse(text) as {
          status?: { message?: string }
          error?: string
          message?: string
        }
        message =
          parsed?.status?.message ||
          parsed?.error ||
          parsed?.message ||
          message
      } catch {
        // keep raw text message
      }
      return NextResponse.json(
        { error: message || "Failed to reply topic" },
        { status: response.status },
      )
    }

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json({ ok: true, data: payload })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reply topic" },
      { status: 500 },
    )
  }
}
