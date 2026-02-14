// app.js
App({
  globalData: {
    openid: null,
    syncTimer: null,
    // 数据版本号：用于检测是否需要清理缓存
    DATA_VERSION: '1.0.2' // 🔑 每次需要清理缓存时，修改这个版本号
  },
  onLaunch() {
    // 检查数据版本，决定是否清理缓存
    this.checkAndCleanCache();

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

    // 🚨 临时禁用自动同步，防止脏数据
    // this.startAutoSync();
  },

  onShow() {
    // 🚨 临时禁用自动同步
    // this.triggerSync();
  },

  onHide() {
    // 🚨 临时禁用自动同步
    // this.triggerSync();
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
  },

  // 检查数据版本并清理缓存
  checkAndCleanCache() {
    try {
      const storedVersion = wx.getStorageSync('DATA_VERSION');
      const currentVersion = this.globalData.DATA_VERSION;

      if (!storedVersion) {
        // 首次启动，保存版本号
        wx.setStorageSync('DATA_VERSION', currentVersion);
        console.log(`首次启动，保存数据版本: ${currentVersion}`);
        return;
      }

      if (storedVersion !== currentVersion) {
        console.log(`数据版本更新: ${storedVersion} -> ${currentVersion}，开始清理缓存`);

        // 保留日志，清除其他所有数据
        const logs = wx.getStorageSync('logs');
        wx.clearStorageSync();

        if (logs) {
          wx.setStorageSync('logs', logs);
        }

        // 保存新版本号
        wx.setStorageSync('DATA_VERSION', currentVersion);

        console.log('缓存清理完成');

        // 可选：提示用户
        wx.showToast({
          title: '数据已更新',
          icon: 'success',
          duration: 2000
        });
      } else {
        console.log(`数据版本一致: ${currentVersion}，无需清理缓存`);
      }
    } catch (e) {
      console.error('检查缓存版本失败:', e);
    }
  }
});