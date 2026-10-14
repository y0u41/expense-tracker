import { Link } from 'react-router-dom'
import './Home.css'

const features = [
  { title: '收支记录', desc: '记录每日收入与支出，分类清晰' },
  { title: '汇总统计', desc: '自动计算总收入、总支出与余额' },
  { title: '日期筛选', desc: '按日期区间快速筛选历史记录' },
  { title: '安全认证', desc: 'scrypt 密码哈希 + 会话管理' },
]

export default function Home() {
  return (
    <div className="card">
      <h1>记账本</h1>
      <p>
        一个简洁的个人记账应用。记录每日收支、查看汇总、按日期筛选。
        点击下方按钮开始记账。
      </p>
      <Link to="/ledger" className="button">
        前往记账页面 →
      </Link>

      <div className="features">
        {features.map((feature) => (
          <div key={feature.title} className="feature">
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
