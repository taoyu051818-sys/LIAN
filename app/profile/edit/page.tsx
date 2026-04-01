"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, UserRoundPen } from "lucide-react"
import { Button } from "@/components/ui/button"

type ProfilePayload = {
  user?: {
    displayname?: string
    username?: string
  }
  profile?: {
    aboutme?: string
  }
}

export default function ProfileEditPage() {
  const [displayName, setDisplayName] = useState("")
  const [aboutMe, setAboutMe] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response = await fetch("/api/nodebb/profile", { cache: "no-store" })
        if (response.status === 401) {
          window.location.href = "/auth"
          return
        }
        if (!response.ok) {
          throw new Error("load failed")
        }
        const payload = (await response.json()) as ProfilePayload
        if (active) {
          setDisplayName(payload.user?.displayname || payload.user?.username || "")
          setAboutMe(payload.profile?.aboutme || "")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-12 items-center px-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-2 text-base font-semibold text-foreground">编辑个人资料</h1>
        </div>
      </header>

      <div className="space-y-4 px-4 py-5">
        {loading ? <p className="text-sm text-muted-foreground">正在加载...</p> : null}

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <UserRoundPen className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">基本信息</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">显示名称</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                placeholder="输入显示名称"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">个人简介</label>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                placeholder="写一点关于你自己的介绍"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          当前页已完成前端编辑表单，保存接口将在下一步接入圈圈用户资料写入能力。
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
        <Button
          disabled
          className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          保存（即将接入）
        </Button>
      </div>
    </div>
  )
}
