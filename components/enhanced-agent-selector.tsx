"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Search, X } from "lucide-react"
import type { Agent } from "@/lib/types"
import { getExpertCategories, type ExpertCategory } from "@/lib/expert-templates"

interface EnhancedAgentSelectorProps {
  agents: Agent[]
  selectedAgentId: string
  onSelect: (agentId: string) => void
  placeholder?: string
}

// 从专家名称推断类别（简单匹配）
function inferCategoryFromName(name: string): ExpertCategory | null {
  const lowerName = name.toLowerCase()
  if (lowerName.includes("企业管理") || lowerName.includes("企业") || lowerName.includes("管理")) {
    return "enterprise-management"
  }
  if (lowerName.includes("营销") || lowerName.includes("市场")) {
    return "marketing"
  }
  if (lowerName.includes("能源")) {
    return "energy-management"
  }
  if (lowerName.includes("电力") || lowerName.includes("设备") || lowerName.includes("运维")) {
    return "power-equipment-maintenance"
  }
  return null
}

export function EnhancedAgentSelector({
  agents,
  selectedAgentId,
  onSelect,
  placeholder = "选择智能体",
}: EnhancedAgentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<ExpertCategory | "all">("all")
  const [isOpen, setIsOpen] = useState(false)

  const categories = getExpertCategories()

  // 过滤智能体
  const filteredAgents = useMemo(() => {
    let filtered = agents.filter((a) => a.status === "active")

    // 按类别筛选
    if (selectedCategory !== "all") {
      filtered = filtered.filter((agent) => {
        const category = inferCategoryFromName(agent.name)
        return category === selectedCategory
      })
    }

    // 按搜索关键词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((agent) => {
        const category = inferCategoryFromName(agent.name)
        const categoryLabel = category
          ? categories.find((c) => c.value === category)?.label || ""
          : ""
        return (
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          categoryLabel.toLowerCase().includes(query)
        )
      })
    }

    return filtered
  }, [agents, selectedCategory, searchQuery, categories])

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)
  const selectedCategoryFromAgent = selectedAgent
    ? inferCategoryFromName(selectedAgent.name)
    : null

  return (
    <Select
      value={selectedAgentId || ""}
      onValueChange={onSelect}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="h-9 w-[200px] text-sm rounded-lg border-border/50 bg-card data-[state=open]:border-primary/50 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md">
        <SelectValue placeholder={placeholder}>
          {selectedAgent && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{selectedAgent.name}</span>
              {selectedCategoryFromAgent && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {categories.find((c) => c.value === selectedCategoryFromAgent)?.label}
                </Badge>
              )}
              {selectedAgent.isDefault && (
                <span className="text-xs text-muted-foreground ml-1">(默认)</span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-lg border-border/50 shadow-lg w-[400px]">
        {/* 搜索框 */}
        <div className="p-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索专家..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchQuery("")
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 类别筛选 */}
        <div className="p-2 border-b border-border/50">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedCategory("all")
              }}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedCategory(cat.value)
                }}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedCategory === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 智能体列表 */}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredAgents.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery || selectedCategory !== "all"
                ? "没有找到匹配的智能体"
                : "没有可用的智能体"}
            </div>
          ) : (
            filteredAgents.map((agent) => {
              const category = inferCategoryFromName(agent.name)
              const categoryLabel = category
                ? categories.find((c) => c.value === category)?.label
                : null

              return (
                <SelectItem
                  key={agent.id}
                  value={agent.id}
                  className="rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Sparkles className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{agent.name}</span>
                        {categoryLabel && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {categoryLabel}
                          </Badge>
                        )}
                        {agent.isDefault && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            (默认)
                          </span>
                        )}
                      </div>
                      {agent.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                </SelectItem>
              )
            })
          )}
        </div>
      </SelectContent>
    </Select>
  )
}
