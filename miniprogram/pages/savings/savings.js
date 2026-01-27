Page({
  data: {
    totalSaved: '2,845.50',
    totalProgress: 35,
    wishes: [
      {
        id: 1,
        name: 'AirPods Pro 2',
        emoji: '🎧',
        color: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        currentAmount: '1,245.50',
        targetAmount: '1,899.00',
        progress: 65.6,
        status: 'active',
        statusText: '进行中',
        amountColor: '#0052d9',
        progressColor: 'linear-gradient(90deg, #0052d9 0%, #60a5fa 100%)',
        progressTextColor: '#666',
        remainColor: '#00a870',
        remainText: '还差 ¥653.50',
        completedDate: ''
      },
      {
        id: 2,
        name: 'Nintendo Switch',
        emoji: '🎮',
        color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        currentAmount: '800.00',
        targetAmount: '2,099.00',
        progress: 38.1,
        status: 'waiting',
        statusText: '等待中',
        amountColor: '#242424',
        progressColor: '#9ca3af',
        progressTextColor: '#666',
        remainColor: '#666',
        remainText: '还差 ¥1,299.00',
        completedDate: ''
      },
      {
        id: 3,
        name: 'Nike Air Max',
        emoji: '👟',
        color: 'linear-gradient(135deg, #ec4899 0%, #be123c 100%)',
        currentAmount: '800.00',
        targetAmount: '800.00',
        progress: 100,
        status: 'completed',
        statusText: '已完成',
        amountColor: '#00a870',
        progressColor: '#00a870',
        progressTextColor: '#00a870',
        remainColor: '#666',
        remainText: '用时 12 天',
        completedDate: '2026-01-15'
      },
      {
        id: 4,
        name: '日本旅行基金',
        emoji: '✈️',
        color: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        currentAmount: '0.00',
        targetAmount: '8,000.00',
        progress: 0,
        status: 'waiting',
        statusText: '等待中',
        amountColor: '#242424',
        progressColor: '#9ca3af',
        progressTextColor: '#666',
        remainColor: '#666',
        remainText: '还差 ¥8,000.00',
        completedDate: ''
      }
    ]
  },

  onLoad() {
    this.calculateTotalProgress();
  },

  // 计算总进度
  calculateTotalProgress() {
    const wishes = this.data.wishes;
    let totalCurrent = 0;
    let totalTarget = 0;

    wishes.forEach(wish => {
      totalCurrent += parseFloat(wish.currentAmount.replace(/,/g, ''));
      totalTarget += parseFloat(wish.targetAmount.replace(/,/g, ''));
    });

    const progress = Math.round((totalCurrent / totalTarget) * 100);

    this.setData({
      totalSaved: this.formatMoney(totalCurrent),
      totalProgress: progress
    });
  },

  // 格式化金额
  formatMoney(amount) {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  // 跳转到愿望详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/wish-detail/wish-detail?id=${id}`
    });
  },

  // 创建新愿望
  createWish() {
    wx.showToast({
      title: '创建愿望功能开发中',
      icon: 'none'
    });
    // TODO: 跳转到创建愿望页面
    // wx.navigateTo({
    //   url: '/pages/create-wish/create-wish'
    // });
  }
});
