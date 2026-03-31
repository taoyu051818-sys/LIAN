"use client"

import { LogOut, Settings, Heart, Bookmark, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav"

export default function ProfilePage() {
  const userProfile = {
    name: "李明",
    school: "北京大学",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    bio: "喜欢打球，爱好摄影，一直在寻找志同道合的小伙伴",
    joinDate: "加入于2个月前",
    stats: {
      posts: 12,
      followers: 342,
      following: 89,
    },
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="h-12 px-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">我的</h1>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* 个人信息卡 */}
      <div className="px-4 py-6 space-y-4">
        {/* 头像和基本信息 */}
        <div className="flex gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={userProfile.avatar}
              alt={userProfile.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-foreground">{userProfile.name}</h2>
            <p className="text-sm text-muted-foreground">{userProfile.school}</p>
            <p className="text-xs text-muted-foreground mt-1">{userProfile.joinDate}</p>
          </div>
        </div>

        {/* 签名 */}
        <p className="text-sm text-foreground leading-relaxed">{userProfile.bio}</p>

        {/* 统计数据 */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="text-center py-2">
            <p className="text-lg font-bold text-foreground">{userProfile.stats.posts}</p>
            <p className="text-xs text-muted-foreground">发布</p>
          </div>
          <div className="text-center py-2">
            <p className="text-lg font-bold text-foreground">{userProfile.stats.followers}</p>
            <p className="text-xs text-muted-foreground">粉丝</p>
          </div>
          <div className="text-center py-2">
            <p className="text-lg font-bold text-foreground">{userProfile.stats.following}</p>
            <p className="text-xs text-muted-foreground">关注</p>
          </div>
        </div>

        {/* 编辑按钮 */}
        <Button variant="outline" className="w-full h-10 rounded-lg">
          编辑个人资料
        </Button>
      </div>

      {/* 功能菜单 */}
      <div className="px-4 py-4 space-y-2 border-t border-border">
        <Link
          href="#"
          className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">我的赞</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="#"
          className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bookmark className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">我的收藏</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="#"
          className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">我的成就</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {/* 底部退出登录 */}
      <div className="px-4 mt-8">
        <Button
          variant="outline"
          className="w-full h-10 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/5"
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}

interface ChevronRightProps {
  className?: string
}

function ChevronRight({ className }: ChevronRightProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  )
}
