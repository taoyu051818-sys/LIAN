"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Lock, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AuthPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/nodebb/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          remember: true,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      window.location.href = "/profile"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="absolute right-4 top-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="px-6 pb-8 pt-16">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <span className="text-2xl font-bold text-primary-foreground">N</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">登录圈圈账号</h1>
        <p className="text-sm text-muted-foreground">登录后即可使用点赞、收藏、群聊和个人资料。</p>
      </div>

      <div className="flex-1 px-6">
        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="用户名或邮箱"
              className="h-12 rounded-xl border-0 bg-muted pl-12"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密码"
              className="h-12 rounded-xl border-0 bg-muted pl-12"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            className="h-12 w-full rounded-xl text-base"
            disabled={loading || !username.trim() || !password.trim()}
            onClick={handleLogin}
          >
            {loading ? "登录中..." : "登录"}
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Button variant="ghost" className="h-12 w-full rounded-xl gap-2" asChild>
          <a href="/">
            先去逛逛
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}
