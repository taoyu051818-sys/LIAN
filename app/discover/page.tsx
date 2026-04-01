"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MasonryGrid } from "@/components/masonry-grid"
import { BottomNav } from "@/components/bottom-nav"
import type { PostData } from "@/components/post-card"
import { mapRecentTopicToPost, type NodeBBRecentTopic } from "@/lib/nodebb"
import { cn } from "@/lib/utils"

const TAGS = [
  { id: "all", label: "全部" },
  { id: "teammates", label: "找队友" },
  { id: "activities", label: "活动" },
  { id: "study", label: "学习" },
  { id: "life", label: "生活" },
  { id: "jobs", label: "求职" },
  { id: "love", label: "交友" },
  { id: "vent", label: "吐槽" },
]

function matchTag(post: PostData, tagId: string) {
  if (tagId === "all") {
    return true
  }

  const text = `${post.title} ${post.content} ${post.tags.join(" ")}`.toLowerCase()

  switch (tagId) {
    case "teammates":
      return /队友|组队|比赛|建模|学习小组/.test(text)
    case "activities":
      return /活动|徒步|羽毛球|剧本杀|健身|周末/.test(text)
    case "study":
      return /考研|考公|学习|经验|日语|建模/.test(text)
    case "life":
      return /校园|食堂|樱花|宿舍|生活/.test(text)
    case "jobs":
      return /实习|求职|计算机/.test(text)
    case "love":
      return /交友|脱单/.test(text)
    case "vent":
      return /吐槽|难吃|室友|宿舍/.test(text)
    default:
      return true
  }
}

export default function DiscoverPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTag, setActiveTag] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

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
          setError(err instanceof Error ? err.message : "Failed to load discover feed")
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

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return posts.filter((post) => {
      const matchesTag = matchTag(post, activeTag)
      const haystack = `${post.title} ${post.content} ${post.author.name} ${post.tags.join(" ")}`.toLowerCase()
      const matchesQuery = !query || haystack.includes(query)
      return matchesTag && matchesQuery
    })
  }, [activeTag, posts, searchQuery])

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
      <div className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-sm border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索你感兴趣的内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-full border-0 bg-input pl-9 pr-3 text-sm focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="scrollbar-hide overflow-x-auto px-3 py-2">
          <div className="flex w-max items-center gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  activeTag === tag.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground active:bg-secondary/70"
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          正在加载发现内容...
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-destructive">
          加载失败：{error}
        </div>
      ) : filteredPosts.length ? (
        <MasonryGrid
          posts={filteredPosts}
          onPostClick={handlePostClick}
          onPostLike={handlePostLike}
        />
      ) : (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          当前筛选下还没有可展示的帖子
        </div>
      )}

      <BottomNav />
    </div>
  )
}
