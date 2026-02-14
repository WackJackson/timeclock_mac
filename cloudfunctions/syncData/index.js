// 云函数：数据同步
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'timebomp-2g4siacf47b7e567',
  traceUser: true
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;

  try {
    const openid = wxContext.OPENID;

    // 🚨 加强验证：检查所有无效的 openid
    if (!openid || openid === 'undefined' || openid === 'null' || openid.trim() === '') {
      console.error('无效的 openid:', openid, 'type:', typeof openid);
      return {
        success: false,
        error: '用户未登录或 openid 无效，无法同步数据',
        code: 'INVALID_OPENID'
      };
    }

    switch (action) {
      case 'upload':
        // 上传本地数据到云端
        return await uploadData(openid, data);

      case 'download':
        // 下载云端数据到本地
        return await downloadData(openid);

      case 'sync':
        // 智能同步（合并数据）
        return await syncData(openid, data);

      default:
        return {
          success: false,
          error: '未知的操作类型'
        };
    }
  } catch (err) {
    console.error('数据同步失败:', err);
    return {
      success: false,
      error: err.message,
      errorDetail: err
    };
  }
};

// 上传数据
async function uploadData(openid, localData) {
  try {
    // 验证 openid
    if (!openid || openid === 'undefined' || openid === 'null') {
      throw new Error('无效的 openid');
    }

    // 查询用户数据记录（按 openid 查询）
    const userDataQuery = await db.collection('user_data').where({
      _openid: openid
    }).limit(1).get();

    const now = new Date();
    const syncData = {
      userConfig: localData.userConfig || null,
      workRecords: localData.workRecords || {},
      wishes: localData.wishes || [],
      activeWish: localData.activeWish || null,
      todayEarnings: localData.todayEarnings || {},
      todayEarningsHistory: localData.todayEarningsHistory || {},
      firstWorkDate: localData.firstWorkDate || null,
      currentMode: localData.currentMode || 'normal',
      lastSyncTime: now,
      updateTime: now
    };

    if (userDataQuery.data.length === 0) {
      // 首次上传，创建记录
      await db.collection('user_data').add({
        data: {
          _openid: openid,  // 🔑 手动添加 _openid
          ...syncData,
          createTime: now
        }
      });
    } else {
      // 更新现有记录
      await db.collection('user_data').doc(userDataQuery.data[0]._id).update({
        data: syncData
      });
    }

    return {
      success: true,
      message: '数据上传成功',
      syncTime: now
    };
  } catch (err) {
    throw new Error('上传数据失败: ' + err.message);
  }
}

// 下载数据
async function downloadData(openid) {
  try {
    // 验证 openid
    if (!openid || openid === 'undefined' || openid === 'null') {
      throw new Error('无效的 openid');
    }

    // 查询用户数据记录（按 openid 查询）
    const userDataQuery = await db.collection('user_data').where({
      _openid: openid
    }).limit(1).get();

    if (userDataQuery.data.length === 0) {
      return {
        success: true,
        hasData: false,
        message: '云端暂无数据'
      };
    }

    const cloudData = userDataQuery.data[0];

    return {
      success: true,
      hasData: true,
      data: {
        userConfig: cloudData.userConfig,
        workRecords: cloudData.workRecords,
        wishes: cloudData.wishes,
        activeWish: cloudData.activeWish,
        todayEarnings: cloudData.todayEarnings,
        todayEarningsHistory: cloudData.todayEarningsHistory,
        firstWorkDate: cloudData.firstWorkDate,
        currentMode: cloudData.currentMode,
        lastSyncTime: cloudData.lastSyncTime
      },
      message: '数据下载成功'
    };
  } catch (err) {
    throw new Error('下载数据失败: ' + err.message);
  }
}

// 智能同步（合并策略）
async function syncData(openid, localData) {
  try {
    // 验证 openid
    if (!openid || openid === 'undefined' || openid === 'null') {
      throw new Error('无效的 openid');
    }

    // 查询用户数据记录（按 openid 查询）
    const userDataQuery = await db.collection('user_data').where({
      _openid: openid
    }).limit(1).get();

    if (userDataQuery.data.length === 0) {
      // 云端无数据，直接上传本地数据
      return await uploadData(openid, localData);
    }

    const cloudData = userDataQuery.data[0];
    const now = new Date();

    // 合并策略：
    // 1. userConfig: 使用最新的（比较updateTime）
    // 2. workRecords: 合并（本地+云端）
    // 3. wishes: 合并（去重，按createdDate排序）
    // 4. todayEarningsHistory: 合并（本地+云端）
    // 5. firstWorkDate: 取最早的
    // 6. currentMode: 使用本地的（最新状态）

    const mergedData = {
      // 用户配置：使用本地的（假设本地是最新的）
      userConfig: localData.userConfig || cloudData.userConfig,

      // 工作记录：合并
      workRecords: mergeObjects(localData.workRecords || {}, cloudData.workRecords || {}),

      // 愿望列表：合并去重
      wishes: mergeWishes(localData.wishes || [], cloudData.wishes || []),

      // 当前激活愿望：使用本地的
      activeWish: localData.activeWish || cloudData.activeWish,

      // 今日收入：使用本地的（最新）
      todayEarnings: localData.todayEarnings || cloudData.todayEarnings,

      // 收入历史：合并
      todayEarningsHistory: mergeObjects(
        localData.todayEarningsHistory || {},
        cloudData.todayEarningsHistory || {}
      ),

      // 首次工作日期：取最早的
      firstWorkDate: getEarliestDate(localData.firstWorkDate, cloudData.firstWorkDate),

      // 当前模式：使用本地的
      currentMode: localData.currentMode || cloudData.currentMode || 'normal',

      lastSyncTime: now,
      updateTime: now
    };

    // 更新到云端
    await db.collection('user_data').doc(cloudData._id).update({
      data: mergedData
    });

    return {
      success: true,
      message: '数据同步成功',
      data: mergedData,
      syncTime: now
    };
  } catch (err) {
    throw new Error('同步数据失败: ' + err.message);
  }
}

// 合并对象（保留所有键值）
function mergeObjects(obj1, obj2) {
  return { ...obj2, ...obj1 }; // obj1 覆盖 obj2（本地优先）
}

// 合并愿望列表（去重）
function mergeWishes(localWishes, cloudWishes) {
  const wishMap = new Map();

  // 先添加云端的
  cloudWishes.forEach(wish => {
    wishMap.set(wish.id, wish);
  });

  // 再添加本地的（会覆盖云端的）
  localWishes.forEach(wish => {
    wishMap.set(wish.id, wish);
  });

  // 转为数组并按创建日期排序
  const merged = Array.from(wishMap.values());
  merged.sort((a, b) => {
    const dateA = new Date(a.createdDate || 0);
    const dateB = new Date(b.createdDate || 0);
    return dateB - dateA; // 降序
  });

  return merged;
}

// 获取最早的日期
function getEarliestDate(date1, date2) {
  if (!date1) return date2;
  if (!date2) return date1;

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return d1 < d2 ? date1 : date2;
}
