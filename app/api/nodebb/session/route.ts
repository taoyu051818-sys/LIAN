import { NextResponse } from "next/server"
import { extractSessionCookie, fetchNodeBB } from "@/lib/nodebb-server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const cookieHeader = extractSessionCookie(request.headers.get("cookie"))

    if (!cookieHeader) {
      return NextResponse.json({ loggedIn: false, user: null })
    }

    const response = await fetchNodeBB("/api/", {
      cookieHeader,
    })

    if (!response.ok) {
      return NextResponse.json({ loggedIn: false, user: null })
    }

    const data = await response.json()
    const loggedIn = !!data?.loggedIn

    return NextResponse.json({
      loggedIn,
      user: loggedIn ? data.loggedInUser || null : null,
    })
  } catch {
    return NextResponse.json({ loggedIn: false, user: null })
  }
}
