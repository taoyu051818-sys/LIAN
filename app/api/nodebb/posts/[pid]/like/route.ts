import { NextResponse } from "next/server"
import { extractSessionCookie, fetchNodeBB, fetchNodeBBCsrf } from "@/lib/nodebb-server"

export const runtime = "nodejs"

async function ensureCookie(request: Request) {
  const cookieHeader = extractSessionCookie(request.headers.get("cookie"))
  if (!cookieHeader) {
    throw new Error("Not logged in")
  }
  return cookieHeader
}

export async function PUT(request: Request, context: { params: Promise<{ pid: string }> }) {
  try {
    const { pid } = await context.params
    const cookieHeader = await ensureCookie(request)
    const csrfToken = await fetchNodeBBCsrf(cookieHeader)

    const response = await fetchNodeBB(`/api/v3/posts/${pid}/vote`, {
      method: "PUT",
      cookieHeader,
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ delta: 1 }),
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: text || "Like failed" }, { status: response.status })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Like failed" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ pid: string }> }) {
  try {
    const { pid } = await context.params
    const cookieHeader = await ensureCookie(request)
    const csrfToken = await fetchNodeBBCsrf(cookieHeader)

    const response = await fetchNodeBB(`/api/v3/posts/${pid}/vote`, {
      method: "DELETE",
      cookieHeader,
      headers: {
        "x-csrf-token": csrfToken,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: text || "Unlike failed" }, { status: response.status })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unlike failed" },
      { status: 500 }
    )
  }
}
