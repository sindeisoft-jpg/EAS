"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ExpertTemplateCard } from "@/components/expert-template-card"
import { ExpertDetailDialog } from "@/components/expert-detail-dialog"
import type { ExpertTemplate } from "@/lib/expert-templates"
import { getExpertTemplates } from "@/lib/expert-templates"
import { storage } from "@/lib/storage"
import { showSuccess, showError } from "@/lib/toast-utils"
import { Search, Store, Settings } from "lucide-react"

export default function MarketplacePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<ExpertTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [llmConnections, setLlmConnections] = useState<any[]>([])
  const [dbConnections, setDbConnections] = useState<any[]>([])
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null)
  const [defaultLlmId, setDefaultLlmId] = useState<string>("")
  const [defaultDbId, setDefaultDbId] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<ExpertTemplate | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      // 加载模板
      const allTemplates = getExpertTemplates()
      setTemplates(allTemplates)

      // 加载LLM连接
      const llmData = await storage.llmConnections.getAll()
      const activeLLMs = llmData.filter(
        (conn) => conn.organizationId === user?.organizationId && conn.status === "active"
      )
      setLlmConnections(activeLLMs)
      if (activeLLMs.length > 0) {
        const defaultLLM = activeLLMs.find((llm) => llm.isDefault) || activeLLMs[0]
        setDefaultLlmId(defaultLLM.id)
      }

      // 加载数据源连接
      const dbData = await storage.dbConnections.getAll()
      const activeDBs = dbData.filter(
        (conn) => conn.organizationId === user?.organizationId && conn.status !== "error"
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

      showSuccess("创建成功", `智能体 "${data.agent.name}" 已创建`)
      
      // 可以选择跳转到智能体管理页面
      setTimeout(() => {
        router.push("/dashboard/agents")
      }, 1500)
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

  const handleViewDetail = (template: ExpertTemplate) => {
    setSelectedTemplate(template)
    setDetailDialogOpen(true)
  }

  const handleCreateFromDetail = async (template: ExpertTemplate) => {
    setDetailDialogOpen(false)
    await handleCreateExpert(template)
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
    <div className="p-6 overflow-y-auto h-full bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg border border-primary/10">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">智能体市场</h1>
                <p className="text-base text-muted-foreground">发现和创建专业领域的AI智能体，覆盖各行各业</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{templates.length}</div>
                <div className="text-xs text-muted-foreground">智能体模板</div>
              </div>
              <div className="h-12 w-px bg-border"></div>
            </div>
          </div>
        </div>

        {/* 搜索框和配置选择 */}
        <div className="mb-8 space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="搜索智能体模板（名称、描述、能力、场景）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-base shadow-sm border-border/50 focus:border-primary/50"
            />
          </div>

          {/* 配置选择 */}
          <Card className="p-5 bg-card/80 backdrop-blur-sm border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">创建配置</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">大模型连接</label>
                <Select value={defaultLlmId} onValueChange={setDefaultLlmId}>
                  <SelectTrigger className="h-11 border-border/50">
                    <SelectValue placeholder="选择大模型连接" />
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
                <label className="text-sm font-medium mb-2 block text-foreground">数据源（可选）</label>
                <Select value={defaultDbId || "__none__"} onValueChange={(value) => setDefaultDbId(value === "__none__" ? "" : value)}>
                  <SelectTrigger className="h-11 border-border/50">
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
          </Card>
        </div>

        {/* 模板列表 */}
        <div className="mb-8">
          {filteredTemplates.length === 0 ? (
            <Card className="p-12 text-center bg-muted/30 border-border/50">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? `没有找到匹配"${searchQuery}"的智能体模板` : "没有找到智能体模板"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "尝试使用其他关键词搜索，或清除搜索条件" : "暂无智能体模板"}
              </p>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  找到 <span className="font-semibold text-foreground">{filteredTemplates.length}</span> 个智能体模板
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <ExpertTemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleCreateExpert}
                    onViewDetail={handleViewDetail}
                    isCreating={creatingTemplateId === template.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 详细介绍对话框 */}
      {selectedTemplate && (
        <ExpertDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          template={selectedTemplate}
          onCreate={handleCreateFromDetail}
          isCreating={creatingTemplateId === selectedTemplate.id}
          defaultLlmId={defaultLlmId}
          defaultDbId={defaultDbId}
          llmConnections={llmConnections}
          dbConnections={dbConnections}
          onLlmChange={setDefaultLlmId}
          onDbChange={setDefaultDbId}
        />
      )}
    </div>
  )
}
