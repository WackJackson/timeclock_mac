const SalaryCalculator = require('../../utils/salary-calculator.js');
const CountdownCalculator = require('../../utils/countdown-calculator.js');
const { StorageManager } = require('../../utils/storage-manager.js');

Page({
  data: {
    // 用户配置
    config: null,

    // 当前状态
    isWorking: false,
    currentSegment: '',
    currentMode: 'normal',

    // 金额可见性控制
    isAmountVisible: true,

    // 薪资数据
    secondSalary: 0,
    todayEarned: {
      integer: '0',
      decimal: '00'
    },
    actualTodayTotal: 0, // 实际今日累计总额（用于计算增量，不受维度切换影响）
    workDaysInMonth: 0,

    // 今日统计（实际累加的，用于保存）
    actualTodayStats: {
      normal: 0,
      burnout: 0,
      slack: 0
    },

    // 显示用统计（根据维度变化）
    stats: {
      normal: 0,
      burnout: 0,
      slack: 0
    },

    // 今日统计（小时数）
    statsHours: {
      normal: '0.0',
      burnout: '0.0',
      slack: '0.0'
    },

    // 进度数据
    dimensionTab: 'day',
    progress: 0,
    workStartTime: '--:--',
    workEndTime: '--:--',
    currentTime: '--:--',

    // 不同维度的起止标签
    progressStartLabel: '--:--',
    progressEndLabel: '--:--',
    currentProgressLabel: '--:--', // 当前进度指示器文本

    // 倒计时
    countdowns: [],

    // 下一时段
    nextSegment: null,

    // 休息提示
    restMessage: '请享受生活',

    // 定时器
    timer: null,

    // 上次更新时间（用于计算增量）
    lastUpdateTime: null,

    // 保存计数器（每10次即10秒保存一次）
    saveCounter: 0
  },

  onLoad() {
    // 加载金额可见性状态
    const isAmountVisible = wx.getStorageSync('isAmountVisible');
    if (isAmountVisible !== '') {
      this.setData({ isAmountVisible });
    }

    // 加载用户配置
    this.loadConfig();

    // 启动定时器
    this.startTimer();
  },

  onShow() {
    // 页面显示时重新加载数据
    this.loadConfig();

    // 验证数据一致性（开发调试用）
    this.validateDataConsistency();

    this.updateAll();
  },

  onHide() {
    // 页面隐藏时保存当前数据
    this.saveCurrentEarnings();
  },

  onUnload() {
    // 清理定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    this.saveCurrentEarnings();
  },

  // 加载用户配置
  loadConfig() {
    const config = StorageManager.getUserConfig();

    if (!config) {
      // 未设置配置，跳转到设置页
      wx.redirectTo({
        url: '/pages/setup/setup'
      });
      return;
    }

    // 计算本月秒薪
    const salaryData = SalaryCalculator.getCurrentMonthSalary(config);

    // 获取工作时段范围
    const sortedSegments = [...config.segments].sort((a, b) => {
      return SalaryCalculator.timeToSeconds(a.startTime) - SalaryCalculator.timeToSeconds(b.startTime);
    });

    const workStartTime = sortedSegments[0]?.startTime || '--:--';
    const workEndTime = sortedSegments[sortedSegments.length - 1]?.endTime || '--:--';

    // 加载当前模式
    const currentMode = StorageManager.getCurrentMode();

    // 加载今日收入
    const todayEarnings = StorageManager.getTodayEarnings();

    this.setData({
      config,
      secondSalary: salaryData.secondSalary.toFixed(2),
      workDaysInMonth: salaryData.workDaysInMonth,
      workStartTime,
      workEndTime,
      currentMode,
      actualTodayStats: {
        normal: todayEarnings.normal || 0,
        burnout: todayEarnings.burnout || 0,
        slack: todayEarnings.slack || 0
      },
      stats: {
        normal: todayEarnings.normal || 0,
        burnout: todayEarnings.burnout || 0,
        slack: todayEarnings.slack || 0
      },
      progressStartLabel: workStartTime,
      progressEndLabel: workEndTime,
      currentProgressLabel: '--:--' // 初始化为时间格式，会在updateAll时更新
    });

    // 更新统计小时数
    this.updateStatsHours({
      normal: todayEarnings.normal || 0,
      burnout: todayEarnings.burnout || 0,
      slack: todayEarnings.slack || 0
    });

    // 设置初始今日收入显示
    const totalEarned = todayEarnings.total || 0;
    const parts = totalEarned.toFixed(2).split('.');
    this.setData({
      todayEarned: {
        integer: parts[0],
        decimal: parts[1]
      },
      actualTodayTotal: totalEarned // 同时保存实际总额
    });
  },

  // 启动定时器
  startTimer() {
    // 立即更新一次
    this.updateAll();

    // 每秒更新
    const timer = setInterval(() => {
      this.updateAll();
    }, 1000);

    this.setData({ timer });
  },

  // 更新所有数据
  updateAll() {
    if (!this.data.config) return;

    const now = new Date();

    // 更新当前时间
    this.updateCurrentTime(now);

    // 判断工作状态
    this.checkWorkStatus(now);

    // 如果在工作状态，更新收入
    if (this.data.isWorking) {
      this.updateEarnings(now);
    }

    // 更新进度（根据当前维度）
    this.updateProgressByDimension(this.data.dimensionTab);

    // 更新倒计时
    this.updateCountdowns(now);
  },

  // 更新当前时间
  updateCurrentTime(now) {
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    this.setData({
      currentTime: `${hours}:${minutes}`
    });
  },

  // 检查工作状态
  checkWorkStatus(now) {
    const { config } = this.data;

    // 检查是否是工作日
    const isWorkDay = SalaryCalculator.isWorkDay(config.workdays, now);

    if (!isWorkDay) {
      // 非工作日
      this.setData({
        isWorking: false,
        currentSegment: '非工作日',
        restMessage: '尽情享受休息日吧'
      });
      return;
    }

    // 检查当前时段
    const currentSegment = SalaryCalculator.getCurrentSegment(config.segments, now);

    if (currentSegment) {
      // 在工作时段内
      this.setData({
        isWorking: true,
        currentSegment: `${currentSegment.name}中...`
      });

      // 查找下一个时段
      this.findNextSegment(now);
    } else {
      // 在休息时段或非工作时间
      const restSegment = SalaryCalculator.getRestSegment(config.segments, now);

      if (restSegment) {
        // 在休息间隙
        this.setData({
          isWorking: false,
          currentSegment: restSegment.name,
          restMessage: '可以不用战斗了'
        });

        // 查找下一个工作时段
        this.findNextSegment(now);
      } else {
        // 非工作时间（早于第一个时段或晚于最后一个时段）
        this.setData({
          isWorking: false,
          currentSegment: '非工作时间',
          restMessage: '请享受生活'
        });

        // 查找明天第一个时段
        this.findNextDaySegment();
      }
    }
  },

  // 查找下一个时段
  findNextSegment(now) {
    const { config } = this.data;
    const currentSeconds = SalaryCalculator.timeToSeconds(
      `${now.getHours()}:${now.getMinutes()}`
    );

    // 按开始时间排序
    const sortedSegments = [...config.segments].sort((a, b) => {
      return SalaryCalculator.timeToSeconds(a.startTime) - SalaryCalculator.timeToSeconds(b.startTime);
    });

    // 找到下一个时段
    for (const segment of sortedSegments) {
      const segmentStart = SalaryCalculator.timeToSeconds(segment.startTime);
      if (segmentStart > currentSeconds) {
        // 计算倒计时
        const targetTime = new Date(now);
        const [hour, minute] = segment.startTime.split(':').map(Number);
        targetTime.setHours(hour, minute, 0, 0);

        const diff = targetTime - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        this.setData({
          nextSegment: {
            name: segment.name,
            startTime: segment.startTime,
            endTime: segment.endTime,
            countdown: hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes}分钟`
          }
        });
        return;
      }
    }

    // 没有找到今天的下一个时段
    this.setData({
      nextSegment: null
    });
  },

  // 查找明天第一个时段
  findNextDaySegment() {
    const { config } = this.data;

    if (config.segments.length === 0) {
      this.setData({ nextSegment: null });
      return;
    }

    // 获取最早的时段
    const sortedSegments = [...config.segments].sort((a, b) => {
      return SalaryCalculator.timeToSeconds(a.startTime) - SalaryCalculator.timeToSeconds(b.startTime);
    });

    const firstSegment = sortedSegments[0];

    this.setData({
      nextSegment: {
        name: firstSegment.name,
        startTime: firstSegment.startTime,
        endTime: firstSegment.endTime,
        countdown: '明天'
      }
    });
  },

  // 更新收入
  updateEarnings(now) {
    const { secondSalary, currentMode, lastUpdateTime, dimensionTab } = this.data;

    // 如果是第一次更新或者跨天了，重置lastUpdateTime
    if (!lastUpdateTime || !this.isSameDay(new Date(lastUpdateTime), now)) {
      this.setData({
        lastUpdateTime: now.getTime()
      });
      return;
    }

    // 计算时间差（秒）
    const timeDiff = (now.getTime() - lastUpdateTime) / 1000;

    // 如果时间差异常（大于10秒），可能是有问题，记录警告
    if (timeDiff > 10) {
      console.warn('[updateEarnings] 时间差异常:', timeDiff, '秒', {
        secondSalary,
        oldTotal: this.data.actualTodayTotal.toFixed(2)
      });
    }

    // 计算增量
    const increment = secondSalary * timeDiff;

    // 更新实际今日总额（不受维度影响）
    const newActualTotal = this.data.actualTodayTotal + increment;

    // 如果当前在"日"维度，同步更新显示
    if (dimensionTab === 'day') {
      const parts = newActualTotal.toFixed(2).split('.');
      this.setData({
        todayEarned: {
          integer: parts[0],
          decimal: parts[1]
        },
        actualTodayTotal: newActualTotal,
        lastUpdateTime: now.getTime()
      });
    } else {
      // 其他维度只更新实际总额，不更新显示
      this.setData({
        actualTodayTotal: newActualTotal,
        lastUpdateTime: now.getTime()
      });
    }

    // 更新实际今日各模式统计
    const actualStats = { ...this.data.actualTodayStats };
    actualStats[currentMode] = (actualStats[currentMode] || 0) + increment;

    // 如果在"日"维度，同步更新显示的统计
    if (dimensionTab === 'day') {
      this.setData({
        actualTodayStats: actualStats,
        stats: actualStats
      });
      // 更新统计小时数
      this.updateStatsHours(actualStats);
    } else {
      // 其他维度只更新实际统计
      this.setData({ actualTodayStats: actualStats });
    }

    // 更新激活愿望的进度
    this.updateActiveWishProgress(increment);

    // 每10秒保存一次数据（使用计数器更可靠）
    this.data.saveCounter++;
    if (this.data.saveCounter >= 10) {
      this.saveCurrentEarnings();
      this.data.saveCounter = 0;
    }
  },

  // 判断是否同一天
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  },

  // 将金额转换为小时数
  convertToHours(amount) {
    const secondSalary = parseFloat(this.data.secondSalary);
    if (secondSalary <= 0) return '0.0';
    const hours = amount / secondSalary / 3600;
    return hours.toFixed(1);
  },

  // 更新统计小时数
  updateStatsHours(stats) {
    this.setData({
      statsHours: {
        normal: this.convertToHours(stats.normal || 0),
        burnout: this.convertToHours(stats.burnout || 0),
        slack: this.convertToHours(stats.slack || 0)
      }
    });
  },

  // 获取本周工作日范围
  getWeekWorkDays() {
    const { config } = this.data;
    if (!config || !config.workdays) {
      return { firstDay: null, lastDay: null };
    }

    const now = new Date();
    const today = now.getDay(); // 0-6, 0是周日
    const monday = new Date(now);
    monday.setDate(now.getDate() - (today === 0 ? 6 : today - 1)); // 调整到本周一
    monday.setHours(0, 0, 0, 0);

    let firstWorkDay = null;
    let lastWorkDay = null;

    // 遍历本周7天，找到第一个和最后一个工作日
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      if (SalaryCalculator.isWorkDay(config.workdays, date)) {
        if (!firstWorkDay) {
          firstWorkDay = new Date(date);
        }
        lastWorkDay = new Date(date);
      }
    }

    return { firstDay: firstWorkDay, lastDay: lastWorkDay };
  },

  // 获取本月工作日范围
  getMonthWorkDays() {
    const { config } = this.data;
    if (!config || !config.workdays) {
      return { firstDay: null, lastDay: null };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let firstWorkDay = null;
    let lastWorkDay = null;

    // 遍历本月所有天，找到第一个和最后一个工作日
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);

      if (SalaryCalculator.isWorkDay(config.workdays, date)) {
        if (!firstWorkDay) {
          firstWorkDay = new Date(date);
        }
        lastWorkDay = new Date(date);
      }
    }

    return { firstDay: firstWorkDay, lastDay: lastWorkDay };
  },

  // 格式化日期为显示文本
  formatDateLabel(date, type) {
    if (!date) return '--';

    if (type === 'week') {
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekDays[date.getDay()];
    } else if (type === 'month') {
      return `${date.getDate()}号`;
    }

    return '--';
  },

  // 更新激活愿望进度
  updateActiveWishProgress(increment) {
    const activeWishId = StorageManager.getActiveWish();
    if (!activeWishId) return;

    // 创建资金来源记录
    const record = {
      date: StorageManager.getTodayKey(),
      segmentName: this.data.currentSegment,
      mode: this.data.currentMode,
      amount: increment.toFixed(2),
      timestamp: Date.now()
    };

    // 更新愿望进度
    StorageManager.updateWishProgress(activeWishId, increment, record);
  },

  // 保存当前收入
  saveCurrentEarnings() {
    // 使用实际今日数据，而不是显示的数据（可能是周/月的数据）
    const total = this.data.actualTodayTotal;
    const stats = this.data.actualTodayStats;

    StorageManager.saveTodayEarnings({
      total,
      normal: stats.normal,
      burnout: stats.burnout,
      slack: stats.slack
    });
  },

  // 更新倒计时
  updateCountdowns(now) {
    if (!this.data.config) return;

    const countdowns = CountdownCalculator.getAllCountdowns(this.data.config, now);
    this.setData({ countdowns });
  },

  // 切换维度
  onDimensionChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      dimensionTab: value
    });

    // 更新对应维度的数据
    this.updateDimensionData(value);
  },

  // 更新维度数据
  updateDimensionData(dimension) {
    let earnings;

    if (dimension === 'day') {
      earnings = StorageManager.getTodayEarnings();
      // 切回"日"维度时，同步实际今日数据
      this.setData({
        actualTodayTotal: earnings.total || 0,
        actualTodayStats: {
          normal: earnings.normal || 0,
          burnout: earnings.burnout || 0,
          slack: earnings.slack || 0
        }
      });
    } else if (dimension === 'week') {
      earnings = StorageManager.getWeekEarnings();
    } else if (dimension === 'month') {
      earnings = StorageManager.getMonthEarnings();
    }

    // 更新显示的金额和统计
    const total = earnings.total || 0;
    const parts = total.toFixed(2).split('.');
    const stats = {
      normal: earnings.normal || 0,
      burnout: earnings.burnout || 0,
      slack: earnings.slack || 0
    };

    this.setData({
      todayEarned: {
        integer: parts[0],
        decimal: parts[1]
      },
      stats
    });

    // 更新统计小时数
    this.updateStatsHours(stats);

    // 更新进度
    this.updateProgressByDimension(dimension);
  },

  // 根据维度更新进度
  updateProgressByDimension(dimension) {
    const { config } = this.data;
    if (!config || !config.segments.length) {
      this.setData({
        progress: 0,
        progressStartLabel: '--',
        progressEndLabel: '--'
      });
      return;
    }

    const now = new Date();

    if (dimension === 'day') {
      // 今日进度
      const workedSeconds = SalaryCalculator.calculateTodayWorkedSeconds(config.segments, []);
      const totalSeconds = SalaryCalculator.calculateDailyWorkSeconds(config.segments);
      const progress = totalSeconds > 0 ? (workedSeconds / totalSeconds * 100).toFixed(1) : 0;

      this.setData({
        progress,
        progressStartLabel: this.data.workStartTime,
        progressEndLabel: this.data.workEndTime,
        currentProgressLabel: this.data.currentTime // 日维度显示当前时间
      });
    } else if (dimension === 'week') {
      // 本周进度
      const { firstDay, lastDay } = this.getWeekWorkDays();

      if (!firstDay || !lastDay) {
        this.setData({
          progress: 0,
          progressStartLabel: '--',
          progressEndLabel: '--'
        });
        return;
      }

      const dailySeconds = SalaryCalculator.calculateDailyWorkSeconds(config.segments);

      // 计算本周工作日总数
      let totalWeekWorkDays = 0;
      const monday = new Date(now);
      const today = now.getDay();
      monday.setDate(now.getDate() - (today === 0 ? 6 : today - 1));
      monday.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        if (SalaryCalculator.isWorkDay(config.workdays, date)) {
          totalWeekWorkDays++;
        }
      }

      const totalWeekSeconds = dailySeconds * totalWeekWorkDays;

      // 计算本周已工作秒数
      let workedWeekSeconds = 0;
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        if (date > now) break; // 不计算未来的日期

        const isWorkDay = SalaryCalculator.isWorkDay(config.workdays, date);
        if (isWorkDay) {
          if (this.isSameDay(date, now)) {
            // 今天只计算已过去的时间
            workedWeekSeconds += SalaryCalculator.calculateTodayWorkedSeconds(config.segments, []);
          } else if (date < now) {
            // 过去的日子算完整工作时间
            workedWeekSeconds += dailySeconds;
          }
        }
      }

      const progress = totalWeekSeconds > 0 ? (workedWeekSeconds / totalWeekSeconds * 100).toFixed(1) : 0;

      // 获取当前是周几
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const currentWeekDay = weekDays[now.getDay()];

      this.setData({
        progress,
        progressStartLabel: this.formatDateLabel(firstDay, 'week'),
        progressEndLabel: this.formatDateLabel(lastDay, 'week'),
        currentProgressLabel: currentWeekDay // 周维度显示当前周几
      });
    } else if (dimension === 'month') {
      // 本月进度
      const { firstDay, lastDay } = this.getMonthWorkDays();

      if (!firstDay || !lastDay) {
        this.setData({
          progress: 0,
          progressStartLabel: '--',
          progressEndLabel: '--'
        });
        return;
      }

      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dailySeconds = SalaryCalculator.calculateDailyWorkSeconds(config.segments);

      // 计算本月工作日总数
      let totalWorkDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (SalaryCalculator.isWorkDay(config.workdays, date)) {
          totalWorkDays++;
        }
      }

      const totalMonthSeconds = dailySeconds * totalWorkDays;

      // 计算本月已工作秒数
      let workedMonthSeconds = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);

        if (date > now) break; // 不计算未来的日期

        const isWorkDay = SalaryCalculator.isWorkDay(config.workdays, date);
        if (isWorkDay) {
          if (this.isSameDay(date, now)) {
            // 今天只计算已过去的时间
            workedMonthSeconds += SalaryCalculator.calculateTodayWorkedSeconds(config.segments, []);
          } else if (date < now) {
            // 过去的日子算完整工作时间
            workedMonthSeconds += dailySeconds;
          }
        }
      }

      const progress = totalMonthSeconds > 0 ? (workedMonthSeconds / totalMonthSeconds * 100).toFixed(1) : 0;

      // 获取当前是几号
      const currentDay = `${now.getDate()}号`;

      this.setData({
        progress,
        progressStartLabel: this.formatDateLabel(firstDay, 'month'),
        progressEndLabel: this.formatDateLabel(lastDay, 'month'),
        currentProgressLabel: currentDay // 月维度显示当前几号
      });
    }
  },

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;

    // 只能在工作状态下切换
    if (!this.data.isWorking) {
      wx.showToast({
        title: '请在工作时段切换模式',
        icon: 'none'
      });
      return;
    }

    this.setData({
      currentMode: mode
    });

    // 保存当前模式
    StorageManager.setCurrentMode(mode);

    // 提示
    const modeNames = {
      normal: '普通模式',
      burnout: '燃尽模式',
      slack: '摸鱼模式'
    };

    wx.showToast({
      title: `已切换到${modeNames[mode]}`,
      icon: 'none'
    });
  },

  // 验证数据一致性（开发调试用）
  validateDataConsistency() {
    const todayEarnings = StorageManager.getTodayEarnings();
    const history = wx.getStorageSync('todayEarnings_history') || {};
    const todayKey = StorageManager.getTodayKey();

    // 检查今天的数据是否在历史记录中，且值是否一致
    // 注意：今天的数据默认不会保存到 history 中，只有在特定时机才会保存
    // 因此出现差异警告是正常现象，不必过于担心
    if (history[todayKey]) {
      const historyTotal = history[todayKey].total || 0;
      const currentTotal = todayEarnings.total || 0;

      // 如果差异超过0.1元，说明可能存在数据不一致
      if (Math.abs(historyTotal - currentTotal) > 0.1) {
        console.warn('数据不一致检测:', {
          historyTotal,
          currentTotal,
          difference: Math.abs(historyTotal - currentTotal),
          note: '这可能是正常的，因为今天的数据可能还未同步到 history'
        });
      }
    }
  },

  // 切换金额可见性
  toggleAmountVisibility() {
    const newVisibility = !this.data.isAmountVisible;
    this.setData({
      isAmountVisible: newVisibility
    });

    // 保存到本地存储
    wx.setStorageSync('isAmountVisible', newVisibility);
  }
});

