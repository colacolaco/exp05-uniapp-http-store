<template>
  <view class="page">
    <view class="head">
      <text class="head-title">本地存储</text>
      <text class="head-sub">
        命名空间 exp05: 下的全部 KV 记录，底层是 uni.setStorageSync → localStorage / Storage / plus.storage
      </text>
    </view>

    <view class="card">
      <view class="card-head">
        <text class="card-title">当前共 {{ entries.length }} 条记录</text>
        <text class="refresh" @click="refresh">刷新</text>
      </view>
      <view v-if="entries.length === 0" class="empty">
        <text class="empty-emoji">📭</text>
        <text class="empty-text">还没有写入任何数据：先去列表页加载一次，或登录一次</text>
      </view>
      <view v-for="row in entries" :key="row.key" class="row">
        <view class="row-head">
          <text class="row-key">exp05:{{ row.key }}</text>
          <text v-if="row.expired" class="row-tag danger">已过期</text>
          <text v-else class="row-tag ok">有效</text>
        </view>
        <text class="row-preview">{{ row.preview }}</text>
        <text class="row-time">写入 {{ row.savedAt }} · 过期 {{ row.expireAt }}</text>
      </view>
    </view>

    <view class="card">
      <text class="card-title">这一页说明了什么</text>
      <text class="card-note">
        ① 所有键都有统一前缀，方便一键清理，也不会和同域其它应用打架；
        ② 每条记录带 savedAt / expireAt，读取时自动判过期，避免用到陈旧缓存；
        ③ 账号类记录里只有脱敏账号、token 摘要与密码加盐摘要，没有明文密码。
      </text>
    </view>

    <view class="card">
      <text class="card-title">维护操作</text>
      <view class="btn btn-ghost" @click="refresh">
        <text class="btn-text">重新读取（模拟重启后再读）</text>
      </view>
      <view class="btn btn-danger" @click="clearAll">
        <text class="btn-text-danger">清空本应用的 KV（{{ entries.length }} 条）</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { storage } from '../../service/storage.js'

const entries = ref([])

function refresh() {
  entries.value = storage.entries()
  uni.showToast({ title: '已读取 ' + entries.value.length + ' 条', icon: 'none' })
}

function clearAll() {
  uni.showModal({
    title: '确认清空',
    content: '将删除 exp05: 前缀下的 ' + entries.value.length + ' 条记录，删除后需要重新登录/加载。',
    confirmText: '清空',
    success: (res) => {
      if (!res.confirm) return
      storage.clear()
      refresh()
      uni.showToast({ title: '已清空', icon: 'success' })
    }
  })
}

onShow(refresh)
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
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  margin-bottom: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2329;
}
.refresh {
  font-size: 23rpx;
  color: #4e6ef2;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}
.empty-emoji {
  font-size: 56rpx;
}
.empty-text {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8a9099;
  text-align: center;
}
.row {
  padding: 18rpx 0;
  border-bottom: 2rpx solid #f2f3f5;
  display: flex;
  flex-direction: column;
}
.row:last-child {
  border-bottom: none;
}
.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.row-key {
  font-size: 23rpx;
  font-weight: 600;
  color: #2b3a8f;
  font-family: Consolas, monospace;
}
.row-tag {
  padding: 2rpx 12rpx;
  font-size: 18rpx;
  border-radius: 8rpx;
}
.row-tag.ok {
  color: #19be6b;
  background: #e8f8ef;
}
.row-tag.danger {
  color: #ee3f4d;
  background: #ffecee;
}
.row-preview {
  margin-top: 8rpx;
  font-size: 21rpx;
  line-height: 1.6;
  color: #6b7280;
  word-break: break-all;
}
.row-time {
  margin-top: 6rpx;
  font-size: 19rpx;
  color: #b3b9c4;
}
.btn {
  height: 84rpx;
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 42rpx;
}
.btn-ghost {
  background: #f7f8fc;
  border: 2rpx solid #d6dcf5;
}
.btn-danger {
  background: #fff5f5;
  border: 2rpx solid #ffd2d2;
}
.btn-text {
  font-size: 25rpx;
  color: #4e6ef2;
}
.btn-text-danger {
  font-size: 25rpx;
  color: #ee3f4d;
}
.card-note {
  font-size: 21rpx;
  line-height: 1.85;
  color: #6b7280;
}
</style>
