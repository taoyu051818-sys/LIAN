"use client"

import { Heart, MessageCircle, Bookmark } from "lucide-react"
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
  tags: string[]
  likes: number
  comments: number
  isLiked?: boolean
  isBookmarked?: boolean
}

interface PostCardProps {
  post: PostData
  onLike?: (id: string) => void
  onBookmark?: (id: string) => void
  onClick?: (id: string) => void
  isFirst?: boolean
}

export function PostCard({ post, onLike, onBookmark, onClick, isFirst }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes)
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false)

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLiked(!isLiked)
    setLikes(isLiked ? likes - 1 : likes + 1)
    onLike?.(post.id)
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsBookmarked(!isBookmarked)
    onBookmark?.(post.id)
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
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
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
            <button
              onClick={handleBookmark}
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              <Bookmark
                className={cn(
                  "w-4 h-4 transition-all",
                  isBookmarked && "fill-accent text-accent"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
