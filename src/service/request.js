// 服务层核心：统一 baseURL、超时、请求头注入、响应码校验、错误归一化
// 页面只认 Promise：成功 resolve 业务数据，失败 reject 一个带 type 的 RequestError
import { mockAdapter } from './mock.js'

// ① 统一配置：域名只在这一个地方出现，换环境改一行即可
export const BASE_URL = 'https://api.exp05.example.com/v1'
export const TIMEOUT = 8000
export const USE_MOCK = true

const TOKEN_KEY = 'exp05:token'

// ② 错误归一化：把「网络 / 超时 / HTTP / 业务码 / 解析」收敛成同一种对象
export class RequestError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'RequestError'
    this.type = options.type || 'business' // network | timeout | http | business | parse
    this.code = options.code === undefined ? -1 : options.code
    this.status = options.status || 0
    this.url = options.url || ''
  }
}

export const ERROR_TEXT = {
  network: '网络连接失败，请检查网络后重试',
  timeout: '请求超时，服务器响应太慢了',
  http: '服务器出错了',
  business: '请求没有成功',
  parse: '返回数据格式异常'
}

function resolveUrl(url) {
  return /^https?:\/\//i.test(url) ? url : BASE_URL + url
}

// ③ 请求拦截：统一请求头 + 自动带上登录态（token 存在 KV 里，不写在页面中）
function requestInterceptor(config) {
  const token = uni.getStorageSync(TOKEN_KEY)
  return {
    method: 'GET',
    timeout: TIMEOUT,
    ...config,
    header: {
      'Content-Type': 'application/json',
      'X-Client': 'uni-app-exp05',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(config.header || {})
    }
  }
}

// ④ 响应拦截：HTTP 状态码 + 业务 code 双重校验，只把 data 交给上层
function responseInterceptor(res, url) {
  const statusCode = res.statusCode || 0
  const body = res.data
  if (statusCode < 200 || statusCode >= 300) {
    throw new RequestError(ERROR_TEXT.http + '（HTTP ' + statusCode + '）', {
      type: 'http',
      status: statusCode,
      code: statusCode,
      url
    })
  }
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
    throw new RequestError(body.message || ERROR_TEXT.business, {
      type: 'business',
      code: body.code,
      status: statusCode,
      url
    })
  }
  if (body && typeof body === 'object' && 'data' in body) return body.data
  return body
}

// ⑤ 失败归一化：errMsg 里含 timeout 就是超时，其余按网络错误处理
function toRequestError(err, url) {
  if (err instanceof RequestError) return err
  const errMsg = (err && (err.errMsg || err.message)) || ''
  const isTimeout = /timeout/i.test(errMsg)
  return new RequestError(isTimeout ? ERROR_TEXT.timeout : ERROR_TEXT.network, {
    type: isTimeout ? 'timeout' : 'network',
    url,
    code: isTimeout ? 'TIMEOUT' : 'NETWORK'
  })
}

export function request(options) {
  const config = requestInterceptor(options)
  const url = resolveUrl(config.url)

  return new Promise((resolve, reject) => {
    const onSuccess = (res) => {
      try {
        resolve(responseInterceptor(res, config.url))
      } catch (err) {
        reject(toRequestError(err, config.url))
      }
    }
    const onFail = (err) => reject(toRequestError(err, config.url))

    if (USE_MOCK) {
      mockAdapter(config).then(onSuccess).catch(onFail)
      return
    }

    uni.request({
      url,
      method: config.method,
      data: config.data,
      header: config.header,
      timeout: config.timeout,
      success: onSuccess,
      fail: onFail
    })
  })
}

export const get = (url, data, options = {}) => request({ url, data, method: 'GET', ...options })
export const post = (url, data, options = {}) => request({ url, data, method: 'POST', ...options })
