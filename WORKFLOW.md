# 工作流说明文档

## 用户提问 → SQL生成 → 查询执行 完整流程

### 1. 前端处理（chat-interface.tsx）

**位置**: `components/chat-interface.tsx` 的 `handleSubmit` 函数

**流程**:
1. 用户提交问题
2. 检查 `connection?.metadata?.schemas` 是否存在
3. 如果不存在，调用 `apiClient.getDatabaseSchema(dbConnectionId)` 获取数据库结构
4. 将 schema 和用户消息一起发送到后端 `/api/chat`

**关键代码**:
```typescript
// 获取数据库 schema（如果还没有）
let schema = connection?.metadata?.schemas
const dbConnectionId = getEffectiveDatabaseId()

if (!schema && dbConnectionId) {
  try {
    const schemaData = await apiClient.getDatabaseSchema(dbConnectionId)
    schema = schemaData.schemas
  } catch (error) {
    console.warn("[Chat] Failed to fetch schema:", error)
  }
}
```

---

### 2. 获取数据库结构（Schema API）

**位置**: `app/api/databases/[id]/schema/route.ts`

**流程**:
1. 接收数据库连接ID
2. 使用 SQL 查询 `information_schema` 获取数据库结构：
   - 查询所有表：`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '数据库名'`
   - 对每个表查询列信息：`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT FROM information_schema.COLUMNS WHERE ...`
3. 将获取的结构保存到 `connection.metadata` 中
4. 返回完整的 schema 数据

**关键SQL语句**:
```sql
-- MySQL
SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '数据库名'

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = '数据库名' AND TABLE_NAME = '表名'
ORDER BY ORDINAL_POSITION
```

**返回的数据结构**:
```json
{
  "schemas": [
    {
      "tableName": "表名",
      "columns": [
        {
          "name": "列名",
          "type": "数据类型",
          "nullable": true/false,
          "isPrimaryKey": true/false,
          "isForeignKey": true/false,
          "description": "列注释"
        }
      ],
      "rowCount": 行数
    }
  ]
}
```

---

### 3. 后端Chat处理（chat/route.ts）

**位置**: `app/api/chat/route.ts` 的 `handlePOST` 函数

#### 3.1 接收和准备Schema

**流程**:
1. 接收前端传来的 `databaseSchema` 参数
2. 如果没有提供，尝试从 `connection.metadata.schemas` 获取
3. 如果仍然没有，**自动获取**（调用SQL查询information_schema）

**关键代码**:
```typescript
// 如果没有提供 schema，尝试从 metadata 获取或自动获取
let schema = databaseSchema
if (!schema && connection.metadata && (connection.metadata as any).schemas) {
  schema = (connection.metadata as any).schemas
}

// 如果仍然没有 schema，尝试自动获取
if (!schema || (Array.isArray(schema) && schema.length === 0)) {
  // 自动获取schema（使用SQL查询information_schema）
  // ... 执行SQL查询获取表结构
}
```

#### 3.2 格式化Schema并传递给LLM

**流程**:
1. 使用 `formatDatabaseSchema(schema)` 将schema格式化为易读的文本
2. 构建系统提示词，包含：
   - 数据库类型和名称
   - 完整的数据库架构信息（所有表和字段）
   - 使用规则和限制
   - 输出格式要求

**关键代码**:
```typescript
// 格式化数据库结构
const formattedSchema = formatDatabaseSchema(schema)
const schemaText = formattedSchema

// 构建系统提示词
systemPrompt = `
# 数据库信息
- 数据库类型: ${connection.type || "MySQL"}
- 数据库名称: ${connection.database}

# 数据库架构
${schemaText}

# 重要规则（必须严格遵守）
2. **⚠️ 严格使用架构中存在的表和列名**：
   - **必须完全匹配**数据库 schema 中提供的表名和字段名
   - **不要猜测或编造字段名**：只能使用 schema 中明确列出的字段
   ...
`
```

#### 3.3 调用LLM生成SQL

**流程**:
1. 将系统提示词和用户消息发送给LLM
2. LLM根据用户问题和提供的schema生成SQL语句
3. 从LLM响应中提取JSON格式的SQL

