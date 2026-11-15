// 本地文章数据：mock 服务端返回的数据源，也是列表页的「业务数据」
export const ARTICLES = [
  {
    id: 'A1001',
    title: 'UniApp 三端编译原理：一套代码怎么跑三个平台',
    summary: '编译期把 Vue 模板转成各端可执行代码，运行时提供统一的 uni API 适配层。',
    author: '陈老师',
    tag: '原理',
    views: 2431,
    createdAt: '2026-10-21',
    emoji: '🧩',
    color: '#4e6ef2'
  },
  {
    id: 'A1002',
    title: '封装一个靠谱的请求层：baseURL、超时与统一错误',
    summary: '拦截器负责拼地址、加请求头，响应拦截负责判业务码，错误统一映射成可读文案。',
    author: '李同学',
    tag: '网络',
    views: 1986,
    createdAt: '2026-10-23',
    emoji: '🌐',
    color: '#19be6b'
  },
  {
    id: 'A1003',
    title: 'async/await 与 Promise 的区别，以及什么时候该用哪个',
    summary: 'await 只是 Promise 的语法糖，错误处理仍要靠 try/catch 或 .catch 兜住。',
    author: '王同学',
    tag: '异步',
    views: 3312,
    createdAt: '2026-10-24',
    emoji: '⏱️',
    color: '#ff9900'
  },
  {
    id: 'A1004',
    title: '列表页的三种状态：加载中、空数据、网络失败',
    summary: '状态机比 if-else 更好维护，每种状态都要有明确的界面标注和可操作出口。',
    author: '赵同学',
    tag: '交互',
    views: 1524,
    createdAt: '2026-10-26',
    emoji: '📋',
    color: '#7d5cf6'
  },
  {
    id: 'A1005',
    title: 'uni.setStorageSync 的正确用法与常见坑',
    summary: '只能存可序列化的数据，对象要自己转 JSON，写满 10MB 会静默失败。',
    author: '刘同学',
    tag: '存储',
    views: 2874,
    createdAt: '2026-10-28',
    emoji: '💾',
    color: '#00b4a6'
  },
  {
    id: 'A1006',
    title: '不要在本地存明文密码：从一次代码审计说起',
    summary: 'Storage 里的内容对设备上的其他程序并不安全，敏感信息应只存加盐摘要。',
    author: '陈老师',
    tag: '安全',
    views: 4102,
    createdAt: '2026-10-30',
    emoji: '🔐',
    color: '#ee3f4d'
  },
  {
    id: 'A1007',
    title: '为什么列表要做分页：一次拉 1000 条的代价',
    summary: '首屏时间、内存占用、流量成本都在为分页投票。',
    author: '孙同学',
    tag: '性能',
    views: 1109,
    createdAt: '2026-11-01',
    emoji: '📄',
    color: '#2f9cff'
  },
  {
    id: 'A1008',
    title: '拉取刷新与触底加载：交互细节决定体验',
    summary: 'onPullDownRefresh 里的 load 要能重置页码，触底加载要防止重复请求。',
    author: '周同学',
    tag: '交互',
    views: 968,
    createdAt: '2026-11-03',
    emoji: '🔄',
    color: '#c2185b'
  },
  {
    id: 'A1009',
    title: '统一错误码设计：前端该怎么提示用户',
    summary: '网络错误给重试、业务错误给原因、鉴权错误直接跳登录。',
    author: '吴同学',
    tag: '网络',
    views: 1733,
    createdAt: '2026-11-05',
    emoji: '🚦',
    color: '#ff6b35'
  },
  {
    id: 'A1010',
    title: '把请求层写薄：哪些逻辑不该塞进 request.js',
    summary: '请求层只做传输与协议，业务编排放到 api.js，页面只管状态。',
    author: '郑同学',
    tag: '架构',
    views: 2045,
    createdAt: '2026-11-07',
    emoji: '🧱',
    color: '#8a5cf6'
  }
]
