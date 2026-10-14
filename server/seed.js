// 初始化/补充管理员账号
// 用法: ADMIN_PASSWORD=你的密码 npm run seed
// 必须设置 ADMIN_PASSWORD 环境变量，否则拒绝执行（防止明文密码入库）
import crypto from 'node:crypto'
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'data.db'))
db.pragma('journal_mode = WAL')

// 建表（与服务端保持一致）
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`)

// 旧库兼容：缺少 role 列时补充
const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
if (!cols.includes('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'boss'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_PASSWORD) {
  console.error('错误: 必须设置 ADMIN_PASSWORD 环境变量')
  console.error('用法: ADMIN_PASSWORD=你的密码 npm run seed')
  process.exit(1)
}

if (ADMIN_PASSWORD.length < 6) {
  console.error('错误: ADMIN_PASSWORD 长度至少 6 位')
  process.exit(1)
}

const existing = db.prepare('SELECT id, role FROM users WHERE username = ?').get(ADMIN_USERNAME)
if (existing) {
  console.log(`管理员账号 ${ADMIN_USERNAME} 已存在 (id=${existing.id}, role=${existing.role})，无需重复创建`)
} else {
  const salt = crypto.randomBytes(16).toString('hex')
  const passwordHash = crypto.scryptSync(ADMIN_PASSWORD, salt, 64).toString('hex')
  const info = db
    .prepare("INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, 'admin')")
    .run(ADMIN_USERNAME, passwordHash, salt)
  console.log(`管理员账号创建成功: ${ADMIN_USERNAME} (id=${info.lastInsertRowid})`)
}

db.close()
