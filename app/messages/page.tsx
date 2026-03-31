"use client"

import { ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav"

interface Message {
  id: string
  title: string
  lastMessage: string
  participantCount: number
  unread: number
  time: string
  image: string
}

const MESSAGES: Message[] = [
  {
    id: "1",
    title: "周末打球约",
    lastMessage: "我会准时到",
    participantCount: 4,
    unread: 0,
    time: "2分钟前",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=100&h=100&fit=crop",
  },
  {
    id: "2",
    title: "AI比赛组队",
    lastMessage: "你好，我想加入你们的队伍",
    participantCount: 3,
    unread: 1,
    time: "5分钟前",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=100&h=100&fit=crop",
  },
  {
    id: "3",
    title: "日语学习小组",
    lastMessage: "明天一起去图书馆吗",
    participantCount: 2,
    unread: 0,
    time: "1小时前",
    image: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=100&h=100&fit=crop",
  },
]

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="h-12 px-4 flex items-center">
          <h1 className="text-lg font-bold text-foreground">消息</h1>
        </div>
      </header>

      {/* 消息列表 */}
      <div className="divide-y divide-border">
        {MESSAGES.map((msg) => (
          <Link
            key={msg.id}
            href={`/post/${msg.id}/group`}
            className="px-4 py-3 flex gap-3 active:bg-muted transition-colors"
          >
            {/* 图片 */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <Image
                src={msg.image}
                alt={msg.title}
                fill
                className="object-cover"
              />
              {msg.unread > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {msg.unread}
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {msg.title}
                </h3>
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {msg.time}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mb-1">
                {msg.lastMessage}
              </p>
              <p className="text-xs text-muted-foreground">
                {msg.participantCount} 人参与
              </p>
            </div>

            {/* 箭头 */}
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* 空状态提示 */}
      {MESSAGES.length === 0 && (
        <div className="mt-20 text-center">
          <p className="text-sm text-muted-foreground">还没有消息呢</p>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
