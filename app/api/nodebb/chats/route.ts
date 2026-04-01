import { NextResponse } from "next/server"
import { extractSessionCookie, fetchNodeBB, fetchNodeBBCsrf } from "@/lib/nodebb-server"

export const runtime = "nodejs"

function getCookie(request: Request) {
  const cookieHeader = extractSessionCookie(request.headers.get("cookie"))
  if (!cookieHeader) {
    throw new Error("Not logged in")
  }
  return cookieHeader
}

export async function GET(request: Request) {
  try {
    const cookieHeader = getCookie(request)
    const response = await fetchNodeBB("/api/v3/chats", { cookieHeader })
    const text = await response.text()

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": "application/json",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load chats" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = getCookie(request)
    const csrfToken = await fetchNodeBBCsrf(cookieHeader)
    const body = await request.text()

    const response = await fetchNodeBB("/api/v3/chats", {
      method: "POST",
      cookieHeader,
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body,
    })

    const text = await response.text()
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": "application/json",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create chat" },
      { status: 500 }
    )
  }
}
