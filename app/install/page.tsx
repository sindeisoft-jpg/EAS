"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { InstallWizard } from "@/components/install-wizard"
import { Loader2 } from "lucide-react"

export default function InstallPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)
  const [needsInstall, setNeedsInstall] = useState(false)

  // 来自设置页的「重新安装」等入口会带 reinstall=1，此时即使已安装也显示安装向导
  const forceReinstall = searchParams.get("reinstall") === "1"

  useEffect(() => {
    // 检查安装状态
    const checkInstallStatus = async () => {
      try {
        const response = await fetch("/api/install/status")
        const data = await response.json()

        if (data.installed && !forceReinstall) {
          // 已安装且未强制重新安装，重定向到首页
          router.push("/")
        } else {
          // 未安装，或强制重新安装：显示安装向导
          setNeedsInstall(true)
        }
      } catch (error) {
        // 如果检查失败，假设需要安装
        console.error("检查安装状态失败:", error)
        setNeedsInstall(true)
      } finally {
        setChecking(false)
      }
    }

    checkInstallStatus()
  }, [router, forceReinstall])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在检查安装状态...</p>
        </div>
      </div>
    )
  }

  if (!needsInstall) {
    return null // 等待重定向
  }

  return (
    <InstallWizard
      onComplete={() => {
        // 安装完成，重定向到登录页
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }}
    />
  )
}
