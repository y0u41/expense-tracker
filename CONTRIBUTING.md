# 贡献指南

感谢你对本项目的关注！本文档说明如何参与开发。

## 开发环境

- Node.js ≥ 20
- npm 或 pnpm

## 快速开始

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/<your-username>/expense-tracker.git
cd expense-tracker

# 2. 安装依赖
npm install

# 3. 启动开发环境
npm run server   # 终端 1：后端
npm run dev      # 终端 2：前端
```

## 项目结构

```
├── server/          # 后端（Express + SQLite）
│   ├── index.js     # API 服务
│   └── __tests__/   # 测试
├── src/             # 前端（React）
│   ├── pages/       # 页面组件
│   ├── components/  # 通用组件
│   └── lib/         # 工具库
└── .github/         # CI 配置
```

## 开发流程

### 1. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 2. 编写代码

- 遵循现有代码风格
- 新功能需添加测试
- 修复 Bug 需说明复现步骤

### 3. 运行测试

```bash
npm test           # 运行所有测试
npm run build      # 构建检查
```

### 4. 提交代码

```bash
git add .
git commit -m "feat: 添加 XXX 功能"
git push origin feature/your-feature-name
```

**提交信息规范**（Conventional Commits）：

| 前缀 | 说明 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: 添加导出 CSV 功能` |
| `fix:` | 修复 Bug | `fix: 修复日期筛选边界问题` |
| `docs:` | 文档更新 | `docs: 更新 README` |
| `test:` | 测试 | `test: 添加登录测试用例` |
| `chore:` | 构建/工具 | `chore: 更新依赖` |

### 5. 创建 Pull Request

- 描述改动内容和原因
- 关联相关 Issue（如有）
- 确保 CI 通过

## 代码规范

### 前端
- 使用 TypeScript，避免 `any`
- 组件函数式写法
- 样式使用项目现有的 CSS 方案

### 后端
- 输入校验必不可少
- SQL 使用参数化查询
- 错误响应格式统一

### 测试
- 新功能必须附带测试
- 测试文件放在 `__tests__/` 目录
- 测试命名：描述行为，如 `should return 401 when token invalid`

## Issue 反馈

提交 Issue 时请包含：

1. **环境信息**：操作系统、Node 版本
2. **复现步骤**：最小复现代码
3. **期望行为 vs 实际行为**
4. **错误日志**（如有）

## 行为准则

- 尊重他人，友善交流
- 聚焦技术讨论
- 欢迎新人提问
