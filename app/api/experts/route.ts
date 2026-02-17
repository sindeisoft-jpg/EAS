import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthenticatedRequest } from "@/lib/middleware"
import { db } from "@/lib/db"
import {
  getAllExpertTemplates,
  getExpertTemplatesByCategory,
  getExpertTemplateById,
  createExpertFromTemplate,
  type CreateExpertConfig,
} from "@/lib/expert-service"
import { getExpertTemplates, getExpertTemplateByCategory } from "@/lib/expert-templates"
import type { ExpertCategory } from "@/lib/expert-templates"
import type { DatabaseConnection } from "@/lib/types"

/**
 * GET /api/experts/templates
 * 获取所有专家模板
 * 查询参数：
 *   - category: 按类别筛选（可选）
 */
async function handleGET(req: AuthenticatedRequest) {
  try {
    const user = req.user!

    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get("category") as ExpertCategory | null

    let templates
    if (category) {
      templates = getExpertTemplatesByCategory(category)
    } else {
      templates = getAllExpertTemplates()
    }

    return NextResponse.json({
      success: true,
      templates,
    })
  } catch (error: any) {
    console.error("[Experts API] GET error:", error)
    return NextResponse.json(
      {
        error: error.message || "获取专家模板失败",
        details: error.details,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/experts/create
 * 从模板创建专家
 * 请求体：
 *   - templateId: 模板ID
 *   - llmConnectionId: LLM连接ID
 *   - databaseConnectionId: 数据库连接ID（可选）
 *   - customName: 自定义名称（可选）
 *   - customDescription: 自定义描述（可选）
 */
async function handlePOST(req: AuthenticatedRequest) {
  try {
    const user = req.user!

    const body = await req.json()
    const {
      templateId,
      llmConnectionId,
      databaseConnectionId,
      customName,
      customDescription,
    } = body

    // 验证必需字段
    if (!templateId) {
      return NextResponse.json(
        { error: "必须提供模板ID" },
        { status: 400 }
      )
    }

    if (!llmConnectionId) {
      return NextResponse.json(
        { error: "必须提供LLM连接ID" },
        { status: 400 }
      )
    }

    // 验证模板是否存在
    const template = getExpertTemplateById(templateId)
    if (!template) {
      return NextResponse.json(
        { error: `专家模板 "${templateId}" 不存在` },
        { status: 404 }
      )
    }

    // 如果提供了数据库连接ID，直接查询数据库获取连接信息
    let databaseConnection: DatabaseConnection | null = null
    if (databaseConnectionId) {
      const dbConnection = await db.databaseConnection.findUnique({
        where: { id: databaseConnectionId },
      })

      if (!dbConnection) {
        return NextResponse.json(
          { error: "数据库连接不存在" },
          { status: 404 }
        )
      }

      if (dbConnection.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: "无权限访问该数据库连接" },
          { status: 403 }
        )
      }

      // 转换为 DatabaseConnection 类型
      databaseConnection = {
        id: dbConnection.id,
        name: dbConnection.name,
        type: dbConnection.type as "mysql" | "postgresql" | "sqlite" | "sqlserver",
        host: dbConnection.host,
        port: dbConnection.port,
        database: dbConnection.database,
        username: dbConnection.username,
        password: dbConnection.password,
        ssl: dbConnection.ssl,
        organizationId: dbConnection.organizationId,
        createdBy: dbConnection.createdBy,
        createdAt: dbConnection.createdAt.toISOString(),
        lastTestedAt: dbConnection.lastTestedAt?.toISOString(),
        status: dbConnection.status as "connected" | "disconnected" | "error",
        isDefault: dbConnection.isDefault,
        metadata: dbConnection.metadata as any,
      } as DatabaseConnection
    }

    // 验证LLM连接是否存在且属于同一组织
    const llmConnection = await db.lLMConnection.findUnique({
      where: { id: llmConnectionId },
    })

    if (!llmConnection) {
      return NextResponse.json({ error: "LLM连接不存在" }, { status: 400 })
    }

    if (llmConnection.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "无权限使用该LLM连接" }, { status: 403 })
    }

    // 创建专家配置
    const config: CreateExpertConfig = {
      templateId,
      llmConnectionId,
      databaseConnectionId,
      databaseConnection, // 传递数据库连接对象
      organizationId: user.organizationId,
      createdBy: user.id,
      customName,
      customDescription,
    }

    // 创建专家对象（不保存）
    const agentData = await createExpertFromTemplate(config)

    // 保存专家到数据库
    const savedAgent = await db.agent.create({
      data: {
        name: agentData.name,
        description: agentData.description || null,
        systemMessage: agentData.systemMessage,
        llmConnectionId: agentData.llmConnectionId,
        databaseConnectionId: agentData.databaseConnectionId || null,
        tools: agentData.tools,
        memory: agentData.memory,
        workflow: agentData.workflow,
        execution: agentData.execution,
        organizationId: agentData.organizationId,
        createdBy: agentData.createdBy,
        status: agentData.status,
        isDefault: agentData.isDefault || false,
      },
    })

    return NextResponse.json({
      success: true,
      agent: savedAgent,
      message: `专家 "${savedAgent.name}" 创建成功`,
    })
  } catch (error: any) {
    console.error("[Experts API] POST error:", error)
    return NextResponse.json(
      {
        error: error.message || "创建专家失败",
        details: error.details,
      },
      { status: 500 }
    )
  }
}

export const GET = requireAuth(handleGET)
export const POST = requireAuth(handlePOST)