**LLM返回格式**:
```json
{
  "explanation": "查询说明",
  "sql": "SELECT ... FROM ... WHERE ...",
  "reasoning": "查询逻辑说明"
}
```

#### 3.4 验证和执行SQL

**流程**:
1. **SQL安全性验证**：确保只包含SELECT语句（不允许INSERT/UPDATE/DELETE等）
2. **Schema验证**：验证SQL中使用的表和字段是否在schema中存在
   - 如果验证失败，会尝试重新生成SQL
3. **执行SQL查询**
4. **处理表结构查询结果**：如果返回的是表结构信息而不是实际数据，会触发第二次查询

**关键代码**:
```typescript
// 验证 SQL 安全性（只允许 SELECT）
const sqlValidation = SQLValidator.validate(sql, false)

// 验证 SQL 中的表和字段是否存在于 schema 中
if (schema && Array.isArray(schema) && schema.length > 0) {
  const schemaValidation = SQLValidator.validateSchema(sql, schema)
  if (!schemaValidation.valid) {
    // 尝试重新生成SQL
    // ...
  }
}

// 执行查询
queryResult = await SQLExecutor.executeQuery(connection as any, sql)
```

---

### 4. 工作流总结

#### ✅ 完整流程确认

1. **✅ 获取数据库结构**
   - 用户提问时，系统会调用SQL语句（查询`information_schema`）返回整个数据库的数据结构
   - 获取方式：
     - 前端主动调用 `/api/databases/[id]/schema` API
     - 或后端在chat API中自动获取（如果schema不存在）
   - SQL语句：使用`information_schema`系统表查询

2. **✅ 根据用户提问生成SQL**
   - LLM根据用户的当前提问和提供的数据库结构生成SQL语句
   - 系统提示词中包含了完整的数据库架构信息

3. **✅ 字段验证**
   - 生成的SQL语句涉及到的字段都基于之前返回的数据结构
   - 系统会验证SQL中的表和字段是否在schema中存在
   - 如果字段不存在，会尝试重新生成或报错

---

### 5. 关键文件位置

| 功能 | 文件路径 | 关键函数/代码 |
|------|---------|--------------|
| 前端获取Schema | `components/chat-interface.tsx` | `handleSubmit` (700-712行) |
| Schema API | `app/api/databases/[id]/schema/route.ts` | `handleGET` (7-176行) |
| Chat API主流程 | `app/api/chat/route.ts` | `handlePOST` (15-1632行) |
| Schema格式化 | `lib/template-engine.ts` | `formatDatabaseSchema` (52-109行) |
| SQL验证 | `lib/sql-validator.ts` | `validateSchema` |
| SQL执行 | `lib/sql-executor.ts` | `executeQuery` |

---

### 6. 数据流图

```
用户提问
  ↓
前端 (chat-interface.tsx)
  ↓ [检查schema是否存在]
  ↓ [如果不存在] → 调用 /api/databases/[id]/schema
  ↓                    ↓
  ↓                   查询 information_schema
  ↓                   返回完整数据库结构
  ↓                   保存到 connection.metadata
  ↓ [schema已存在] ← ← ←
  ↓
发送到 /api/chat (包含schema)
  ↓
后端 (chat/route.ts)
  ↓ [如果schema不存在，自动获取]
  ↓
格式化schema为文本
  ↓
构建系统提示词（包含完整schema）
  ↓
调用LLM生成SQL
  ↓
验证SQL（安全性和schema匹配）
  ↓ [如果验证失败] → 重新生成SQL
  ↓
执行SQL查询
  ↓
返回结果给前端
```

---

### 7. 注意事项

1. **Schema缓存**：获取的schema会保存到`connection.metadata`中，避免重复查询
2. **自动获取**：如果前端没有提供schema，后端会自动获取
3. **字段验证**：严格验证SQL中的表和字段是否在schema中存在
4. **二次查询**：如果返回的是表结构信息，系统会自动触发第二次查询获取实际数据
5. **SQL限制**：只允许SELECT查询，禁止任何修改数据的操作
