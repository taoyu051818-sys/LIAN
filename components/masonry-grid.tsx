"use client"

import { useMemo } from "react"
import { PostCard, type PostData } from "./post-card"

interface MasonryGridProps {
  posts: PostData[]
  onPostClick?: (id: string) => void
}

export function MasonryGrid({ posts, onPostClick }: MasonryGridProps) {
  // 使用 useMemo 确保列分配在客户端和服务端一致
  const columnPosts = useMemo(() => {
    const columns: PostData[][] = [[], []]
    
    // 简单交替分配，完全确定性
    posts.forEach((post, index) => {
      columns[index % 2].push(post)
    })
    
    return columns
  }, [posts])

  return (
    <div className="px-3 py-4 grid grid-cols-2 gap-2.5">
      {columnPosts.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-2.5">
          {column.map((post, postIndex) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onClick={onPostClick} 
              isFirst={postIndex === 0}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
