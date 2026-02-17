/**
 * 集成测试
 * 测试多个模块的协同工作
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SQLValidator } from '@/lib/sql-validator'
import { validateAndCleanChartData, validateQueryResult } from '@/lib/data-validator'
import type { DatabaseSchema, QueryResult } from '@/lib/types'
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
    runId: 'integration-test',
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

describe('集成测试', () => {
  beforeEach(() => {
    try {
      if (fs.existsSync(LOG_PATH)) {
        fs.unlinkSync(LOG_PATH)
      }
    } catch (error) {
      // 忽略错误
    }
  })

  describe('SQL 验证 + 数据验证流程', () => {
    const mockSchema: DatabaseSchema[] = [
      {
        tableName: 'sales',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'product', type: 'VARCHAR', nullable: true },
          { name: 'amount', type: 'DECIMAL', nullable: true },
          { name: 'date', type: 'DATE', nullable: true },
        ],
      },
    ]

    it('应该完成完整的查询流程：验证 SQL -> 执行查询 -> 验证结果', () => {
      // #region agent log
      logDebug('integration.test.ts:58', '开始完整查询流程测试', { 
        sql: 'SELECT product, amount FROM sales',
        hasSchema: true
      }, 'A')
      // #endregion agent log
      
      // 步骤 1: 验证 SQL
      const sql = 'SELECT product, amount FROM sales'
      const sqlValidation = SQLValidator.validate(sql)
      
      // #region agent log
      logDebug('integration.test.ts:67', 'SQL 验证完成', { 
        valid: sqlValidation.valid,
        error: sqlValidation.error
      }, 'A')
      // #endregion agent log
      
      expect(sqlValidation.valid).toBe(true)
      
      // 步骤 2: 验证 Schema
      const schemaValidation = SQLValidator.validateSchema(sql, mockSchema)
      
      // #region agent log
      logDebug('integration.test.ts:77', 'Schema 验证完成', { 
        valid: schemaValidation.valid,
        errors: schemaValidation.errors
      }, 'A')
      // #endregion agent log
      
      expect(schemaValidation.valid).toBe(true)
      
      // 步骤 3: 模拟查询结果
      const queryResult: QueryResult = {
        columns: ['product', 'amount'],
        rows: [
          { product: 'Product A', amount: 100 },
          { product: 'Product B', amount: 200 },
          { product: 'Product C', amount: 300 },
        ],
      }
      
      // 步骤 4: 验证查询结果
      const resultValidation = validateQueryResult(queryResult)
      
      // #region agent log
      logDebug('integration.test.ts:95', '查询结果验证完成', { 
        isValid: resultValidation.isValid,
        isEmpty: resultValidation.isEmpty,
        warnings: resultValidation.warnings
      }, 'A')
      // #endregion agent log
      
      expect(resultValidation.isValid).toBe(true)
      
      // 步骤 5: 清洗数据用于图表
      const cleanedData = validateAndCleanChartData(queryResult.rows)
      
      // #region agent log
      logDebug('integration.test.ts:106', '数据清洗完成', { 
        isValid: cleanedData.isValid,
        cleanedDataLength: cleanedData.cleanedData.length,
        warnings: cleanedData.warnings
      }, 'A')
      // #endregion agent log
      
      expect(cleanedData.isValid).toBe(true)
      expect(cleanedData.cleanedData.length).toBe(3)
    })

    it('应该处理包含 NULL 值的查询结果', () => {
      // #region agent log
      logDebug('integration.test.ts:118', '测试 NULL 值处理流程', { 
        sql: 'SELECT product, amount FROM sales',
        hasNull: true
      }, 'B')
      // #endregion agent log
      
      const sql = 'SELECT product, amount FROM sales'
      const sqlValidation = SQLValidator.validate(sql)
      const schemaValidation = SQLValidator.validateSchema(sql, mockSchema)
      
      // #region agent log
      logDebug('integration.test.ts:126', 'SQL 和 Schema 验证完成', { 
        sqlValid: sqlValidation.valid,
        schemaValid: schemaValidation.valid
      }, 'B')
      // #endregion agent log
      
      expect(sqlValidation.valid).toBe(true)
      expect(schemaValidation.valid).toBe(true)
      
      // 模拟包含 NULL 值的查询结果
      const queryResult: QueryResult = {
        columns: ['product', 'amount'],
        rows: [
          { product: 'Product A', amount: 100 },
          { product: null, amount: null },
          { product: 'Product C', amount: 300 },
        ],
      }
      
      const resultValidation = validateQueryResult(queryResult)
      
      // #region agent log
      logDebug('integration.test.ts:143', 'NULL 值查询结果验证', { 
        isValid: resultValidation.isValid,
        warnings: resultValidation.warnings
      }, 'B')
      // #endregion agent log
      
      expect(resultValidation.isValid).toBe(true)
      
      // 清洗数据（不移除 NULL 行）
      const cleanedData = validateAndCleanChartData(queryResult.rows, {
        removeNullRows: false,
      })
      
      // #region agent log
      logDebug('integration.test.ts:154', 'NULL 值数据清洗结果', { 
        isValid: cleanedData.isValid,
        cleanedDataLength: cleanedData.cleanedData.length
      }, 'B')
      // #endregion agent log
      
      expect(cleanedData.isValid).toBe(true)
      expect(cleanedData.cleanedData.length).toBe(3)
    })

    it('应该拒绝不安全的 SQL 并阻止执行', () => {
      // #region agent log
      logDebug('integration.test.ts:165', '测试不安全 SQL 拒绝流程', { 
        sql: 'DELETE FROM sales',
        isDangerous: true
      }, 'C')
      // #endregion agent log
      
      const dangerousSql = 'DELETE FROM sales'
      const sqlValidation = SQLValidator.validate(dangerousSql)
      
      // #region agent log
      logDebug('integration.test.ts:172', '不安全 SQL 验证结果', { 
        valid: sqlValidation.valid,
        error: sqlValidation.error
      }, 'C')
      // #endregion agent log
      
      expect(sqlValidation.valid).toBe(false)
      expect(sqlValidation.error).toContain('禁止的操作')
      
      // 不应该继续执行查询
      // #region agent log
      logDebug('integration.test.ts:180', '阻止查询执行', { 
        shouldNotExecute: true
      }, 'C')
      // #endregion agent log
    })

    it('应该处理大数据量的查询结果', () => {
      // #region agent log
      logDebug('integration.test.ts:188', '测试大数据量处理流程', { 
        sql: 'SELECT product, amount FROM sales',
        expectedRows: 2000
      }, 'D')
      // #endregion agent log
      
      const sql = 'SELECT product, amount FROM sales'
      const sqlValidation = SQLValidator.validate(sql)
      const schemaValidation = SQLValidator.validateSchema(sql, mockSchema)
      
      // #region agent log
      logDebug('integration.test.ts:196', 'SQL 验证完成（大数据量）', { 
        sqlValid: sqlValidation.valid,
        schemaValid: schemaValidation.valid
      }, 'D')
      // #endregion agent log
      
      expect(sqlValidation.valid).toBe(true)
      expect(schemaValidation.valid).toBe(true)
      
      // 模拟大数据量查询结果
      const queryResult: QueryResult = {
        columns: ['product', 'amount'],
        rows: Array.from({ length: 2000 }, (_, i) => ({
          product: `Product ${i}`,
          amount: i * 10,
        })),
      }
      
      const resultValidation = validateQueryResult(queryResult)
      
      // #region agent log
      logDebug('integration.test.ts:213', '大数据量结果验证', { 
        isValid: resultValidation.isValid,
        warnings: resultValidation.warnings
      }, 'D')
      // #endregion agent log
      
      expect(resultValidation.isValid).toBe(true)
      expect(resultValidation.warnings.some(w => w.includes('数据量较大'))).toBe(true)
      
      // 清洗数据（采样）
      const cleanedData = validateAndCleanChartData(queryResult.rows, {
        maxRows: 1000,
      })
      
      // #region agent log
      logDebug('integration.test.ts:225', '大数据量清洗结果', { 
        isValid: cleanedData.isValid,
        cleanedDataLength: cleanedData.cleanedData.length,
        originalLength: 2000,
        warnings: cleanedData.warnings
      }, 'D')
      // #endregion agent log
      
      expect(cleanedData.isValid).toBe(true)
      expect(cleanedData.cleanedData.length).toBeLessThanOrEqual(1000)
      expect(cleanedData.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('边界情况集成测试', () => {
    it('应该处理复杂的 JOIN 查询', () => {
      // #region agent log
      logDebug('integration.test.ts:240', '测试复杂 JOIN 查询', { 
        sql: 'SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id'
      }, 'E')
      // #endregion agent log
      
      const schema: DatabaseSchema[] = [
        {
          tableName: 'users',
          columns: [
            { name: 'id', type: 'INT', nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: true },
          ],
        },
        {
          tableName: 'orders',
          columns: [
            { name: 'id', type: 'INT', nullable: false },
            { name: 'user_id', type: 'INT', nullable: false },
            { name: 'amount', type: 'DECIMAL', nullable: true },
          ],
        },
      ]
      
      const sql = 'SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id'
      const sqlValidation = SQLValidator.validate(sql)
      const schemaValidation = SQLValidator.validateSchema(sql, schema)
      
      // #region agent log
      logDebug('integration.test.ts:262', '复杂 JOIN 查询验证结果', { 
        sqlValid: sqlValidation.valid,
        schemaValid: schemaValidation.valid,
        errors: schemaValidation.errors
      }, 'E')
      // #endregion agent log
      
      expect(sqlValidation.valid).toBe(true)
      expect(schemaValidation.valid).toBe(true)
    })

    it('应该处理 UNION 查询', () => {
      // #region agent log
      logDebug('integration.test.ts:273', '测试 UNION 查询', { 
        sql: 'SELECT id FROM users UNION SELECT id FROM orders'
      }, 'E')
      // #endregion agent log
      
      const schema: DatabaseSchema[] = [
        {
          tableName: 'users',
          columns: [{ name: 'id', type: 'INT', nullable: false }],
        },
        {
          tableName: 'orders',
          columns: [{ name: 'id', type: 'INT', nullable: false }],
        },
      ]
      
      const sql = 'SELECT id FROM users UNION SELECT id FROM orders'
      const sqlValidation = SQLValidator.validate(sql)
      const schemaValidation = SQLValidator.validateSchema(sql, schema)
      
      // #region agent log
      logDebug('integration.test.ts:290', 'UNION 查询验证结果', { 
        sqlValid: sqlValidation.valid,
        schemaValid: schemaValidation.valid,
        errors: schemaValidation.errors
      }, 'E')
      // #endregion agent log
      
      expect(sqlValidation.valid).toBe(true)
      expect(schemaValidation.valid).toBe(true)
    })
  })
})
