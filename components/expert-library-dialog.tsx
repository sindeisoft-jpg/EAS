"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExpertTemplateCard } from "./expert-template-card"
import type { ExpertTemplate } from "@/lib/expert-templates"
import { getExpertTemplates } from "@/lib/expert-templates"
import { storage } from "@/lib/storage"
import { showSuccess, showError } from "@/lib/toast-utils"
import { Loader2, Search } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Input } from "@/components/ui/input"

interface ExpertLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExpertCreated?: () => void
  userId: string
  organizationId: string
}

export function ExpertLibraryDialog({
  open,
  onOpenChange,
  onExpertCreated,
  userId,
  organizationId,
}: ExpertLibraryDialogProps) {
  const [templates, setTemplates] = useState<ExpertTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [llmConnections, setLlmConnections] = useState<any[]>([])
  const [dbConnections, setDbConnections] = useState<any[]>([])
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null)
  const [defaultLlmId, setDefaultLlmId] = useState<string>("")
  const [defaultDbId, setDefaultDbId] = useState<string>("")

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      // 加载模板
      const allTemplates = getExpertTemplates()
      setTemplates(allTemplates)

      // 加载LLM连接
      const llmData = await storage.llmConnections.getAll()
      const activeLLMs = llmData.filter(
        (conn) => conn.organizationId === organizationId && conn.status === "active"
      )
      setLlmConnections(activeLLMs)
      if (activeLLMs.length > 0) {
        const defaultLLM = activeLLMs.find((llm) => llm.isDefault) || activeLLMs[0]
        setDefaultLlmId(defaultLLM.id)
      }

      // 加载数据库连接
      const dbData = await storage.dbConnections.getAll()
      const activeDBs = dbData.filter(
        (conn) => conn.organizationId === organizationId && conn.status !== "error"
      )
      setDbConnections(activeDBs)
      if (activeDBs.length > 0) {
        const defaultDB = activeDBs.find((db) => db.isDefault) || activeDBs[0]
        setDefaultDbId(defaultDB.id)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    }
  }

  const handleCreateExpert = async (template: ExpertTemplate) => {
    if (!defaultLlmId) {
      showError({
        message: "配置缺失",
        details: "请先配置至少一个激活的LLM连接",
        hint: "前往「大模型管理」页面配置LLM连接",
      })
      return
    }

    setCreatingTemplateId(template.id)

    try {
      const response = await fetch("/api/experts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          templateId: template.id,
          llmConnectionId: defaultLlmId,
          databaseConnectionId: defaultDbId || undefined,
        }),
      })

      // 检查响应类型
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("API returned non-JSON response:", text.substring(0, 200))
        throw new Error(
          response.status === 401
            ? "认证失败，请重新登录"
            : response.status === 404
            ? "API 路由不存在，请检查路径"
            : `服务器返回了非 JSON 响应 (${response.status})`
        )
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "创建专家失败")
      }

      showSuccess("创建成功", `专家 "${data.agent.name}" 已创建`)
      
      if (onExpertCreated) {
        onExpertCreated()
      }

      // 可以选择关闭对话框或保持打开以继续创建
      // onOpenChange(false)
    } catch (error: any) {
      console.error("Failed to create expert:", error)
      showError({
        message: "创建失败",
        details: error.message || "未知错误",
        hint: error.message?.includes("认证")
          ? "请重新登录后再试"
          : error.message?.includes("路由")
          ? "请检查 API 配置"
          : "请检查LLM连接和数据源配置是否正确",
      })
    } finally {
      setCreatingTemplateId(null)
    }
  }

  // 搜索过滤逻辑
  const filteredTemplates = templates.filter((template) => {
    // 如果没有搜索查询，显示所有模板
    if (!searchQuery.trim()) {
      return true
    }
    
    const query = searchQuery.toLowerCase()
    const nameMatch = template.name.toLowerCase().includes(query)
    const descMatch = template.description.toLowerCase().includes(query)
    const categoryMatch = template.categoryLabel.toLowerCase().includes(query)
    const capabilitiesMatch = template.capabilities.some((cap) => cap.toLowerCase().includes(query))
    const useCasesMatch = template.useCases.some((useCase) => useCase.toLowerCase().includes(query))
    
    return nameMatch || descMatch || categoryMatch || capabilitiesMatch || useCasesMatch
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>智能体专家库市场</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索专家..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* 配置选择 */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">LLM连接</label>
                <Select value={defaultLlmId} onValueChange={setDefaultLlmId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择LLM连接" />
                  </SelectTrigger>
                  <SelectContent>
                    {llmConnections.map((llm) => (
                      <SelectItem key={llm.id} value={llm.id}>
                        {llm.name} ({llm.model})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">数据源（可选）</label>
                <Select value={defaultDbId || "__none__"} onValueChange={(value) => setDefaultDbId(value === "__none__" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择数据源（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {dbConnections.map((db) => (
                      <SelectItem key={db.id} value={db.id}>
                        {db.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 模板列表 */}
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? `没有找到匹配"${searchQuery}"的专家模板` : "没有找到专家模板"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <ExpertTemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleCreateExpert}
                    isCreating={creatingTemplateId === template.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
