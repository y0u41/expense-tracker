import crypto from 'node:crypto'
import express from 'express'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---------- 创建 app 和数据库（可被测试复用） ----------
export function createApp(dbPath = ':memory:') {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      expires_at TEXT NOT NULL DEFAULT (datetime('now', '+7 days', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK (amount > 0),
      category TEXT NOT NULL DEFAULT '其他',
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, date);
  `)

  // 密码工具
  function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex')
  }
  function verifyPassword(password, salt, hash) {
    const candidate = hashPassword(password, salt)
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))
  }

  // 鉴权中间件
  function requireAuth(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ message: '未登录' })
    const session = db
      .prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')")
      .get(token)
    if (!session) return res.status(401).json({ message: '登录已过期，请重新登录' })
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(session.user_id)
    if (!user) return res.status(401).json({ message: '用户不存在' })
    req.user = user
    next()
  }

  // 限流
  const loginAttempts = new Map()
  const RATE_WINDOW_MS = 60_000
  const RATE_MAX = 5
  function rateLimit(req, res, next) {
    const key = `${req.ip}:${req.body?.username || ''}`
    const now = Date.now()
    const entry = loginAttempts.get(key)
    if (!entry || now > entry.resetAt) {
      loginAttempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
      return next()
    }
    entry.count++
    if (entry.count > RATE_MAX) {
      return res.status(429).json({ message: '尝试过于频繁，请稍后再试' })
    }
    next()
  }

  const app = express()
  app.use(express.json())

  // 认证
  app.post('/api/auth/register', rateLimit, (req, res) => {
    const { username, password } = req.body || {}
    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ message: '用户名至少 2 个字符' })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: '密码至少 6 位' })
    }
    const name = username.trim()
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(name)
    if (exists) return res.status(409).json({ message: '用户名已被注册' })
    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, salt)
    const info = db
      .prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)')
      .run(name, passwordHash, salt)
    const token = crypto.randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, info.lastInsertRowid)
    res.status(201).json({ token, user: { id: info.lastInsertRowid, username: name, role: 'user' } })
  })

  app.post('/api/auth/login', rateLimit, (req, res) => {
    const { username, password } = req.body || {}
    const user = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(String(username || '').trim())
    if (!user || !verifyPassword(String(password || ''), user.salt, user.password_hash)) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    const token = crypto.randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id)
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } })
  })

  app.post('/api/auth/logout', requireAuth, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.headers.authorization.slice(7))
    res.json({ message: '已退出' })
  })

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user })
  })

  // 记账
  function parseDateFilter(query) {
    const conditions = []
    const params = []
    if (query.startDate) {
      conditions.push('date >= ?')
      params.push(String(query.startDate))
    }
    if (query.endDate) {
      conditions.push('date <= ?')
      params.push(String(query.endDate))
    }
    return { conditions, params }
  }

  app.get('/api/records', requireAuth, (req, res) => {
    const { conditions, params } = parseDateFilter(req.query)
    const where = ['user_id = ?', ...conditions]
    const rows = db
      .prepare(`SELECT * FROM records WHERE ${where.join(' AND ')} ORDER BY date DESC, id DESC`)
      .all(req.user.id, ...params)
    res.json({ records: rows })
  })

  app.get('/api/summary', requireAuth, (req, res) => {
    const { conditions, params } = parseDateFilter(req.query)
    const where = ['user_id = ?', ...conditions]
    const row = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS totalIncome,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS totalExpense
         FROM records WHERE ${where.join(' AND ')}`,
      )
      .get(req.user.id, ...params)
    res.json({
      totalIncome: row.totalIncome,
      totalExpense: row.totalExpense,
      balance: row.totalIncome - row.totalExpense,
    })
  })

  app.post('/api/records', requireAuth, (req, res) => {
    const { type, amount, category, note, date } = req.body || {}
    const value = Number(amount)
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'type 必须是 income 或 expense' })
    }
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: '金额必须大于 0' })
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ message: '日期格式必须为 YYYY-MM-DD' })
    }
    const info = db
      .prepare(
        `INSERT INTO records (user_id, type, amount, category, note, date)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        req.user.id, type, value,
        String(category || '其他').trim() || '其他',
        String(note || '').trim(), String(date),
      )
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(info.lastInsertRowid)
    res.status(201).json({ record })
  })

  app.delete('/api/records/:id', requireAuth, (req, res) => {
    const info = db
      .prepare('DELETE FROM records WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id)
    if (info.changes === 0) return res.status(404).json({ message: '记录不存在' })
    res.json({ message: '已删除' })
  })

  // 全局错误中间件
  app.use((err, req, res, next) => {
    console.error(err)
    const status = err.status || 500
    const message = err.message || '服务器内部错误'
    res.status(status).json({
      message,
      ...(process.env.NODE_ENV !== 'production' ? { detail: err.message } : {}),
    })
  })

  return { app, db }
}

// ---------- 仅在直接运行时启动服务器（测试时不启动） ----------
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  const dbPath = path.join(__dirname, 'data.db')
  const { app, db } = createApp(dbPath)

  // 启动时清理过期会话
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run()

  const distDir = path.join(__dirname, '..', 'dist')
  const srcDir = path.join(__dirname, '..', 'src')
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'))

  if (hasDist) {
    app.use(express.static(distDir))
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distDir, 'index.html'))
      }
      next()
    })
  } else {
    app.get('/', (req, res) => {
      res.type('html').send('<h1>记账后端 API 运行中 ✅</h1>')
    })
  }

  const PORT = process.env.PORT || 3001
  const server = app.listen(PORT, () => {
    console.log(`记账后端已启动: http://localhost:${PORT}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ 端口 ${PORT} 已被占用`)
      process.exit(1)
    }
    console.error('❌ 服务器启动失败:', err.message)
    process.exit(1)
  })
}

