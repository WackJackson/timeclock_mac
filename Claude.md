# 工作时薪观察器 - 开发记录

## 项目概述
这是一个微信小程序项目，帮助用户实时观察自己的工作时薪收益，支持多种工作模式和攒钱愿望管理。

## 核心功能模块

### 1. 时薪页面 (home)
- 实时计算和显示秒薪、今日收入
- 支持三种工作模式：普通模式、燃尽模式、摸鱼模式
- 多维度进度展示：日、周、月维度
- 工作时段管理和倒计时
- 自动保存收入数据到激活的攒钱愿望

### 2. 攒钱功能 (savings + wish-detail)
- 愿望列表管理：创建、查看、删除愿望
- 自定义愿望图标（支持预设emoji + 自定义输入）
- 愿望详情页：三色进度条、资金来源统计、完成预测
- 自动激活机制：新建时自动激活、完成后自动激活下一个
- 按创建时间倒序显示
- 定时刷新（2秒间隔）

### 3. 数据存储 (storage-manager)
- 用户配置：时薪、工作日、时段设置
- 工作记录：按日期存储收入记录
- 愿望数据：愿望列表、激活状态、资金来源记录
- 收入统计：日/周/月维度的收入汇总

## 最近更新 (2026-01-29)

### Commit: f2972d1 - 优化攒钱功能和修复进度显示bug

**攒钱列表页优化：**
1. **自定义emoji输入**
   - 移除最后一个预设emoji（🥁）
   - 新增自定义输入框，支持用户输入任意emoji
   - 文件：`miniprogram/pages/savings/savings.js`、`savings.wxml`、`savings.wxss`

2. **列表排序和显示**
   - 按创建时间倒序排列（最新的在最上面）
   - 添加定时刷新机制，每2秒自动刷新数据
   - 实现 onShow/onHide/onUnload 生命周期管理

3. **智能激活机制**
   - 新建愿望时：如果当前没有进行中的任务，自动激活新任务
   - 修改逻辑：从"第一个愿望自动激活"改为"无激活任务时自动激活"

**愿望详情页优化：**
1. **定时刷新**
   - 添加2秒定时刷新，实时显示进度变化
   - 生命周期管理防止内存泄漏

**存储管理优化：**
1. **自动激活下一个任务**
   - 文件：`miniprogram/utils/storage-manager.js`
   - 当愿望完成（进度≥100%）时：
     - 清除当前激活状态
     - 查找等待中的愿望（按创建时间正序）
     - 自动激活最早创建的等待中任务

**时薪页面bug修复：**
1. **修复日维度进度指示器显示问题**
   - 文件：`miniprogram/pages/home/home.js`
   - 问题：首次进入日维度时显示 `--:--`，需切换维度后才正常
   - 原因：`updateAll()` 调用的 `updateProgress()` 方法不更新 `currentProgressLabel`
   - 解决：将 `updateProgress()` 改为 `updateProgressByDimension(this.data.dimensionTab)`
   - 删除不再使用的 `updateProgress()` 方法

## 技术要点

### 进度计算逻辑
- 日维度：当前时间 vs 工作时段范围
- 周维度：本周已工作天数 vs 本周总工作天数
- 月维度：本月已工作天数 vs 本月总工作天数

### 三色进度条
- 蓝色：普通模式收入占比
- 橙色：燃尽模式收入占比
- 绿色：摸鱼模式收入占比
- 渐变效果增强视觉体验

### 定时器管理
- 时薪页面：每秒更新一次
- 攒钱相关页面：每2秒刷新一次
- 生命周期钩子：onHide/onUnload 时清除定时器

### 数据类型处理
- 金额字段兼容 number 和 string 类型
- 使用 `typeof` 检查 + `parseFloat()` 转换
- 格式化显示使用千分位分隔符

## 数据结构

### 愿望对象结构
```javascript
{
  id: number,              // 愿望ID
  name: string,            // 愿望名称
  emoji: string,           // 图标
  color: string,           // 渐变色
  currentAmount: number,   // 当前金额
  targetAmount: number,    // 目标金额
  progress: number,        // 进度百分比
  status: string,          // 状态：waiting/active/completed
  createdDate: string,     // 创建日期 YYYY-MM-DD
  completedDate: string,   // 完成日期
  records: Array           // 资金来源记录
}
```

### 资金来源记录结构
```javascript
{
  date: string,           // 日期 YYYY-MM-DD
  segmentName: string,    // 时段名称
  mode: string,           // 模式：normal/burnout/slack
  amount: string,         // 金额
  timestamp: number       // 时间戳
}
```

## 待优化项
- [ ] 愿望编辑功能（当前仅有删除）
- [ ] 资金来源详细记录查看
- [ ] 历史数据图表展示
- [ ] 导出数据功能
