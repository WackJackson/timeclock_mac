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

    // 薪资数据
    secondSalary: 0,
    todayEarned: {
      integer: '0',
      decimal: '00'
    },
    workDaysInMonth: 0,

    // 今日统计
    stats: {
      normal: 0,
      burnout: 0,
      slack: 0
    },

    // 进度数据
    dimensionTab: 'day',
    progress: 0,
    workStartTime: '--:--',
    workEndTime: '--:--',
    currentTime: '--:--',

    // 倒计时
    countdowns: [],

    // 下一时段
    nextSegment: null,

    // 休息提示
    restMessage: '请享受生活',

    // 定时器
    timer: null,

    // 上次更新时间（用于计算增量）
    lastUpdateTime: null
  },

  onLoad() {
    // 加载用户配置
    this.loadConfig();

    // 启动定时器
    this.startTimer();
  },

  onShow() {
    // 页面显示时重新加载数据
    this.loadConfig();
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
      secondSalary: salaryData.secondSalary,
      workDaysInMonth: salaryData.workDaysInMonth,
      workStartTime,
      workEndTime,
      currentMode,
      stats: {
        normal: todayEarnings.normal || 0,
        burnout: todayEarnings.burnout || 0,
        slack: todayEarnings.slack || 0
      }
    });

    // 设置初始今日收入显示
    const totalEarned = todayEarnings.total || 0;
    const parts = totalEarned.toFixed(2).split('.');
    this.setData({
      todayEarned: {
        integer: parts[0],
        decimal: parts[1]
      }
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

    // 更新进度
    this.updateProgress(now);

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
    const { secondSalary, currentMode, lastUpdateTime } = this.data;

    // 如果是第一次更新或者跨天了，重置lastUpdateTime
    if (!lastUpdateTime || !this.isSameDay(new Date(lastUpdateTime), now)) {
      this.setData({
        lastUpdateTime: now.getTime()
      });
      return;
    }

    // 计算时间差（秒）
    const timeDiff = (now.getTime() - lastUpdateTime) / 1000;

    // 计算增量
    const increment = secondSalary * timeDiff;

    // 更新总收入
    const currentTotal = parseFloat(this.data.todayEarned.integer + '.' + this.data.todayEarned.decimal);
    const newTotal = currentTotal + increment;
    const parts = newTotal.toFixed(2).split('.');

    this.setData({
      todayEarned: {
        integer: parts[0],
        decimal: parts[1]
      },
      lastUpdateTime: now.getTime()
    });

    // 更新各模式统计
    const stats = { ...this.data.stats };
    stats[currentMode] = (stats[currentMode] || 0) + increment;

    this.setData({ stats });

    // 更新激活愿望的进度
    this.updateActiveWishProgress(increment);

    // 每10秒保存一次数据
    if (Math.floor(now.getTime() / 1000) % 10 === 0) {
      this.saveCurrentEarnings();
    }
  },

  // 判断是否同一天
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
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
    const total = parseFloat(this.data.todayEarned.integer + '.' + this.data.todayEarned.decimal);

    StorageManager.saveTodayEarnings({
      total,
      normal: this.data.stats.normal,
      burnout: this.data.stats.burnout,
      slack: this.data.stats.slack
    });
  },

  // 更新进度
  updateProgress(now) {
    const { config, workStartTime, workEndTime } = this.data;

    if (!config || !config.segments.length) {
      this.setData({ progress: 0 });
      return;
    }

    // 计算今日已工作秒数
    const workedSeconds = SalaryCalculator.calculateTodayWorkedSeconds(config.segments, []);

    // 计算今日总工作秒数
    const totalSeconds = SalaryCalculator.calculateDailyWorkSeconds(config.segments);

    // 计算进度
    const progress = totalSeconds > 0 ? (workedSeconds / totalSeconds * 100).toFixed(1) : 0;

    this.setData({ progress });
  },

  // 更新倒计时
  updateCountdowns(now) {
    if (!this.data.config) return;

    const countdowns = CountdownCalculator.getAllCountdowns(this.data.config, now);
    this.setData({ countdowns });
  },

  // 切换维度
  onDimensionChange(e) {
    this.setData({
      dimensionTab: e.detail.value
    });
    // TODO: 根据维度加载不同的数据
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
  }
});
