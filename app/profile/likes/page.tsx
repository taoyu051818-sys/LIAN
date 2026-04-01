"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

type ProfileData = {
  upvoted?: Array<Record<string, unknown>>
}

function getTopicId(item: Record<string, unknown>) {
  const directTid = item.tid
  if (typeof directTid === "number" || typeof directTid === "string") {
    return String(directTid)
  }

  const topic = item.topic as Record<string, unknown> | undefined
  const topicTid = topic?.tid
  if (typeof topicTid === "number" || typeof topicTid === "string") {
    return String(topicTid)
  }

  return ""
}

function getTitle(item: Record<string, unknown>, index: number) {
  if (typeof item.title === "string" && item.title.trim()) {
    return item.title
  }
  const topic = item.topic as Record<string, unknown> | undefined
  if (typeof topic?.title === "string" && topic.title.trim()) {
    return topic.title
  }
  return `已点赞帖子 #${index + 1}`
}

function getSnippet(item: Record<string, unknown>) {
  if (typeof item.content === "string") {
    return item.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  }
  return "点击查看帖子详情"
}

export default function ProfileLikesPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function load() {
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
        const payload = (await response.json()) as ProfileData
        if (active) {
          setItems(Array.isArray(payload.upvoted) ? payload.upvoted : [])
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "加载失败")
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
          <h1 className="ml-2 text-base font-semibold text-foreground">我的点赞</h1>
        </div>
      </header>

      <div className="space-y-3 px-4 py-4">
        {loading ? <p className="text-sm text-muted-foreground">正在加载...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            暂无点赞内容
          </div>
        ) : null}

        {items.map((item, index) => {
          const tid = getTopicId(item)
          const title = getTitle(item, index)
          const snippet = getSnippet(item)
          const href = tid ? `/post/${tid}` : "/"
          return (
            <Link key={`${tid || "like"}-${index}`} href={href}>
              <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
                <div className="mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <h2 className="line-clamp-1 text-sm font-semibold text-foreground">{title}</h2>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{snippet}</p>
              </article>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
