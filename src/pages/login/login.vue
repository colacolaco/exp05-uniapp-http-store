<template>
  <view class="page">
    <view class="head">
      <text class="head-title">登录与持久化</text>
      <text class="head-sub">
        请求走服务层（统一错误）；登录态与账号信息写入本地 KV，重启应用后仍在；密码只存加盐摘要
      </text>
    </view>

    <!-- 表单 -->
    <view class="card">
      <text class="card-title">① 发起登录请求</text>
      <view class="field">
        <text class="field-label">账号</text>
        <input class="field-input" v-model="form.username" placeholder="演示账号：colacolaco" />
      </view>
      <view class="field">
        <text class="field-label">密码</text>
        <input class="field-input" v-model="form.password" password placeholder="演示密码：123456" />
      </view>
      <view class="btn btn-primary" :class="{ 'btn-disabled': submitting }" @click="submit">
        <text class="btn-text-light">{{ submitting ? '请求中…' : '登录' }}</text>
      </view>
      <view class="btn btn-ghost" @click="submitWrongPassword">
        <text class="btn-text">用错误密码登录（看统一错误处理）</text>
      </view>
      <text v-if="requestState" class="request-state" :class="'state-' + requestState">
        请求状态：{{ requestStateText[requestState] }}
      </text>
    </view>

    <!-- 结果 -->
    <view v-if="session" class="card">
      <text class="card-title">② 登录成功，写入本地 KV 的内容</text>
      <view class="item">
        <text class="item-label">账号</text>
        <text class="item-value">{{ session.account }}</text>
      </view>
      <view class="item">
        <text class="item-label">手机号（脱敏）</text>
        <text class="item-value">{{ session.phoneMasked }}</text>
      </view>
      <view class="item">
        <text class="item-label">token（脱敏）</text>
        <text class="item-value">{{ session.tokenMasked }}</text>
      </view>
      <view class="item">
        <text class="item-label">随机盐</text>
        <text class="item-value mono">{{ session.salt }}</text>
      </view>
      <view class="item">
        <text class="item-label">密码摘要（SHA-256）</text>
        <text class="item-value mono small">{{ session.digest }}</text>
      </view>
      <view class="item">
        <text class="item-label">明文密码</text>
        <text class="item-value danger">未存储</text>
      </view>
      <text class="card-note">
        摘要不可逆：即使设备上的存储被读走，也拿不到原始密码；真实项目里加盐哈希应在服务端完成。
      </text>
    </view>

    <!-- 模拟重启 -->
    <view class="card">
      <text class="card-title">③ 模拟「重启应用后仍然登录」</text>
      <view class="btn btn-ghost" @click="restoreFromStorage">
        <text class="btn-text">只从本地 KV 恢复登录态</text>
      </view>
      <text v-if="restoredHint" class="restored">{{ restoredHint }}</text>
      <text v-else class="card-note">点击后会完全丢弃内存里的数据，只从 uni.getStorageSync 里读。</text>
    </view>

    <!-- 安全说明 -->
    <view class="card">
      <text class="card-title">④ 为什么不能明文存密码</text>
      <view class="bad-code">
        <text class="bad-code-title">错误示范（本工程没有这样做）</text>
        <text class="bad-code-body">uni.setStorageSync('user', { account: 'colacolaco', password: '123456' })</text>
      </view>
      <text class="card-note">
        H5 的 localStorage、小程序的 Storage 都能被同域脚本或调试工具直接读取；一旦被拿到，
        用户在其他平台的同密码账号也会连带失守。所以：只存脱敏后的账号信息 + token，
        密码一律不落盘；token 也要设过期时间并支持失效重登。
      </text>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { login } from '../../service/api.js'
import { storage, KEYS, formatTime } from '../../service/storage.js'
import { randomSalt, digestPassword, maskPhone, maskToken } from '../../service/secure.js'

const form = reactive({ username: 'colacolaco', password: '' })
const submitting = ref(false)
const requestState = ref('')
const session = ref(null)
const restoredHint = ref('')

const requestStateText = {
  loading: '请求中（loading）',
  success: '成功（success）',
  error: '失败（error）'
}

