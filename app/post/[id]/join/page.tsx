"use client"

import { ChevronLeft, MapPin, Clock, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, use } from "react"

interface JoinPageProps {
  params: Promise<{
    id: string
  }>
}

export default function JoinPage({ params }: JoinPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [identity, setIdentity] = useState("real")
  const [remark, setRemark] = useState("")

  const handleJoin = () => {
    // 加入成功，导航到临时群页
    router.push(`/post/${id}/group`)
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
          <span className="text-sm font-medium text-muted-foreground">确认加入</span>
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 内容区 */}
      <div className="px-4 py-6 space-y-6">
        {/* 活动信息概览 */}
        <div className="space-y-3 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">周末一起打羽毛球吗？</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>周六 19:00</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>五道口体育馆</span>
          </div>
        </div>

        {/* 加入方式选择 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">你想如何参与？</h3>
          <RadioGroup value={identity} onValueChange={setIdentity} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50">
              <RadioGroupItem value="real" id="real" />
              <Label htmlFor="real" className="flex-1 cursor-pointer">
                <p className="font-medium text-foreground">我也去</p>
                <p className="text-xs text-muted-foreground">实名加入，让大家认识你</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50">
              <RadioGroupItem value="observe" id="observe" />
              <Label htmlFor="observe" className="flex-1 cursor-pointer">
                <p className="font-medium text-foreground">先围观</p>
                <p className="text-xs text-muted-foreground">加入群聊，还在犹豫中</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50">
              <RadioGroupItem value="ask" id="ask" />
              <Label htmlFor="ask" className="flex-1 cursor-pointer">
                <p className="font-medium text-foreground">想问一下</p>
                <p className="text-xs text-muted-foreground">我有疑问，先提问</p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50">
              <RadioGroupItem value="beginner" id="beginner" />
              <Label htmlFor="beginner" className="flex-1 cursor-pointer">
                <p className="font-medium text-foreground">我是新手</p>
                <p className="text-xs text-muted-foreground">没经验，但很想学</p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 留言框（可选） */}
        <div className="space-y-2">
          <Label htmlFor="remark" className="text-sm font-medium text-foreground">
            留一句话 <span className="text-muted-foreground">（可选）</span>
          </Label>
          <Textarea
            id="remark"
            placeholder="比如：我有自己的拍子 / 新手希望大家多指教 / 周六下午3点能到"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="min-h-20 resize-none rounded-lg border-border bg-input text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* 信息提示 */}
        <div className="p-3 bg-secondary/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            ℹ️ 加入后，你会自动进入这个活动的临时群聊。大家可以在这里确认时间地点、交流联系方式。
          </p>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background border-t border-border space-y-2">
        <Button
          onClick={handleJoin}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg"
        >
          确认加入
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="w-full h-10 rounded-lg"
        >
          取消
        </Button>
      </div>
    </div>
  )
}
