// app.js
App({
  globalData: {
    openid: null,
    syncTimer: null
  },
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'timebomp-2g4siacf47b7e567',
        traceUser: true
      });
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    // 启动定期自动同步（每5分钟同步一次）
    this.startAutoSync();
  },

  onShow() {
    // 小程序从后台进入前台时，触发一次同步
    this.triggerSync();
  },

  onHide() {
    // 小程序从前台进入后台时，触发一次同步
    this.triggerSync();
  },

  // 启动定期自动同步
  startAutoSync() {
    // 清除旧的定时器
    if (this.globalData.syncTimer) {
      clearInterval(this.globalData.syncTimer);
    }

    // 每5分钟自动同步一次
    this.globalData.syncTimer = setInterval(() => {
      this.triggerSync();
    }, 5 * 60 * 1000); // 5分钟
  },

  // 触发同步
  triggerSync() {
    const { StorageManager } = require('./utils/storage-manager.js');
    StorageManager.autoSyncToCloud();
  }
});