"use client"

import { Home, Compass, Plus, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { id: "home", label: "首页", icon: Home, href: "/" },
  { id: "discover", label: "发现", icon: Compass, href: "/discover" },
  { id: "publish", label: "发布", icon: Plus, href: "/publish", isCenter: true },
  { id: "messages", label: "消息", icon: MessageCircle, href: "/messages" },
  { id: "profile", label: "我的", icon: User, href: "/profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  // 在发布页和详情页隐藏底部导航
  if (pathname === "/publish" || pathname.startsWith("/post/") || pathname === "/auth") {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around h-16 px-2 pb-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          if (item.isCenter) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="relative -mt-5 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Icon className="w-5 h-5 text-primary-foreground" />
              </Link>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
