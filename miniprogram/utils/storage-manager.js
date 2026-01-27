/**
 * 数据存储模块
 * 管理用户配置和工作记录
 */

const STORAGE_KEYS = {
  USER_CONFIG: 'userConfig',
  WORK_RECORDS: 'workRecords',
  WISHES: 'wishes',
  ACTIVE_WISH: 'activeWish',
  HAS_SETUP: 'hasSetup',
  CURRENT_MODE: 'currentMode',
  TODAY_EARNINGS: 'todayEarnings',
  FIRST_WORK_DATE: 'firstWorkDate'
};

class StorageManager {
  /**
   * 保存用户配置
   * @param {Object} config {salary, workdays, segments}
   */
  static saveUserConfig(config) {
    try {
      wx.setStorageSync(STORAGE_KEYS.USER_CONFIG, config);
      return true;
    } catch (e) {
      console.error('保存用户配置失败:', e);
      return false;
    }
  }

  /**
   * 获取用户配置
   * @returns {Object|null}
   */
  static getUserConfig() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.USER_CONFIG);
    } catch (e) {
      console.error('获取用户配置失败:', e);
      return null;
    }
  }

  /**
   * 保存工作记录
   * @param {Object} record 工作记录对象
   */
  static saveWorkRecord(record) {
    try {
      const records = this.getWorkRecords();
      const today = this.getTodayKey();

      if (!records[today]) {
        records[today] = [];
      }

      records[today].push({
        ...record,
        timestamp: Date.now()
      });

      wx.setStorageSync(STORAGE_KEYS.WORK_RECORDS, records);
      return true;
    } catch (e) {
      console.error('保存工作记录失败:', e);
      return false;
    }
  }

  /**
   * 获取工作记录
   * @param {string} date 日期key (YYYY-MM-DD)，不传则返回所有
   * @returns {Object|Array}
   */
  static getWorkRecords(date = null) {
    try {
      const records = wx.getStorageSync(STORAGE_KEYS.WORK_RECORDS) || {};

      if (date) {
        return records[date] || [];
      }

      return records;
    } catch (e) {
      console.error('获取工作记录失败:', e);
      return date ? [] : {};
    }
  }

  /**
   * 获取今日工作记录
   */
  static getTodayRecords() {
    return this.getWorkRecords(this.getTodayKey());
  }

  /**
   * 保存愿望列表
   */
  static saveWishes(wishes) {
    try {
      wx.setStorageSync(STORAGE_KEYS.WISHES, wishes);
      return true;
    } catch (e) {
      console.error('保存愿望列表失败:', e);
      return false;
    }
  }

  /**
   * 获取愿望列表
   */
  static getWishes() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.WISHES) || [];
    } catch (e) {
      console.error('获取愿望列表失败:', e);
      return [];
    }
  }

  /**
   * 保存激活的愿望ID
   */
  static setActiveWish(wishId) {
    try {
      wx.setStorageSync(STORAGE_KEYS.ACTIVE_WISH, wishId);
      return true;
    } catch (e) {
      console.error('保存激活愿望失败:', e);
      return false;
    }
  }

  /**
   * 获取激活的愿望ID
   */
  static getActiveWish() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.ACTIVE_WISH);
    } catch (e) {
      console.error('获取激活愿望失败:', e);
      return null;
    }
  }

  /**
   * 保存当前模式
   */
  static setCurrentMode(mode) {
    try {
      wx.setStorageSync(STORAGE_KEYS.CURRENT_MODE, mode);
      return true;
    } catch (e) {
      console.error('保存当前模式失败:', e);
      return false;
    }
  }

  /**
   * 获取当前模式
   */
  static getCurrentMode() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.CURRENT_MODE) || 'normal';
    } catch (e) {
      console.error('获取当前模式失败:', e);
      return 'normal';
    }
  }

  /**
   * 更新愿望进度
   * @param {number} wishId 愿望ID
   * @param {number} amount 增加的金额
   * @param {Object} record 资金来源记录
   */
  static updateWishProgress(wishId, amount, record) {
    try {
      const wishes = this.getWishes();
      const wish = wishes.find(w => w.id === wishId);

      if (wish) {
        wish.currentAmount = (parseFloat(wish.currentAmount.replace(/,/g, '')) + amount).toFixed(2);
        wish.progress = Math.min(100, (parseFloat(wish.currentAmount) / parseFloat(wish.targetAmount.replace(/,/g, '')) * 100).toFixed(1));

        // 保存资金来源记录
        if (!wish.records) {
          wish.records = [];
        }
        wish.records.push(record);

        // 检查是否完成
        if (wish.progress >= 100) {
          wish.status = 'completed';
          wish.completedDate = this.getTodayKey();
        }

        this.saveWishes(wishes);
      }

      return true;
    } catch (e) {
      console.error('更新愿望进度失败:', e);
      return false;
    }
  }

  /**
   * 保存今日收入
   */
  static saveTodayEarnings(earnings) {
    try {
      const data = {
        date: this.getTodayKey(),
        ...earnings
      };
      wx.setStorageSync(STORAGE_KEYS.TODAY_EARNINGS, data);
      return true;
    } catch (e) {
      console.error('保存今日收入失败:', e);
      return false;
    }
  }

  /**
   * 获取今日收入
   */
  static getTodayEarnings() {
    try {
      const data = wx.getStorageSync(STORAGE_KEYS.TODAY_EARNINGS);
      const today = this.getTodayKey();

      // 如果不是今天的数据，返回初始值
      if (!data || data.date !== today) {
        return {
          total: 0,
          normal: 0,
          burnout: 0,
          slack: 0
        };
      }

      return data;
    } catch (e) {
      console.error('获取今日收入失败:', e);
      return {
        total: 0,
        normal: 0,
        burnout: 0,
        slack: 0
      };
    }
  }

  /**
   * 获取今日日期key (YYYY-MM-DD)
   */
  static getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 保存首次工作日期
   */
  static setFirstWorkDate(date) {
    try {
      wx.setStorageSync(STORAGE_KEYS.FIRST_WORK_DATE, date);
      return true;
    } catch (e) {
      console.error('保存首次工作日期失败:', e);
      return false;
    }
  }

  /**
   * 获取首次工作日期
   */
  static getFirstWorkDate() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.FIRST_WORK_DATE);
    } catch (e) {
      console.error('获取首次工作日期失败:', e);
      return null;
    }
  }

  /**
   * 清空所有数据
   */
  static clearAll() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        wx.removeStorageSync(key);
      });
      return true;
    } catch (e) {
      console.error('清空数据失败:', e);
      return false;
    }
  }
}

module.exports = {
  StorageManager,
  STORAGE_KEYS
};
