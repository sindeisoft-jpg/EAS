import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * 安装状态：检查数据库是否已配置且至少存在一名用户（视为已安装）
 */
export async function GET() {
  try {
    const count = await db.user.count()
    return NextResponse.json({ installed: count > 0 })
  } catch {
    return NextResponse.json({ installed: false })
  }
}
