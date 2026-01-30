const { StorageManager } = require('../../utils/storage-manager.js');

Page({
  data: {
    step: 1,
    isEditMode: false,
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
      ]
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
    const targetStep = options && options.step ? parseInt(options.step) : 1;

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
    } else {
      // 编辑模式：加载已有配置
      const config = StorageManager.getUserConfig();
      if (config) {
        // 更新weekdays的selected状态
        const weekdays = this.data.weekdays.map(day => ({
          ...day,
          selected: config.workdays.includes(day.value)
        }));

        this.setData({
          formData: config,
          weekdays: weekdays,
          isEditMode: true,
          step: targetStep // 跳转到指定步骤
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

  // 添加时段
  addSegment() {
    const newSegment = {
      id: this.data.nextSegmentId,
      type: 'work',
      name: '工作时段',
      startTime: '09:00',
      endTime: '18:00'
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

  // 验证步骤
  validateStep() {
    const { step, formData } = this.data;

    if (step === 1) {
      if (!formData.salary || parseFloat(formData.salary) <= 0) {
        wx.showToast({
          title: '请输入有效的月薪',
          icon: 'none'
        });
        return false;
      }
    }

    if (step === 2) {
      if (formData.workdays.length === 0) {
        wx.showToast({
          title: '请至少选择一个工作日',
          icon: 'none'
        });
        return false;
      }
    }

    if (step === 3) {
      if (formData.segments.length === 0) {
        wx.showToast({
          title: '请至少添加一个工作时段',
          icon: 'none'
        });
        return false;
      }
    }

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
      // 只有首次设置时才保存首次工作日期
      if (!this.data.isEditMode) {
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
  }
});
