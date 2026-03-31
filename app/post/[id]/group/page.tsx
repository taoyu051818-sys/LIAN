"use client"

import { ChevronLeft, Send, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface GroupPageProps {
  params: {
    id: string
  }
}

const MEMBERS = [
  {
    id: 1,
    name: "运动达人",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop",
    school: "北京大学",
    role: "发起者",
  },
  {
    id: 2,
    name: "小李",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop",
    school: "清华大学",
  },
  {
    id: 3,
    name: "王五",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop",
    school: "人大",
  },
  {
    id: 4,
    name: "你",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop",
    school: "北邮",
  },
]

const MESSAGES = [
  {
    id: 1,
    author: "运动达人",
    content: "大家好，我是发起者",
    time: "14:30",
    isMe: false,
  },
  {
    id: 2,
    author: "小李",
    content: "我也想去！什么时间呢？",
    time: "14:35",
    isMe: false,
  },
  {
    id: 3,
    author: "运动达人",
    content: "周六晚上7点，五道口体育馆见",
    time: "14:36",
    isMe: false,
  },
  {
    id: 4,
    author: "王五",
    content: "好的，我会准时到！",
    time: "14:40",
    isMe: false,
  },
  {
    id: 5,
    author: "你",
    content: "新手可以吗？",
    time: "14:42",
    isMe: true,
  },
]

export default function GroupPage({ params }: GroupPageProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")

  const handleSendMessage = () => {
    if (message.trim()) {
      // 发送消息
      setMessage("")
    }
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
          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-foreground">周末打球约</p>
            <p className="text-xs text-muted-foreground">4人已加入</p>
          </div>
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 成员卡片 */}
      <div className="px-4 py-4 border-b border-border">
        <p className="text-xs text-muted-foreground mb-2">参与成员</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {MEMBERS.map((member) => (
            <div key={member.id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary">
                <Image
                  src={member.avatar}
                  alt={member.name}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-xs text-foreground text-center max-w-12 truncate">
                {member.name === "你" ? "你" : member.name.split("").slice(0, 2).join("")}
              </p>
              {member.role && (
                <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                  {member.role}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 快捷消息建议 */}
      <div className="px-4 py-3 space-y-2 border-b border-border">
        <p className="text-xs text-muted-foreground">快捷回复</p>
        <div className="flex flex-wrap gap-2">
          {[
            "我会准时到",
            "我可能晚10分钟",
            "新手可以吗",
            "有没有拍子",
          ].map((text) => (
            <Button
              key={text}
              variant="outline"
              size="sm"
              className="text-xs rounded-full h-7"
              onClick={() => setMessage(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      </div>

      {/* 聊天记录 */}
      <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
        {MESSAGES.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                msg.isMe
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-secondary text-secondary-foreground rounded-bl-none"
              }`}
            >
              <p>{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.isMe ? "text-primary-foreground/70" : "text-secondary-foreground/70"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 消息输入框 */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            placeholder="输入消息..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 h-10 rounded-full border-border bg-input"
          />
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90"
            onClick={handleSendMessage}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
