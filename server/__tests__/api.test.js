import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'

describe('记账 API', () => {
  let app
  let db
  let token

  beforeEach(() => {
    ;({ app, db } = createApp(':memory:'))
  })

  describe('认证', () => {
    it('注册成功返回 201 和 token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123456' })
      expect(res.status).toBe(201)
      expect(res.body.token).toBeTruthy()
      expect(res.body.user.username).toBe('testuser')
    })

    it('用户名过短返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'a', password: '123456' })
      expect(res.status).toBe(400)
    })

    it('密码过短返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123' })
      expect(res.status).toBe(400)
    })

    it('重复注册返回 409', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123456' })
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123456' })
      expect(res.status).toBe(409)
    })

    it('登录成功返回 token', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123456' })
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: '123456' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeTruthy()
    })

    it('错误密码返回 401', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123456' })
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpass' })
      expect(res.status).toBe(401)
    })

    it('/api/auth/me 无 token 返回 401', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('/api/auth/me 带 token 返回用户', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123456' })
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`)
      expect(res.status).toBe(200)
      expect(res.body.user.username).toBe('testuser')
    })
  })

  describe('记账记录', () => {
    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123456' })
      token = reg.body.token
    })

    it('新增支出记录成功', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 25.5, category: '餐饮', note: '午饭', date: '2026-01-15' })
      expect(res.status).toBe(201)
      expect(res.body.record.amount).toBe(25.5)
      expect(res.body.record.type).toBe('expense')
    })

    it('新增收入记录成功', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'income', amount: 5000, category: '工资', date: '2026-01-10' })
      expect(res.status).toBe(201)
    })

    it('无效 type 返回 400', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid', amount: 10, date: '2026-01-15' })
      expect(res.status).toBe(400)
    })

    it('金额 <= 0 返回 400', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 0, date: '2026-01-15' })
      expect(res.status).toBe(400)
    })

    it('无效日期格式返回 400', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 10, date: 'invalid' })
      expect(res.status).toBe(400)
    })

    it('获取记录列表', async () => {
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 25.5, date: '2026-01-15' })
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'income', amount: 5000, date: '2026-01-10' })

      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.records).toHaveLength(2)
    })

    it('按日期筛选记录', async () => {
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 10, date: '2026-01-15' })
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 20, date: '2026-01-20' })

      const res = await request(app)
        .get('/api/records?startDate=2026-01-16')
        .set('Authorization', `Bearer ${token}`)
      expect(res.body.records).toHaveLength(1)
      expect(res.body.records[0].amount).toBe(20)
    })

    it('汇总计算正确', async () => {
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'income', amount: 5000, date: '2026-01-10' })
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 25.5, date: '2026-01-15' })
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 100, date: '2026-01-16' })

      const res = await request(app)
        .get('/api/summary')
        .set('Authorization', `Bearer ${token}`)
      expect(res.body.totalIncome).toBe(5000)
      expect(res.body.totalExpense).toBe(125.5)
      expect(res.body.balance).toBe(4874.5)
    })

    it('删除记录成功', async () => {
      const create = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 10, date: '2026-01-15' })
      const id = create.body.record.id

      const res = await request(app)
        .delete(`/api/records/${id}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
    })

    it('删除不存在的记录返回 404', async () => {
      const res = await request(app)
        .delete('/api/records/99999')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })

    it('无 token 访问记录返回 401', async () => {
      const res = await request(app).get('/api/records')
      expect(res.status).toBe(401)
    })
  })

  describe('数据隔离', () => {
    it('用户 A 看不到用户 B 的记录', async () => {
      const regA = await request(app)
        .post('/api/auth/register')
        .send({ username: 'userA', password: '123456' })
      const regB = await request(app)
        .post('/api/auth/register')
        .send({ username: 'userB', password: '123456' })

      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${regA.body.token}`)
        .send({ type: 'expense', amount: 100, date: '2026-01-15' })

      const resB = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${regB.body.token}`)
      expect(resB.body.records).toHaveLength(0)
    })
  })
})
