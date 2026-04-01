"use client"

import { Heart } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

export interface PostData {
  id: string
  title: string
  content: string
  image: string
  author: {
    name: string
    avatar: string
    school: string
    isAnonymous: boolean
  }
  tags: Array<string | { value?: string }>
  likes: number
  comments: number
  participantCount?: number
  isLiked?: boolean
  isBookmarked?: boolean
}

interface PostCardProps {
  post: PostData
  onLike?: (post: PostData, nextLiked: boolean) => Promise<boolean | void> | boolean | void
  onClick?: (id: string) => void
  isFirst?: boolean
}

export function PostCard({ post, onLike, onClick, isFirst }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes)
  const safeTags = (post.tags || [])
    .map((tag) => (typeof tag === "string" ? tag : tag?.value || ""))
    .map((tag) => String(tag).trim())
    .filter(Boolean)

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextLiked = !isLiked
    const prevLiked = isLiked
    const prevLikes = likes

    setIsLiked(nextLiked)
    setLikes((value) => Math.max(0, value + (nextLiked ? 1 : -1)))

    try {
      const result = await onLike?.(post, nextLiked)
      if (result === false) {
        throw new Error("like failed")
      }
    } catch {
      setIsLiked(prevLiked)
      setLikes(prevLikes)
    }
  }

  return (
    <div
      className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onClick?.(post.id)}
    >
      {/* 图片区域 */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={post.image}
          alt={post.title}
          fill
          loading={isFirst ? "eager" : "lazy"}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* 标签悬浮 */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {safeTags.slice(0, 2).map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="px-2 py-0.5 bg-background/80 backdrop-blur-sm text-xs rounded-full text-foreground/80"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-card-foreground line-clamp-2 leading-relaxed mb-2">
          {post.title}
        </h3>

        {/* 作者信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-full overflow-hidden bg-muted">
              {post.author.isAnonymous ? (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs text-primary">匿</span>
                </div>
              ) : (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {post.author.isAnonymous ? "匿名用户" : post.author.name}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {post.author.school}
              </span>
            </div>
          </div>

          {/* 互动区域 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className="flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Heart
                className={cn(
                  "w-4 h-4 transition-all",
                  isLiked && "fill-primary text-primary scale-110"
                )}
              />
              <span className="text-xs">{likes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
