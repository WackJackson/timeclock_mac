Page({
  data: {
    authorEmoji: '🦹🏿‍♂️',
    wechatId: 'WackJackson'
  },

  // 复制微信号
  copyWechatId() {
    wx.setClipboardData({
      data: this.data.wechatId,
      success: () => {
        wx.showToast({
          title: '微信号已复制',
          icon: 'success'
        });
      }
    });
  }
});
