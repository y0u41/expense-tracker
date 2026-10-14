import { Link } from 'react-router-dom'
import './About.css'

const techStack = [
  { name: 'React', desc: 'UI 库' },
  { name: 'TypeScript', desc: '静态类型系统' },
  { name: 'React Router', desc: '客户端路由' },
  { name: 'Vite', desc: '开发服务器与构建工具' },
]

export default function About() {
  return (
    <div className="card">
      <h1>关于</h1>
      <p>
        本项目是一个基于 React + TypeScript 的个人记账本，
        支持收支记录管理、汇总统计、日期筛选，后端使用 Express + SQLite。
      </p>

      <h2 className="about-subtitle">技术栈</h2>
      <ul className="tech-list">
        {techStack.map((tech) => (
          <li key={tech.name}>
            <strong>{tech.name}</strong>
            <span> — {tech.desc}</span>
          </li>
        ))}
      </ul>

      <Link to="/" className="button">
        ← 返回首页
      </Link>
    </div>
  )
}
