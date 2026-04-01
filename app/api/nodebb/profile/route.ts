import { NextResponse } from "next/server"
import { extractSessionCookie, fetchNodeBB } from "@/lib/nodebb-server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const cookieHeader = extractSessionCookie(request.headers.get("cookie"))
    if (!cookieHeader) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const sessionRes = await fetchNodeBB("/api/", { cookieHeader })
    const sessionData = await sessionRes.json()
    if (!sessionData?.loggedIn || !sessionData?.loggedInUser) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const user = sessionData.loggedInUser
    const userslug = user.userslug
    const [profileRes, bookmarksRes, upvotedRes] = await Promise.all([
      fetchNodeBB(`/api/user/${userslug}`, { cookieHeader }),
      fetchNodeBB(`/api/user/${userslug}/bookmarks`, { cookieHeader }),
      fetchNodeBB(`/api/user/${userslug}/upvoted`, { cookieHeader }),
    ])

    const [profileData, bookmarksData, upvotedData] = await Promise.all([
      profileRes.json(),
      bookmarksRes.json().catch(() => ({})),
      upvotedRes.json().catch(() => ({})),
    ])

    return NextResponse.json({
      user,
      profile: profileData,
      bookmarks: bookmarksData.topics || bookmarksData.posts || [],
      upvoted: upvotedData.posts || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load profile" },
      { status: 500 }
    )
  }
}
