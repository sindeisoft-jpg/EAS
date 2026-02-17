import { NextResponse } from "next/server"
import mysql from "mysql2/promise"
import path from "path"
import type { DatabaseConnection } from "@/lib/types"

/**
 * 安装向导：测试数据库连接（无需登录），失败时返回具体错误信息便于排查
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const type = body && typeof body === "object" ? body.type : undefined

    if (!type) {
      return NextResponse.json(
        { success: false, error: "缺少数据库类型", message: "请选择数据库类型" },
        { status: 400 }
      )
    }

    const connection = buildConnectionFromBody(type, body)
    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: "参数不完整",
          message: type === "sqlite" ? "请填写数据库路径" : "请填写主机、用户名、密码和数据库名",
        },
        { status: 400 }
      )
    }

    const result = await testConnectionWithMessage(connection as DatabaseConnection)
    if (result.success) {
      return NextResponse.json({ success: true, message: "连接成功" })
    }
    const res: Record<string, unknown> = {
      success: false,
      error: result.message,
      message: result.message,
      hint: result.hint,
    }
    if ("code" in result && result.code) res.code = result.code
    return NextResponse.json(res)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "测试连接失败"
    const isBindingsError =
      /bindings\s*file|better_sqlite3\.node|Could not locate/i.test(message) ||
      message.includes("better_sqlite3")
    console.error("[install] test-connection error:", err)
    if (isBindingsError) {
      return NextResponse.json({
        success: false,
        error: "SQLite 驱动未正确编译",
        message: "SQLite 驱动未正确编译（找不到 better_sqlite3 原生模块）",
        hint: "请在项目根目录执行：pnpm rebuild better-sqlite3。若仍失败，请安装 Xcode 命令行工具（终端执行 xcode-select --install）后重试，或改用 MySQL 完成安装。",
        code: "SQLITE_BINDINGS_NOT_BUILT",
      })
    }
    return NextResponse.json(
      {
        success: false,
        error: message,
        message,
        hint: "请确认数据库服务已启动、地址端口正确、用户名密码无误",
      },
      { status: 500 }
    )
  }
}

async function testConnectionWithMessage(
  connection: DatabaseConnection
): Promise<{ success: true } | { success: false; message: string; hint?: string; code?: string }> {
  try {
    if (connection.type === "mysql") {
      const baseConfig = {
        host: connection.host,
        port: connection.port,
        user: connection.username,
        password: connection.password,
        ssl: connection.ssl ? {} : undefined,
      }
      try {
        const conn = await mysql.createConnection({
          ...baseConfig,
          database: connection.database,
        })
        await conn.execute("SELECT 1")
        await conn.end()
        return { success: true }
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr)
        if (msg.includes("Unknown database") || msg.includes("ER_BAD_DB_ERROR")) {
          const connNoDb = await mysql.createConnection(baseConfig)
          try {
            const dbName = connection.database.replace(/`/g, "``")
            await connNoDb.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
          } finally {
            await connNoDb.end()
          }
          const conn2 = await mysql.createConnection({
            ...baseConfig,
            database: connection.database,
          })
          await conn2.execute("SELECT 1")
          await conn2.end()
          return { success: true }
        }
        throw firstErr
      }
    }
    if (connection.type === "sqlite") {
      let dbPath = connection.database
      if (!dbPath) return { success: false, message: "未填写数据库路径" }
      if (!path.isAbsolute(dbPath)) {
        dbPath = path.join(process.cwd(), dbPath)
      }
      let Database: typeof import("better-sqlite3")["default"]
      try {
        const mod = await import("better-sqlite3")
        Database = mod.default
      } catch (loadErr: unknown) {
        const loadMsg = loadErr instanceof Error ? loadErr.message : String(loadErr)
        const isBindingsError =
          /bindings\s*file|better_sqlite3\.node|Could not locate/i.test(loadMsg) ||
          loadMsg.includes("better_sqlite3")
        if (isBindingsError) {
          return {
            success: false,
            message: "SQLite 驱动未正确编译（找不到 better_sqlite3 原生模块）",
            hint: "请在项目根目录执行：pnpm rebuild better-sqlite3。若仍失败，请安装 Xcode 命令行工具（终端执行 xcode-select --install）后重试，或改用 MySQL 完成安装。",
            code: "SQLITE_BINDINGS_NOT_BUILT",
          }
        }
        throw loadErr
      }
      const db = new Database(dbPath, { readonly: true })
      try {
        db.prepare("SELECT 1").get()
        return { success: true }
      } finally {
        db.close()
      }
    }
    return { success: false, message: `不支持的数据库类型: ${connection.type}` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    let hint: string | undefined
    if (msg.includes("ECONNREFUSED") || msg.includes("connect ETIMEDOUT")) {
      hint = "请确认数据库服务已启动，且主机和端口正确"
    } else if (msg.includes("Access denied") || msg.includes("ER_ACCESS_DENIED")) {
      hint = "请检查用户名和密码是否正确"
    } else if (msg.includes("Unknown database") || msg.includes("ER_BAD_DB_ERROR")) {
      hint = "数据库不存在，请先创建该数据库或改用已存在的库名"
    } else if (msg.includes("ENOENT") && connection.type === "sqlite") {
      hint = "SQLite 文件路径不存在，请检查路径或先创建目录"
    }
    return { success: false, message: msg, hint }
  }
}

function buildConnectionFromBody(
  type: string,
  body: Record<string, unknown>
): Partial<DatabaseConnection> | null {
  if (type === "mysql") {
    const { host, port, username, password, database } = body
    if (host === undefined || host === null || typeof host !== "string") return null
    if (username === undefined || username === null || typeof username !== "string") return null
    if (database === undefined || database === null || typeof database !== "string") return null
    if (password !== undefined && password !== null && typeof password !== "string") return null
    const h = String(host).trim()
    const u = String(username).trim()
    const d = String(database).trim()
    if (!h || !u || !d) return null
    return {
      type: "mysql",
      host: h,
      port: Number(port) || 3306,
      username: u,
      password: password == null ? "" : String(password),
      database: d,
      ssl: false,
    } as Partial<DatabaseConnection>
  }
  if (type === "sqlite") {
    const pathVal = body.databasePath ?? body.database
    if (pathVal === undefined || pathVal === null || typeof pathVal !== "string") return null
    const p = String(pathVal).trim()
    if (!p) return null
    return {
      type: "sqlite",
      host: "",
      port: 0,
      database: p,
      username: "",
      password: "",
      ssl: false,
    } as Partial<DatabaseConnection>
  }
  return null
}
