/**
 * 倒计时计算工具
 */

const SalaryCalculator = require('./salary-calculator.js');

class CountdownCalculator {
  /**
   * 计算距离下一个休息时间
   * @param {Array<Object>} segments 工作时段
   * @param {Date} now 当前时间
   * @returns {string} 倒计时文本
   */
  static getTimeToNextRest(segments, now = new Date()) {
    const currentSegment = SalaryCalculator.getCurrentSegment(segments, now);

    if (!currentSegment) {
      return '已在休息';
    }

    const [endHour, endMinute] = currentSegment.endTime.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    return this.formatTimeDiff(endTime - now);
  }

  /**
   * 计算距离下班时间
   * @param {Array<Object>} segments 工作时段
   * @param {Date} now 当前时间
   * @returns {string} 倒计时文本
   */
  static getTimeToWorkEnd(segments, now = new Date()) {
    const sortedSegments = [...segments].sort((a, b) => {
      const aEnd = SalaryCalculator.timeToSeconds(a.endTime);
      const bEnd = SalaryCalculator.timeToSeconds(b.endTime);
      return bEnd - aEnd;
    });

    const lastSegment = sortedSegments[0];
    if (!lastSegment) {
      return '无工作时段';
    }

    const [endHour, endMinute] = lastSegment.endTime.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    const currentSeconds = SalaryCalculator.timeToSeconds(
      `${now.getHours()}:${now.getMinutes()}`
    );
    const endSeconds = SalaryCalculator.timeToSeconds(lastSegment.endTime);

    if (currentSeconds >= endSeconds) {
      return '已下班';
    }

    return this.formatTimeDiff(endTime - now);
  }

  /**
   * 计算距离周末
   * @param {Array<number>} workdays 工作日数组
   * @param {Date} now 当前时间
   * @returns {string} 倒计时文本
   */
  static getTimeToWeekend(workdays, now = new Date()) {
    const currentDay = now.getDay();

    // 找到本周最后一个工作日
    let lastWorkDay = Math.max(...workdays);

    // 如果今天已过最后一个工作日，计算到下周末
    if (currentDay >= lastWorkDay) {
      const daysToNextWeek = 7 - currentDay + lastWorkDay;
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysToNextWeek);
      targetDate.setHours(23, 59, 59, 999);

      return this.formatDaysDiff(targetDate - now);
    }

    // 计算到本周最后一个工作日
    const daysToWeekend = lastWorkDay - currentDay;
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysToWeekend);
    targetDate.setHours(23, 59, 59, 999);

    return this.formatDaysDiff(targetDate - now);
  }

  /**
   * 计算距离假期
   * @param {Date} now 当前时间
   * @returns {string} 倒计时文本
   */
  static getTimeToHoliday(now = new Date()) {
    // 2026年法定节假日
    const holidays = [
      { name: '春节', date: new Date(2026, 1, 17) }, // 2026年2月17日（农历正月初一）
      { name: '清明节', date: new Date(2026, 3, 5) },
      { name: '劳动节', date: new Date(2026, 4, 1) },
      { name: '端午节', date: new Date(2026, 5, 19) },
      { name: '中秋节', date: new Date(2026, 8, 15) },
      { name: '国庆节', date: new Date(2026, 9, 1) }
    ];

    // 找到下一个节假日
    let nextHoliday = null;
    for (const holiday of holidays) {
      if (holiday.date > now) {
        nextHoliday = holiday;
        break;
      }
    }

    if (!nextHoliday) {
      // 如果今年没有了，返回明年春节
      nextHoliday = { name: '春节', date: new Date(2027, 0, 6) };
    }

    const days = Math.ceil((nextHoliday.date - now) / (1000 * 60 * 60 * 24));
    return `${days}天（${nextHoliday.name}）`;
  }

  /**
   * 格式化时间差（小时、分钟）
   * @param {number} milliseconds 毫秒数
   * @returns {string} 格式化文本
   */
  static formatTimeDiff(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}小时${minutes}分`;
    }
    return `${minutes}分钟`;
  }

  /**
   * 格式化天数差异
   * @param {number} milliseconds 毫秒数
   * @returns {string} 格式化文本
   */
  static formatDaysDiff(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);

    if (days > 0) {
      return `${days}天${hours}小时`;
    }

    return this.formatTimeDiff(milliseconds);
  }

  /**
   * 获取所有倒计时
   * @param {Object} config 用户配置
   * @param {Date} now 当前时间
   * @returns {Array<Object>} 倒计时数组
   */
  static getAllCountdowns(config, now = new Date()) {
    return [
      {
        icon: '☕',
        label: '距离休息',
        value: this.getTimeToNextRest(config.segments, now)
      },
      {
        icon: '🏠',
        label: '距离下班',
        value: this.getTimeToWorkEnd(config.segments, now)
      },
      {
        icon: '🎉',
        label: '距离周末',
        value: this.getTimeToWeekend(config.workdays, now)
      },
      {
        icon: '🏖️',
        label: '距离假期',
        value: this.getTimeToHoliday(now)
      }
    ];
  }
}

module.exports = CountdownCalculator;
