const { StorageManager } = require('../../utils/storage-manager.js');

Page({
  data: {
    needLogin: false,
    showLoginGuide: false,
    userInfo: {
      isLogin: false,
      nickName: '未登录',
      avatarUrl: ''
    },
    workYears: '0.0年',
    recordDays: 0,
    monthlySalary: '0',
    totalEarned: '0',
    workdays: '--',
    worktime: '--',
    dimensionTab: 'day',
    totalHours: 0,
    chartStyle: 'background: conic-gradient(#e5e5e5 0deg 360deg);',
    modeStats: {
      normal: {
        hours: 0,
        percent: 0,
        amount: '0.00'
      },
      burnout: {
        hours: 0,
        percent: 0,
        amount: '0.00'
      },
      slack: {
        hours: 0,
        percent: 0,
        amount: '0.00'
      }
    },
    refreshTimer: null
  },

  onLoad() {
    const userInfo = StorageManager.getUserInfo();

    // 检查是否已登录
    if (!userInfo.isLogin) {
      // 未登录：显示登录引导界面
      this.setData({
        needLogin: true,
        showLoginGuide: true
      });
      return;  // 不加载其他数据
    }

    // 已登录：正常加载数据
    this.loadUserInfo();
    this.loadUserData();
  },

  onShow() {
    // 如果已登录，每次显示页面时重新加载
    const userInfo = StorageManager.getUserInfo();
    if (userInfo.isLogin) {
      this.loadUserInfo();
      this.loadUserData();

      // 启动定时刷新（每2秒刷新一次）
      this.data.refreshTimer = setInterval(() => {
        this.loadUserData();
      }, 2000);

      // 触发一次自动同步
      StorageManager.autoSyncToCloud();
    }
  },

  onHide() {
    // 页面隐藏时清除定时器
    if (this.data.refreshTimer) {
      clearInterval(this.data.refreshTimer);
      this.data.refreshTimer = null;
    }
  },

  onUnload() {
    // 页面卸载时清除定时器
    if (this.data.refreshTimer) {
      clearInterval(this.data.refreshTimer);
      this.data.refreshTimer = null;
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = StorageManager.getUserInfo();
    // 简化 openid 显示（只显示后6位）
    if (userInfo && userInfo.openid) {
      userInfo.shortId = userInfo.openid.slice(-6);
    }
    this.setData({ userInfo });
  },

  // 处理登录
  handleLogin() {
    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 直接调用云函数登录，使用默认头像（空字符串会在WXML中显示emoji）
    this.performLogin('微信用户', '');
  },

  // 执行登录
  async performLogin(nickName, avatarUrl) {
    try {
      // 调用云函数进行登录
      const cloudResult = await wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName,
          avatarUrl
        }
      });

      wx.hideLoading();

      if (cloudResult.result.success) {
        const userInfo = {
          isLogin: true,
          nickName,
          avatarUrl,
          openid: cloudResult.result.openid
        };

        StorageManager.saveUserInfo(userInfo);

        // 简化 openid 显示
        if (userInfo.openid) {
          userInfo.shortId = userInfo.openid.slice(-6);
        }

        this.setData({ userInfo });

        // 保存到全局数据
        const app = getApp();
        app.globalData.openid = cloudResult.result.openid;

        // 调用登录成功回调
        this.onLoginSuccess(cloudResult.result.isNewUser);

        wx.showToast({
          title: '登录成功，点击头像和昵称可修改',
          icon: 'none',
          duration: 2000
        });
      } else {
        throw new Error(cloudResult.result.error || '登录失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('登录失败:', err);
      wx.showModal({
        title: '登录失败',
        content: err.message || '请检查网络连接和云开发配置',
        showCancel: false
      });
    }
  },

  // 登录成功回调
  onLoginSuccess(isNewUser) {
    this.setData({
      needLogin: false,
      showLoginGuide: false
    });
    this.loadUserInfo();
    this.loadUserData();

    // 自动同步数据
    this.autoSyncData(isNewUser);
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;

    // 更新本地数据
    const userInfo = this.data.userInfo;
    userInfo.avatarUrl = avatarUrl;

    StorageManager.saveUserInfo(userInfo);
    this.setData({ userInfo });

    // 更新云端数据
    this.updateCloudUserInfo(userInfo.nickName, avatarUrl);

    wx.showToast({
      title: '头像已更新',
      icon: 'success'
    });
  },

  // 显示昵称输入选择器
  showNicknameInput() {
    const that = this;
    wx.showActionSheet({
      itemList: ['使用微信昵称（推荐）', '手动输入昵称'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 使用微信昵称（官方推荐方式）
          that.showWechatNicknameInput();
        } else if (res.tapIndex === 1) {
          // 手动输入
          that.showManualNicknameInput();
        }
      }
    });
  },

  // 显示微信昵称输入框（官方推荐方式）
  showWechatNicknameInput() {
    wx.navigateTo({
      url: '/pages/edit-nickname/edit-nickname'
    });
  },

  // 手动输入昵称
  showManualNicknameInput() {
    const that = this;
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.userInfo.nickName === '微信用户' ? '' : this.data.userInfo.nickName,
      success: (res) => {
        if (res.confirm && res.content) {
          const newNickName = res.content.trim();
          if (newNickName) {
            // 更新本地数据
            const userInfo = that.data.userInfo;
            userInfo.nickName = newNickName;

            StorageManager.saveUserInfo(userInfo);
            that.setData({ userInfo });

            // 更新云端数据
            that.updateCloudUserInfo(newNickName, userInfo.avatarUrl);

            wx.showToast({
              title: '昵称已更新',
              icon: 'success'
            });
          }
        }
      }
    });
  },

  // 更新云端用户信息
  async updateCloudUserInfo(nickName, avatarUrl) {
    try {
      await wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName,
          avatarUrl
        }
      });
    } catch (err) {
      console.error('更新用户信息失败:', err);
    }
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后仍可使用所有功能',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          StorageManager.clearUserInfo();
          this.setData({
            userInfo: {
              isLogin: false,
              nickName: '未登录',
              avatarUrl: ''
            }
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 加载用户数据
  loadUserData() {
    const config = StorageManager.getUserConfig();
    if (!config) {
      return;
    }

    // 格式化月薪
    const salary = parseFloat(config.salary || 0);
    this.setData({
      monthlySalary: this.formatMoney(salary)
    });

    // 格式化工作日
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const workdayNames = config.workdays.sort((a, b) => a - b).map(day => weekdayNames[day]);
    const workdaysText = workdayNames.length > 0 ? `周${workdayNames.join('、')}` : '--';
    this.setData({
      workdays: workdaysText
    });

    // 格式化工作时段
    if (config.segments && config.segments.length > 0) {
      const sortedSegments = [...config.segments].sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
      });
      const firstSegment = sortedSegments[0];
      const lastSegment = sortedSegments[sortedSegments.length - 1];
      this.setData({
        worktime: `${firstSegment.startTime}-${lastSegment.endTime}`
      });
    }

    // 计算工龄
    this.calculateWorkTenure();

    // 计算累计收入和记录天数
    this.calculateTotalStats();

    // 加载当前维度的统计数据
    this.loadStatsData(this.data.dimensionTab);
  },

  // 计算工龄
  calculateWorkTenure() {
    const firstWorkDate = StorageManager.getFirstWorkDate();
    if (!firstWorkDate) {
      this.setData({ workYears: '0.0年' });
      return;
    }

    const start = new Date(firstWorkDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 计算年数（365天为一年，保留一位小数）
    const years = (diffDays / 365).toFixed(1);

    this.setData({ workYears: `${years}年` });
  },

  // 计算累计统计数据
  calculateTotalStats() {
    // 从收入历史记录中获取数据
    const earningsHistory = wx.getStorageSync('todayEarnings_history') || {};
    const recordDays = Object.keys(earningsHistory).length;

    // 计算累计收入（从历史记录）
    let totalEarned = 0;
    Object.values(earningsHistory).forEach(dayEarnings => {
      totalEarned += parseFloat(dayEarnings.total || 0);
    });

    // 加上今天的收入（可能还没保存到历史记录）
    const todayEarnings = StorageManager.getTodayEarnings();
    totalEarned += parseFloat(todayEarnings.total || 0);

    this.setData({
      recordDays: recordDays,
      totalEarned: this.formatKMoney(totalEarned)
    });
  },

  // 格式化金额（K单位）
  formatKMoney(amount) {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(2);
  },

  // 格式化金额
  formatMoney(amount) {
    return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  // 切换时间维度
  switchDimension(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      dimensionTab: value
    });
    // 根据维度加载不同的统计数据
    this.loadStatsData(value);
  },

  // 加载统计数据
  loadStatsData(dimension) {
    const config = StorageManager.getUserConfig();
    if (!config) return;

    // 导入 SalaryCalculator 来计算秒薪
    const SalaryCalculator = require('../../utils/salary-calculator.js');
    const salaryData = SalaryCalculator.getCurrentMonthSalary(config);
    const secondSalary = salaryData.secondSalary;

    let earnings;
    if (dimension === 'day') {
      earnings = StorageManager.getTodayEarnings();
    } else if (dimension === 'week') {
      earnings = StorageManager.getWeekEarnings();
    } else if (dimension === 'month') {
      earnings = StorageManager.getMonthEarnings();
    } else if (dimension === 'year') {
      // 年度统计需要遍历整年的数据
      earnings = this.getYearEarnings();
    }

    const total = earnings.total || 0;
    const normal = earnings.normal || 0;
    const burnout = earnings.burnout || 0;
    const slack = earnings.slack || 0;

    // 计算小时数（金额 / 秒薪 / 3600）
    const totalHours = secondSalary > 0 ? (total / secondSalary / 3600).toFixed(1) : '0.0';
    const normalHours = secondSalary > 0 ? (normal / secondSalary / 3600).toFixed(1) : '0.0';
    const burnoutHours = secondSalary > 0 ? (burnout / secondSalary / 3600).toFixed(1) : '0.0';
    const slackHours = secondSalary > 0 ? (slack / secondSalary / 3600).toFixed(1) : '0.0';

    // 计算百分比
    const normalPercent = total > 0 ? Math.round((normal / total) * 100) : 0;
    const burnoutPercent = total > 0 ? Math.round((burnout / total) * 100) : 0;
    const slackPercent = total > 0 ? Math.round((slack / total) * 100) : 0;

    // 生成饼图渐变样式
    const chartStyle = this.generateChartStyle(normalPercent, burnoutPercent, slackPercent);

    this.setData({
      totalHours: totalHours,
      chartStyle: chartStyle,
      modeStats: {
        normal: {
          hours: normalHours,
          percent: normalPercent,
          amount: normal.toFixed(2)
        },
        burnout: {
          hours: burnoutHours,
          percent: burnoutPercent,
          amount: burnout.toFixed(2)
        },
        slack: {
          hours: slackHours,
          percent: slackPercent,
          amount: slack.toFixed(2)
        }
      }
    });
  },

  // 生成环形图样式
  generateChartStyle(normalPercent, burnoutPercent, slackPercent) {
    // 如果所有值都是0，显示灰色圆环
    if (normalPercent === 0 && burnoutPercent === 0 && slackPercent === 0) {
      return 'background: conic-gradient(#e5e5e5 0deg 360deg);';
    }

    // 计算角度（百分比 * 3.6 = 角度）
    const normalDeg = normalPercent * 3.6;
    const burnoutDeg = burnoutPercent * 3.6;
    const slackDeg = slackPercent * 3.6;

    // 计算累积角度
    const normalEnd = normalDeg;
    const burnoutEnd = normalEnd + burnoutDeg;
    const slackEnd = burnoutEnd + slackDeg;

    // 生成conic-gradient
    let gradient = 'background: conic-gradient(';

    if (normalPercent > 0) {
      gradient += `#0052d9 0deg ${normalEnd}deg`;
      if (burnoutPercent > 0 || slackPercent > 0) gradient += ', ';
    }

    if (burnoutPercent > 0) {
      gradient += `#ed7b2f ${normalEnd}deg ${burnoutEnd}deg`;
      if (slackPercent > 0) gradient += ', ';
    }

    if (slackPercent > 0) {
      gradient += `#00a870 ${burnoutEnd}deg ${slackEnd}deg`;
    }

    gradient += ');';
    return gradient;
  },

  // 获取年度收入统计
  getYearEarnings() {
    try {
      const earningsHistory = wx.getStorageSync('todayEarnings_history') || {};
      const now = new Date();
      const currentYear = now.getFullYear();

      let total = 0;
      let normal = 0;
      let burnout = 0;
      let slack = 0;

      // 遍历历史记录，只统计当年的数据
      Object.entries(earningsHistory).forEach(([dateKey, dayData]) => {
        const [year] = dateKey.split('-');
        if (parseInt(year) === currentYear) {
          total += dayData.total || 0;
          normal += dayData.normal || 0;
          burnout += dayData.burnout || 0;
          slack += dayData.slack || 0;
        }
      });

      // 加上今天的数据（如果是当年）
      const todayData = StorageManager.getTodayEarnings();
      total += todayData.total || 0;
      normal += todayData.normal || 0;
      burnout += todayData.burnout || 0;
      slack += todayData.slack || 0;

      return { total, normal, burnout, slack };
    } catch (e) {
      console.error('获取年度收入失败:', e);
      return { total: 0, normal: 0, burnout: 0, slack: 0 };
    }
  },

  // 编辑月薪
  editSalary() {
    wx.navigateTo({
      url: '/pages/setup/setup?edit=true&step=0'
    });
  },

  // 编辑工作日
  editWorkdays() {
    wx.navigateTo({
      url: '/pages/setup/setup?edit=true&step=1'
    });
  },

  // 编辑工作时段
  editWorktime() {
    wx.navigateTo({
      url: '/pages/setup/setup?edit=true&step=2'
    });
  },

  // 编辑工龄
  editWorkTenure() {
    wx.navigateTo({
      url: '/pages/setup/setup?edit=true&step=3'
    });
  },

  // 帮助与反馈
  showHelp() {
    wx.navigateTo({
      url: '/pages/author/author'
    });
  },

  // 自动同步数据（登录后调用）
  async autoSyncData(isNewUser) {
    try {
      if (isNewUser) {
        // 新用户：上传本地数据到云端
        const result = await StorageManager.uploadToCloud();
        if (result.success) {
          console.log('新用户数据已上传到云端');
        }
      } else {
        // 老用户：智能同步（合并云端和本地数据）
        const result = await StorageManager.syncWithCloud();
        if (result.success) {
          console.log('数据同步成功');
          // 刷新页面数据
          this.loadUserData();
        }
      }
    } catch (err) {
      console.error('自动同步失败:', err);
    }
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '关于',
      content: '工作时薪观察器 v1.0.0\n\n一款帮助打工人实时观察工作收入的小工具',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
