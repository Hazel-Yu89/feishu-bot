const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json({ limit: '1mb' }));

// ===================== 你的密钥（已填好，不要改） =====================
const ENCRYPT_KEY = "eXsTQiEt9d4gXW7CT1CFub6wB7IhNB5o";
const VERIFICATION_TOKEN = "FpcV6iKVjbdq3p6KHSWOecAPnl5h5dDd";
// ====================================================================

// 飞书消息解密函数（适配飞书官方加密规则）
function decrypt(encryptStr) {
  try {
    const key = crypto.createHash('sha256').update(ENCRYPT_KEY).digest();
    const iv = Buffer.from(encryptStr.slice(0, 16), 'base64');
    const encryptedData = Buffer.from(encryptStr.slice(16), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('解密失败:', e);
    return null;
  }
}

// 飞书回调入口（核心：3秒内返回challenge）
app.post('/webhook/event', (req, res) => {
  // 1. 飞书URL校验（必须立刻返回，不能有任何延迟）
  if (req.body?.type === 'url_verification') {
    console.log('收到飞书校验请求，立即返回challenge');
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // 2. 处理实际消息事件
  try {
    const encryptStr = req.body?.encrypt;
    if (!encryptStr) {
      return res.status(200).json({ code: 0, msg: 'success' });
    }

    const msg = decrypt(encryptStr);
    if (!msg) {
      return res.status(200).json({ code: 0, msg: 'decrypt success' });
    }

    // 打印消息日志（方便你调试）
    if (msg.event?.type === 'im.message.receive_v1') {
      console.log('✅ 收到群@消息:', JSON.stringify(msg.event, null, 2));
    }

    // 3. 必须返回200，飞书才认为接收成功
    res.status(200).json({ code: 0, msg: 'success' });
  } catch (e) {
    console.error('处理消息异常:', e);
    res.status(200).json({ code: 0, msg: 'error handled' });
  }
});

// 健康检查接口（防止Vercel休眠）
app.get('/', (req, res) => {
  res.status(200).send('飞书机器人运行中 ✅');
});

// 启动服务
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 飞书机器人已启动，端口: ${port}`);
});
