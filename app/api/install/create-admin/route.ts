import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

/**
 * 安装向导：自动创建默认管理员账户（无需登录）
 * 默认账户：admin@admin.com / admin123
 */
export async function POST() {
  try {
    const defaultUsername = "admin"
    const defaultEmail = "admin@admin.com"
    const defaultPassword = "admin123"
    const defaultName = "管理员"

    // 检查是否已存在默认账户
    const existing = await db.user.findFirst({
      where: {
        OR: [
          { username: defaultUsername },
          { email: defaultEmail }
        ]
      }
    })
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "默认管理员账户已存在",
        warning: "默认管理员账户已存在，可直接使用 admin / admin123 登录"
      })
    }

    // 获取或创建默认组织
    let org = await db.organization.findFirst({ where: { slug: "default" } })
    if (!org) {
      org = await db.organization.create({
        data: {
          name: "默认组织",
          slug: "default",
          plan: "free",
          settings: { maxDatabaseConnections: 10, maxUsers: 50 },
        },
      })
    }

    // 创建默认管理员账户
    const passwordHash = await bcrypt.hash(defaultPassword, 10)
    await db.user.create({
      data: {
        username: defaultUsername,
        email: defaultEmail,
        name: defaultName,
        passwordHash,
        role: "admin",
        organizationId: org.id,
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: "默认管理员账户已创建",
      credentials: {
        username: defaultUsername,
        email: defaultEmail,
        password: defaultPassword,
        name: defaultName
      }
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "创建管理员账户失败"
    const errCode = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined
    const isTableMissing =
      /table\s+[`"]?users[`"]?\s+does not exist|does not exist in the current database/i.test(message) ||
      errCode === "P2021"
    console.error("[install] create-admin error:", err)
    if (isTableMissing) {
      return NextResponse.json({
        success: false,
        error: "数据库表不存在",
        message: "当前连接到的数据库中找不到 users 表",
        code: "TABLE_DOES_NOT_EXIST",
        hint: "通常是上一步「初始化」刚写入了 .env，但开发服务器尚未重载。请先重启开发服务器：在终端按 Ctrl+C 停止，再运行 pnpm dev，然后回到本页点击「下一步」重试。",
      })
    }
    return NextResponse.json(
      {
        success: false,
        error: message,
        message,
        hint: "请确认数据库已初始化且安装接口已正确配置",
      },
      { status: 500 }
    )
  }
}
