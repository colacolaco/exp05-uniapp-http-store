# 实验05 · 网络请求与本地数据存储（UniApp + Vue3）

> 课程：移动应用开发 · 实验 05 · 主攻框架：UniApp（Vue3 + Vite）
> 一句话：把 `uni.request` 收敛到一个服务层（baseURL / 超时 / 统一错误），页面用 `async/await` 处理
> 「请求中 / 成功 / 失败」，列表做全三态标注，账号数据落本地 KV 且**不存明文密码**。

## 一、任务要求与实现对照

| 任务要求 | 实现位置 | 实现方式 |
| --- | --- | --- |
| 1. 网络请求统一封装到服务层（baseURL、超时、统一错误处理） | [`src/service/request.js`](src/service/request.js) | `BASE_URL` + `TIMEOUT` 集中在文件顶部；请求拦截注入 `X-Client` / `Authorization`；响应拦截校验 HTTP 状态码与业务 `code`；失败统一为 `RequestError`（`type` = network / timeout / http / business / parse） |
| 2. 用 Promise / async-await 正确处理异步，区分「请求中、成功、失败」 | [`src/service/api.js`](src/service/api.js)、[`src/pages/articles/articles.vue`](src/pages/articles/articles.vue) | `request()` 返回 Promise；`api.js` 用 `async` 包装业务接口；页面 `load()` 用 `try / catch / finally` 驱动 `status = loading / success / error` |
| 3. 列表「加载中、空数据、网络失败」三种状态并给出界面标注 | [`src/pages/articles/articles.vue`](src/pages/articles/articles.vue) | 顶栏状态徽标（`请求中 / 成功 / 成功（空数据）/ 失败`）+ 骨架屏 + 空态面板 + 失败面板（错误类型与错误码 + 重新加载） |
| 4. 本栈 KV 本地存储实现持久化，重启应用后仍在 | [`src/service/storage.js`](src/service/storage.js) | `uni.setStorageSync` 封装：`exp05:` 命名空间、`savedAt/expireAt`（TTL）、`keys()/entries()/clear()`；H5 → localStorage，小程序 → Storage，App → plus.storage |
| 5. 建立数据安全意识：不明文存储密码等敏感信息 | [`src/service/secure.js`](src/service/secure.js)、[`src/pages/login/login.vue`](src/pages/login/login.vue) | 密码只做**加盐 SHA-256 摘要**（随机盐每次登录重新生成），本地只存脱敏账号、`tokenMasked`、`salt`、`digest`；手机号 `138****2201` |

## 二、目录结构

```
exp05-uniapp-http-store/
├── index.html
├── package.json
├── vite.config.js                 # 端口 5183
├── src/
│   ├── main.js                    # createApp 三端统一入口
│   ├── App.vue                    # 启动时读一次本地 KV，验证「重启后仍在」
│   ├── pages.json                 # 3 个页面：文章列表 / 登录 / 本地存储
│   ├── manifest.json
│   ├── uni.scss
│   ├── data/
│   │   └── articles.js            # 10 条文章数据（mock 服务端数据源）
│   ├── service/                   # ★ 服务层
│   │   ├── request.js             # baseURL / 超时 / 拦截器 / 统一错误
│   │   ├── api.js                 # 业务接口：fetchArticles / login
│   │   ├── mock.js                # 本地 mock 服务端（可切 ok/empty/fail/timeout）
│   │   ├── storage.js             # KV 封装：命名空间 + TTL + 枚举
│   │   └── secure.js              # SHA-256、随机盐、脱敏
│   └── pages/
│       ├── articles/articles.vue  # 三态列表 + 演示开关 + KV 提示
│       ├── login/login.vue        # 登录请求 + 持久化 + 不明文存密码
│       └── store/store.vue        # KV 明细与清理
└── docs/
    ├── 实验报告.md
    └── screenshots/               # 6 张运行截图
```

## 三、关键实现

### 3.1 服务层：一个入口、一处配置、一种错误

```js
// src/service/request.js
export const BASE_URL = 'https://api.exp05.example.com/v1'
export const TIMEOUT = 8000

export function request(options) {
  const config = requestInterceptor(options)   // 统一请求头 + 自动带 token
  return new Promise((resolve, reject) => {
    const onSuccess = (res) => {
      try { resolve(responseInterceptor(res, config.url)) }  // 校验 HTTP + 业务码
      catch (err) { reject(toRequestError(err, config.url)) }
    }
    const onFail = (err) => reject(toRequestError(err, config.url))
    uni.request({ ...config, success: onSuccess, fail: onFail })
  })
}
```

错误归一化后，页面只需要三件事：`loading`、`success`、`catch`。

