<template>
  <view class="page">
    <view class="head">
      <text class="head-title">文章列表</text>
      <text class="head-sub">
        服务层统一封装：baseURL / 超时 / 统一错误；列表三态：加载中、空数据、网络失败
      </text>
    </view>

    <!-- ③ 状态标注：任何时刻都能看到当前处于哪个状态 -->
    <view class="status-bar">
      <text class="badge" :class="'badge-' + status">{{ statusText }}</text>
      <text class="status-extra">{{ statusExtra }}</text>
    </view>

    <!-- ④ KV 持久化：上次成功加载的时间来自本地存储，重启应用后仍在 -->
    <view class="kv-card">
      <view class="kv-row">
        <text class="kv-label">上次成功加载（来自本地 KV）</text>
        <text class="kv-value">{{ lastLoadText }}</text>
      </view>
      <text class="kv-note">存入 localStorage 的 exp05:lastLoadAt，刷新或重启应用后仍能读到</text>
    </view>

    <!-- 状态一：请求中 -->
    <view v-if="status === 'loading'" class="panel">
      <view class="spinner" />
      <text class="panel-title">加载中…</text>
      <text class="panel-sub">正在请求 GET /articles（统一超时 {{ timeoutText }}）</text>
      <view v-for="n in 3" :key="n" class="skeleton">
        <view class="skeleton-thumb" />
        <view class="skeleton-lines">
          <view class="skeleton-line" />
          <view class="skeleton-line short" />
        </view>
      </view>
    </view>

    <!-- 状态二：网络失败 -->
    <view v-else-if="status === 'error'" class="panel">
      <text class="panel-emoji">📡</text>
      <text class="panel-title">{{ errorTitle }}</text>
      <text class="panel-sub">{{ errorText }}</text>
      <text class="panel-error">错误类型：{{ errorType }} · code：{{ errorCode }}</text>
      <view class="btn btn-primary" @click="load(true)">
        <text class="btn-text-light">重新加载</text>
      </view>
    </view>

    <!-- 状态三：空数据 -->
    <view v-else-if="status === 'empty'" class="panel">
      <text class="panel-emoji">🗂️</text>
      <text class="panel-title">空数据</text>
      <text class="panel-sub">接口成功返回，但列表里一条数据也没有（total = 0）</text>
      <view class="btn btn-ghost" @click="switchScenario('ok')">
        <text class="btn-text">切回正常数据</text>
      </view>
    </view>

    <!-- 状态四：成功 -->
    <view v-else class="list">
      <text class="list-meta">共 {{ total }} 篇 · 每页 {{ pageSize }} 篇 · 第 {{ page }} 页</text>
      <view
        v-for="item in list"
        :key="item.id"
        class="row"
        hover-class="row-hover"
        @click="rememberArticle(item)"
      >
        <view class="thumb" :style="{ backgroundColor: item.color }">
          <text class="thumb-emoji">{{ item.emoji }}</text>
        </view>
        <view class="meta">
          <view class="meta-top">
            <text v-if="item.id === lastArticleId" class="dot">●</text>
            <text class="title">{{ item.title }}</text>
          </view>
          <text class="summary">{{ item.summary }}</text>
          <text class="info">{{ item.author }} · {{ item.tag }} · {{ item.views }} 阅读 · {{ item.createdAt }}</text>
        </view>
      </view>
      <view class="btn btn-ghost" @click="loadNextPage">
        <text class="btn-text">加载下一页（第 {{ page + 1 }} 页）</text>
      </view>
    </view>

    <!-- 演示开关 -->
    <view class="demo">
      <text class="demo-title">演示开关：改变 mock 服务的返回，观察三种状态</text>
      <view class="chips">
        <text
          v-for="option in scenarios"
          :key="option.value"
          class="chip"
          :class="{ 'chip-active': scenario === option.value }"
          @click="switchScenario(option.value)"
        >{{ option.label }}</text>
      </view>
      <view class="links">
        <view class="link" @click="goLogin"><text class="link-text">登录页：持久化 + 敏感信息脱敏 →</text></view>
        <view class="link" @click="goStore"><text class="link-text">本地存储页：KV 明细 →</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { fetchArticles } from '../../service/api.js'
