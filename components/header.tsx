"use client"

import { Bell } from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  title?: string
  showNotification?: boolean
}

export function Header({ title = "圈圈", showNotification = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="px-4 h-12 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">圈</span>
          </div>
          <span className="font-semibold text-foreground text-lg">{title}</span>
        </div>

        {/* 通知按钮 */}
        {showNotification && (
          <Link href="/notifications" className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </Link>
        )}
      </div>
    </header>
  )
}