| err.type | 触发条件 | 给用户的文案 |
| --- | --- | --- |
| `timeout` | `errMsg` 含 timeout | 请求超时，服务器响应太慢了 |
| `network` | 其它请求失败 | 网络连接失败，请检查网络后重试 |
| `http` | 状态码非 2xx | 服务器出错了（HTTP 500） |
| `business` | `body.code !== 0` | 后端返回的 `message` |

### 3.2 页面三态：状态机而不是一堆 if

```js
const status = ref('loading')   // loading | success | empty | error
async function load(reset = false) {
  status.value = 'loading'
  try {
    const data = await fetchArticles({ page: page.value, pageSize: pageSize.value })
    if (!data.list.length) { status.value = 'empty'; return }
    list.value = reset ? data.list : list.value.concat(data.list)
    status.value = 'success'
    storage.set(KEYS.lastLoad, { at: Date.now(), count: data.total })   // ← 顺手落盘
  } catch (err) {
    status.value = 'error'
    errorType.value = err.type
    errorText.value = err.message
  }
}
```

### 3.3 KV 封装：命名空间 + TTL

```js
// src/service/storage.js
const PREFIX = 'exp05:'
storage.set('session', record)            // 永不过期
storage.set('token', token, 7 * 86400000) // 7 天后自动过期
storage.get('session')                    // 过期会自动删除并返回 null
storage.entries()                         // 给「本地存储」页面用的表格数据
```

重启验证：刷新页面或杀掉进程重开，首页「上次成功加载（来自本地 KV）」仍在，说明数据不是内存态。

### 3.4 敏感信息：密码只留加盐摘要

```js
// src/service/secure.js
const salt = randomSalt(16)                      // 每次登录重新生成
const digest = digestPassword(password, salt)    // SHA-256(salt + '::' + 密码 + '::exp05')
storage.set('session', {
  account: user.nickname,
  phoneMasked: maskPhone(user.phone),             // 138****2201
  tokenMasked: maskToken(token),                  // mock-t****2768（长度 24）
  salt,
  digest,
  loginAt: Date.now()
})                                               // ← 全程没有明文密码
```

> 说明：真实项目里加盐哈希属于服务端职责（bcrypt / argon2），客户端连摘要都不该持有；
> 本实验的实现用于对照「明文存储」的反例，说明为什么不能 `setStorageSync('user', { password })`。

## 四、运行方式

```bash
cd exp05-uniapp-http-store
npm install
npm run dev:h5            # http://localhost:5183/  （本机 5173/5180/5181/5182 已被其它实验占用）
npm run dev:mp-weixin     # 微信开发者工具导入 dist/dev/mp-weixin
node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build          # H5 打包
node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin
```

> 本机 `npm run build` 可能被 PowerShell 执行策略拦住（`npm.ps1` 禁止运行脚本），
> 直接用上面的 `node .../uni.js build` 即可。

页面切换：首页默认是「文章列表」，底部演示开关可切 mock 返回；下方两个链接进「登录 / 本地存储」页。

## 五、运行效果（6 张截图，见 `docs/screenshots/`）

| 截图 | 说明 |
| --- | --- |
| `articles-loading.png` | 请求中：状态徽标「请求中」+ 转圈 + 3 条骨架屏 |
| `articles-success.png` | 成功：6 条文章 + 顶部「上次成功加载」来自 KV |
| `articles-empty.png` | 空数据：`total = 0` 的空态面板 + 「切回正常数据」 |
| `articles-error.png` | 网络失败：错误类型 `network · NETWORK` + 「重新加载」 |
| `login-persist.png` | 登录成功写入 KV 的字段（脱敏手机号 / token / 盐 / 摘要 / 明文密码=未存储）+ 只从 KV 恢复登录态 |
| `store-keys.png` | KV 明细：4 条记录、写入时间、过期时间 |

## 六、构建验证

| 目标 | 命令 | 结果 |
| --- | --- | --- |
| H5 | `uni.js build` | `dist/build/h5` 13 个文件、227.2 KB |
| 微信小程序 | `uni.js build -p mp-weixin` | `dist/build/mp-weixin` 23 个文件（3 个页面 + 5 个 service 模块） |

## 七、常见问题

1. **切到「网络失败」后一直失败？** 演示开关是全局 mock 状态，切回「正常数据」即可。
2. **存储里没有 token？** 先跑一次登录页，`persistSession` 才会写入 `exp05:token`。
3. **打开 127.0.0.1:5183 拒绝连接？** Vite 只监听了 `localhost`（IPv6 `::1`），用 `http://localhost:5183/`。
4. **清空 KV 后数据没了？** 这是预期行为，「本地存储」页的「清空本应用的 KV」用于复位演示环境。
5. **想接真实后端？** 把 `request.js` 里的 `USE_MOCK` 改成 `false`、`BASE_URL` 换成自己的域名即可，页面代码一行都不用改。