async function doLogin(password) {
  submitting.value = true
  requestState.value = 'loading'
  try {
    const data = await login({ username: form.username, password })
    requestState.value = 'success'
    persistSession(data.user, password, data.token)
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (err) {
    requestState.value = 'error'
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// ④ 持久化：token 单独存（给请求拦截器用），账号信息存脱敏结构，密码只留加盐摘要
function persistSession(user, password, token) {
  const salt = randomSalt(16)
  const record = {
    account: user.nickname,
    userId: user.id,
    phoneMasked: maskPhone(user.phone),
    tokenMasked: maskToken(token),
    salt,
    digest: digestPassword(password, salt),
    loginAt: Date.now()
  }
  storage.set(KEYS.token, token, 7 * 24 * 3600 * 1000)
  storage.set(KEYS.session, record)
  session.value = record
}

function submit() {
  if (!form.password) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  doLogin(form.password)
}

function submitWrongPassword() {
  doLogin('wrong-password')
}

function restoreFromStorage() {
  session.value = null
  const record = storage.get(KEYS.session)
  const token = storage.get(KEYS.token)
  if (!record) {
    restoredHint.value = '本地没有登录记录，请先登录一次。'
    return
  }
  session.value = record
  restoredHint.value =
    '已从本地 KV 恢复：' + record.account + '，登录时间 ' + formatTime(record.loginAt) +
    '，token ' + (token ? '有效' : '已失效') + '（明文密码不在其中）'
  uni.showToast({ title: '已从本地恢复登录态', icon: 'none' })
}
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
.card {
  margin-bottom: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 35, 41, 0.05);
  display: flex;
  flex-direction: column;
}
.card-title {
  margin-bottom: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2329;
}
.card-note {
  margin-top: 14rpx;
  font-size: 21rpx;
  line-height: 1.8;
  color: #6b7280;
}
.field {
  display: flex;
  align-items: center;
  height: 88rpx;
  margin-bottom: 16rpx;
  padding: 0 22rpx;
  background: #f7f8fc;
  border-radius: 14rpx;
}
.field-label {
  width: 90rpx;
  font-size: 24rpx;
  color: #6b7280;
}
.field-input {
  flex: 1;
  font-size: 26rpx;
  color: #1f2329;
}
.btn {
  height: 84rpx;
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 42rpx;
}
.btn-primary {
  background: #4e6ef2;
  box-shadow: 0 10rpx 24rpx rgba(78, 110, 242, 0.28);
}
.btn-disabled {
  opacity: 0.6;
}
.btn-ghost {
  background: #f7f8fc;
  border: 2rpx solid #d6dcf5;
}
.btn-text {
  font-size: 25rpx;
  color: #4e6ef2;
}
.btn-text-light {
  font-size: 26rpx;
  color: #fff;
}
.request-state {
  margin-top: 14rpx;
  font-size: 22rpx;
}
.state-loading {
  color: #4e6ef2;
}
.state-success {
  color: #19be6b;
}
.state-error {
  color: #ee3f4d;
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f2f3f5;
}
.item-label {
  font-size: 24rpx;
  color: #8a9099;
}
.item-value {
  max-width: 62%;
  font-size: 24rpx;
  color: #1f2329;
  text-align: right;
}
.mono {
  font-family: Consolas, monospace;
}
.small {
  font-size: 19rpx;
  word-break: break-all;
}
.danger {
  color: #ee3f4d;
  font-weight: 600;
}
.restored {
  margin-top: 12rpx;
  padding: 14rpx 18rpx;
  font-size: 21rpx;
  line-height: 1.7;
  color: #1a7f4b;
  background: #eef7f0;
  border-left: 6rpx solid #19be6b;
  border-radius: 10rpx;
}
.bad-code {
  padding: 16rpx 18rpx;
  background: #fff3f3;
  border-left: 6rpx solid #ee3f4d;
  border-radius: 10rpx;
}
.bad-code-title {
  font-size: 21rpx;
  color: #ee3f4d;
  font-weight: 600;
}
.bad-code-body {
  margin-top: 8rpx;
  font-size: 20rpx;
  font-family: Consolas, monospace;
  color: #8a3b3b;
  word-break: break-all;
}
</style>
