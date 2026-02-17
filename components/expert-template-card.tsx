"use client"

import type React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Eye,
  Droplets,
  Wheat,
  Bolt,
  Building,
  Train,
  Leaf,
  Radio
} from "lucide-react"

interface ExpertTemplateCardProps {
  template: ExpertTemplate
  onSelect: (template: ExpertTemplate) => void
  onViewDetail?: (template: ExpertTemplate) => void
  isCreating?: boolean
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

export function ExpertTemplateCard({
  template,
  onSelect,
  onViewDetail,
  isCreating = false,
}: ExpertTemplateCardProps) {
  const Icon = categoryIcons[template.category] || Sparkles

  const handleCardClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮，不触发查看详情
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    if (onViewDetail) {
      onViewDetail(template)
    }
  }

  return (
    <Card 
      className="p-6 relative hover:shadow-xl hover:border-primary/20 transition-all duration-300 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm group cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg border border-primary/10">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">{template.name}</h3>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
              {template.categoryLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-5">
        <div>
          <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            核心能力
          </p>
          <div className="flex flex-wrap gap-2">
            {template.capabilities.slice(0, 3).map((capability, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs px-2.5 py-1 bg-muted/60 border-border/50 hover:bg-muted transition-colors"
              >
                {capability}
              </Badge>
            ))}
            {template.capabilities.length > 3 && (
              <Badge variant="outline" className="text-xs px-2.5 py-1 bg-muted/60 border-border/50">
                +{template.capabilities.length - 3} 更多
              </Badge>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            适用场景
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {template.useCases.slice(0, 2).map((useCase, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                <span className="line-clamp-1 leading-relaxed">{useCase}</span>
              </li>
            ))}
            {template.useCases.length > 2 && (
              <li className="text-xs text-muted-foreground/70 pl-5.5">
                还有 {template.useCases.length - 2} 个场景...
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="flex gap-2.5 pt-2 border-t border-border/50">
        {onViewDetail && (
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetail(template)
            }}
            disabled={isCreating}
            className="flex-1 gap-2 h-10 rounded-lg font-medium border-border/50 hover:bg-muted/80 transition-colors"
          >
            <Eye className="w-4 h-4" />
            查看详情
          </Button>
        )}
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onSelect(template)
          }}
          disabled={isCreating}
          className={`gap-2 h-10 rounded-lg font-medium shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${onViewDetail ? 'flex-1' : 'w-full'}`}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              创建专家
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
