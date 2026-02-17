/**
 * 报告格式化工具
 * 客户端安全的格式化函数，不依赖 Prisma
 */

import { translateColumnName } from "./utils"
import type { AnalysisReport } from "./report-generator"

/**
 * 格式化报告为Markdown
 */
export function formatReportAsMarkdown(report: AnalysisReport): string {
  const parts: string[] = []
  
  parts.push(`# ${report.title}\n`)
  parts.push(`**分析目标**: ${report.goal}\n`)
  parts.push(`**生成时间**: ${new Date(report.generatedAt).toLocaleString("zh-CN")}\n`)
  parts.push(`---\n`)
  
  // 摘要
  parts.push(`## 📊 执行摘要\n`)
  parts.push(report.summary)
  parts.push(`\n`)
  
  // 关键发现
  if (report.keyFindings.length > 0) {
    parts.push(`## 🔍 关键发现\n`)
    report.keyFindings.forEach((finding, index) => {
      parts.push(`${index + 1}. ${finding}`)
    })
    parts.push(`\n`)
  }
  
  // 详细章节
  parts.push(`## 📋 详细分析\n`)
  for (const section of report.sections.sort((a, b) => a.order - b.order)) {
    parts.push(`### ${section.title}\n`)
    
    switch (section.type) {
      case "text":
        parts.push(section.content)
        break
        
      case "table":
        const tableData = section.content as any
        if (tableData.columns && tableData.rows) {
          const translatedColumns = tableData.columns.map((col: string) => translateColumnName(col))
          parts.push(`| ${translatedColumns.join(" | ")} |`)
          parts.push(`| ${translatedColumns.map(() => "---").join(" | ")} |`)
          tableData.rows.slice(0, 10).forEach((row: any) => {
            const values = tableData.columns.map((col: string) => row[col] || "")
            parts.push(`| ${values.join(" | ")} |`)
          })
          if (tableData.rows.length > 10) {
            parts.push(`\n*（显示前10行，共 ${tableData.rowCount} 行）*`)
          }
        }
        break
        
      case "ai_analysis":
      case "ai_summary":
        parts.push(section.content)
        break
        
      case "chart":
        parts.push(`*图表数据已生成，共 ${section.content.chartCount || 0} 个图表*`)
        break
    }
    
    parts.push(`\n`)
  }
  
  // 建议
  if (report.recommendations && report.recommendations.length > 0) {
    parts.push(`## 💡 建议\n`)
    report.recommendations.forEach((rec, index) => {
      parts.push(`${index + 1}. ${rec}`)
    })
    parts.push(`\n`)
  }
  
  // 元数据
  parts.push(`---\n`)
  parts.push(`**执行统计**:\n`)
  parts.push(`- 总步骤数: ${report.metadata.totalSteps}`)
  parts.push(`- 完成步骤数: ${report.metadata.completedSteps}`)
  parts.push(`- 总执行时间: ${(report.metadata.executionTime / 1000).toFixed(2)} 秒`)
  
  return parts.join("\n")
}

/**
 * 格式化报告为JSON
 */
export function formatReportAsJSON(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2)
}
