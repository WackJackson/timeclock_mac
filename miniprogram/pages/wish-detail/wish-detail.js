Page({
  data: {
    wishId: 0,
    wishData: {
      name: 'AirPods Pro 2',
      emoji: '🎧',
      color: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
      description: '降噪耳机,专注工作必备',
      currentAmount: '1,245.50',
      targetAmount: '1,899.00',
      progress: 65.6,
      status: 'active'
    },
    stats: {
      savedDays: 8,
      estimatedDays: 4,
      dailyAverage: '155.69'
    },
    records: [
      {
        id: 1,
        segmentName: '下午搬砖',
        modeName: '普通模式',
        modeTheme: 'primary',
        date: '01-25',
        timeRange: '14:00 - 18:00',
        amount: '172.80',
        icon: '⚡',
        iconBg: '#ecf2fe',
        amountColor: '#0052d9'
      },
      {
        id: 2,
        segmentName: '上午搬砖',
        modeName: '燃尽模式',
        modeTheme: 'warning',
        date: '01-25',
        timeRange: '09:00 - 12:00',
        amount: '129.60',
        icon: '🔥',
        iconBg: '#fff0e6',
        amountColor: '#ed7b2f'
      },
      {
        id: 3,
        segmentName: '下午搬砖',
        modeName: '摸鱼模式',
        modeTheme: 'success',
        date: '01-24',
        timeRange: '14:00 - 18:00',
        amount: '172.80',
        icon: '🐟',
        iconBg: '#e0f7f1',
        amountColor: '#00a870'
      },
      {
        id: 4,
        segmentName: '上午搬砖',
        modeName: '普通模式',
        modeTheme: 'primary',
        date: '01-24',
        timeRange: '09:00 - 12:00',
        amount: '129.60',
        icon: '⚡',
        iconBg: '#ecf2fe',
        amountColor: '#0052d9'
      },
      {
        id: 5,
        segmentName: '下午搬砖',
        modeName: '普通模式',
        modeTheme: 'primary',
        date: '01-23',
        timeRange: '14:00 - 18:00',
        amount: '172.80',
        icon: '⚡',
        iconBg: '#ecf2fe',
        amountColor: '#0052d9'
      }
    ]
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        wishId: parseInt(options.id)
      });
      this.loadWishData();
    }
  },

  // 加载愿望数据
  loadWishData() {
    // 这里应该根据 wishId 从存储中加载数据
    // 暂时使用示例数据
  },

  // 返回
  goBack() {
    wx.navigateBack();
  },

  // 更多操作
  showMore() {
    wx.showActionSheet({
      itemList: ['编辑愿望', '删除愿望'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.editWish();
        } else if (res.tapIndex === 1) {
          this.deleteWish();
        }
      }
    });
  },

  // 编辑愿望
  editWish() {
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    });
  },

  // 删除愿望
  deleteWish() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个愿望吗？',
      confirmColor: '#e34d59',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  },

  // 查看全部记录
  viewAllRecords() {
    wx.showToast({
      title: '查看全部功能开发中',
      icon: 'none'
    });
  },

  // 设为进行中
  setActive() {
    this.setData({
      'wishData.status': 'active'
    });
    wx.showToast({
      title: '已设为进行中',
      icon: 'success'
    });
  },

  // 暂停攒钱
  pauseWish() {
    this.setData({
      'wishData.status': 'waiting'
    });
    wx.showToast({
      title: '已暂停攒钱',
      icon: 'none'
    });
  }
});
