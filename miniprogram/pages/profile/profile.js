Page({
  data: {
    workYears: '1年3个月',
    recordDays: 286,
    monthlySalary: '15,000',
    totalEarned: '186.5k',
    workdays: '周一至周五',
    worktime: '09:00-18:00',
    dimensionTab: 'day',
    totalHours: 7,
    modeStats: {
      normal: {
        hours: 4.2,
        percent: 60,
        amount: '181.44'
      },
      burnout: {
        hours: 1.75,
        percent: 25,
        amount: '75.60'
      },
      slack: {
        hours: 1.05,
        percent: 15,
        amount: '45.36'
      }
    }
  },

  onLoad() {
    this.loadUserData();
  },

  // 加载用户数据
  loadUserData() {
    // 这里应该从存储中加载用户数据
    // 暂时使用示例数据
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
    // 这里应该根据维度加载不同的数据
    console.log('Loading stats for:', dimension);
  },

  // 编辑月薪
  editSalary() {
    wx.showToast({
      title: '编辑月薪功能开发中',
      icon: 'none'
    });
    // TODO: 跳转到月薪设置页面
  },

  // 编辑工作日
  editWorkdays() {
    wx.showToast({
      title: '编辑工作日功能开发中',
      icon: 'none'
    });
    // TODO: 跳转到工作日设置页面
  },

  // 编辑工作时段
  editWorktime() {
    wx.showToast({
      title: '编辑时段功能开发中',
      icon: 'none'
    });
    // TODO: 跳转到时段设置页面
  },

  // 提醒设置
  editNotifications() {
    wx.showToast({
      title: '提醒设置功能开发中',
      icon: 'none'
    });
  },

  // 导出数据
  exportData() {
    wx.showModal({
      title: '导出数据',
      content: '是否导出所有工作记录数据？',
      confirmText: '导出',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '导出中...'
          });
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '导出成功',
              icon: 'success'
            });
          }, 1500);
        }
      }
    });
  },

  // 帮助与反馈
  showHelp() {
    wx.showToast({
      title: '帮助功能开发中',
      icon: 'none'
    });
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
