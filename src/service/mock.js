// 模拟服务端：不依赖真实域名也能演示「请求中 / 成功 / 空数据 / 失败 / 超时」全部状态
// 真实项目里把 request.js 的 USE_MOCK 改成 false、BASE_URL 改成自己的域名即可
import { ARTICLES } from '../data/articles.js'

export const mockState = {
  // ok | empty | fail | timeout | slow
  scenario: 'ok',
  latency: 900
}

export function setScenario(scenario) {
  mockState.scenario = scenario
}

export function setLatency(ms) {
  mockState.latency = ms
}

function reply(data, statusCode = 200) {
  return { statusCode, data }
}

// 与 uni.request 的回调结构保持一致：成功给 { statusCode, data }，失败给 { errMsg }
export function mockAdapter({ url, method = 'GET', data }) {
  return new Promise((resolve, reject) => {
    // 超时/慢网速场景故意拖长响应时间，方便观察「请求中」状态
    const slow = mockState.scenario === 'timeout' || mockState.scenario === 'slow'
    const latency = slow ? mockState.latency + 4000 : mockState.latency
    setTimeout(() => {
      const scenario = mockState.scenario
      if (scenario === 'fail') {
        reject({ errMsg: 'request:fail mock network unreachable' })
        return
      }
      if (scenario === 'timeout') {
        reject({ errMsg: 'request:fail timeout' })
        return
      }
      if (url === '/articles') {
        if (scenario === 'empty') {
          resolve(reply({ code: 0, message: 'ok', data: { list: [], total: 0, page: 1, pageSize: 6 } }))
          return
        }
        const page = Number((data && data.page) || 1)
        const pageSize = Number((data && data.pageSize) || 6)
        const start = (page - 1) * pageSize
        resolve(
          reply({
            code: 0,
            message: 'ok',
            data: {
              list: ARTICLES.slice(start, start + pageSize),
              total: ARTICLES.length,
              page,
              pageSize
            }
          })
        )
        return
      }
      if (url === '/login' && method === 'POST') {
        const username = (data && data.username) || ''
        const password = (data && data.password) || ''
        if (!username || !password) {
          resolve(reply({ code: 40001, message: '账号和密码不能为空' }))
          return
        }
        if (password !== '123456') {
          resolve(reply({ code: 40003, message: '账号或密码错误（演示密码：123456）' }))
          return
        }
        resolve(
          reply({
            code: 0,
            message: 'ok',
            data: {
              token: 'mock-token-' + Date.now(),
              user: { id: 'U1001', nickname: username, phone: '13800002201' }
            }
          })
        )
        return
      }
      resolve(reply({ code: 404, message: '接口不存在：' + url }, 404))
    }, latency)
  })
}
