"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { ExpertTemplate } from "@/lib/expert-templates"
import { 
  Building2, 
  TrendingUp, 
  Zap, 
  Settings, 
  Sparkles, 
  CheckCircle2,
  TrendingDown,
  Heart,
  GraduationCap,
  ShoppingCart,
  Factory,
  Truck,
  Users,
  Calculator,
  Scale,
  Code,
  Home,
  UtensilsCrossed,
  FileText,
  Database,
  Droplets,
  Wheat,
  Bolt,
  Building,
  Train,
  Leaf,
  Radio
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ExpertDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: ExpertTemplate
  onCreate: (template: ExpertTemplate) => void
  isCreating?: boolean
  defaultLlmId: string
  defaultDbId: string
  llmConnections: any[]
  dbConnections: any[]
  onLlmChange: (id: string) => void
  onDbChange: (id: string) => void
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "enterprise-management": Building2,
  "marketing": TrendingUp,
  "energy-management": Zap,
  "power-equipment-maintenance": Settings,
  "finance": TrendingDown,
  "healthcare": Heart,
  "education": GraduationCap,
  "retail": ShoppingCart,
  "manufacturing": Factory,
  "logistics": Truck,
  "hr": Users,
  "accounting": Calculator,
  "legal": Scale,
  "tech": Code,
  "real-estate": Home,
  "hospitality": UtensilsCrossed,
  "industrial": Factory,
  "water-resources": Droplets,
  "agriculture": Wheat,
  "power-system": Bolt,
  "construction": Building,
  "transportation": Train,
  "environmental": Leaf,
  "telecom": Radio,
}

export function ExpertDetailDialog({
  open,
  onOpenChange,
  template,
  onCreate,
  isCreating = false,
  defaultLlmId,
  defaultDbId,
  llmConnections,
  dbConnections,
  onLlmChange,
  onDbChange,
}: ExpertDetailDialogProps) {
  const Icon = categoryIcons[template.category] || Sparkles

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle className="text-2xl font-bold text-foreground">{template.name}</DialogTitle>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {template.categoryLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {template.description}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* 配置选择 */}
            <Card className="p-4 bg-muted/30 border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-4">创建配置</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-2 block text-muted-foreground">大模型连接</label>
                  <Select value={defaultLlmId} onValueChange={onLlmChange}>
                    <SelectTrigger className="h-10">
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
                  <label className="text-xs font-medium mb-2 block text-muted-foreground">数据源（可选）</label>
                  <Select value={defaultDbId || "__none__"} onValueChange={(value) => onDbChange(value === "__none__" ? "" : value)}>
                    <SelectTrigger className="h-10">
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

            {/* 核心能力 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">核心能力</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.capabilities.map((capability, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-sm px-3 py-1.5 bg-muted/50 border-border/50"
                  >
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* 适用场景 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">适用场景</h3>
              </div>
              <ul className="space-y-2">
                {template.useCases.map((useCase, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span className="text-sm text-foreground leading-relaxed">{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* 系统提示词 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">系统提示词</h3>
              </div>
              <Card className="p-4 bg-muted/30 border-border/50">
                <ScrollArea className="h-64 w-full">
                  <div className="pr-4">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {template.systemMessage}
                    </pre>
                  </div>
                </ScrollArea>
              </Card>
            </div>

            <Separator />

            {/* 工具配置 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">工具配置</h3>
              </div>
              <div className="space-y-2">
                {template.tools.map((tool, index) => (
                  <Card key={index} className="p-3 bg-muted/30 border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Database className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{tool.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {tool.type === "sql_query" ? "SQL查询" : tool.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {tool.description}
                        </p>
                        {tool.type === "sql_query" && tool.config && (
                          <div className="mt-2 p-2 bg-background/50 rounded border border-border/30">
                            <p className="text-xs font-medium text-muted-foreground mb-1">SQL配置：</p>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                              {tool.config.sql?.substring(0, 200)}
                              {tool.config.sql && tool.config.sql.length > 200 ? "..." : ""}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* 底部操作按钮 */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            关闭
          </Button>
          <Button
            onClick={() => onCreate(template)}
            disabled={isCreating || !defaultLlmId}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                创建智能体
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
