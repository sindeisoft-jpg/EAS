/**
 * 数据验证器测试
 * 测试数据验证、清洗、NULL 值处理等功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { validateAndCleanChartData, validateQueryResult } from '@/lib/data-validator'
import type { QueryResult } from '@/lib/types'
import fs from 'fs'

const LOG_PATH = '/Users/xurongyu/Desktop/app/eas/.cursor/debug.log'
const SERVER_ENDPOINT = 'http://127.0.0.1:7247/ingest/3b488634-236d-4c4a-816d-7b48c56dda2f'

// #region agent log
function logDebug(location: string, message: string, data: any, hypothesisId?: string) {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location,
    message,
    data,
    sessionId: 'test-session',
    runId: 'data-validator-test',
    hypothesisId: hypothesisId || 'A',
  }
  
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(logEntry) + '\n')
  } catch (error) {
    // 忽略文件写入错误
  }
  
  fetch(SERVER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logEntry),
  }).catch(() => {})
}
// #endregion agent log

describe('数据验证器', () => {
  beforeEach(() => {
    try {
      if (fs.existsSync(LOG_PATH)) {
        fs.unlinkSync(LOG_PATH)
      }
    } catch (error) {
      // 忽略错误
    }
  })

  describe('validateAndCleanChartData', () => {
    it('应该验证有效数据', () => {
      // #region agent log
      logDebug('data-validator.test.ts:45', '测试有效数据验证', { 
        dataLength: 3,
        sampleData: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }]
      }, 'A')
      // #endregion agent log
      
      const data = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
        { name: 'C', value: 30 },
      ]
      
      const result = validateAndCleanChartData(data)
      
      // #region agent log
      logDebug('data-validator.test.ts:58', '有效数据验证结果', { 
        isValid: result.isValid,
        cleanedDataLength: result.cleanedData.length,
        warnings: result.warnings,
        errors: result.errors
      }, 'A')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.cleanedData.length).toBe(3)
      expect(result.errors.length).toBe(0)
    })

    it('应该拒绝非数组数据', () => {
      // #region agent log
      logDebug('data-validator.test.ts:70', '测试非数组数据拒绝', { 
        dataType: typeof null,
        data: null
      }, 'B')
      // #endregion agent log
      
      const result = validateAndCleanChartData(null as any)
      
      // #region agent log
      logDebug('data-validator.test.ts:76', '非数组数据验证结果', { 
        isValid: result.isValid,
        errors: result.errors
      }, 'B')
      // #endregion agent log
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('数据不是数组格式')
    })

    it('应该拒绝空数组', () => {
      // #region agent log
      logDebug('data-validator.test.ts:85', '测试空数组拒绝', { 
        dataLength: 0
      }, 'B')
      // #endregion agent log
      
      const result = validateAndCleanChartData([])
      
      // #region agent log
      logDebug('data-validator.test.ts:90', '空数组验证结果', { 
        isValid: result.isValid,
        errors: result.errors
      }, 'B')
      // #endregion agent log
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('数据为空')
    })

    it('应该处理 NULL 值', () => {
      // #region agent log
      logDebug('data-validator.test.ts:100', '测试 NULL 值处理', { 
        dataLength: 3,
        nullCount: 1
      }, 'C')
      // #endregion agent log
      
      const data = [
        { name: 'A', value: 10 },
        { name: 'B', value: null },
        { name: 'C', value: 30 },
      ]
      
      const result = validateAndCleanChartData(data, { removeNullRows: false })
      
      // #region agent log
      logDebug('data-validator.test.ts:112', 'NULL 值处理结果', { 
        isValid: result.isValid,
        cleanedDataLength: result.cleanedData.length,
        hasNull: result.cleanedData.some((row: any) => Object.values(row).includes(null))
      }, 'C')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.cleanedData.length).toBe(3)
    })

    it('应该移除 NULL 值过多的行', () => {
      // #region agent log
      logDebug('data-validator.test.ts:124', '测试移除 NULL 值过多的行', { 
        dataLength: 3,
        nullThreshold: 0.5
      }, 'C')
      // #endregion agent log
      
      const data = [
        { name: 'A', value: 10, other: 20 },
        { name: null, value: null, other: null }, // 100% NULL
        { name: 'C', value: 30, other: 40 },
      ]
      
      const result = validateAndCleanChartData(data, { 
        removeNullRows: true, 
        nullThreshold: 0.5 
      })
      
      // #region agent log
      logDebug('data-validator.test.ts:137', '移除 NULL 行结果', { 
        isValid: result.isValid,
        cleanedDataLength: result.cleanedData.length,
        originalLength: 3,
        warnings: result.warnings
      }, 'C')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.cleanedData.length).toBeLessThan(3)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('应该处理 NaN 值', () => {
      // #region agent log
      logDebug('data-validator.test.ts:149', '测试 NaN 值处理', { 
        dataLength: 2,
        hasNaN: true
      }, 'D')
      // #endregion agent log
      
      const data = [
        { name: 'A', value: 10 },
        { name: 'B', value: NaN },
      ]
      
      const result = validateAndCleanChartData(data)
      
      // #region agent log
      logDebug('data-validator.test.ts:160', 'NaN 值处理结果', { 
        isValid: result.isValid,
        cleanedData: result.cleanedData,
        hasNaN: result.cleanedData.some((row: any) => 
          Object.values(row).some((v: any) => typeof v === 'number' && isNaN(v))
        )
      }, 'D')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      // NaN 应该被转换为 0
      const rowWithNaN = result.cleanedData.find((row: any) => row.name === 'B')
      expect(rowWithNaN?.value).toBe(0)
    })

    it('应该处理 Infinity 值', () => {
      // #region agent log
      logDebug('data-validator.test.ts:175', '测试 Infinity 值处理', { 
        dataLength: 2,
        hasInfinity: true
      }, 'D')
      // #endregion agent log
      
      const data = [
        { name: 'A', value: 10 },
        { name: 'B', value: Infinity },
      ]
      
      const result = validateAndCleanChartData(data)
      
      // #region agent log
      logDebug('data-validator.test.ts:186', 'Infinity 值处理结果', { 
        isValid: result.isValid,
        cleanedData: result.cleanedData
      }, 'D')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      const rowWithInf = result.cleanedData.find((row: any) => row.name === 'B')
      expect(rowWithInf?.value).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('应该对大数据量进行采样', () => {
      // #region agent log
      logDebug('data-validator.test.ts:197', '测试大数据量采样', { 
        originalLength: 2000,
        maxRows: 1000
      }, 'E')
      // #endregion agent log
      
      const data = Array.from({ length: 2000 }, (_, i) => ({
        name: `Item ${i}`,
        value: i,
      }))
      
      const result = validateAndCleanChartData(data, { maxRows: 1000 })
      
      // #region agent log
      logDebug('data-validator.test.ts:208', '大数据量采样结果', { 
        isValid: result.isValid,
        cleanedDataLength: result.cleanedData.length,
        originalLength: 2000,
        warnings: result.warnings
      }, 'E')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.cleanedData.length).toBeLessThanOrEqual(1000)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('应该警告列数少于2列', () => {
      // #region agent log
      logDebug('data-validator.test.ts:221', '测试列数警告', { 
        dataLength: 2,
        columnCount: 1
      }, 'F')
      // #endregion agent log
      
      const data = [
        { name: 'A' },
        { name: 'B' },
      ]
      
      const result = validateAndCleanChartData(data)
      
      // #region agent log
      logDebug('data-validator.test.ts:232', '列数警告结果', { 
        isValid: result.isValid,
        warnings: result.warnings
      }, 'F')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('列数少于2列'))).toBe(true)
    })
  })

  describe('validateQueryResult', () => {
    it('应该验证有效的查询结果', () => {
      // #region agent log
      logDebug('data-validator.test.ts:245', '测试有效查询结果验证', { 
        rowsCount: 3,
        columnsCount: 2
      }, 'A')
      // #endregion agent log
      
      const queryResult: QueryResult = {
        columns: ['name', 'value'],
        rows: [
          { name: 'A', value: 10 },
          { name: 'B', value: 20 },
          { name: 'C', value: 30 },
        ],
      }
      
      const result = validateQueryResult(queryResult)
      
      // #region agent log
      logDebug('data-validator.test.ts:259', '有效查询结果验证', { 
        isValid: result.isValid,
        isEmpty: result.isEmpty,
        warnings: result.warnings,
        errors: result.errors
      }, 'A')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.isEmpty).toBe(false)
      expect(result.errors.length).toBe(0)
    })

    it('应该拒绝 null 查询结果', () => {
      // #region agent log
      logDebug('data-validator.test.ts:272', '测试 null 查询结果拒绝', { 
        queryResult: null
      }, 'B')
      // #endregion agent log
      
      const result = validateQueryResult(null)
      
      // #region agent log
      logDebug('data-validator.test.ts:277', 'null 查询结果验证', { 
        isValid: result.isValid,
        isEmpty: result.isEmpty,
        errors: result.errors
      }, 'B')
      // #endregion agent log
      
      expect(result.isValid).toBe(false)
      expect(result.isEmpty).toBe(true)
      expect(result.errors).toContain('查询结果为空')
    })

    it('应该拒绝格式错误的查询结果', () => {
      // #region agent log
      logDebug('data-validator.test.ts:288', '测试格式错误查询结果拒绝', { 
        queryResultType: typeof { rows: 'not-array' }
      }, 'B')
      // #endregion agent log
      
      const result = validateQueryResult({ rows: 'not-array' } as any)
      
      // #region agent log
      logDebug('data-validator.test.ts:293', '格式错误查询结果验证', { 
        isValid: result.isValid,
        errors: result.errors
      }, 'B')
      // #endregion agent log
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('不是数组'))).toBe(true)
    })

    it('应该拒绝空行结果', () => {
      // #region agent log
      logDebug('data-validator.test.ts:303', '测试空行结果拒绝', { 
        rowsLength: 0
      }, 'B')
      // #endregion agent log
      
      const result = validateQueryResult({
        columns: ['name', 'value'],
        rows: [],
      })
      
      // #region agent log
      logDebug('data-validator.test.ts:310', '空行结果验证', { 
        isValid: result.isValid,
        isEmpty: result.isEmpty,
        errors: result.errors
      }, 'B')
      // #endregion agent log
      
      expect(result.isValid).toBe(false)
      expect(result.isEmpty).toBe(true)
      expect(result.errors.some(e => e.includes('没有返回任何数据'))).toBe(true)
    })

    it('应该警告缺少列信息', () => {
      // #region agent log
      logDebug('data-validator.test.ts:322', '测试缺少列信息警告', { 
        hasColumns: false
      }, 'F')
      // #endregion agent log
      
      const result = validateQueryResult({
        columns: [],
        rows: [{ name: 'A', value: 10 }],
      })
      
      // #region agent log
      logDebug('data-validator.test.ts:330', '缺少列信息验证', { 
        isValid: result.isValid,
        errors: result.errors
      }, 'F')
      // #endregion agent log
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('缺少列信息'))).toBe(true)
    })

    it('应该警告大数据量', () => {
      // #region agent log
      logDebug('data-validator.test.ts:341', '测试大数据量警告', { 
        rowsCount: 1500
      }, 'E')
      // #endregion agent log
      
      const queryResult: QueryResult = {
        columns: ['name', 'value'],
        rows: Array.from({ length: 1500 }, (_, i) => ({
          name: `Item ${i}`,
          value: i,
        })),
      }
      
      const result = validateQueryResult(queryResult)
      
      // #region agent log
      logDebug('data-validator.test.ts:354', '大数据量警告结果', { 
        isValid: result.isValid,
        warnings: result.warnings
      }, 'E')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('数据量较大'))).toBe(true)
    })

    it('应该警告高 NULL 值比例', () => {
      // #region agent log
      logDebug('data-validator.test.ts:365', '测试高 NULL 值比例警告', { 
        rowsCount: 10,
        nullRatio: 0.6
      }, 'C')
      // #endregion agent log
      
      const queryResult: QueryResult = {
        columns: ['name', 'value'],
        rows: Array.from({ length: 10 }, (_, i) => ({
          name: i < 6 ? null : `Item ${i}`,
          value: i < 6 ? null : i,
        })),
      }
      
      const result = validateQueryResult(queryResult)
      
      // #region agent log
      logDebug('data-validator.test.ts:379', '高 NULL 值比例警告结果', { 
        isValid: result.isValid,
        warnings: result.warnings
      }, 'C')
      // #endregion agent log
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('NULL值比例较高'))).toBe(true)
    })
  })
})
