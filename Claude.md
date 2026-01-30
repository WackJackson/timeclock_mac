# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
工作时薪观察器 (Work Hourly Wage Observer) - A WeChat mini-program that helps users track real-time work earnings, supports multiple work modes, and manages savings goals.

**Tech Stack:**
- WeChat Mini-Program native framework (not React/Vue)
- TDesign WeChat Mini-Program component library
- JavaScript (ES6+, no TypeScript in actual code despite devDependencies)
- Local storage via `wx.setStorageSync/getStorageSync`

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# Build npm packages (required after npm install or when adding new packages)
# Must be done in WeChat DevTools: Tools -> Build npm
```

### Testing
Open the project in WeChat Developer Tools (微信开发者工具):
1. Import project directory: `/Users/zhangyafei1/WeChatProjects/miniprogram-1`
2. Click "Compile" button to preview
3. Use simulator or real device preview via QR code

**Important:** This is a WeChat mini-program, so there's no `npm start`, `npm test`, or `npm run build` commands. All development happens in WeChat DevTools.

## Architecture

### File Structure
```
miniprogram/
├── pages/                    # Page components (WXML + WXSS + JS + JSON per page)
│   ├── home/                 # Real-time earnings display
│   ├── savings/              # Savings goals list
│   ├── wish-detail/          # Individual savings goal detail
│   ├── profile/              # User settings and statistics
│   └── setup/                # First-time setup wizard
├── utils/                    # Core business logic utilities
│   ├── storage-manager.js    # Centralized local storage management
│   ├── salary-calculator.js  # Wage calculation based on calendar
│   ├── countdown-calculator.js # Work segment countdowns
│   └── util.js              # General utilities
├── app.js                    # App entry point and lifecycle
├── app.json                  # Global config (pages, tabBar, components)
└── app.wxss                  # Global styles
```

### Core Architecture Patterns

#### 1. Central Storage Manager (`utils/storage-manager.js`)
All data persistence goes through `StorageManager` class. **Never** call `wx.setStorageSync` directly from pages.

**Key storage keys:**
- `userConfig` - User's salary, workdays, work segments
- `workRecords` - Daily work records by date (YYYY-MM-DD)
- `wishes` - Array of savings goals
- `activeWish` - ID of currently active savings goal
- `currentMode` - Current work mode (normal/burnout/slack)
- `todayEarnings` - Today's earnings breakdown by mode

**Critical methods:**
- `updateWishProgress(wishId, amount, record)` - Updates wish progress and auto-activates next wish when completed
- `getTodayEarnings()` / `getWeekEarnings()` / `getMonthEarnings()` - Multi-dimension earnings aggregation

#### 2. Salary Calculation System (`utils/salary-calculator.js`)
Dynamic second-based salary calculation based on actual calendar workdays.

**Flow:**
1. Calculate workdays in current month based on user's selected workdays (Mon-Sun)
2. Calculate daily work seconds from user's segments (e.g., 09:00-12:00, 14:00-18:00)
3. Compute second salary: `monthlySalary / (workDaysInMonth × dailyWorkSeconds)`

**Key methods:**
- `getCurrentMonthSalary(config)` - Returns secondSalary for current month
- `getCurrentSegment(segments, now)` - Returns current work segment or null
- `calculateTodayWorkedSeconds(segments, breaks)` - How many seconds worked today

#### 3. Real-time Earnings Update (`pages/home/home.js`)
**Timer pattern:**
- Main timer: 1-second interval updates all data
- Auto-saves earnings every 10 seconds
- Updates active wish progress incrementally
- Lifecycle: Clear timer in `onHide()` and `onUnload()`

**Earnings flow:**
```
updateAll() -> updateEarnings() -> updateActiveWishProgress()
                                -> saveCurrentEarnings()
```

#### 4. Wishes Auto-Activation System
**Rules:**
1. When creating new wish: If no active wish exists, auto-activate new one
2. When wish reaches 100%: Clear active status, find oldest waiting wish by `createdDate`, auto-activate it
3. Wishes list sorted by `createdDate` DESC (newest first)

**Implementation:** `storage-manager.js` line 215-235

#### 5. Multi-Dimension Progress (`pages/home/home.js`)
Three dimension tabs: day/week/month

**Pattern:**
- Each dimension has different `progressStartLabel`, `progressEndLabel`, `currentProgressLabel`
- Day: Shows time (e.g., "09:00", "18:00", "14:35")
- Week: Shows weekday (e.g., "周一", "周五", "周三")
- Month: Shows date (e.g., "1号", "31号", "15号")

**Critical:** Always call `updateProgressByDimension(dimension)` instead of removed `updateProgress()` method.

### WeChat Mini-Program Specifics

#### Page Lifecycle
```javascript
onLoad(options)   // Page initialization, receives navigation params
onShow()          // Page becomes visible (start timers here)
onHide()          // Page hidden (clear timers here)
onUnload()        // Page destroyed (cleanup resources here)
```

**Timer management pattern:**
```javascript
onShow() {
  this.data.refreshTimer = setInterval(() => {
    this.loadData();
  }, 2000);
},

