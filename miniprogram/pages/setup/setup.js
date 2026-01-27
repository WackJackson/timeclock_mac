Page({
  data: {
    step: 1,
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
    hasRestSegment: true,
    nextSegmentId: 3
  },

  onLoad() {
    // 检查是否已经完成过设置
    const hasSetup = wx.getStorageSync('hasSetup');
    if (hasSetup) {
      // 已完成设置,跳转到首页
      wx.switchTab({
        url: '/pages/home/home'
      });
    }
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
    });
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

    // 保存设置到本地存储
    wx.setStorageSync('userConfig', this.data.formData);
    wx.setStorageSync('hasSetup', true);

    wx.showToast({
      title: '设置完成',
      icon: 'success'
    });

    // 跳转到首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/home/home'
      });
    }, 1500);
  }
});
