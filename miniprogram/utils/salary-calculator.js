/**
 * 工资计算核心工具类
 * 基于日历的动态秒薪计算
 */

class SalaryCalculator {
  /**
   * 计算指定月份的实际工作天数
   * @param {number} year 年份
   * @param {number} month 月份 (1-12)
   * @param {Array<number>} workdays 工作日数组 [0-6]，0=周日，1=周一...6=周六
   * @returns {number} 实际工作天数
   */
  static calculateWorkDaysInMonth(year, month, workdays) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workDayCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      if (workdays.includes(dayOfWeek)) {
        workDayCount++;
      }
    }

    return workDayCount;
  }

  /**
   * 计算每日工作总秒数
   * @param {Array<Object>} segments 工作时段数组 [{startTime, endTime}]
   * @returns {number} 每日工作总秒数
   */
  static calculateDailyWorkSeconds(segments) {
    let totalSeconds = 0;

    segments.forEach(segment => {
      const [startHour, startMinute] = segment.startTime.split(':').map(Number);
      const [endHour, endMinute] = segment.endTime.split(':').map(Number);

      const startSeconds = startHour * 3600 + startMinute * 60;
      const endSeconds = endHour * 3600 + endMinute * 60;

      totalSeconds += (endSeconds - startSeconds);
    });

    return totalSeconds;
  }

  /**
   * 计算本月秒薪
   * @param {number} monthlySalary 月薪
   * @param {number} workDaysInMonth 本月工作天数
   * @param {number} dailyWorkSeconds 每日工作秒数
   * @returns {number} 本月秒薪
   */
  static calculateSecondSalary(monthlySalary, workDaysInMonth, dailyWorkSeconds) {
    if (workDaysInMonth === 0 || dailyWorkSeconds === 0) {
      return 0;
    }

    const monthlyWorkSeconds = workDaysInMonth * dailyWorkSeconds;
    return monthlySalary / monthlyWorkSeconds;
  }

  /**
   * 获取当前完整配置并计算秒薪
   * @param {Object} config 用户配置 {salary, workdays, segments}
   * @returns {Object} 计算结果 {secondSalary, workDaysInMonth, dailyWorkSeconds}
   */
  static getCurrentMonthSalary(config) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const workDaysInMonth = this.calculateWorkDaysInMonth(year, month, config.workdays);
    const dailyWorkSeconds = this.calculateDailyWorkSeconds(config.segments);
    const secondSalary = this.calculateSecondSalary(
      parseFloat(config.salary),
      workDaysInMonth,
      dailyWorkSeconds
    );

    return {
      secondSalary,
      workDaysInMonth,
      dailyWorkSeconds,
      year,
      month
    };
  }

  /**
   * 判断当前时间是否在工作时段内
   * @param {Array<Object>} segments 工作时段数组
   * @param {Date} now 当前时间
   * @returns {Object|null} 返回当前时段对象或null
   */
  static getCurrentSegment(segments, now = new Date()) {
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    for (const segment of segments) {
      const [startHour, startMinute] = segment.startTime.split(':').map(Number);
      const [endHour, endMinute] = segment.endTime.split(':').map(Number);

      const startSeconds = startHour * 3600 + startMinute * 60;
      const endSeconds = endHour * 3600 + endMinute * 60;

      if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
        return segment;
      }
    }

    return null;
  }

  /**
   * 判断当前时间是否在休息间隙
   * @param {Array<Object>} segments 工作时段数组
   * @param {Date} now 当前时间
   * @returns {Object|null} 返回休息间隙对象或null
   */
  static getRestSegment(segments, now = new Date()) {
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const sortedSegments = [...segments].sort((a, b) => {
      const aStart = this.timeToSeconds(a.startTime);
      const bStart = this.timeToSeconds(b.startTime);
      return aStart - bStart;
    });

    for (let i = 0; i < sortedSegments.length - 1; i++) {
      const currentEnd = this.timeToSeconds(sortedSegments[i].endTime);
      const nextStart = this.timeToSeconds(sortedSegments[i + 1].startTime);

      if (currentSeconds >= currentEnd && currentSeconds < nextStart) {
        return {
          startTime: sortedSegments[i].endTime,
          endTime: sortedSegments[i + 1].startTime,
          name: '休息时间'
        };
      }
    }

    return null;
  }

  /**
   * 时间字符串转秒数
   */
  static timeToSeconds(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 3600 + minute * 60;
  }

  /**
   * 秒数转时间字符串
   */
  static secondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * 判断今天是否是工作日
   * @param {Array<number>} workdays 工作日数组
   * @param {Date} date 日期
   * @returns {boolean}
   */
  static isWorkDay(workdays, date = new Date()) {
    const dayOfWeek = date.getDay();
    return workdays.includes(dayOfWeek);
  }

  /**
   * 计算今日已工作秒数
   * @param {Array<Object>} segments 工作时段
   * @param {Array<Object>} workRecords 今日工作记录
   * @returns {number} 已工作秒数
   */
  static calculateTodayWorkedSeconds(segments, workRecords) {
    // 实现根据工作记录计算已工作秒数的逻辑
    // 这里先返回一个简单实现
    const now = new Date();
    let totalSeconds = 0;

    segments.forEach(segment => {
      const [startHour, startMinute] = segment.startTime.split(':').map(Number);
      const [endHour, endMinute] = segment.endTime.split(':').map(Number);

      const segmentStart = new Date(now);
      segmentStart.setHours(startHour, startMinute, 0, 0);

      const segmentEnd = new Date(now);
      segmentEnd.setHours(endHour, endMinute, 0, 0);

      if (now >= segmentStart) {
        if (now <= segmentEnd) {
          // 当前在这个时段内
          totalSeconds += (now - segmentStart) / 1000;
        } else {
          // 这个时段已经结束
          totalSeconds += (segmentEnd - segmentStart) / 1000;
        }
      }
    });

    return Math.floor(totalSeconds);
  }
}

module.exports = SalaryCalculator;