import { setScenario, mockState } from '../../service/mock.js'
import { storage, KEYS, formatTime } from '../../service/storage.js'
import { TIMEOUT } from '../../service/request.js'

// 请求三态：loading（请求中）→ success / empty / error
const status = ref('loading')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(6)
const errorText = ref('')
const errorType = ref('')
const errorCode = ref('')
const lastLoadText = ref('还没有成功加载过')
const lastArticleId = ref('')
const scenario = ref(mockState.scenario)
const timeoutText = Math.round(TIMEOUT / 1000) + ' 秒'

const scenarios = [
  { value: 'ok', label: '正常数据' },
  { value: 'empty', label: '空数据' },
  { value: 'fail', label: '网络失败' },
  { value: 'timeout', label: '请求超时' }
]

const statusText = computed(() => {
  return { loading: '请求中', success: '成功', empty: '成功（空数据）', error: '失败' }[status.value]
})

const statusExtra = computed(() => {
  if (status.value === 'loading') return '状态 = loading'
  if (status.value === 'success') return '状态 = success · ' + list.value.length + ' 条'
  if (status.value === 'empty') return '状态 = success · total 0'
  return '状态 = error · ' + errorType.value
})

const errorTitle = computed(() => (errorType.value === 'timeout' ? '请求超时' : '网络失败'))

// 统一出口：页面里只写 try/catch，不再关心 HTTP 细节
async function load(reset = false) {
  if (reset) page.value = 1
  status.value = 'loading'
  errorText.value = ''
  errorType.value = ''
  errorCode.value = ''
  try {
    const data = await fetchArticles({ page: page.value, pageSize: pageSize.value })
    total.value = data.total
    pageSize.value = data.pageSize
    if (!data.list.length) {
      list.value = []
      status.value = 'empty'
      return
    }
    list.value = reset ? data.list : list.value.concat(data.list)
    status.value = 'success'
    const savedAt = Date.now()
    storage.set(KEYS.lastLoad, { at: savedAt, count: data.total, page: data.page })
    lastLoadText.value = formatTime(savedAt) + '（共 ' + data.total + ' 篇）'
    console.log('[列表页] 请求成功，', data.list.length, '条，took', mockState.latency, 'ms')
  } catch (err) {
    status.value = 'error'
    errorText.value = err.message || '未知错误'
    errorType.value = err.type || 'unknown'
    errorCode.value = err.code
    console.warn('[列表页] 请求失败：', err.type, err.code, err.message)
  }
}

function loadNextPage() {
  if (list.value.length >= total.value) {
    uni.showToast({ title: '已经到底了', icon: 'none' })
    return
  }
  page.value += 1
  load()
}

function switchScenario(value) {
  scenario.value = value
  setScenario(value)
  load(true)
}

