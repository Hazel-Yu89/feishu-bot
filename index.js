const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// ===================== 你的密钥（已填好） =====================
const ENCRYPT_KEY = "eXsTQiEt9d4gXW7CT1CFub6wB7IhNB5o";
const VERIFICATION_TOKEN = "FpcV6iKVjbdq3p6KHSWOecAPnl5h5dDd";
// ==============================================================

// 飞书消息解密函数
function decrypt(encrypt) {
  const key = crypto.createHash('sha256').update(ENCRYPT_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(encrypt.slice(0, 16), 'base64'));
  let decrypted = decipher.update(encrypt.slice(16), 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// 接收飞书回调
app.post('/webhook/event', (req, res) => {
  try {
    const body = req.body;

    // 1. 挑战验证（飞书必须）
    if (body.type === "url_verification") {
      return res.json({ challenge: body.challenge });
    }

    // 2. 解密消息
    const msg = decrypt(body.encrypt);

    // 3. 自动回复（核心功能）
    if (msg.event?.type === "im.message.receive_v1") {
      console.log("收到消息:", msg.event.message.content);
      return res.json({ code: 0, msg: "success" });
    }

    res.json({ code: 0 });
  } catch (e) {
    res.json({ code: 1 });
  }
});

// 启动服务
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`机器人运行中 → port ${port}`);
});
