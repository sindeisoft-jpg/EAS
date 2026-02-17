import { NextResponse } from "next/server"
import { requireAuth, AuthenticatedRequest } from "@/lib/middleware"
import path from "path"
import fs from "fs"
import mysql from "mysql2/promise"
import { execSync } from "child_process"

/**
 * 解析 DATABASE_URL，返回可展示的配置（密码脱敏）
 * 仅支持 mysql: mysql://user:password@host:port/database
 */
function parseDatabaseUrl(url: string): {
  type: string
  host: string
  port: number
  database: string
  username: string
  password: string
} | null {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  if (!trimmed.startsWith("mysql://")) return null
  try {
    const match = trimmed.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?&\s]+)/)
    if (!match) return null
    const [, userPart, , host, portStr, dbPart] = match
    const username = decodeURIComponent(userPart)
    const database = decodeURIComponent(dbPart)
    const port = parseInt(portStr, 10)
    return {
      type: "mysql",
      host,
      port: Number.isNaN(port) ? 3306 : port,
      database,
      username,
      password: "***",
    }
  } catch {
    return null
  }
}

async function handleGET(req: AuthenticatedRequest) {
  try {
    const user = req.user!
    if (user.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }
    const url = process.env.DATABASE_URL
    const config = url ? parseDatabaseUrl(url) : null
    if (!config) {
      return NextResponse.json({
        configured: false,
        message: "未配置系统数据库（DATABASE_URL）",
        config: null,
      })
    }
    return NextResponse.json({
      configured: true,
      config,
    })
  } catch (error: unknown) {
    console.error("[Settings] system-database GET error:", error)
    return NextResponse.json({ error: "获取系统数据库配置失败" }, { status: 500 })
  }
}

function buildMysqlConnection(body: Record<string, unknown>): {
  host: string
  port: number
  user: string
  password: string
  database: string
} | null {
  const { host, port, username, password, database } = body
  if (
    !host ||
    !username ||
    !password ||
    !database ||
    typeof host !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof database !== "string"
  ) {
    return null
  }
  return {
    host: String(host).trim(),
    port: Number(port) || 3306,
    user: String(username).trim(),
    password: String(password),
    database: String(database).trim(),
  }
}

async function handlePUT(req: AuthenticatedRequest) {
  try {
    const authUser = req.user!
    if (authUser.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const connection = buildMysqlConnection(body)
    if (!connection) {
      return NextResponse.json(
        { error: "参数不完整", message: "请填写主机、端口、数据库名、用户名和密码" },
        { status: 400 }
      )
    }

    const { host, port, user, password, database } = connection
    const databaseUrl = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`

    // 1. 测试连接（可选：仅确保能连上 MySQL，不强制创建库）
    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
      })
      await conn.ping()
      await conn.end()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      let hint = "请确认数据库服务已启动，且用户名密码正确"
      if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) hint = "请确认 MySQL 服务已启动，且主机和端口正确"
      if (msg.includes("Access denied")) hint = "请检查用户名和密码是否正确"
      if (msg.includes("Unknown database")) hint = "请先创建该数据库，或使用已存在的数据库名"
      return NextResponse.json(
        {
          success: false,
          error: msg,
          message: msg,
          hint,
        },
        { status: 400 }
      )
    }

    // 2. 写入或更新 .env 中的 DATABASE_URL
    const envPath = path.join(process.cwd(), ".env")
    let envContent = ""
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8")
    }
    const newLine = `DATABASE_URL="${databaseUrl}"`
    if (/^\s*DATABASE_URL\s*=/m.test(envContent)) {
      envContent = envContent.replace(/^\s*DATABASE_URL\s*=\s*["']?[^"'\n]*["']?\s*/m, `${newLine}\n`)
    } else {
      envContent = envContent.trimEnd() + (envContent ? "\n" : "") + newLine + "\n"
    }
    fs.writeFileSync(envPath, envContent)

    // 3. 生成 Prisma Client（使新连接在下次请求生效；当前进程仍用旧 env，需重启服务）
    try {
      execSync("pnpm db:generate", { cwd: process.cwd(), stdio: "pipe", encoding: "utf-8" })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({
        success: true,
        message: "配置已写入 .env，但 Prisma 生成失败，请手动执行 pnpm db:generate 并重启服务",
        warning: msg,
      })
    }

    return NextResponse.json({
      success: true,
      message: "系统数据库配置已保存。请重启应用服务后生效。",
      config: parseDatabaseUrl(databaseUrl),
    })
  } catch (error: unknown) {
    console.error("[Settings] system-database PUT error:", error)
    return NextResponse.json({ error: "更新系统数据库配置失败" }, { status: 500 })
  }
}

export const GET = requireAuth(handleGET)
export const PUT = requireAuth(handlePUT)
