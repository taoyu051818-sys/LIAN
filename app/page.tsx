"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { MasonryGrid } from "@/components/masonry-grid"
import type { PostData } from "@/components/post-card"
import { mapRecentTopicToPost, type NodeBBRecentTopic } from "@/lib/nodebb"

export default function HomePage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadRecent() {
      try {
        setLoading(true)
        setError("")

        const response = await fetch("/api/nodebb/recent", {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        const mappedPosts = ((data.topics || []) as NodeBBRecentTopic[]).map(mapRecentTopicToPost)

        if (active) {
          setPosts(mappedPosts)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load feed")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadRecent()

    return () => {
      active = false
    }
  }, [])

  const handlePostClick = (id: string) => {
    router.push(`/post/${id}`)
  }

  const handlePostLike = async (post: PostData, nextLiked: boolean) => {
    if (!post.pid) {
      return false
    }

    const response = await fetch(`/api/nodebb/posts/${post.pid}/like`, {
      method: nextLiked ? "PUT" : "DELETE",
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (payload.error) {
        setError(payload.error)
      }
      return false
    }

    return true
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="h-3" />

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          正在加载圈圈内容...
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-destructive">
          加载失败：{error}
        </div>
      ) : posts.length ? (
        <MasonryGrid posts={posts} onPostClick={handlePostClick} onPostLike={handlePostLike} />
      ) : (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          还没有可展示的内容
        </div>
      )}

      <BottomNav />
    </div>
  )
}
