const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const app = express();

// 你提供的飞书信息
const APP_ID = "cli_a944b463d84d5bda";
const APP_SECRET = "XQFysGqrmrWp3xoWAPb6uchrJDsE2DKw";
const ENCRYPT_KEY = "eXsTQiEt9d4gXW7CT1CFub6wB7IhNB5o";
const VERIFICATION_TOKEN = "FpcV6iKVjbdq3p6KHSWOecAPnl5h5dDd";

// 必须用这个中间件解析JSON
app.use(express.json({ limit: '1mb' }));

// ==================== 工具函数 ====================
// 获取 tenant_access_token
async function getTenantAccessToken() {
  const resp = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const data = await resp.json();
  return data.access_token;
}

// 解密飞书消息
function decryptMessage(encryptStr) {
  try {
    const key = crypto.createHash("sha256").update(ENCRYPT_KEY).digest();
    const encrypted = Buffer.from(encryptStr, "base64");
    const iv = encrypted.subarray(0, 16);
    const data = encrypted.subarray(16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let res = decipher.update(data, "binary", "utf8");
    res += decipher.final("utf8");
    return JSON.parse(res);
  } catch (e) {
    return null;
  }
}

// 发送消息给用户
async function sendMessage(openId, content) {
  const token = await getTenantAccessToken();
  await fetch("https://open.feishu.cn/open-apis/im/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: "text",
      content: JSON.stringify({ text: content })
    })
  });
}

// ==================== Webhook核心逻辑（0延迟响应） ====================
app.post('/webhook', async (req, res) => {
  // 🔥 第一步：立刻返回200，彻底解决3秒超时！
  res.status(200).send({ challenge: req.body.challenge });

  // 🔥 第二步：异步处理消息，不阻塞响应
  setImmediate(async () => {
    try {
      // 处理飞书URL验证（第一次配置时用）
      if (req.body.type === 'url_verification') {
        return;
      }

      // 解密消息
      const payload = decryptMessage(req.body.payload);
      if (!payload) return;

      // 收到用户消息
      if (payload.type === "message" && payload.message?.message_type === "text") {
        const openId = payload.sender?.sender_id?.open_id;
        const userText = payload.message?.content?.trim();

        if (!openId || !userText) return;

        console.log(`📩 收到消息：${userText}`);

        // ==================== 你的机器人功能 ====================
        if (userText.includes("你好")) {
          await sendMessage(openId, "你好呀！我是你的飞书机器人 😊");
        } else if (userText.includes("功能")) {
          await sendMessage(openId, "我可以自动回复、查资料、做提醒～");
        } else {
          await sendMessage(openId, `我收到啦：${userText}`);
        }
      }
    } catch (err) {
      console.error("❌ 消息处理错误：", err);
    }
  });
});

// 保活接口（给GitHub Actions用）
app.get('/ping', (req, res) => {
  res.status(200).send("pong");
});

// 首页
app.get('/', (req, res) => {
  res.status(200).send("✅ 飞书机器人运行中");
});

// Vercel自动分配端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 服务启动，端口：${PORT}`);
});

// 导出模块（Vercel要求）
module.exports = app;
