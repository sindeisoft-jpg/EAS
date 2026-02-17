"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Database,
  Settings,
  CheckCircle2,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: "welcome", title: "欢迎", icon: Sparkles },
  { id: "database-type", title: "选择数据库", icon: Database },
  { id: "database-config", title: "配置数据库", icon: Settings },
  { id: "test-connection", title: "测试连接", icon: CheckCircle2 },
  { id: "init-database", title: "初始化", icon: Database },
  { id: "complete", title: "完成", icon: CheckCircle2 },
] as const

interface InstallWizardProps {
  onComplete?: () => void
}

export function InstallWizard({ onComplete }: InstallWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initErrorCode, setInitErrorCode] = useState<string | null>(null)
  const [databaseType, setDatabaseType] = useState<"mysql" | "sqlite">("mysql")
  const [mysqlConfig, setMysqlConfig] = useState({
    host: "127.0.0.1",
    port: 3306,
    username: "root",
    password: "",
    database: "enterprise_ai_bi",
  })
  const [sqliteConfig, setSqliteConfig] = useState({
    databasePath: "./data/database.sqlite",
  })
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    code?: string
  } | null>(null)
  const [adminCreated, setAdminCreated] = useState(false)

  const handleNext = async () => {
    const stepId = STEPS[currentStep].id
    if (currentStep === STEPS.length - 1) {
      onComplete?.() ?? router.push("/login")
      return
    }
    if (stepId === "test-connection") {
      if (testResult?.success) {
        setCurrentStep((s) => s + 1)
        setError(null)
        return
      }
      await handleTestConnection()
      return
    }
    if (stepId === "init-database") {
      await handleInitDatabase()
      return
    }
    setCurrentStep((s) => s + 1)
    setError(null)
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
      setError(null)
      setTestResult(null)
      if (STEPS[currentStep].id === "init-database") setInitErrorCode(null)
    }
  }

  const parseJsonResponse = async (
    res: Response
  ): Promise<{ data: Record<string, unknown> | null; rawText: string }> => {
    const text = await res.text()
    if (!text.trim()) return { data: null, rawText: text }
    try {
      return { data: JSON.parse(text) as Record<string, unknown>, rawText: text }
    } catch {
      return { data: null, rawText: text }
    }
  }

  const invalidResponseError = (res: Response, rawText: string): string => {
    const statusHint = res.status !== 200 ? ` (HTTP ${res.status})` : ""
    const bodyHint =
      rawText && rawText.length > 0
        ? ` 响应非 JSON，请检查接口是否正常。若为 500 可查看终端或服务器日志。`
        : " 响应为空，请确认安装接口路由已正确配置。"
    return `服务器未返回有效数据${statusHint}，请确认安装接口已正确配置。${bodyHint}`
  }

  const handleTestConnection = async () => {
    setLoading(true)
    setError(null)
    setTestResult(null)
    try {
      const config = databaseType === "mysql" ? mysqlConfig : sqliteConfig
      const res = await fetch("/api/install/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: databaseType, ...config }),
      })
      const { data, rawText } = await parseJsonResponse(res)
      if (!data) {
        setTestResult({
          success: false,
          message: invalidResponseError(res, rawText),
        })
        setError(null)
        return
      }
      if (data.success) {
        setTestResult({ success: true, message: (data.message as string) || "连接成功" })
        setError(null)
        setTimeout(() => setCurrentStep((s) => s + 1), 1000)
      } else {
        const msg = (data.error as string) || (data.message as string) || "连接失败"
        const hint = data.hint as string | undefined
        const code = data.code as string | undefined
        setTestResult({
          success: false,
          message: hint ? `${msg}\n提示: ${hint}` : msg,
          code,
        })
        setError(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "测试连接失败"
      setTestResult({ success: false, message: msg })
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInitDatabase = async () => {
    setLoading(true)
    setError(null)
    setInitErrorCode(null)
    try {
      const config = databaseType === "mysql" ? mysqlConfig : sqliteConfig
      
      // 1. 初始化数据库
      const initRes = await fetch("/api/install/init-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: databaseType, ...config }),
      })
      const { data: initData, rawText: initRawText } = await parseJsonResponse(initRes)
      if (!initData) {
        setError(invalidResponseError(initRes, initRawText))
        return
      }
      if (!initData.success) {
        const code = (initData.code as string) || null
        setInitErrorCode(code)
        // MARIADB_PROC_UPGRADE 时简短展示，详情在下方卡片中，避免刷屏
        if (code === "MARIADB_PROC_UPGRADE") {
          setError("MariaDB 系统表需升级，请按下方步骤操作。")
        } else {
          const msg = (initData.error as string) || (initData.message as string) || "数据库初始化失败"
          const details = initData.details as string | undefined
          const hint = initData.hint as string | undefined
          setError(details ? `${msg}\n${details}` : hint ? `${msg}\n${hint}` : msg)
        }
        return
      }

      // 2. 自动创建默认管理员账户
      const adminRes = await fetch("/api/install/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const { data: adminData, rawText: adminRawText } = await parseJsonResponse(adminRes)
      if (!adminData) {
        setError(invalidResponseError(adminRes, adminRawText))
        return
      }
      if (!adminData.success) {
        const msg = (adminData.error as string) || (adminData.message as string) || "创建管理员账户失败"
        setError(msg)
        return
      }

      // 3. 设置管理员创建状态并进入下一步
      setAdminCreated(true)
      setError(null)
      setInitErrorCode(null)
      setCurrentStep((s) => s + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "数据库初始化失败")
      setInitErrorCode(null)
    } finally {
      setLoading(false)
    }
  }


  const renderStepContent = () => {
    const step = STEPS[currentStep].id
    switch (step) {
      case "welcome":
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center border-2 border-blue-200 shadow-md">
                <Sparkles className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2 text-blue-800">欢迎使用紫鈊BI系统</h2>
              <p className="text-blue-600">
                智能数据分析平台，AI 驱动的自然语言查询和可视化
              </p>
            </div>
            <p className="text-sm text-blue-500">
              请按步骤完成数据库配置与管理员账户创建
            </p>
          </div>
        )
      case "database-type":
        return (
          <div className="space-y-6">
            <p className="text-blue-600">选择系统将使用的数据库类型（点击卡片切换）</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                className={cn(
                  "cursor-pointer transition-all border-2",
                  databaseType === "mysql"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                )}
                onClick={() => setDatabaseType("mysql")}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg text-blue-800">MySQL</CardTitle>
                  {databaseType === "mysql" && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                      已选
                    </span>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-blue-600">
                  适用于生产环境，支持多用户与高并发（推荐，安装向导支持）
                </CardContent>
              </Card>
              <Card
                className={cn(
                  "cursor-pointer transition-all border-2",
                  databaseType === "sqlite"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                )}
                onClick={() => setDatabaseType("sqlite")}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg text-blue-800">SQLite</CardTitle>
                  {databaseType === "sqlite" && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                      已选
                    </span>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-blue-600">
                  轻量级，适合开发或单机部署（需手动配置，向导暂不支持自动建表）
                </CardContent>
              </Card>
            </div>
          </div>
        )
      case "database-config":
        return (
          <div className="space-y-6">
            {databaseType === "mysql" ? (
              <div className="grid gap-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>主机</Label>
                    <Input
                      value={mysqlConfig.host}
                      onChange={(e) =>
                        setMysqlConfig((c) => ({ ...c, host: e.target.value }))
                      }
                      placeholder="127.0.0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>端口</Label>
                    <Input
                      type="number"
                      value={mysqlConfig.port}
                      onChange={(e) =>
                        setMysqlConfig((c) => ({
                          ...c,
                          port: Number(e.target.value) || 3306,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    value={mysqlConfig.username}
                    onChange={(e) =>
                      setMysqlConfig((c) => ({ ...c, username: e.target.value }))
                    }
                    placeholder="root"
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <Input
                    type="password"
                    value={mysqlConfig.password}
                    onChange={(e) =>
                      setMysqlConfig((c) => ({ ...c, password: e.target.value }))
                    }
                    placeholder="数据库密码（XAMPP 默认留空）"
                  />
                </div>
                <div className="space-y-2">
                  <Label>数据库名</Label>
                  <Input
                    value={mysqlConfig.database}
                    onChange={(e) =>
                      setMysqlConfig((c) => ({ ...c, database: e.target.value }))
                    }
                    placeholder="enterprise_ai_bi"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>数据库文件路径</Label>
                <Input
                  value={sqliteConfig.databasePath}
                  onChange={(e) =>
                    setSqliteConfig((c) => ({
                      ...c,
                      databasePath: e.target.value,
                    }))
                  }
                  placeholder="./data/database.sqlite"
                />
              </div>
            )}
          </div>
        )
      case "test-connection":
        return (
          <div className="space-y-6">
            <p className="text-blue-600">
              点击「下一步」测试当前配置是否能连接数据库
            </p>
            {testResult && (
              <>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg p-4 text-sm border",
                    testResult.success
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  )}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0" />
                  )}
                  <span className="whitespace-pre-wrap">
                    {testResult.code === "SQLITE_BINDINGS_NOT_BUILT"
                      ? "SQLite 驱动未正确编译（找不到 better_sqlite3 原生模块）"
                      : testResult.message}
                  </span>
                </div>
                {testResult && !testResult.success && testResult.code === "SQLITE_BINDINGS_NOT_BUILT" && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-base text-amber-800">如何解决</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-amber-700">
                      <p>better-sqlite3 需要针对当前 Node 版本和系统编译。请按顺序尝试：</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          在项目根目录执行：<code className="rounded bg-amber-100 px-1">pnpm rebuild better-sqlite3</code>
                        </li>
                        <li>
                          若仍报错，请安装 Xcode 命令行工具（终端执行{" "}
                          <code className="rounded bg-amber-100 px-1">xcode-select --install</code>）后重新执行上一步。
                        </li>
                        <li>
                          或改用 MySQL：点击「上一步」回到「选择数据库」选择 MySQL，使用 XAMPP 等完成安装。
                        </li>
                      </ol>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )
      case "init-database":
        return (
          <div className="space-y-6">
            <p className="text-blue-600">
              将创建系统所需的表结构，请点击「下一步」执行初始化
            </p>
            {databaseType === "sqlite" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base text-amber-800">当前安装向导仅支持 MySQL 初始化</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-amber-700">
                  <p>您已选择 SQLite，无法在本页自动建表。请任选其一：</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      <strong className="text-amber-900">改用 MySQL</strong>：点击「上一步」回到「选择数据库」选择 MySQL，并使用 XAMPP 等中的 MariaDB 完成安装。
                    </li>
                    <li>
                      <strong className="text-amber-900">手动配置 SQLite</strong>：在 .env 中设置 <code className="rounded bg-amber-100 px-1">DATABASE_URL="file:./data/dev.db"</code>，将 Prisma schema 改为 sqlite 后执行 <code className="rounded bg-amber-100 px-1">pnpm db:push</code>。
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}
            {error && initErrorCode === "SQLITE_NOT_SUPPORTED" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base text-amber-800">当前仅支持 MySQL 初始化</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-700">
                  请按上方说明改用 MySQL（如 XAMPP 中的 MariaDB）完成安装，或手动配置 SQLite。
                </CardContent>
              </Card>
            )}
            {error && initErrorCode === "MARIADB_PROC_UPGRADE" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base text-amber-800">MariaDB 系统表需要升级</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-amber-700">
                    请按以下步骤在运行 MariaDB 的服务器上执行升级后，再点击「重试」。
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      本机：在终端执行{" "}
                      <code className="rounded bg-amber-100 px-1">mysql_upgrade -u root -p</code>
                    </li>
                    <li>
                      Docker：执行{" "}
                      <code className="rounded bg-amber-100 px-1">
                        docker exec -it <容器名> mysql_upgrade -u root -p
                      </code>
                    </li>
                    <li>执行完成后，点击下方「重试」再次初始化</li>
                  </ol>
                  <Button type="button" onClick={handleInitDatabase} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    重试
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )
      case "complete":
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-200 shadow-md">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 text-green-800">安装完成</h2>
              <p className="text-green-600">
                系统已就绪，点击「完成」将跳转到登录页
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium mb-2 text-blue-800">默认管理员账户</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-600">用户名：</span>
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">admin</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">密码：</span>
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">admin123</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">姓名：</span>
                  <span className="text-blue-800">管理员</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">邮箱：</span>
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">admin@admin.com</code>
                </div>
              </div>
              <p className="text-xs text-blue-500 mt-3">
                提示：登录后请及时修改密码，并可在个人设置中更新邮箱等信息。
              </p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1
  const isFirst = currentStep === 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="w-full max-w-2xl shadow-xl border-2 border-blue-100">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "flex items-center gap-1",
                  i < currentStep && "text-blue-700",
                  i === currentStep && "font-bold text-blue-800"
                )}
              >
                {i > 0 && <span className="mx-1">/</span>}
                <s.icon className="h-4 w-4" />
                {s.title}
              </span>
            ))}
          </div>
          <CardTitle className="text-xl text-blue-900">{step.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 bg-white">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
          {renderStepContent()}
          <div className="mt-8 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={isFirst || loading}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              上一步
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLast ? "完成" : "下一步"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
