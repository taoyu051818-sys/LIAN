"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Home, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type GroupPageProps = {
  params: Promise<{
    id: string
  }>
}

type ChatMessage = {
  mid: number
  content: string
  timestampISO?: string
  fromuid?: number
  user?: {
    username?: string
    picture?: string | null
  }
}

type ChatRoomPayload = {
  roomId?: number
  roomName?: string
  users?: Array<{
    uid?: number
    username?: string
    picture?: string | null
  }>
  messages?: ChatMessage[]
}

export default function GroupPage({ params }: GroupPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [room, setRoom] = useState<ChatRoomPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadRoom() {
    try {
      setLoading(true)
      const response = await fetch(`/api/nodebb/chats/${id}`, { cache: "no-store" })
      if (response.status === 401) {
        window.location.href = "/auth"
        return
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      setRoom(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load room")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoom()
  }, [id])

  const handleSendMessage = async () => {
    if (!message.trim()) {
      return
    }

    try {
      const response = await fetch(`/api/nodebb/chats/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setMessage("")
      await loadRoom()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    }
  }

  const title = room?.roomName || `讨论室 ${id}`

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-12 items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{room?.users?.length || 0} 人已加入</p>
          </div>
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="border-b border-border px-4 py-4">
        <p className="mb-2 text-xs text-muted-foreground">参与成员</p>
        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2">
          {(room?.users || []).map((member) => (
            <div key={member.uid || member.username} className="flex flex-shrink-0 flex-col items-center gap-1">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-primary">
                <Image
                  src={member.picture || "https://placehold.co/40x40/f4f4f5/27272a?text=U"}
                  alt={member.username || "user"}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="max-w-12 truncate text-center text-xs text-foreground">{member.username || "用户"}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">正在加载聊天记录...</div>
      ) : error ? (
        <div className="px-4 py-10 text-center text-sm text-destructive">{error}</div>
      ) : (
        <div className="flex-1 space-y-4 px-4 py-4">
          {(room?.messages || []).map((msg) => (
            <div key={msg.mid} className="flex justify-start">
              <div className="max-w-xs rounded-bl-none rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                <p className="mb-1 text-xs text-muted-foreground">{msg.user?.username || "用户"}</p>
                <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                <p className="mt-1 text-xs text-secondary-foreground/70">
                  {msg.timestampISO
                    ? new Date(msg.timestampISO).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="输入消息..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSendMessage()
              }
            }}
            className="h-10 flex-1 rounded-full border-border bg-input"
          />
          <Button className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90" onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
