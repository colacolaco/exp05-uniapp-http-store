// 业务接口层：只描述「后端有哪些接口、参数是什么、返回什么形状」
// 传输细节（baseURL、超时、错误）全部交给 request.js，页面只调用这里的函数
import { get, post, RequestError } from './request.js'

// 列表：GET /articles?page=1&pageSize=6
export async function fetchArticles(params = {}) {
  const data = await get('/articles', {
    page: params.page || 1,
    pageSize: params.pageSize || 6
  })
  return {
    list: (data && data.list) || [],
    total: (data && data.total) || 0,
    page: (data && data.page) || 1,
    pageSize: (data && data.pageSize) || 6
  }
}

// 登录：POST /login  →  { token, user }
export async function login({ username, password }) {
  const data = await post('/login', { username, password })
  if (!data || !data.token) {
    throw new RequestError('登录返回数据缺少 token', { type: 'parse' })
  }
  return data
}
