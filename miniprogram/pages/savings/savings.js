const { StorageManager } = require('../../utils/storage-manager.js');

Page({
  data: {
    totalSaved: '0.00',
    totalProgress: 0,
    wishes: [],
    showCreateDialog: false,
    newWish: {
      name: '',
      amount: '',
      emoji: '🎯'
    },
    emojiOptions: [
      '🎧', '🎮', '👟', '✈️', '📱', '💻', '⌚', '📷',
      '🎸', '🏀', '🚗', '🏠', '💍', '📚', '🎯', '🎨',
      '🎬', '🎤', '🎪', '🎭', '🎺', '🎻', '🎹'
    ],
    customEmoji: '',
    refreshTimer: null
  },

  onLoad() {
    this.loadWishes();
  },

  onShow() {
    // 每次显示页面时重新加载，以便更新数据
    this.loadWishes();

    // 启动定时刷新（每2秒刷新一次）
    this.data.refreshTimer = setInterval(() => {
      this.loadWishes();
    }, 2000);
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

  // 加载愿望列表
  loadWishes() {
    const wishes = StorageManager.getWishes();
    const activeWishId = StorageManager.getActiveWish();

    // 按创建时间倒序排列（最新的在前面）
    wishes.sort((a, b) => {
      const dateA = a.createdDate || '0000-00-00';
      const dateB = b.createdDate || '0000-00-00';
      return dateB.localeCompare(dateA);
    });

    // 格式化愿望数据用于显示
    const formattedWishes = wishes.map(wish => {
      const current = parseFloat(wish.currentAmount || 0);
      const target = parseFloat(wish.targetAmount || 0);
      const progress = target > 0 ? Math.round((current / target) * 100) : 0;
      const isActive = wish.id === activeWishId;

      return {
        ...wish,
        currentAmount: this.formatMoney(current),
        targetAmount: this.formatMoney(target),
        progress: progress,
        status: progress >= 100 ? 'completed' : (isActive ? 'active' : 'waiting'),
        statusText: progress >= 100 ? '已完成' : (isActive ? '进行中' : '等待中'),
        amountColor: progress >= 100 ? '#00a870' : (isActive ? '#0052d9' : '#242424'),
        progressColor: progress >= 100 ? '#00a870' : (isActive ? 'linear-gradient(90deg, #0052d9 0%, #60a5fa 100%)' : '#9ca3af'),
        progressTextColor: progress >= 100 ? '#00a870' : '#666',
        remainColor: isActive ? '#00a870' : '#666',
        remainText: progress >= 100
          ? (wish.completedDate ? `完成于 ${wish.completedDate}` : '已完成')
          : `还差 ¥${this.formatMoney(target - current)}`
      };
    });

    this.setData({
      wishes: formattedWishes
    }, () => {
      this.calculateTotalProgress();
    });
  },

  // 计算总进度
  calculateTotalProgress() {
    const wishes = this.data.wishes;
    if (wishes.length === 0) {
      this.setData({
        totalSaved: '0.00',
        totalProgress: 0
      });
      return;
    }

    let totalCurrent = 0;
    let totalTarget = 0;

    wishes.forEach(wish => {
      totalCurrent += parseFloat(wish.currentAmount.replace(/,/g, ''));
      totalTarget += parseFloat(wish.targetAmount.replace(/,/g, ''));
    });

    const progress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

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
    this.setData({
      showCreateDialog: true,
      newWish: {
        name: '',
        amount: '',
        emoji: '🎯'
      },
      customEmoji: ''
    });
  },

  // 输入愿望名称
  onWishNameInput(e) {
    this.setData({
      'newWish.name': e.detail.value
    });
  },

  // 输入目标金额
  onWishAmountInput(e) {
    this.setData({
      'newWish.amount': e.detail.value
    });
  },

  // 选择图标
  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.setData({
      'newWish.emoji': emoji,
      customEmoji: ''
    });
  },

  // 输入自定义emoji
  onCustomEmojiInput(e) {
    const value = e.detail.value;
    this.setData({
      customEmoji: value,
      'newWish.emoji': value || '🎯'
    });
  },

  // 确认创建
  confirmCreate() {
    const { name, amount, emoji } = this.data.newWish;

    // 验证输入
    if (!name || name.trim() === '') {
      wx.showToast({
        title: '请输入愿望名称',
        icon: 'none'
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      });
      return;
    }

    // 生成颜色
    const colors = [
      'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be123c 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // 创建新愿望
    const wishes = StorageManager.getWishes();
    const newId = wishes.length > 0 ? Math.max(...wishes.map(w => w.id)) + 1 : 1;

    const newWishItem = {
      id: newId,
      name: name.trim(),
      emoji: emoji,
      color: color,
      currentAmount: 0,
      targetAmount: amountNum,
      createdDate: StorageManager.getTodayKey()
    };

    wishes.push(newWishItem);
    StorageManager.saveWishes(wishes);

    // 如果当前没有进行中的愿望，自动设为激活
    const activeWishId = StorageManager.getActiveWish();
    if (!activeWishId) {
      StorageManager.setActiveWish(newId);
    }

    // 关闭对话框并刷新列表
    this.setData({
      showCreateDialog: false
    });

    this.loadWishes();

    wx.showToast({
      title: '创建成功',
      icon: 'success'
    });
  },

  // 取消创建
  cancelCreate() {
    this.setData({
      showCreateDialog: false
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，阻止点击事件冒泡到overlay
  }
});
