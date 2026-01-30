// 云函数：用户登录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  try {
    const { nickName, avatarUrl } = event;

    // 获取用户openid
    const openid = wxContext.OPENID;

    // 查询当前用户的记录（云开发会自动按_openid过滤）
    const userQuery = await db.collection('users').limit(1).get();

    const now = new Date();

    if (userQuery.data.length === 0) {
      // 新用户，创建记录
      const addResult = await db.collection('users').add({
        data: {
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
