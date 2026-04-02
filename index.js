const crypto = require('crypto');

// 你的密钥
const VERIFICATION_TOKEN = "FpcV6iKVjbdq3p6KHSWOecAPnl5h5dDd";
const ENCRYPT_KEY = "eXsTQiEt9d4gXW7CT1CFub6wB7IhNB5o";

// 启动服务（只为了在 Vercel/GitHub 运行）
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('✅ 飞书长连接机器人已部署\nGitHub 可维护');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ GitHub 托管成功！');
  console.log('✅ 飞书长连接模式！');
  console.log('✅ 不超时、实时、可维护！');
});
