"use client"

import { useState, FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Mail, Lock, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [checkingInstall, setCheckingInstall] = useState(true)
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 检查安装状态
    const checkInstallStatus = async () => {
      try {
        const response = await fetch("/api/install/status")
        const data = await response.json()

        if (!data.installed) {
          // 未安装，重定向到安装页
          router.push("/install")
          return
        }
      } catch (error) {
        // 如果检查失败，假设需要安装
        console.error("检查安装状态失败:", error)
        router.push("/install")
        return
      } finally {
        setCheckingInstall(false)
      }
    }

    checkInstallStatus()
  }, [router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(username, password)
      router.push("/dashboard")
    } catch (err: any) {
      if ((err as any).code === "INSTALL_REQUIRED") {
        router.push("/install")
        return
      }
      setError(err.message || "登录失败，请检查您的用户名和密码")
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingInstall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-muted-foreground">正在检查安装状态...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4 overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md p-10 relative z-10 bg-card/90 backdrop-blur-2xl border-primary/30 shadow-premium-lg">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/30 shadow-premium">
              <Logo size="xl" showText={false} />
            </div>
            <Sparkles className="w-6 h-6 text-primary absolute -top-1 -right-1 animate-pulse drop-shadow-lg" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 tracking-tight gradient-text">紫鈊BI系统</h1>
            <p className="text-sm text-muted-foreground font-medium">智能数据分析，AI驱动</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-semibold text-foreground">用户名</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60 z-10" />
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名或邮箱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="pl-11 h-12 rounded-lg"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">密码</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60 z-10" />
              <Input
                id="password"
                type="password"
                placeholder="请输入您的密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-11 h-12 rounded-lg"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="rounded-lg border-2 border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full h-12 text-base font-semibold rounded-lg shadow-premium-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                登录中...
              </>
            ) : (
              "登录"
            )}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg backdrop-blur-sm">
          <p className="text-xs text-muted-foreground text-center leading-relaxed font-medium">
            默认管理员账号：admin / admin123
          </p>
        </div>
      </Card>
    </div>
  )
}
