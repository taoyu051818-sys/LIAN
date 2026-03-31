"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MasonryGrid } from "@/components/masonry-grid"
import { BottomNav } from "@/components/bottom-nav"
import type { PostData } from "@/components/post-card"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

const TAGS = [
  { id: "all", label: "全部" },
  { id: "teammates", label: "找队友" },
  { id: "activities", label: "活动" },
  { id: "study", label: "学习" },
  { id: "life", label: "生活" },
  { id: "jobs", label: "求职" },
  { id: "love", label: "恋爱" },
  { id: "vent", label: "树洞" },
]

// 发现页数据
const DISCOVER_POSTS: PostData[] = [
  {
    id: "d1",
    title: "周末徒步活动！香山一日游",
    content: "组织一次香山徒步，预计5小时...",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=500&fit=crop",
    author: {
      name: "户外达人",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop",
      school: "北京师范大学",
      isAnonymous: false,
    },
    tags: ["活动", "徒步"],
    likes: 234,
    comments: 56,
    participantCount: 8,
    category: "activity",
  },
  {
    id: "d2",
    title: "考公上岸经验分享",
    content: "备考一年半终于上岸了...",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=450&fit=crop",
    author: {
      name: "公考上岸",
      avatar: "",
      school: "中国人民大学",
      isAnonymous: true,
    },
    tags: ["学习", "考公"],
    likes: 1567,
    comments: 234,
    category: "question",
  },
  {
    id: "d3",
    title: "剧本杀组局！新手友好",
    content: "周六晚上7点，五道口剧本杀店...",
    image: "https://images.unsplash.com/photo-1606503153255-59d5a90c8c61?w=400&h=600&fit=crop",
    author: {
      name: "剧本杀爱好者",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      school: "北京大学",
      isAnonymous: false,
    },
    tags: ["活动", "剧本杀"],
    likes: 89,
    comments: 34,
    participantCount: 4,
    category: "activity",
  },
  {
    id: "d4",
    title: "有没有一起健身的小伙伴",
    content: "想找个健身搭子，互相监督...",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=500&fit=crop",
    author: {
      name: "健身小白",
      avatar: "",
      school: "清华大学",
      isAnonymous: true,
    },
    tags: ["活动", "健身"],
    likes: 156,
    comments: 67,
    participantCount: 2,
    category: "activity",
  },
  {
    id: "d5",
    title: "脱单交友！理工科男生看过来",
    content: "本人文科女，想认识理工科的朋友...",
    image: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&h=450&fit=crop",
    author: {
      name: "匿名",
      avatar: "",
      school: "北京外国语大学",
      isAnonymous: true,
    },
    tags: ["恋爱", "交友"],
    likes: 345,
    comments: 123,
    category: "love",
  },
  {
    id: "d6",
    title: "吐槽一下宿舍室友",
    content: "真的受不了了，每天半夜打游戏...",
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=400&fit=crop",
    author: {
      name: "匿名",
      avatar: "",
      school: "北京航空航天大学",
      isAnonymous: true,
    },
    tags: ["树洞", "吐槽"],
    likes: 678,
    comments: 234,
    category: "vent",
  },
]

export default function DiscoverPage() {
  const router = useRouter()
  const [activeTag, setActiveTag] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const handlePostClick = (id: string) => {
    router.push(`/post/${id}`)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部搜索栏 */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索感兴趣的内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 h-10 bg-input border-0 rounded-full text-sm focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-3 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 w-max">
            {TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200",
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

      {/* 内容列表 */}
      <MasonryGrid posts={DISCOVER_POSTS} onPostClick={handlePostClick} />

      {/* 底部导航 */}
      <BottomNav />
    </div>
  )
}
