// ========== 飞书长连接机器人（Vercel 可直接运行）==========
const WebSocket = require('ws');
const crypto = require('crypto');
const fetch = require('node-fetch');

// 你提供的飞书信息
const APP_ID = "cli_a944b463d84d5bda";
const APP_SECRET = "XQFysGqrmrWp3xoWAPb6uchrJDsE2DKw";
const ENCRYPT_KEY = "eXsTQiEt9d4gXW7CT1CFub6wB7IhNB5o";
const VERIFICATION_TOKEN = "FpcV6iKVjbdq3p6KHSWOecAPnl5h5dDd";

// 长连接地址（飞书官方）
const WS_URL = "wss://ws-event-feishu.feishu.cn/event";

// ==================== 工具函数 ====================
// 获取 tenant_access_token（必须要，才能发消息）
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

// ==================== 长连接主逻辑 ====================
function start() {
  console.log("✅ 正在连接飞书长连接...");

  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("🔗 连接成功，开始鉴权...");
    ws.send(JSON.stringify({
      type: "auth",
      token: VERIFICATION_TOKEN
    }));
  });

  ws.on("message", async (data) => {
    const msg = JSON.parse(data.toString());

    // 鉴权成功
    if (msg.type === "auth_success") {
      console.log("✅ 机器人已上线！");
      return;
    }

    // 解密消息
    const payload = decryptMessage(msg.payload);
    if (!payload) return;

    // 收到消息
    if (payload.type === "message" && payload.message?.message_type === "text") {
      const openId = payload.sender?.sender_id?.open_id;
      const userText = payload.message?.content?.trim();

      if (!openId || !userText) return;

      console.log(`📩 收到消息：${userText}`);

      // ==================== 你的机器人功能 ====================
      // 在这里写你要的自动回复逻辑
      if (userText.includes("你好")) {
        await sendMessage(openId, "你好呀！我是你的飞书机器人 😊");
      } else if (userText.includes("功能")) {
        await sendMessage(openId, "我可以自动回复、查资料、做提醒～");
      } else {
        await sendMessage(openId, `我收到啦：${userText}`);
      }
    }
  });

  ws.on("close", () => {
    console.log("🔌 连接断开，5秒后重连...");
    setTimeout(start, 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ 错误：", err);
  });
}

// 启动
start();
