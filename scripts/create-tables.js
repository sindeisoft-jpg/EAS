#!/usr/bin/env node

/**
 * 直接使用 SQL 创建所有表
 * 用于绕过 Prisma migrate 的兼容性问题
 */

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

/**
 * 从 .env 中解析 DATABASE_URL，支持密码中含 : 和 @
 * 格式: mysql://user:password@host:port/database
 */
function parseDatabaseUrl(envContent) {
  const urlMatch =
    envContent.match(/DATABASE_URL\s*=\s*"([^"]+)"/) ||
    envContent.match(/DATABASE_URL\s*=\s*'([^']+)'/)
  if (!urlMatch || !urlMatch[1].startsWith('mysql://')) return null
  const url = urlMatch[1].trim()
  const rest = url.slice('mysql://'.length)
  const atIdx = rest.lastIndexOf('@')
  if (atIdx === -1) return null
  const userPart = rest.slice(0, atIdx)
  const hostPart = rest.slice(atIdx + 1)
  const colonIdx = userPart.indexOf(':')
  const user = colonIdx === -1 ? userPart : userPart.slice(0, colonIdx)
  const password = colonIdx === -1 ? '' : userPart.slice(colonIdx + 1)
  const slashIdx = hostPart.indexOf('/')
  const hostPort = slashIdx === -1 ? hostPart : hostPart.slice(0, slashIdx)
  let database = slashIdx === -1 ? '' : hostPart.slice(slashIdx + 1).replace(/\?.*$/, '').trim()
  const lastColon = hostPort.lastIndexOf(':')
  const host = lastColon === -1 ? hostPort : hostPort.slice(0, lastColon)
  const port = lastColon === -1 ? 3306 : parseInt(hostPort.slice(lastColon + 1), 10) || 3306
  return { user, password, host, port, database }
}

async function main() {
  console.log('🚀 开始创建数据库表...\n')

  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    console.error('❌ 未找到 .env 文件')
    process.exit(1)
  }
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const parsed = parseDatabaseUrl(envContent)
  if (!parsed) {
    console.error('❌ 无法解析 DATABASE_URL，请确保格式为 mysql://用户:密码@主机:端口/数据库名')
    process.exit(1)
  }
  const { user: dbUser, password: dbPass, host: dbHost, port: dbPort, database: dbName } = parsed

  console.log(`📊 连接到数据库: ${dbName}\n`)

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
    })

    console.log('✅ 数据库连接成功\n')

    let sqlPath = path.join(process.cwd(), 'scripts', 'prisma-generated-fixed.sql')
    if (!fs.existsSync(sqlPath)) {
      sqlPath = path.join(process.cwd(), 'scripts', 'create-tables.sql')
    }
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ 未找到建表 SQL 文件（scripts/prisma-generated-fixed.sql 或 scripts/create-tables.sql）')
      process.exit(1)
    }
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
    if (!sqlContent || !sqlContent.trim()) {
      console.error('❌ 建表 SQL 文件为空，请运行 pnpm db:generate-sql 从 Prisma schema 生成')
      process.exit(1)
    }

    let cleanSql = sqlContent
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^USE\s+[^;]+;?\s*$/gim, '')

    const statements = cleanSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => {
        const upper = s.toUpperCase().trim()
        return s.length > 0 && upper.startsWith('CREATE')
      })

    if (statements.length === 0) {
      console.error('❌ SQL 文件中没有有效的 CREATE 语句')
      process.exit(1)
    }

    console.log(`📝 执行 ${statements.length} 个 SQL 语句...\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          const sql = statement.endsWith(';') ? statement : statement + ';'
          await connection.execute(sql)
          const tableMatch =
            statement.match(/CREATE TABLE.*?IF NOT EXISTS.*?`?(\w+)`?/i) ||
            statement.match(/CREATE TABLE.*?`?(\w+)`?/i)
          if (tableMatch) {
            console.log(`   ✅ ${tableMatch[1]}`)
          }
        } catch (error) {
          if (
            error.message.includes('already exists') ||
            error.code === 'ER_TABLE_EXISTS_ERROR'
          ) {
            const tableMatch =
              statement.match(/CREATE TABLE.*?IF NOT EXISTS.*?`?(\w+)`?/i) ||
              statement.match(/CREATE TABLE.*?`?(\w+)`?/i)
            if (tableMatch) {
              console.log(`   ⚠️  ${tableMatch[1]} (已存在)`)
            }
          } else {
            console.error(`   ❌ 错误: ${error.message}`)
            const preview = statement.substring(0, 100).replace(/\n/g, ' ')
            console.error(`   SQL 预览: ${preview}...`)
            await connection.end()
            process.exit(1)
          }
        }
      }
    }

    await connection.end()
    console.log('\n✅ 所有表创建完成！\n')
  } catch (error) {
    console.error('❌ 创建表失败:', error.message)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
