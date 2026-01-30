const { StorageManager } = require('../../utils/storage-manager.js');

Page({
  data: {
    wishId: 0,
    wishData: {
      name: '',
      emoji: '🎯',
      color: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      description: '',
      currentAmount: '0.00',
      targetAmount: '0.00',
      progress: 0,
      status: 'waiting'
    },
    modeProgress: {
      normal: 0,
      burnout: 0,
      slack: 0
    },
    stats: {
      savedDays: 0,
      estimatedDays: 0,
      totalMinutes: 0
    },
    records: [],
    refreshTimer: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        wishId: parseInt(options.id)
      });
      this.loadWishData();
    }
  },

  onShow() {
    // 每次显示页面时重新加载数据，以便看到最新进度
    if (this.data.wishId) {
      this.loadWishData();

      // 启动定时刷新（每2秒刷新一次）
      this.data.refreshTimer = setInterval(() => {
        this.loadWishData();
      }, 2000);
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

  // 加载愿望数据
  loadWishData() {
    const wishes = StorageManager.getWishes();
    const wish = wishes.find(w => w.id === this.data.wishId);

    if (!wish) {
      wx.showToast({
        title: '愿望不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 获取激活的愿望ID
    const activeWishId = StorageManager.getActiveWish();

    // 计算进度
    const current = parseFloat(wish.currentAmount || 0);
    const target = parseFloat(wish.targetAmount || 0);
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;

    // 判断状态
    let status = 'waiting';
    if (progress >= 100) {
      status = 'completed';
    } else if (wish.id === activeWishId) {
      status = 'active';
    }

    // 获取愿望的资金记录
    const records = wish.records || [];

    // 计算每种模式的进度
    const modeProgress = this.calculateModeProgress(records, target);

    // 计算统计数据
    const stats = this.calculateStats(wish, records);

    // 格式化资金记录（传入目标金额以限制显示）
    const formattedRecords = this.formatRecords(records, target);

    // 更新数据
    this.setData({
      wishData: {
        ...wish,
        currentAmount: this.formatMoney(current),
        targetAmount: this.formatMoney(target),
        progress: progress,
        status: status
      },
      modeProgress: modeProgress,
      stats: stats,
      records: formattedRecords
    });
  },

  // 计算每种模式的进度百分比
  calculateModeProgress(records, targetAmount) {
    const modeStats = {
      normal: 0,
      burnout: 0,
      slack: 0
    };

    // 按模式汇总金额
    records.forEach(record => {
      const mode = record.mode || 'normal';
      const amount = parseFloat(record.amount || 0);
      if (modeStats[mode] !== undefined) {
        modeStats[mode] += amount;
      }
    });

    // 计算每种模式的进度百分比
    const result = {
      normal: targetAmount > 0 ? Math.round((modeStats.normal / targetAmount) * 100 * 10) / 10 : 0,
      burnout: targetAmount > 0 ? Math.round((modeStats.burnout / targetAmount) * 100 * 10) / 10 : 0,
      slack: targetAmount > 0 ? Math.round((modeStats.slack / targetAmount) * 100 * 10) / 10 : 0
    };

    // 确保总进度不超过100%
    const total = result.normal + result.burnout + result.slack;
    if (total > 100) {
      const ratio = 100 / total;
      result.normal = Math.round(result.normal * ratio * 10) / 10;
      result.burnout = Math.round(result.burnout * ratio * 10) / 10;
      result.slack = Math.round(result.slack * ratio * 10) / 10;
    }

    return result;
  },

  // 计算统计数据
  calculateStats(wish, records) {
    // 获取用户配置和薪资数据
    const userConfig = StorageManager.getUserConfig();
    if (!userConfig) {
      return {
        savedDays: 0,
        estimatedDays: 0,
        totalMinutes: 0
      };
    }

    // 导入 SalaryCalculator
    const SalaryCalculator = require('../../utils/salary-calculator.js');
    const salaryData = SalaryCalculator.getCurrentMonthSalary(userConfig);

    // 获取秒薪和每日工作秒数
    const secondSalary = salaryData.secondSalary;
    const dailyWorkSeconds = salaryData.dailyWorkSeconds;

    // 计算已攒天数（从创建日期到今天，包含今天）
    const createdDate = wish.createdDate;
    const today = StorageManager.getTodayKey();
    let savedDays = 0;

    if (createdDate) {
      // 计算日期差，然后加1（因为今天也算一天）
      const daysDiff = this.getDaysBetween(createdDate, today);
      savedDays = daysDiff + 1;
    }

    // 获取当前金额和目标金额
    const current = parseFloat(wish.currentAmount || 0);
    const target = parseFloat(wish.targetAmount || 0);

    // 计算所需总时长（分钟）- 基于目标金额
    // 目标金额 / 秒薪 = 所需工作秒数，再除以60得到分钟数
    const totalMinutes = secondSalary > 0 ? Math.round((target / secondSalary) / 60) : 0;

    // 计算预计完成天数（考虑休息日）
    // 日薪 = 秒薪 × 每日工作秒数
    const dailySalary = secondSalary * dailyWorkSeconds;
    const remaining = target - current;

    let estimatedDays = 0;
    if (dailySalary > 0 && remaining > 0) {
      // 计算还需要多少个工作日
      const workDaysNeeded = Math.ceil(remaining / dailySalary);

      // 计算这些工作日对应多少个日历天（包含休息日）
      const calendarDaysNeeded = this.calculateCalendarDays(workDaysNeeded, userConfig.workdays);

      // 因为今天已经算第一天了，所以预计完成是 calendarDaysNeeded - 1 天后
      estimatedDays = calendarDaysNeeded > 0 ? calendarDaysNeeded - 1 : 0;
    }

    return {
      savedDays: savedDays,
      estimatedDays: estimatedDays,
      totalMinutes: totalMinutes
    };
  },

  // 计算N个工作日需要多少个日历天（从明天开始算）
  calculateCalendarDays(workDaysNeeded, workdays) {
    if (workDaysNeeded <= 0) return 0;

    const today = new Date();
    let calendarDays = 0;
    let workDaysFound = 0;
    let currentDate = new Date(today);

    // 从今天开始往后数，找到第N个工作日
    while (workDaysFound < workDaysNeeded) {
      const dayOfWeek = currentDate.getDay(); // 0=周日, 1=周一, ..., 6=周六

      // 检查当天是否为工作日
      if (workdays.includes(dayOfWeek)) {
        workDaysFound++;
      }

      calendarDays++;

      // 移到下一天
      currentDate.setDate(currentDate.getDate() + 1);

      // 防止无限循环（如果workdays为空）
      if (calendarDays > 1000) break;
    }

    return calendarDays;
  },

  // 格式化资金记录
  formatRecords(records, targetAmount) {
    if (records.length === 0) {
      return [];
    }

    // 获取时薪设置
    const userConfig = StorageManager.getUserConfig();
    const hourlyRate = userConfig ? parseFloat(userConfig.hourlyRate || 0) : 0;

    // 按模式汇总金额和时长
    const modeStats = {
      normal: { total: 0, minutes: 0 },
      burnout: { total: 0, minutes: 0 },
      slack: { total: 0, minutes: 0 }
    };

    // 计算总金额，但不超过目标金额
    let accumulatedTotal = 0;
    const target = parseFloat(targetAmount || 0);

    records.forEach(record => {
      const mode = record.mode || 'normal';
      const amount = parseFloat(record.amount || 0);

      // 如果累计金额已经达到目标，不再累加
      if (accumulatedTotal >= target && target > 0) {
        return;
      }

      // 计算本次实际应该累加的金额（不超过目标）
      const actualAmount = target > 0 ? Math.min(amount, target - accumulatedTotal) : amount;
      accumulatedTotal += actualAmount;

      if (modeStats[mode]) {
        modeStats[mode].total += actualAmount;
        // 计算时长（分钟） = 金额 / 时薪 * 60
        if (hourlyRate > 0) {
          modeStats[mode].minutes += (actualAmount / hourlyRate) * 60;
        }
      }
    });

    // 转换为显示数组
    const result = [];

    if (modeStats.normal.total > 0) {
      result.push({
        id: 'normal',
        modeName: '普通模式',
        modeTheme: 'primary',
        icon: '⚡',
        iconBg: '#ecf2fe',
        amountColor: '#0052d9',
        amount: this.formatMoney(modeStats.normal.total),
        minutes: Math.round(modeStats.normal.minutes)
      });
    }

    if (modeStats.burnout.total > 0) {
      result.push({
        id: 'burnout',
        modeName: '燃尽模式',
        modeTheme: 'warning',
        icon: '🔥',
        iconBg: '#fff0e6',
        amountColor: '#ed7b2f',
        amount: this.formatMoney(modeStats.burnout.total),
        minutes: Math.round(modeStats.burnout.minutes)
      });
    }

    if (modeStats.slack.total > 0) {
      result.push({
        id: 'slack',
        modeName: '摸鱼模式',
        modeTheme: 'success',
        icon: '🐟',
        iconBg: '#e0f7f1',
        amountColor: '#00a870',
        amount: this.formatMoney(modeStats.slack.total),
        minutes: Math.round(modeStats.slack.minutes)
      });
    }

    return result;
  },

  // 计算两个日期之间的天数差（不包含结束日期）
  getDaysBetween(dateStr1, dateStr2) {
    const date1 = this.parseDate(dateStr1);
    const date2 = this.parseDate(dateStr2);

    // 设置为当天的00:00:00，避免时间部分影响计算
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);

    const diffTime = date2 - date1;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  // 解析日期字符串
  parseDate(dateStr) {
    // dateStr 格式: 2026-01-29
    const parts = dateStr.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
  },

  // 格式化金额
  formatMoney(amount) {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
          // 从存储中删除愿望
          const wishes = StorageManager.getWishes();
          const index = wishes.findIndex(w => w.id === this.data.wishId);

          if (index > -1) {
            wishes.splice(index, 1);
            StorageManager.saveWishes(wishes);

            // 如果删除的是激活的愿望，清除激活状态
            const activeWishId = StorageManager.getActiveWish();
            if (activeWishId === this.data.wishId) {
              StorageManager.setActiveWish(null);
            }

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
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
    StorageManager.setActiveWish(this.data.wishId);
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
    StorageManager.setActiveWish(null);
    this.setData({
      'wishData.status': 'waiting'
    });
    wx.showToast({
      title: '已暂停攒钱',
      icon: 'none'
    });
  }
});
