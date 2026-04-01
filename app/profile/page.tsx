"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { BadgeCheck, Bookmark, Heart, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"

type ProfilePayload = {
  user: {
    uid: number
    username: string
    userslug: string
    displayname?: string
    picture?: string | null
    reputation?: number
    topiccount?: number
    postcount?: number
    joindateISO?: string
  } | null
  profile?: {
    aboutme?: string
  }
  bookmarks?: Array<unknown>
  upvoted?: Array<unknown>
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfilePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch("/api/nodebb/profile", { cache: "no-store" })
        if (response.status === 401) {
          window.location.href = "/auth"
          return
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = (await response.json()) as ProfilePayload
        if (active) {
          setData(payload)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load profile")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [])

  const handleLogout = async () => {
    await fetch("/api/nodebb/auth/logout", { method: "POST" }).catch(() => undefined)
    window.location.href = "/"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading profile...</div>
        <BottomNav />
      </div>
    )
  }

  if (error || !data?.user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-4 py-10 text-center text-sm text-destructive">{error || "Not logged in"}</div>
        <BottomNav />
      </div>
    )
  }

  const user = data.user
  const displayName = user.displayname || user.username
  const avatar =
    user.picture ||
    `https://placehold.co/200x200/f4f4f5/27272a?text=${encodeURIComponent(displayName[0] || "?")}`
  const joinDate = user.joindateISO ? new Date(user.joindateISO).toLocaleDateString("zh-CN") : "Unknown"

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-12 items-center justify-between px-4">
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
          <Link href="/profile/edit">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="space-y-4 px-4 py-6">
        <div className="flex gap-4">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            <Image src={avatar} alt={displayName} fill className="object-cover" />
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">@{user.userslug}</p>
            <p className="mt-1 text-xs text-muted-foreground">Joined {joinDate}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-foreground">
          {data.profile?.aboutme || "No profile introduction yet."}
        </p>

        <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
          <div className="py-2 text-center">
            <p className="text-lg font-bold text-foreground">{user.topiccount || 0}</p>
            <p className="text-xs text-muted-foreground">Topics</p>
          </div>
          <div className="py-2 text-center">
            <p className="text-lg font-bold text-foreground">{user.postcount || 0}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="py-2 text-center">
            <p className="text-lg font-bold text-foreground">{user.reputation || 0}</p>
            <p className="text-xs text-muted-foreground">Reputation</p>
          </div>
        </div>

      </div>

      <div className="space-y-2 border-t border-border px-4 py-4">
        <Link
          href="/profile/likes"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-foreground">My likes</span>
          </div>
          <span className="text-xs text-muted-foreground">{data.upvoted?.length || 0}</span>
        </Link>

        <Link
          href="/profile/bookmarks"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-foreground">My bookmarks</span>
          </div>
          <span className="text-xs text-muted-foreground">{data.bookmarks?.length || 0}</span>
        </Link>

        <Link
          href="/profile/verify"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-foreground">验证高校身份</span>
          </div>
          <span className="text-xs text-muted-foreground">去验证</span>
        </Link>
      </div>

      <div className="mt-8 px-4">
        <Button
          variant="outline"
          className="h-10 w-full rounded-lg border-destructive/20 text-destructive hover:bg-destructive/5"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}
