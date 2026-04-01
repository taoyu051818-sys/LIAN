"use client"

import Link from "next/link"
import { BadgeCheck, ChevronLeft, CircleHelp, GraduationCap, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ProfileVerifyPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-12 items-center px-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-2 text-base font-semibold text-foreground">高校身份验证</h1>
        </div>
      </header>

      <div className="space-y-4 px-4 py-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">验证后可获得</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              更高账号可信度与认证标识
            </li>
            <li className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              校园相关功能优先开放
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">验证方式</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            目前支持通过学校邮箱进行验证。后续可扩展为学号、校园统一身份或第三方认证方式。
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <CircleHelp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">状态说明</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            当前为前端验证流程页，后端审核与材料提交接口将在下一步接入。
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
        <Button
          disabled
          className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          开始高校身份验证（即将接入）
        </Button>
      </div>
    </div>
  )
}
