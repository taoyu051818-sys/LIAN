"use client"

import { ChevronLeft, Heart, MessageCircle, Share2, Users, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, use } from "react"
import type { PostData } from "@/components/post-card"

interface PostDetailPageProps {
  params: Promise<{
    id: string
  }>
}

// 模拟数据
const MOCK_POST: PostData = {
  id: "1",
  title: "周末一起打羽毛球吗？五道口附近",
  content: "有没有爱好羽毛球的小伙伴，周末想约一场友谊赛。我们是初级水平，主要是为了放松和交友。时间可以灵活安排，地点在五道口附近。如果你也感兴趣，欢迎加入！",
  image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&h=800&fit=crop",
  author: {
    name: "运动达人",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    school: "北京大学",
    isAnonymous: false,
  },
  tags: ["活动", "运动"],
  likes: 67,
  comments: 23,
  participantCount: 3,
}

const COMMENTS = [
  {
    id: 1,
    author: "小李",
    school: "清华大学",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop",
    content: "我也想去！什么时间呢？",
    time: "2小时前",
    likes: 5,
  },
  {
    id: 2,
    author: "匿名",
    school: "北邮",
    avatar: "",
    content: "新手可以吗？",
    time: "1小时前",
    likes: 2,
  },
  {
    id: 3,
    author: "王五",
    school: "人大",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop",
    content: "我报名了，已经加入小群！",
    time: "30分钟前",
    likes: 8,
  },
]

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(MOCK_POST.likes)

  const handleLike = () => {
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
  }

  const handleJoin = () => {
    // 导航到加入页面
    router.push(`/post/${id}/join`)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="h-12 px-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">详情</span>
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 内容区 */}
      <div className="px-4 py-4 space-y-4">
        {/* 图片 */}
        <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted">
          <Image
            src={MOCK_POST.image}
            alt={MOCK_POST.title}
            fill
            priority
            className="object-cover"
          />
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {MOCK_POST.title}
        </h1>

        {/* 作者信息 */}
        <div className="flex items-center gap-3 py-3 border-b border-border">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {MOCK_POST.author.avatar && (
              <Image
                src={MOCK_POST.author.avatar}
                alt={MOCK_POST.author.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {MOCK_POST.author.isAnonymous ? "匿名用户" : MOCK_POST.author.name}
            </p>
            <p className="text-xs text-muted-foreground">{MOCK_POST.author.school}</p>
          </div>
        </div>

        {/* 参与情况 */}
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">
            已有 <span className="font-semibold">{MOCK_POST.participantCount}</span> 人加入
          </span>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2">
          {MOCK_POST.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 正文 */}
        <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
          {MOCK_POST.content}
        </p>

        {/* 互动统计 */}
        <div className="flex items-center gap-4 py-3 border-y border-border text-sm text-muted-foreground">
          <span>{likeCount} 赞</span>
          <span>{MOCK_POST.comments} 评论</span>
        </div>

        {/* 互动按钮 */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="gap-2 rounded-lg h-10"
            onClick={handleLike}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-primary text-primary" : ""}`} />
            <span className="text-xs">{liked ? "已赞" : "赞"}</span>
          </Button>
          <Button variant="outline" className="gap-2 rounded-lg h-10">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">评论</span>
          </Button>
          <Button variant="outline" className="gap-2 rounded-lg h-10">
            <Share2 className="w-4 h-4" />
            <span className="text-xs">分享</span>
          </Button>
        </div>

        {/* 评论区 */}
        <div className="space-y-3 pt-4">
          <h3 className="font-semibold text-foreground">评论</h3>
          {COMMENTS.map((comment) => (
            <div key={comment.id} className="flex gap-3 pb-3 border-b border-border">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {comment.avatar && (
                  <Image
                    src={comment.avatar}
                    alt={comment.author}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{comment.author}</p>
                  <p className="text-xs text-muted-foreground">{comment.school}</p>
                  <p className="text-xs text-muted-foreground ml-auto">{comment.time}</p>
                </div>
                <p className="text-sm text-foreground">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="h-4" />
      </div>

      {/* 浮动按钮 */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background border-t border-border">
        <Button
          onClick={handleJoin}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg"
        >
          我也去
        </Button>
      </div>
    </div>
  )
}
