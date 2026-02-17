import { NextResponse } from "next/server"
import mysql from "mysql2/promise"
import { execSync } from "child_process"
import path from "path"
import fs from "fs"

/** 读取建表 SQL 文件并解析出 CREATE 语句（与 create-tables.js 规则一致） */
function loadCreateStatements(cwd: string): string[] {
  let sqlPath = path.join(cwd, "scripts", "prisma-generated-fixed.sql")
  if (!fs.existsSync(sqlPath)) {
    sqlPath = path.join(cwd, "scripts", "create-tables.sql")
  }
  if (!fs.existsSync(sqlPath)) {
    throw new Error("未找到建表 SQL 文件（scripts/prisma-generated-fixed.sql 或 scripts/create-tables.sql）")
  }
  const sqlContent = fs.readFileSync(sqlPath, "utf-8")
  const cleanSql = sqlContent
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^USE\s+[^;]+;?\s*$/gim, "")
  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      const upper = s.toUpperCase().trim()
      return s.length > 0 && upper.startsWith("CREATE")
    })
  return statements
}

/**
 * 安装向导：初始化数据库（写入 .env、创建库、执行建表），无需登录
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { type } = body

    if (!type) {
      return NextResponse.json(
        { success: false, error: "缺少数据库类型", message: "请选择数据库类型" },
        { status: 400 }
      )
    }

    // 当前安装向导仅支持 MySQL 初始化（建表 SQL 为 MySQL 语法，Prisma schema 为 MySQL）
    if (type !== "mysql") {
      return NextResponse.json({
        success: false,
        error: "当前安装向导仅支持 MySQL 初始化",
        message: "选择 SQLite 无法通过本向导自动建表",
        code: "SQLITE_NOT_SUPPORTED",
        hint: "请改用 MySQL 完成安装（如 XAMPP 中的 MariaDB），或手动配置 SQLite：在 .env 中设置 DATABASE_URL=\"file:./data/dev.db\"，然后执行 pnpm db:push（需先将 Prisma schema 改为 sqlite 并生成对应迁移）。",
      })
    }

    const connection = buildMysqlConnection(body)
    if (!connection) {
      return NextResponse.json({
        success: false,
        error: "参数不完整",
        message: "请填写主机、用户名、密码和数据库名",
      })
    }

    const { host, port, user, password, database } = connection
    const databaseUrl = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`

    // 1. 确保数据库存在
    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
      })
      const dbName = database.replace(/`/g, "``")
      await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
      await conn.end()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      let hint = "请确认数据库服务已启动，且用户名具备创建数据库权限。若使用 XAMPP，请在 XAMPP 控制台先启动 MySQL/MariaDB。"
      if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) hint = "请确认 MySQL 已启动且主机、端口正确。若使用 XAMPP，请在 XAMPP 控制台启动 MySQL/MariaDB。"
      if (msg.includes("Access denied")) hint = "请检查用户名和密码是否正确（XAMPP 默认 root 密码为空）。"
      return NextResponse.json({
        success: false,
        error: msg,
        message: msg,
        hint,
      })
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

    // 3. 生成 Prisma Client
    try {
      execSync("pnpm db:generate", { cwd: process.cwd(), stdio: "pipe", encoding: "utf-8" })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({
        success: false,
        error: "Prisma Client 生成失败",
        message: msg,
        hint: "请确认已安装依赖并执行 pnpm install",
      })
    }

    // 4. 创建表：在 API 内直接执行建表 SQL，不调用子进程与 db:push，避免触发 MariaDB mysql.proc 问题
    const cwd = process.cwd()
    let createStatements: string[]
    try {
      createStatements = loadCreateStatements(cwd)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({
        success: false,
        error: "创建数据库表失败",
        message: msg,
        hint: "请确保项目内存在 scripts/create-tables.sql 或 scripts/prisma-generated-fixed.sql。若使用 XAMPP（MariaDB），曾升级过 XAMPP 时请先执行 mysql_upgrade -u root -p。",
      })
    }
    if (createStatements.length === 0) {
      return NextResponse.json({
        success: false,
        error: "创建数据库表失败",
        message: "SQL 文件中没有有效的 CREATE 语句",
        hint: "可运行 pnpm db:generate-sql 从 Prisma schema 生成建表 SQL",
      })
    }
    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
      })
      for (const statement of createStatements) {
        if (!statement.trim()) continue
        const sql = statement.endsWith(";") ? statement : statement + ";"
        try {
          await conn.execute(sql)
        } catch (err: unknown) {
          const em = err instanceof Error ? err.message : String(err)
          if (
            em.includes("already exists") ||
            (err as { code?: string }).code === "ER_TABLE_EXISTS_ERROR"
          ) {
            continue
          }
          try {
            await conn.end()
          } catch {
            /* 忽略关闭连接时的错误，优先返回建表失败原因 */
          }
          const isMariaDbProcError =
            /mysql\.proc|Column count.*wrong|Expected 21, found 20|mysql_upgrade|MariaDB/i.test(em)
          if (isMariaDbProcError) {
            return NextResponse.json({
              success: false,
              error: "创建数据库表失败",
              message: "MariaDB 系统表需升级（mysql.proc 列数不匹配）",
              code: "MARIADB_PROC_UPGRADE",
              hint: "请在运行 MariaDB 的服务器上执行一次升级：\n\n本机：mysql_upgrade -u root -p\nDocker：docker exec -it <容器名> mysql_upgrade -u root -p\n\n执行完成后点击「重试」再次初始化。",
              details: em,
            })
          }
          return NextResponse.json({
            success: false,
            error: "创建数据库表失败",
            message: em,
            hint: "请检查数据库连接与权限，或手动执行 pnpm db:create-tables。若使用 XAMPP（MariaDB）且提示系统表错误，请先执行 mysql_upgrade -u root -p。",
            details: em,
          })
        }
      }
      await conn.end()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isMariaDbProcError =
        /mysql\.proc|Column count.*wrong|Expected 21, found 20|mysql_upgrade|MariaDB/i.test(msg)
      if (isMariaDbProcError) {
        return NextResponse.json({
          success: false,
          error: "创建数据库表失败",
          message: "MariaDB 系统表需升级（mysql.proc 列数不匹配）",
          code: "MARIADB_PROC_UPGRADE",
          hint: "请在运行 MariaDB 的服务器上执行一次升级：\n\n本机：mysql_upgrade -u root -p\nDocker：docker exec -it <容器名> mysql_upgrade -u root -p\n\n执行完成后点击「重试」再次初始化。",
          details: msg,
        })
      }
      return NextResponse.json({
        success: false,
        error: "创建数据库表失败",
        message: msg,
        hint: "请检查数据库连接与权限，或手动执行 pnpm db:create-tables。若使用 XAMPP（MariaDB）且提示系统表错误，请先执行 mysql_upgrade -u root -p。",
        details: msg,
      })
    }

    return NextResponse.json({ success: true, message: "数据库表结构已创建" })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "数据库初始化失败"
    console.error("[install] init-database error:", err)
    return NextResponse.json(
      {
        success: false,
        error: message,
        message,
        hint: "请查看服务器日志或确认安装接口已正确配置",
      },
      { status: 500 }
    )
  }
}

function buildMysqlConnection(body: Record<string, unknown>): { host: string; port: number; user: string; password: string; database: string } | null {
  const { host, port, username, password, database } = body
  // 允许空密码（XAMPP 等默认 root 无密码）；trim 后不允许空字符串
  if (host === undefined || host === null || typeof host !== "string") return null
  if (username === undefined || username === null || typeof username !== "string") return null
  if (database === undefined || database === null || typeof database !== "string") return null
  if (password !== undefined && password !== null && typeof password !== "string") return null
  const h = String(host).trim()
  const u = String(username).trim()
  const d = String(database).trim()
  if (!h || !u || !d) return null
  return {
    host: h,
    port: Number(port) || 3306,
    user: u,
    password: password == null ? "" : String(password),
    database: d,
  }
}
