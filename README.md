# 紫鈊BI系统 - 智能数据分析平台

<p align="center">
  <img src="public/icon.svg" alt="紫鈊BI Logo" width="120" height="120">
  <br>
  <strong>让数据说话，让决策更智能</strong>
</p>

<p align="center">
  <a href="#-产品简介">产品简介</a> •
  <a href="#-核心功能">核心功能</a> •
  <a href="#-技术架构">技术架构</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-部署指南">部署指南</a> •
  <a href="#-文档">文档</a> •
  <a href="#-许可证">许可证</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js" alt="Next.js 14">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS 3">
  <img src="https://img.shields.io/badge/Prisma-5.0-2D3748?style=for-the-badge&logo=prisma" alt="Prisma 5">
</p>

## 🚀 产品简介

**紫鈊BI系统**是南京鑫和网络有限公司倾力打造的**新一代智能数据分析平台**，将人工智能与商业智能深度融合，为企业提供**自然语言驱动的数据洞察解决方案**。

### ✨ 产品特色
- **🤖 AI智能驱动**：自然语言查询，无需SQL知识
- **📊 智能可视化**：自动图表生成，交互式仪表板
- **🔒 企业级安全**：多级权限控制，完整审计追溯
- **🔄 实时分析**：毫秒级数据更新，支持大数据量
- **🎯 零代码操作**：业务人员自主分析，释放IT压力

## 🎯 核心功能

### 1. 自然语言数据查询
- **智能对话式查询**：使用自然语言提问，系统自动生成SQL
- **多轮对话优化**：上下文理解，持续优化查询结果
- **智能意图识别**：准确理解用户查询意图

### 2. 智能可视化分析
- **自动图表推荐**：根据数据特征智能推荐最佳可视化方案
- **交互式仪表板**：拖拽式自定义，实时数据更新
- **多维度钻取**：支持数据层层深入分析

### 3. AI智能助手
- **专业数据分析师**：内置AI助手提供分析建议
- **智能报告生成**：自动生成结构化分析报告
- **预测性分析**：基于历史数据进行趋势预测

### 4. 企业级管理
- **用户权限管理**：细粒度权限控制，支持RBAC
- **数据安全管理**：敏感数据自动脱敏，访问控制
- **完整审计日志**：所有操作记录可追溯

## 🏗️ 技术架构

### 前端技术栈
- **框架**：Next.js 14 (App Router) + React 18
- **语言**：TypeScript 5
- **样式**：Tailwind CSS 3 + shadcn/ui
- **图表**：ECharts + Recharts
- **状态管理**：React Context + Zustand

### 后端技术栈
- **运行时**：Node.js 18+
- **ORM**：Prisma 5 + MySQL/SQLite
- **API**：Next.js API Routes
- **认证**：JWT + 会话管理
- **AI集成**：OpenAI API + 本地LLM支持

### 数据库
- **主数据库**：MySQL 8.0+ (推荐生产环境)
- **开发数据库**：SQLite (开发环境)
- **数据模型**：完整的关系型数据模型

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- MySQL 8.0+ 或 SQLite
- pnpm 8.0+ (推荐) 或 npm 9.0+

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/sindeisoft-jpg/EAS.git
   cd EAS
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **环境配置**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接
   ```

4. **数据库初始化**
   ```bash
   # 创建数据库
   pnpm db:push
   
   # 生成Prisma客户端
   pnpm db:generate
   ```

5. **启动开发服务器**
   ```bash
   pnpm dev
   ```

6. **访问应用**
   - 打开浏览器访问：http://localhost:3000
   - 首次访问会自动跳转到安装向导
   - 按照向导完成数据库配置和管理员账户创建

### 默认管理员账户
- **用户名**：admin
- **密码**：admin123
- **邮箱**：admin@admin.com

## 📦 部署指南

### 生产环境部署

#### 使用 Docker (推荐)
```bash
# 构建Docker镜像
docker build -t zixinbi .

# 运行容器
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://user:password@host:3306/database" \
  -e JWT_SECRET="your-jwt-secret" \
  zixinbi
