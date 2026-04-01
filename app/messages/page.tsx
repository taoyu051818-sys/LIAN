"use client"

import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav"

type ChatRoom = {
  roomId: number
  roomName?: string
  user?: {
    username?: string
    picture?: string | null
  }
  teaser?: {
    content?: string
    timestampISO?: string
  }
  userCount?: number
  unread?: boolean
  unreadCount?: number
}

export default function MessagesPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadRooms() {
      try {
        setLoading(true)
        const response = await fetch("/api/nodebb/chats", { cache: "no-store" })
        if (response.status === 401) {
          window.location.href = "/auth"
          return
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        if (active) {
          setRooms(data.rooms || [])
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load chats")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadRooms()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-12 items-center px-4">
          <h1 className="text-lg font-bold text-foreground">消息</h1>
        </div>
      </header>

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">正在加载聊天...</div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-destructive">{error}</div>
      ) : rooms.length ? (
        <div className="divide-y divide-border">
          {rooms.map((room) => {
            const title = room.roomName || room.user?.username || `房间 ${room.roomId}`
            const image =
              room.user?.picture ||
              "https://placehold.co/100x100/f4f4f5/27272a?text=Chat"

            return (
              <Link
                key={room.roomId}
                href={`/post/${room.roomId}/group`}
                className="flex gap-3 px-4 py-3 transition-colors active:bg-muted"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={image} alt={title} fill className="object-cover" />
                  {!!room.unreadCount && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {room.unreadCount}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between">
                    <h3 className="truncate font-semibold text-foreground">{title}</h3>
                    <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                      {room.teaser?.timestampISO
                        ? new Date(room.teaser.timestampISO).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="mb-1 truncate text-sm text-muted-foreground">
                    {room.teaser?.content || "还没有消息"}
                  </p>
                  <p className="text-xs text-muted-foreground">{room.userCount || 0} 人参与</p>
                </div>

                <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mt-20 text-center text-sm text-muted-foreground">还没有消息</div>
      )}

      <BottomNav />
    </div>
  )
}
