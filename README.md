# 💰 简易记账本

![License](https://img.shields.io/badge/license-MIT-green) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Express](https://img.shields.io/badge/Express-5-000000) ![SQLite](https://img.shields.io/badge/SQLite-3-003B57) ![Tests](https://img.shields.io/badge/tests-20%20passed-brightgreen)

> 一个前后端分离的记账应用，帮你轻松管理收支 💸

## 这是什么？

一个简洁的个人记账工具，支持**收入/支出记录、日期筛选、汇总统计**，每个用户数据完全隔离。前端 React + TypeScript，后端 Express + SQLite，开箱即用。

**适合场景**：
- 📚 学习全栈开发的入门项目
- 💡 快速搭建个人记账工具的模板
- 🎯 理解前后端分离 + 鉴权的最佳实践

## ✨ 功能特性

### 用户系统
- ✅ 注册 / 登录（scrypt 密码哈希 + Token 会话）
- ✅ 未登录自动跳转登录页
- ✅ 用户数据完全隔离（A 看不到 B 的记录）

### 记账功能
- ✅ 添加收入 / 支出记录：金额、分类、日期、备注
- ✅ 汇总卡片：总收入 / 总支出 / 余额
- ✅ 按日期区间筛选记录和汇总
- ✅ 删除记录

### 安全特性
- ✅ scrypt 密码哈希（非明文）
- ✅ 登录/注册限流（5 次/分钟，防暴力破解）
- ✅ 会话过期机制（7 天自动失效）
- ✅ SQL 参数化查询（防注入）

## 🛠️ 技术栈

| 端 | 技术 |
|---|---|
| **前端** | React 19、TypeScript、Vite、React Router 7 |
| **后端** | Node.js、Express 5、better-sqlite3（WAL 模式） |
| **鉴权** | Bearer Token + scrypt 密码哈希 |
| **测试** | Vitest + Supertest（20 个用例） |

## 🏗️ 系统架构

```text
┌─────────────────────────────────────────────────────────────┐
│  浏览器 (http://localhost:5173)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React SPA                                           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Auth   │ │ Ledger  │ │  Home    │ │  About   │  │   │
│  │  │ 登录注册 │ │ 记账页面 │ │  首页    │ │  关于    │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬─────┘ └──────────┘  │   │
│  │       └───────────┴───────────┘                      │   │
│  │                    │ api.ts (fetch + Bearer Token)   │   │
│  └────────────────────┼─────────────────────────────────┘   │
│                       │ /api/* (Vite dev proxy → 3001)      │
├───────────────────────┼─────────────────────────────────────┤
│                       ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Express Server (http://localhost:3001)              │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │  Middleware                                  │   │    │
│  │  │  Rate Limit → Auth Verify → Route Handler   │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │    │
│  │  │  /auth   │ │ /records │ │    /summary      │    │    │
│  │  │ 注册登录  │ │ CRUD     │ │    汇总统计      │    │    │
│  │  └────┬─────┘ └────┬─────┘ └────────┬─────────┘    │    │
│  │       └────────────┴────────────────┘               │    │
│  │                      │                              │    │
│  │  ┌───────────────────▼──────────────────────────┐   │    │
│  │  │  better-sqlite3 (WAL 模式)                    │   │    │
│  │  │  users 表 │ records 表 │ sessions 表          │   │    │
│  │  │  数据文件: server/data.db (gitignore)         │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 目录结构

```
expense-tracker/
├── server/                # 后端
│   ├── index.js           # API 服务（createApp 可测试）
│   ├── seed.js            # 管理员账号种子脚本
│   └── __tests__/         # API 测试（20 个用例）
├── src/                   # 前端
│   ├── lib/               # api.ts 请求封装 / auth.tsx 状态管理
│   ├── pages/             # Home / Auth / Ledger / About
│   ├── components/        # Navbar 导航栏
│   └── App.tsx            # 路由与登录守卫
├── .github/workflows/     # CI 自动测试
└── vite.config.ts         # 含 /api → 3001 开发代理
```

## 🚀 快速开始

### 1 分钟上手

```bash
# 1. 安装依赖
npm install

# 2. 启动后端（终端 1）
npm run server

# 3. 启动前端（终端 2）
npm run dev
```

打开浏览器访问 **http://localhost:5173**，注册账号即可开始记账！

### 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动前端开发服务器（5173） |
| `npm run server` | 启动后端 API（3001） |
| `npm run seed` | 创建管理员账号（幂等） |
| `npm run build` | 生产构建 |
| `npm test` | 运行测试（20 个用例） |

## 📡 API 一览

除注册/登录外，均需携带 `Authorization: Bearer <token>`。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册，成功即返回 token |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| GET | `/api/records` | 记录列表（支持日期筛选） |
| POST | `/api/records` | 新增记录 |
| DELETE | `/api/records/:id` | 删除记录 |
| GET | `/api/summary` | 汇总统计 |

## 🧪 测试

```bash
npm test
# ✅ 20 passed (认证/记录CRUD/汇总/数据隔离)
```

## ❓ 常见问题

- **`Cannot GET /`**：后端是纯 API，请访问 5173 端口的前端
- **端口被占用**：`$env:PORT=3002; npm run server` 换端口
- **重置数据库**：删除 `server/data.db` 后重启

## 📄 许可证

[MIT License](LICENSE) © y0u41
