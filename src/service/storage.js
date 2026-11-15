// 本地 KV 存储封装：命名空间 + JSON 序列化 + 过期时间(TTL) + 一键枚举
// 底层就是 uni.setStorageSync / getStorageSync：H5 落到 localStorage，
// 小程序落到 wx Storage，App 落到 plus.storage —— 重启应用后数据仍在
const PREFIX = 'exp05:'

function fullKey(key) {
  return PREFIX + key
}

export const storage = {
  // 写入：ttlMs 传 0/不传表示永不过期
  set(key, value, ttlMs = 0) {
    const now = Date.now()
    const record = {
      value,
      savedAt: now,
      expireAt: ttlMs > 0 ? now + ttlMs : 0
    }
    uni.setStorageSync(fullKey(key), record)
    return record
  },

  // 读取：过期即删除并返回兜底值
  get(key, fallback = null) {
    const record = uni.getStorageSync(fullKey(key))
    if (!record || typeof record !== 'object') return fallback
    if (record.expireAt && Date.now() > record.expireAt) {
      uni.removeStorageSync(fullKey(key))
      return fallback
    }
    return record.value
  },

  remove(key) {
    uni.removeStorageSync(fullKey(key))
  },

  // 只列出本应用命名空间下的 key，避免污染同一个 localStorage
  keys() {
    try {
      const info = uni.getStorageInfoSync()
      return (info.keys || [])
        .filter((key) => key.indexOf(PREFIX) === 0)
        .map((key) => key.slice(PREFIX.length))
    } catch (err) {
      return []
    }
  },

  // 给「本地存储」页面用的表格数据
  entries() {
    return this.keys().map((key) => {
      const raw = uni.getStorageSync(fullKey(key)) || {}
      const expireAt = raw.expireAt || 0
      return {
        key,
        preview: formatPreview(raw.value),
        savedAt: formatTime(raw.savedAt),
        expireAt: expireAt ? formatTime(expireAt) : '长期有效',
        expired: expireAt > 0 && Date.now() > expireAt
      }
    })
  },

  clear() {
    this.keys().forEach((key) => uni.removeStorageSync(fullKey(key)))
  }
}

function formatPreview(value) {
  if (value === null || value === undefined) return '空'
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > 46 ? text.slice(0, 46) + '…' : text
}

export function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds())
  )
}

// 存储键统一在这里声明，避免页面里到处写字符串
export const KEYS = {
  token: 'token',
  session: 'session',
  lastLoad: 'lastLoadAt',
  lastArticle: 'lastArticleId',
  theme: 'theme'
}
