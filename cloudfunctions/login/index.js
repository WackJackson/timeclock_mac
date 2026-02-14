// 云函数：用户登录
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'timebomp-2g4siacf47b7e567',
  traceUser: true
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  try {
    const { nickName, avatarUrl } = event;

    // 获取用户openid
    const openid = wxContext.OPENID;

    // 🚨 验证openid是否有效
    if (!openid || openid === 'undefined' || openid === 'null' || openid.trim() === '') {
      console.error('无效的 openid:', openid, 'type:', typeof openid);
      return {
        success: false,
        error: '获取用户身份失败，请检查云开发配置',
        code: 'INVALID_OPENID'
      };
    }

    // 查询当前用户的记录（必须按_openid过滤）
    const userQuery = await db.collection('users').where({
      _openid: openid
    }).limit(1).get();

    const now = new Date();

    if (userQuery.data.length === 0) {
      // 新用户，创建记录
      const addResult = await db.collection('users').add({
        data: {
          _openid: openid,  // 🔑 手动添加 _openid
          nickName,
          avatarUrl,
          createTime: now,
          updateTime: now
        }
      });

      return {
        success: true,
        isNewUser: true,
        openid,
        nickName,
        avatarUrl,
        userId: addResult._id,
        message: '注册成功'
      };
    } else {
      // 老用户，更新信息
      const existingUser = userQuery.data[0];

      await db.collection('users').doc(existingUser._id).update({
        data: {
          nickName,
          avatarUrl,
          updateTime: now
        }
      });

      return {
        success: true,
        isNewUser: false,
        openid,
        nickName,
        avatarUrl,
        userId: existingUser._id,
        message: '登录成功'
      };
    }
  } catch (err) {
    console.error('登录失败:', err);
    return {
      success: false,
      error: err.message,
      errorDetail: err
    };
  }
};
