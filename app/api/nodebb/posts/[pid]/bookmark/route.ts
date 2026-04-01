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

    const response = await fetchNodeBB(`/api/v3/posts/${pid}/bookmark`, {
      method: "PUT",
      cookieHeader,
      headers: {
        "x-csrf-token": csrfToken,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: text || "Bookmark failed" }, { status: response.status })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bookmark failed" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ pid: string }> }) {
  try {
    const { pid } = await context.params
    const cookieHeader = await ensureCookie(request)
    const csrfToken = await fetchNodeBBCsrf(cookieHeader)

    const response = await fetchNodeBB(`/api/v3/posts/${pid}/bookmark`, {
      method: "DELETE",
      cookieHeader,
      headers: {
        "x-csrf-token": csrfToken,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: text || "Unbookmark failed" }, { status: response.status })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unbookmark failed" },
      { status: 500 }
    )
  }
}
