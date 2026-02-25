const { StorageManager } = require('../../utils/storage-manager.js');

Page({
  data: {
    step: -1, // -1: 欢迎页, 0-3: 设置步骤
    isEditMode: false,
    isLogging: false,
    formData: {
      salary: '15000',
      workdays: [1, 2, 3, 4, 5], // 0-6 表示周日到周六
      segments: [
        {
          id: 1,
          type: 'work',
          name: '上午搬砖',
          startTime: '09:00',
          endTime: '12:00'
        },
        {
          id: 2,
          type: 'work',
          name: '下午搬砖',
          startTime: '14:00',
          endTime: '18:00'
        }
      ],
      firstWorkDate: (() => {
        // 默认为今天的年月
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      })()
    },
    weekdays: [
      { label: '一', value: 1, selected: true },
      { label: '二', value: 2, selected: true },
      { label: '三', value: 3, selected: true },
      { label: '四', value: 4, selected: true },
      { label: '五', value: 5, selected: true },
      { label: '六', value: 6, selected: false },
      { label: '日', value: 0, selected: false }
    ],
    displaySegments: [], // 用于显示的时段列表（包含工作和休息）
    nextSegmentId: 3
  },

  onLoad(options) {
    // 检查是否是编辑模式
    const isEdit = options && options.edit === 'true';
    const targetStep = options && options.step ? parseInt(options.step) : 0;

    if (!isEdit) {
      // 非编辑模式：检查是否已经完成过设置
      const hasSetup = wx.getStorageSync('hasSetup');
      if (hasSetup) {
        // 已完成设置,跳转到首页
        wx.switchTab({
          url: '/pages/home/home'
        });
        return;
      }
      // 首次设置，从欢迎页（步骤-1）开始
      this.setData({ step: -1 });

      // 首次设置模式：隐藏左上角的home按钮
      if (wx.hideHomeButton) {
        wx.hideHomeButton();
      }
    } else {
      // 编辑模式：直接跳转到指定步骤
      this.setData({ step: targetStep, isEditMode: true });

      // 加载已有配置
      const config = StorageManager.getUserConfig();
      if (config) {
        // 更新weekdays的selected状态
        const weekdays = this.data.weekdays.map(day => ({
          ...day,
          selected: config.workdays.includes(day.value)
        }));

        // 加载首次工作日期
        const firstWorkDate = StorageManager.getFirstWorkDate();
        // 如果是完整日期格式（YYYY-MM-DD），提取年月
        let firstWorkYearMonth = '';
        if (firstWorkDate) {
          const parts = firstWorkDate.split('-');
          firstWorkYearMonth = `${parts[0]}-${parts[1]}`;
        } else if (targetStep === 3) {
          // 如果是编辑工龄且没有设置过，默认为今天的年月
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          firstWorkYearMonth = `${year}-${month}`;
        }

        this.setData({
          formData: {
            ...config,
            firstWorkDate: firstWorkYearMonth
          },
          weekdays: weekdays
        });
      }
    }

    // 初始化显示时段列表
    this.updateRestSegments();
  },

  // 月薪输入
  onSalaryInput(e) {
    this.setData({
      'formData.salary': e.detail.value
    });
  },

  // 切换工作日
  toggleWeekday(e) {
    const value = e.currentTarget.dataset.value;
    const weekdays = this.data.weekdays.map(day => {
      if (day.value === value) {
        return { ...day, selected: !day.selected };
      }
      return day;
    });

    const selectedDays = weekdays.filter(day => day.selected).map(day => day.value);

    this.setData({
      weekdays,
      'formData.workdays': selectedDays
    });
  },

  // 首次工作日期选择
  onFirstWorkDateChange(e) {
    this.setData({
      'formData.firstWorkDate': e.detail.value
    });
  },

  // 时段名称输入
  onSegmentNameInput(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    const segments = this.data.formData.segments.map(seg => {
      if (seg.id === id) {
        return { ...seg, name: value };
      }
      return seg;
    });

    this.setData({
      'formData.segments': segments
    });
  },

  // 时段时间变更
  onSegmentTimeChange(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    const value = e.detail.value;

    const segments = this.data.formData.segments.map(seg => {
      if (seg.id === id) {
        if (type === 'start') {
          return { ...seg, startTime: value };
        } else {
          return { ...seg, endTime: value };
        }
      }
      return seg;
    });

    this.setData({
      'formData.segments': segments
    }, () => {
      // 时间变更后重新计算休息间隙
      this.updateRestSegments();
    });
  },

  // 更新休息间隙显示
  updateRestSegments() {
    const workSegments = this.data.formData.segments;

    // 按开始时间排序工作时段
    const sortedWorkSegments = [...workSegments].sort((a, b) => {
      const aStart = this.timeToMinutes(a.startTime);
      const bStart = this.timeToMinutes(b.startTime);
      return aStart - bStart;
    });

    // 生成包含休息时段的完整列表
    const displaySegments = [];
    for (let i = 0; i < sortedWorkSegments.length; i++) {
      // 添加工作时段
      displaySegments.push(sortedWorkSegments[i]);

      // 检查与下一个工作时段之间是否有间隙
      if (i < sortedWorkSegments.length - 1) {
        const currentEnd = this.timeToMinutes(sortedWorkSegments[i].endTime);
        const nextStart = this.timeToMinutes(sortedWorkSegments[i + 1].startTime);

        // 如果间隙大于0分钟，添加休息时段
        if (nextStart > currentEnd) {
          displaySegments.push({
            id: `rest-${i}`,
            type: 'rest',
            name: '休息时段',
            startTime: sortedWorkSegments[i].endTime,
            endTime: sortedWorkSegments[i + 1].startTime
          });
        }
      }
    }

    this.setData({
      displaySegments: displaySegments
    });
  },

  // 时间字符串转分钟数
  timeToMinutes(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
  },

  // 分钟数转时间字符串
  minutesToTime(minutes) {
    // 处理超过24小时的情况
    const totalMinutes = minutes % 1440; // 1440 = 24 * 60
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  },

  // 添加时段
  addSegment() {
    // 找到最后一个工作时段的结束时间
    const sortedSegments = [...this.data.formData.segments].sort((a, b) => {
      const aStart = this.timeToMinutes(a.startTime);
      const bStart = this.timeToMinutes(b.startTime);
      return aStart - bStart;
    });

    let newStartTime = '09:00';
    let newEndTime = '12:00';

    if (sortedSegments.length > 0) {
      const lastSegment = sortedSegments[sortedSegments.length - 1];
      const lastEndMinutes = this.timeToMinutes(lastSegment.endTime);

      // 开始时间 = 最后结束时间 + 1小时（60分钟）
      const newStartMinutes = lastEndMinutes + 60;
      // 结束时间 = 开始时间 + 3小时（180分钟）
      const newEndMinutes = newStartMinutes + 180;

      newStartTime = this.minutesToTime(newStartMinutes);
      newEndTime = this.minutesToTime(newEndMinutes);
    }

    const newSegment = {
      id: this.data.nextSegmentId,
      type: 'work',
      name: '工作时段',
      startTime: newStartTime,
      endTime: newEndTime
    };

    this.setData({
      'formData.segments': [...this.data.formData.segments, newSegment],
      nextSegmentId: this.data.nextSegmentId + 1
    }, () => {
      // 添加后重新计算休息间隙
      this.updateRestSegments();
    });
  },

  // 删除时段
  deleteSegment(e) {
    const id = e.currentTarget.dataset.id;
    const segments = this.data.formData.segments.filter(seg => seg.id !== id);

    if (segments.length === 0) {
      wx.showToast({
        title: '至少保留一个工作时段',
        icon: 'none'
      });
      return;
    }

    this.setData({
      'formData.segments': segments
    }, () => {
      // 删除后重新计算休息间隙
      this.updateRestSegments();
    });
  },

  // 下一步
  nextStep() {
    // 欢迎页直接进入设置（步骤-1 -> 步骤0）
    if (this.data.step === -1) {
      this.setData({ step: 0 });
      return;
    }

    // 验证当前步骤
    if (!this.validateStep()) {
      return;
    }

    if (this.data.step < 3) {
      this.setData({
        step: this.data.step + 1
      });
    }
  },

  // 上一步
  prevStep() {
    if (this.data.step > 0) {
      this.setData({
        step: this.data.step - 1
      });
    } else if (this.data.step === 0) {
      // 返回欢迎页
      this.setData({ step: -1 });
    }
  },

  // 验证步骤
  validateStep() {
    const { step, formData } = this.data;

    if (step === 0) {
      if (!formData.salary || parseFloat(formData.salary) <= 0) {
        wx.showToast({
          title: '请输入有效的月薪',
          icon: 'none'
        });
        return false;
      }
    }

    if (step === 1) {
      if (formData.workdays.length === 0) {
        wx.showToast({
          title: '请至少选择一个工作日',
          icon: 'none'
        });
        return false;
      }
    }

    if (step === 2) {
      if (formData.segments.length === 0) {
        wx.showToast({
          title: '请至少添加一个工作时段',
          icon: 'none'
        });
        return false;
      }
    }

    // 步骤3工龄设置是可选的，不需要验证

    return true;
  },

  // 完成设置
  completeSetup() {
    if (!this.validateStep()) {
      return;
    }

    // 使用存储管理器保存配置
    const success = StorageManager.saveUserConfig(this.data.formData);

    if (success) {
      // 保存首次工作日期（如果用户设置了）
      if (this.data.formData.firstWorkDate) {
        const fullDate = `${this.data.formData.firstWorkDate}-01`; // 追加日期
        StorageManager.setFirstWorkDate(fullDate);
      } else if (!this.data.isEditMode) {
        // 首次设置且未填写工龄时，使用今天作为首次工作日期
        const today = StorageManager.getTodayKey();
        const existingFirstWorkDate = StorageManager.getFirstWorkDate();
        if (!existingFirstWorkDate) {
          StorageManager.setFirstWorkDate(today);
        }
      }

      wx.setStorageSync('hasSetup', true);

      wx.showToast({
        title: this.data.isEditMode ? '修改成功' : '设置完成',
        icon: 'success'
      });

      // 跳转到首页或返回上一页
      setTimeout(() => {
        if (this.data.isEditMode) {
          wx.navigateBack();
        } else {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }
      }, 1500);
    } else {
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 编辑模式保存
  saveEdit() {
    // 验证当前步骤的数据
    if (!this.validateStep()) {
      return;
    }

    // 如果是第3步（工龄设置），只保存首次工作日期
    if (this.data.step === 3) {
      const firstWorkDate = this.data.formData.firstWorkDate;
      // 转换为完整日期格式（补充01作为日）
      const fullDate = `${firstWorkDate}-01`;
      StorageManager.setFirstWorkDate(fullDate);

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 其他步骤保存完整配置
    const success = StorageManager.saveUserConfig(this.data.formData);

    if (success) {
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } else {
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 从欢迎页登录
  async handleLoginFromWelcome() {
    this.setData({ isLogging: true });

    try {
      // 调用云函数登录
      const cloudResult = await wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName: '微信用户',
          avatarUrl: ''
        }
      });

      if (cloudResult.result.success) {
        const userInfo = {
          isLogin: true,
          nickName: '微信用户',
          avatarUrl: '',
          openid: cloudResult.result.openid
        };

        StorageManager.saveUserInfo(userInfo);

        // 保存到全局数据
        const app = getApp();
        app.globalData.openid = cloudResult.result.openid;

        // 检查是否有云端数据
        await this.syncCloudData(userInfo);

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        this.setData({ isLogging: false });
      } else {
        throw new Error(cloudResult.result.error || '登录失败');
      }
    } catch (err) {
      this.setData({ isLogging: false });
      console.error('登录失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }
  },

  // 同步云端数据
  async syncCloudData(userInfo) {
    try {
      // 尝试从云端下载数据
      const result = await StorageManager.downloadFromCloud();

      if (result.success && result.hasData) {
        // 数据已经在 downloadFromCloud 中恢复了
        // 设置 hasSetup 为 true，这样可以跳过首页的设置检查
        wx.setStorageSync('hasSetup', true);

        // 有云端数据，恢复数据到本地
        wx.showModal({
          title: '恢复数据',
          content: '检测到您在云端保存了数据，是否恢复？',
          confirmText: '恢复',
          cancelText: '跳过',
          success: (res) => {
            if (res.confirm) {
              // 跳转到首页
              wx.switchTab({
                url: '/pages/home/home'
              });
            } else {
              // 跳过恢复，删除已恢复的数据，开始设置
              wx.setStorageSync('hasSetup', false);
              this.setData({ step: 0 });
            }
          }
        });
      } else {
        // 没有云端数据，直接开始设置
        this.setData({ step: 0 });
      }
    } catch (err) {
      console.error('同步云端数据失败:', err);
      // 同步失败，直接开始设置
      this.setData({ step: 0 });
    }
  }
});
