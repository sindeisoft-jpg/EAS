import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { generateToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 })
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      },
      include: { organization: true },
    })

    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    // Update last login time
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    })

    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json({
      token,
      user: {
        ...userWithoutPassword,
        passwordHash: undefined,
      },
    })
  } catch (error: any) {
    console.error("[Auth] Login error:", error)
    console.error("[Auth] Error stack:", error.stack)

    const msg = error.message || String(error)
    const isDbMissing =
      msg.includes("P1001") ||
      msg.includes("P1003") ||
      msg.includes("P2021") ||
      msg.includes("Can't reach database") ||
      msg.includes("Unknown database") ||
      msg.includes("ER_BAD_DB_ERROR") ||
      msg.includes("does not exist") ||
      (msg.includes("Prisma") && msg.includes("connect"))

    if (isDbMissing) {
      return NextResponse.json(
        {
          error: "数据库未就绪或已丢失，请先完成安装",
          code: "INSTALL_REQUIRED",
        },
        { status: 503 }
      )
    }

    // Check for other common issues
    let errorMessage = "登录失败"
    if (msg.includes("PrismaClient") || msg.includes("Cannot find module")) {
      errorMessage = "数据库客户端未初始化。请运行: pnpm db:generate"
    } else if (msg.includes("P2002") || msg.includes("Unique constraint")) {
      errorMessage = "数据库约束错误"
    } else if (msg.includes("P2025") || msg.includes("Record to update not found")) {
      errorMessage = "记录不存在"
    } else if (process.env.NODE_ENV === "development") {
      errorMessage = `登录失败: ${msg}`
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 }
    )
  }
}
