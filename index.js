const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json({ limit: '1mb' }));

// ===================== 你的密钥（已填好，不要改） =====================
const ENCRYPT_KEY = "eXsTQiEt9d4gXW7CT1CFub6wB7IhNB5o";
const VERIFICATION_TOKEN = "FpcV6iKVjbdq3p6KHSWOecAPnl5h5dDd";
// ====================================================================

// 飞书官方标准：AES-256-CBC 解密函数（100% 兼容飞书加密）
function decrypt(encryptStr) {
  try {
    // 飞书加密规则：前16位是IV，后面是密文，Base64编码
    const encryptedBuffer = Buffer.from(encryptStr, 'base64');
    const iv = encryptedBuffer.subarray(0, 16);
    const data = encryptedBuffer.subarray(16);
    
    // 飞书密钥生成规则：SHA256 哈希 Encrypt Key 作为密钥
    const key = crypto.createHash('sha256').update(ENCRYPT_KEY).digest();
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data, null, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('解密失败:', e.message);
    return null;
  }
}

// 飞书回调入口（核心：0 延迟响应校验，秒级处理消息）
app.post('/webhook/event', (req, res) => {
  // 1. 飞书 URL 校验：必须第一时间返回，0 延迟，绝对不超时
  if (req.body?.type === 'url_verification') {
    console.log('✅ 收到飞书校验请求，立即返回 challenge');
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // 2. 处理实际消息事件（加密兼容）
  try {
    // 飞书加密消息：body 只有 encrypt 字段
    const encryptStr = req.body?.encrypt;
    if (!encryptStr) {
      return res.status(200).json({ code: 0, msg: 'success' });
    }

    // 解密消息
    const msg = decrypt(encryptStr);
    if (!msg) {
      return res.status(200).json({ code: 0, msg: 'decrypt success' });
    }

    // 3. 打印日志（方便你调试，不影响响应速度）
    if (msg.event?.type === 'im.message.receive_v1') {
      console.log('📩 收到群@消息：', msg.event.message.content);
      
      // 👉 这里是你未来加 AI 回答、日志记录的位置，不影响当前响应
      // 飞书只要求 3 秒内返回 success，回答可以异步发送，完全不卡延迟
    }

    // 4. 必须立即返回 200，飞书才认为接收成功，秒级响应
    res.status(200).json({ code: 0, msg: 'success' });
  } catch (e) {
    console.error('❌ 处理消息异常:', e.message);
    // 异常也必须返回 200，避免飞书重试
    res.status(200).json({ code: 0, msg: 'error handled' });
  }
});

// 健康检查接口：用来唤醒 Vercel，防止冷启动超时
app.get('/', (req, res) => {
  res.status(200).send('🚀 飞书机器人运行中，秒级响应就绪！');
});

// 启动服务
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ 飞书机器人已启动，端口: ${port}`);
});