onHide() {
  if (this.data.refreshTimer) {
    clearInterval(this.data.refreshTimer);
    this.data.refreshTimer = null;
  }
}
```

#### Data Binding
Use `this.setData({...})` to update UI. Direct assignment to `this.data` won't trigger re-render.

#### Navigation
```javascript
wx.navigateTo({ url: '/pages/wish-detail/wish-detail?id=123' })  // Push with back button
wx.redirectTo({ url: '/pages/home/home' })  // Replace current page
wx.navigateBack()  // Go back
```

#### Component Usage (TDesign)
Global components registered in `app.json`:
- `<t-button>`, `<t-input>`, `<t-tag>`, `<t-progress>`, `<t-tabs>`, `<t-tab-panel>`, etc.

Page-specific components registered in page's `.json` file.

## Common Development Patterns

### Adding a New Savings Wish
1. Create wish object with `id`, `name`, `emoji`, `targetAmount`, `createdDate`
2. Call `StorageManager.saveWishes(wishes)`
3. If no active wish, call `StorageManager.setActiveWish(newId)`
4. UI auto-refreshes via 2-second timer

### Modifying Data Structures
**Important:** Amount fields are stored as both `number` and `string` (historical inconsistency).
Always handle both:
```javascript
const amount = typeof value === 'number'
  ? value
  : parseFloat((value || '0').toString().replace(/,/g, ''));
```

### Adding New Work Modes
Currently: `normal`, `burnout`, `slack`
1. Update mode stats in `StorageManager.getTodayEarnings()`
2. Add mode display in `pages/home/home.wxml` and `home.js`
3. Update `formatRecords()` in `wish-detail.js` for mode aggregation
4. Add corresponding gradient colors in WXSS

## Critical Bugs to Avoid

1. **Don't update completed wishes:** Check `wish.status === 'completed' || wish.progress >= 100` before updating
2. **Clear timers:** Always clear intervals in `onHide()`/`onUnload()`
3. **Use StorageManager:** Never call `wx.setStorageSync()` directly from pages
4. **Dimension-aware progress:** Use `updateProgressByDimension()`, not removed `updateProgress()`
5. **Type-safe amounts:** Always handle both number and string types for amount fields

## Data Persistence Notes
- All data stored locally via WeChat's sync storage API
- No backend server, no API calls
- Data persists across app restarts
- Storage keys defined in `utils/storage-manager.js` STORAGE_KEYS constant

## Recent Changes (Reference Only)

### 2026-01-30: Savings Features and Progress Bug Fix (Commit f2972d1)
- Added custom emoji input for savings wishes (removed last preset emoji 🥁)
- Wishes now sorted by `createdDate` DESC (newest first)
- Auto-activation: New wish activates if no active wish exists
- Auto-activation: Completed wish triggers activation of oldest waiting wish
- Added 2-second refresh timers to savings pages
- Fixed day dimension progress indicator showing `--:--` on first load

## Data Structures (Key Types)

### Wish Object
```javascript
{
  id: number,
  name: string,
  emoji: string,
  color: string,              // CSS gradient
  currentAmount: number,      // Can also be string (handle both!)
  targetAmount: number,       // Can also be string (handle both!)
  progress: number,           // 0-100
  status: string,             // 'waiting' | 'active' | 'completed'
  createdDate: string,        // 'YYYY-MM-DD'
  completedDate: string,      // 'YYYY-MM-DD' (optional)
  records: Array<Record>      // Funding source records
}
```

### Funding Record
```javascript
{
  date: string,              // 'YYYY-MM-DD'
  segmentName: string,       // e.g., '上午工作'
  mode: string,              // 'normal' | 'burnout' | 'slack'
  amount: string,
  timestamp: number
}
```

### User Config
```javascript
{
  salary: string,            // Monthly salary
  workdays: Array<number>,   // [1, 2, 3, 4, 5] = Mon-Fri, 0 = Sun, 6 = Sat
  segments: Array<{
    name: string,
    startTime: string,       // 'HH:mm'
    endTime: string          // 'HH:mm'
  }>,
  hourlyRate: number         // Computed: salary / (workdays * segments)
}
```