// ① 事件 + ④ 持久化：点击记录最后浏览的文章 id
function rememberArticle(item) {
  lastArticleId.value = item.id
  storage.set(KEYS.lastArticle, { id: item.id, title: item.title, at: Date.now() })
  uni.showToast({ title: '已记录到本地：' + item.id, icon: 'none' })
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function goStore() {
  uni.navigateTo({ url: '/pages/store/store' })
}

onShow(() => {
  const saved = storage.get(KEYS.lastLoad)
  if (saved && saved.at) {
    lastLoadText.value = formatTime(saved.at) + '（共 ' + saved.count + ' 篇）'
  }
  const article = storage.get(KEYS.lastArticle)
  if (article && article.id) lastArticleId.value = article.id
})

onPullDownRefresh(async () => {
  await load(true)
  uni.stopPullDownRefresh()
})

load(true)
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 28rpx 60rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  flex-direction: column;
  padding: 8rpx 8rpx 18rpx;
}
.head-title {
  font-size: 42rpx;
  font-weight: 700;
  color: #1f2329;
}
.head-sub {
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #8a9099;
}
.status-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.badge {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}
.badge-loading {
  background: #eef1fe;
  color: #4e6ef2;
}
.badge-success {
  background: #e8f8ef;
  color: #19be6b;
}
.badge-empty {
  background: #fff6e6;
  color: #ff9900;
}
.badge-error {
  background: #ffecee;
  color: #ee3f4d;
}
.status-extra {
  margin-left: 14rpx;
  font-size: 22rpx;
  color: #8a9099;
}
.kv-card {
  margin-bottom: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 18rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 35, 41, 0.05);
  display: flex;
  flex-direction: column;
}
.kv-row {
  display: flex;
  flex-direction: column;
}
.kv-label {
  font-size: 24rpx;
  color: #6b7280;
}
.kv-value {
  margin-top: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #2b3a8f;
}
.kv-note {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #b3b9c4;
}
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 32rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 35, 41, 0.05);
}
.panel-emoji {
  font-size: 64rpx;
}
.panel-title {
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2329;
}
.panel-sub {
  margin-top: 10rpx;
  font-size: 23rpx;
  line-height: 1.7;
  color: #8a9099;
  text-align: center;
}
.panel-error {
  margin-top: 14rpx;
  padding: 10rpx 18rpx;
  font-size: 20rpx;
  color: #ee3f4d;
  background: #ffecee;
  border-radius: 10rpx;
}
.spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #dfe4ef;
  border-top-color: #4e6ef2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.skeleton {
  display: flex;
  width: 100%;
  margin-top: 22rpx;
  padding: 20rpx;
  background: #f7f8fc;
  border-radius: 14rpx;
  box-sizing: border-box;
}
.skeleton-thumb {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: #e6ebf5;
}
.skeleton-lines {
  flex: 1;
  margin-left: 18rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.skeleton-line {
  height: 20rpx;
  border-radius: 10rpx;
  background: #e6ebf5;
}
.skeleton-line.short {
  margin-top: 12rpx;
  width: 55%;
}
.list {
  display: flex;
  flex-direction: column;
}
.list-meta {
  margin-bottom: 14rpx;
  font-size: 22rpx;
  color: #b3b9c4;
}
.row {
  display: flex;
  margin-bottom: 18rpx;
  padding: 22rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 35, 41, 0.05);
}
.row-hover {
  transform: scale(0.99);
  background: #f7f8fc;
}
.thumb {
  width: 84rpx;
  height: 84rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.thumb-emoji {
  font-size: 40rpx;
}
.meta {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.meta-top {
  display: flex;
  align-items: center;
}
.dot {
  margin-right: 8rpx;
  font-size: 18rpx;
  color: #19be6b;
}
.title {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}
.summary {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #6b7280;
}
.info {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #b3b9c4;
}
.btn {
  height: 84rpx;
  margin-top: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 42rpx;
}
.btn-primary {
  width: 100%;
  background: #4e6ef2;
  box-shadow: 0 10rpx 24rpx rgba(78, 110, 242, 0.28);
}
.btn-ghost {
  background: #fff;
  border: 2rpx solid #d6dcf5;
}
.btn-text {
  font-size: 26rpx;
  color: #4e6ef2;
}
.btn-text-light {
  font-size: 26rpx;
  color: #fff;
}
.demo {
  margin-top: 26rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 35, 41, 0.05);
  display: flex;
  flex-direction: column;
}
.demo-title {
  font-size: 23rpx;
  font-weight: 600;
  color: #1f2329;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  margin-top: 14rpx;
}
.chip {
  margin: 0 14rpx 14rpx 0;
  padding: 10rpx 22rpx;
  font-size: 22rpx;
  color: #6b7280;
  background: #f2f4f9;
  border-radius: 999rpx;
}
.chip-active {
  color: #fff;
  background: #4e6ef2;
}
.links {
  margin-top: 6rpx;
  display: flex;
  flex-direction: column;
}
.link {
  padding: 14rpx 0;
  border-top: 2rpx solid #f2f3f5;
}
.link-text {
  font-size: 23rpx;
  color: #4e6ef2;
}
</style>
