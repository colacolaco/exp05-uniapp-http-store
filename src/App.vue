<script>
import { storage, KEYS } from './service/storage.js'

export default {
  onLaunch() {
    console.log('[App] onLaunch —— 实验05：网络请求与本地数据存储')
    // 启动时读一次本地 KV，验证「重启后数据仍在」
    const session = storage.get(KEYS.session)
    const lastLoad = storage.get(KEYS.lastLoad)
    console.log('[App] 启动时读取本地 KV：', {
      登录记录: session ? session.account : '无',
      上次加载时间: lastLoad ? lastLoad.at : '无'
    })
  },
  onShow() {
    console.log('[App] onShow —— 应用进入前台')
  },
  onHide() {
    console.log('[App] onHide —— 应用进入后台')
  }
}
</script>

<style>
/* 全局样式：三端通用，单位 rpx 会自动按屏幕宽度换算 */
page {
  background-color: #f5f6fa;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #1f2329;
}
</style>
