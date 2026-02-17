import { NextResponse } from "next/server"
import { requireAuth, AuthenticatedRequest } from "@/lib/middleware"
import { db } from "@/lib/db"

async function handler(req: AuthenticatedRequest) {
  try {
    const userId = req.user!.id

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        organizationId: true,
        createdAt: true,
        lastLoginAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error("[Auth] Get me error:", error)

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

    let errorMessage = "获取用户信息失败"
    let statusCode = 500
    if (msg.includes("PrismaClient") || msg.includes("Cannot find module")) {
      errorMessage = "数据库客户端未初始化"
      statusCode = 503
    } else if (process.env.NODE_ENV === "development") {
      errorMessage = `获取用户信息失败: ${msg}`
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export const GET = requireAuth(handler)