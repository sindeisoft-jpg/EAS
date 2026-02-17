"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [checkingInstall, setCheckingInstall] = useState(true)

  useEffect(() => {
    // 首先检查安装状态
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

  useEffect(() => {
    // 安装检查完成后，处理用户认证
    if (!checkingInstall && !isLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, checkingInstall, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-muted-foreground">Loading...</div>
      </div>
    </div>
  )
}
