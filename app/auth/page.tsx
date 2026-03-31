"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GraduationCap, Mail, ArrowRight, CheckCircle2, X } from "lucide-react"
import Link from "next/link"

type AuthStep = "phone" | "verify" | "school" | "complete"

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [school, setSchool] = useState("")
  const [studentId, setStudentId] = useState("")
  const [countdown, setCountdown] = useState(0)

  const sendCode = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setStep("verify")
  }

  const verifyCode = () => {
    setStep("school")
  }

  const submitSchool = () => {
    setStep("complete")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 关闭按钮 */}
      <div className="absolute top-4 right-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      {/* 顶部区域 */}
      <div className="pt-16 pb-8 px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6">
          <span className="text-primary-foreground font-bold text-2xl">圈</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {step === "phone" && "欢迎加入圈圈"}
          {step === "verify" && "验证手机号"}
          {step === "school" && "校园认证"}
          {step === "complete" && "认证完成"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {step === "phone" && "使用手机号快速登录，开启跨校社交之旅"}
          {step === "verify" && `验证码已发送至 ${phone}`}
          {step === "school" && "完成校园认证，解锁更多功能"}
          {step === "complete" && "你已成功完成认证，开始探索吧"}
        </p>
      </div>

      {/* 表单区域 */}
      <div className="flex-1 px-6">
        {/* 步骤1: 手机号 */}
        {step === "phone" && (
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                +86
              </span>
              <input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={11}
                className="w-full h-12 pl-14 pr-4 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              className="w-full h-12 rounded-xl text-base"
              disabled={phone.length !== 11}
              onClick={sendCode}
            >
              获取验证码
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              登录即表示同意
              <span className="text-primary">《用户协议》</span>
              和
              <span className="text-primary">《隐私政策》</span>
            </p>
          </div>
        )}

        {/* 步骤2: 验证码 */}
        {step === "verify" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={code[i] || ""}
                  onChange={(e) => {
                    const newCode = code.split("")
                    newCode[i] = e.target.value
                    setCode(newCode.join(""))
                    if (e.target.value && e.target.nextElementSibling) {
                      (e.target.nextElementSibling as HTMLInputElement).focus()
                    }
                  }}
                  className="w-full h-12 bg-muted rounded-xl text-center text-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setStep("phone")}
                className="text-muted-foreground"
              >
                更换手机号
              </button>
              <button
                onClick={sendCode}
                disabled={countdown > 0}
                className={cn(
                  "text-primary",
                  countdown > 0 && "text-muted-foreground"
                )}
              >
                {countdown > 0 ? `${countdown}s后重发` : "重新发送"}
              </button>
            </div>
            <Button
              className="w-full h-12 rounded-xl text-base mt-4"
              disabled={code.length !== 6}
              onClick={verifyCode}
            >
              验证
            </Button>
          </div>
        )}

        {/* 步骤3: 学校认证 */}
        {step === "school" && (
          <div className="space-y-4">
            <div className="relative">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="请输入学校名称"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="请输入学校邮箱"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              请使用学校邮箱进行认证，我们将发送验证邮件
            </p>
            <Button
              className="w-full h-12 rounded-xl text-base"
              disabled={!school.trim() || !studentId.trim()}
              onClick={submitSchool}
            >
              提交认证
            </Button>
            <button
              onClick={() => setStep("complete")}
              className="w-full text-center text-sm text-muted-foreground"
            >
              暂时跳过
            </button>
          </div>
        )}

        {/* 步骤4: 完成 */}
        {step === "complete" && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">欢迎来到圈圈</h2>
            <p className="text-sm text-muted-foreground mb-8">
              在这里发现新朋友，探索更大的世界
            </p>
            <Button className="w-full h-12 rounded-xl text-base gap-2" asChild>
              <a href="/">
                开始探索
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* 步骤指示器 */}
      {step !== "complete" && (
        <div className="p-6">
          <div className="flex items-center justify-center gap-2">
            {["phone", "verify", "school"].map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1 rounded-full transition-all",
                  s === step ? "w-6 bg-primary" : "w-1 bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
