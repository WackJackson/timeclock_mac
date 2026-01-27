Page({
  data: {
    isWorking: true,
    currentSegment: '下午搬砖中...',
    todayEarned: {
      integer: '486',
      decimal: '57'
    },
    secondSalary: '0.0217',
    restMessage: '请享受生活',
    stats: {
      normal: 3,
      burnout: 0,
      slack: 0
    },
    dimensionTab: 'day',
    progress: 68.5,
    workStartTime: '09:00',
    workEndTime: '18:00',
    currentTime: '15:15',
    currentMode: 'normal',
    countdowns: [
      { icon: '☕', label: '距离休息', value: '1小时23分' },
      { icon: '🏠', label: '距离下班', value: '2小时45分' },
      { icon: '🎉', label: '距离周末', value: '2天6小时' },
      { icon: '🏖️', label: '距离假期', value: '28天' }
    ],
    nextSegment: {
      name: '下午搬砖',
      startTime: '14:00',
      endTime: '18:00',
      countdown: '1:30'
    }
  },

  onLoad() {
    this.updateTime();
    this.startTimer();
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  // 更新时间
  updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    this.setData({
      currentTime: `${hours}:${minutes}`
    });

    // 判断是否在工作时间
    this.checkWorkStatus();
  },

  // 检查工作状态
  checkWorkStatus() {
    const now = new Date();
    const currentHour = now.getHours();

    // 示例：9-12点和14-18点为工作时间
    const isWorkingNow = (currentHour >= 9 && currentHour < 12) || (currentHour >= 14 && currentHour < 18);

    this.setData({
      isWorking: isWorkingNow
    });

    if (isWorkingNow) {
      if (currentHour >= 9 && currentHour < 12) {
        this.setData({
          currentSegment: '上午搬砖中...'
        });
      } else {
        this.setData({
          currentSegment: '下午搬砖中...'
        });
      }
    } else {
      if (currentHour >= 12 && currentHour < 14) {
        this.setData({
          currentSegment: '午休时间',
          restMessage: '可以不用战斗了',
          nextSegment: {
            name: '下午搬砖',
            startTime: '14:00',
            endTime: '18:00',
            countdown: this.calculateCountdown(14, 0)
          }
        });
      }
    }
  },

  // 计算倒计时
  calculateCountdown(targetHour, targetMinute) {
    const now = new Date();
    const target = new Date();
    target.setHours(targetHour, targetMinute, 0);

    if (target < now) {
      target.setDate(target.getDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  },

  // 启动定时器
  startTimer() {
    this.timer = setInterval(() => {
      this.updateTime();
      this.updateEarnings();
    }, 1000);
  },

  // 更新收入
  updateEarnings() {
    // 这里应该根据实际工作时间和模式计算收入
    // 示例：简单递增
    const current = parseFloat(this.data.todayEarned.integer + '.' + this.data.todayEarned.decimal);
    const newAmount = current + 0.01;
    const parts = newAmount.toFixed(2).split('.');

    this.setData({
      todayEarned: {
        integer: parts[0],
        decimal: parts[1]
      }
    });
  },

  // 切换维度
  onDimensionChange(e) {
    this.setData({
      dimensionTab: e.detail.value
    });
    // 这里应该根据维度加载不同的数据
  },

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      currentMode: mode
    });

    // 提示模式切换
    wx.showToast({
      title: `已切换到${this.getModeName(mode)}`,
      icon: 'none'
    });
  },

  getModeName(mode) {
    const names = {
      normal: '普通模式',
      burnout: '燃尽模式',
      slack: '摸鱼模式'
    };
    return names[mode] || '';
  },

  timer: null
});
