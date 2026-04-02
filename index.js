const express = require('express');
const crypto = require('crypto');
const app = express();

// ===================== 飞书密钥（从Vercel环境变量读取，绝对安全） =====================
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN;
const ENCRYPT_KEY = process.env.FEISHU_ENCRYPT_KEY;
// ====================================================================================

// 必须用这个中间件，否则飞书JSON解析失败
app.use(express.json({ limit: '1mb' }));

// 🔥 飞书Webhook入口：0延迟响应，绝对不超时
app.post('/webhook', (req, res) => {
  // 第一步：优先处理飞书校验，0.01秒返回，3秒校验必过
  if (req.body?.type === "url_verification") {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // 第二步：异步处理消息，不影响响应速度
  setImmediate(async () => {
    try {
      // 解密飞书加密消息
      const encrypted = req.body.encrypt;
      const key = crypto.createHash('sha256').update(ENCRYPT_KEY).digest();
      const encryptedBuf = Buffer.from(encrypted, 'base64');
      const iv = encryptedBuf.subarray(0, 16);
      const data = encryptedBuf.subarray(16);
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(data, null, 'utf8');
      decrypted += decipher.final('utf8');
      const event = JSON.parse(decrypted);

      // 收到消息后自动回复
      if (event.event?.type === 'im.message.receive_v1') {
        const messageId = event.event.message.message_id;
        const question = JSON.parse(event.event.message.content).text;
        
        // 获取飞书访问令牌
        const tokenRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
        });
        const tokenData = await tokenRes.json();
        const token = tokenData.tenant_access_token;

        // 调用飞书API回复用户
        await fetch(`https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            msg_type: "text",
            content: JSON.stringify({ text: `✅ 知识库助手已收到你的提问：${question}` })
          })
        });
        console.log(`✅ 已回复用户：${question}`);
      }
    } catch (err) {
      console.error("❌ 处理消息失败:", err);
    }
  });

  // 立刻返回成功，飞书永远不会超时
  return res.status(200).json({ code: 0, msg: "success" });
});

// 🔥 保活接口：给GitHub Actions用，唤醒Vercel，彻底消灭冷启动
app.get('/ping', (req, res) => {
  res.status(200).send("pong");
});

// 首页
app.get('/', (req, res) => {
  res.status(200).send("✅ 飞书知识库助手运行中");
});

// Vercel自动分配端口，不用手动改
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 服务启动，端口：${PORT}`);
});
