/**
 * 专家服务层
 * 提供专家模板获取和专家创建功能
 */

import type { Agent, AgentTool, SQLToolConfig, DatabaseConnection } from "./types"
import type { ExpertTemplate, ExpertCategory } from "./expert-templates"
import {
  getExpertTemplates,
  getExpertTemplateByCategory,
  getExpertCategories,
} from "./expert-templates"
import { storage } from "./storage"

export interface CreateExpertConfig {
  templateId: string
  llmConnectionId: string
  databaseConnectionId?: string
  databaseConnection?: DatabaseConnection // 新增：可选的数据库连接对象（用于服务器端场景）
  organizationId: string
  createdBy: string
  customName?: string
  customDescription?: string
}

/**
 * 获取所有专家模板
 */
export function getAllExpertTemplates(): ExpertTemplate[] {
  return getExpertTemplates()
}

/**
 * 按类别获取专家模板
 */
export function getExpertTemplatesByCategory(
  category: ExpertCategory
): ExpertTemplate[] {
  return getExpertTemplates().filter((t) => t.category === category)
}

/**
 * 根据ID获取专家模板
 */
export function getExpertTemplateById(templateId: string): ExpertTemplate | undefined {
  return getExpertTemplates().find((t) => t.id === templateId)
}

/**
 * 获取所有专家类别
 */
export function getAllExpertCategories(): Array<{ value: ExpertCategory; label: string }> {
  return getExpertCategories()
}

/**
 * 从模板创建专家
 */
export async function createExpertFromTemplate(
  config: CreateExpertConfig
): Promise<Agent> {
  const template = getExpertTemplateById(config.templateId)
  
  if (!template) {
    throw new Error(`专家模板 "${config.templateId}" 不存在`)
  }

  // 验证必需字段
  if (!config.llmConnectionId) {
    throw new Error("必须提供 LLM 连接 ID")
  }
  if (!config.organizationId) {
    throw new Error("必须提供组织 ID")
  }
  if (!config.createdBy) {
    throw new Error("必须提供创建者 ID")
  }

  // 生成唯一的工具ID
  const generateToolId = (tool: AgentTool, index: number) => {
    return `tool_${Date.now()}_${index}`
  }

  // 复制并配置工具
  let tools: AgentTool[] = template.tools.map((tool, index) => ({
    ...tool,
    id: generateToolId(tool, index),
  }))

  // 如果提供了数据库连接ID，获取数据库名称并替换SQL中的占位符
  if (config.databaseConnectionId) {
    let dbConnection: DatabaseConnection | null = null
    
    // 优先使用直接提供的数据库连接对象（服务器端场景）
    if (config.databaseConnection) {
      dbConnection = config.databaseConnection
    } else {
      // 如果没有提供连接对象，尝试通过 storage 获取（客户端场景）
      try {
        dbConnection = await storage.dbConnections.getById(config.databaseConnectionId)
      } catch (error: any) {
        // 如果是在服务器端，storage 可能无法工作，抛出更明确的错误
        throw new Error(`无法获取数据库连接。如果这是在服务器端，请直接提供 databaseConnection 对象。原始错误: ${error.message}`)
      }
    }
    
    if (dbConnection && dbConnection.database) {
      const databaseName = dbConnection.database
      
      // 替换所有SQL工具中的数据库名称占位符
      tools = tools.map((tool) => {
        if (tool.type === "sql_query") {
          const toolConfig = tool.config as SQLToolConfig
          if (toolConfig.sql && toolConfig.sql.includes("{{databaseName}}")) {
            return {
              ...tool,
              config: {
                ...toolConfig,
                sql: toolConfig.sql.replace(/\{\{databaseName\}\}/g, databaseName),
              } as SQLToolConfig,
            }
          }
        }
        return tool
      })
    } else {
      throw new Error("数据库连接不存在或数据库名称为空")
    }
  }
  // 如果未提供数据库连接，保留占位符（让用户后续配置）

  // 创建专家对象
  const agent: Agent = {
    id: `agent_${Date.now()}`,
    name: config.customName || template.name,
    description: config.customDescription || template.description,
    systemMessage: template.systemMessage,
    llmConnectionId: config.llmConnectionId,
    databaseConnectionId: config.databaseConnectionId,
    tools,
    memory: {
      type: "simple",
      enabled: true,
      maxHistory: 10,
      config: {},
    },
    workflow: {
      nodes: [],
      edges: [],
    },
    execution: {
      timeout: 30,
      maxRetries: 3,
      retryDelay: 1,
      concurrency: 1,
      enableLogging: true,
    },
    organizationId: config.organizationId,
    createdBy: config.createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    isDefault: false,
  }

  // 不在这里保存，返回专家对象让调用者保存
  // 这样可以支持服务器端直接使用 db 保存，避免客户端 API 调用问题
  return agent
}

/**
 * 批量创建专家（从多个模板）
 */
export async function createExpertsFromTemplates(
  configs: CreateExpertConfig[]
): Promise<Agent[]> {
  const results: Agent[] = []
  
  for (const config of configs) {
    try {
      const agent = await createExpertFromTemplate(config)
      results.push(agent)
    } catch (error: any) {
      console.error(`创建专家失败 (${config.templateId}):`, error)
      // 继续创建其他专家，不中断流程
    }
  }
  
  return results
}

/**
 * 检查专家是否已存在（基于名称和组织）
 */
export async function checkExpertExists(
  name: string,
  organizationId: string
): Promise<boolean> {
  try {
    const agents = await storage.agents.getAll()
    return agents.some(
      (agent) =>
        agent.name === name && agent.organizationId === organizationId
    )
  } catch (error) {
    console.error("检查专家是否存在时出错:", error)
    return false
  }
}