```

#### 手动部署
1. **构建生产版本**
   ```bash
   pnpm build
   ```

2. **启动生产服务器**
   ```bash
   pnpm start
   ```

3. **配置反向代理** (Nginx示例)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### 环境变量配置
```env
# 数据库配置
DATABASE_URL="mysql://username:password@localhost:3306/database_name"

# 应用配置
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# JWT配置
JWT_SECRET="your-jwt-secret-key"

# AI配置 (可选)
OPENAI_API_KEY="your-openai-api-key"
```

## 📚 文档

### 详细文档
- [产品介绍文档](./产品介绍-紫鈊BI系统.md) - 完整的产品功能和技术架构介绍
- [自我介绍文档](./紫鈊BI系统-自我介绍.md) - 专业的自我介绍和公司背景

### API文档
系统提供完整的RESTful API接口，支持以下功能：

#### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

#### 数据查询
- `POST /api/chat/stream/[sessionId]` - 流式数据查询
- `GET /api/databases/[id]/schema` - 获取数据库结构
- `POST /api/databases/[id]/query` - 执行SQL查询

#### 管理功能
- `GET /api/users` - 用户管理
- `GET /api/databases` - 数据库连接管理
- `GET /api/agents` - AI助手管理

### 开发指南

#### 项目结构
```
eas/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关页面
│   ├── api/               # API路由
│   ├── dashboard/         # 仪表板页面
│   └── install/           # 安装向导
├── components/            # React组件
│   ├── ui/               # 基础UI组件
│   └── *.tsx             # 业务组件
├── lib/                   # 工具函数和业务逻辑
├── prisma/               # 数据库模型
├── public/               # 静态资源
└── styles/               # 全局样式
```

#### 添加新功能
1. **创建数据库模型**：在 `prisma/schema.prisma` 中定义
2. **生成Prisma客户端**：运行 `pnpm db:generate`
3. **创建API路由**：在 `app/api/` 下添加新路由
4. **创建页面组件**：在 `app/` 目录下添加页面
5. **创建业务组件**：在 `components/` 目录下添加组件

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test tests/data-validator.test.ts

# 运行测试并查看覆盖率
pnpm test:coverage
```

### 测试类型
- **单元测试**：业务逻辑测试
- **集成测试**：API接口测试
- **E2E测试**：完整流程测试

## 🤝 贡献指南

我们欢迎社区贡献！请按以下步骤参与：

1. **Fork 仓库**
2. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **提交更改**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **推送到分支**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **创建 Pull Request**

### 开发规范
- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 编写单元测试
- 更新相关文档

## 📞 支持与联系

### 问题反馈
- [GitHub Issues](https://github.com/sindeisoft-jpg/EAS/issues) - 报告Bug或功能请求
- [Discussions](https://github.com/sindeisoft-jpg/EAS/discussions) - 技术讨论

### 商业支持
**南京鑫和网络有限公司**
- **官网**：www.xinhe.net
- **邮箱**：contact@xinhe.net
- **电话**：025-8888 8888
- **地址**：江苏省南京市鼓楼区中山路99号鑫和大厦

### 社区
- **GitHub**：https://github.com/sindeisoft-jpg/EAS
- **文档**：https://docs.zixinbi.com (建设中)
- **演示**：https://demo.zixinbi.com (建设中)

## 📄 许可证

本项目采用 **MIT 许可证** - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

### 主要技术依赖
- [Next.js](https://nextjs.org) - React框架
- [Prisma](https://prisma.io) - 现代ORM
- [Tailwind CSS](https://tailwindcss.com) - 实用优先的CSS框架
- [ECharts](https://echarts.apache.org) - 强大的图表库
- [shadcn/ui](https://ui.shadcn.com) - 可复用的UI组件

---

<p align="center">
  <strong>紫鈊BI系统 - 您的智能数据分析伙伴</strong>
  <br>
  <em>让数据创造价值，用智能驱动未来</em>
</p>

<p align="center">
  <sub>由 <a href="https://www.xinhe.net">南京鑫和网络有限公司</a> 荣誉出品</sub>
</p>