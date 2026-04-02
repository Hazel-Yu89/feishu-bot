const lark = require('@larksuiteoapi/node-sdk');

// 你的密钥
const APP_ID = 'cli_a944b463d84d5bda';
const APP_SECRET = 'XQFysGqrmrWp3xoWAPb6uchrJDsE2DKw';
const VERIFICATION_TOKEN = 'FpcV6iKVjbdq3p6KHSWOecAPnl5h5dDd';
const ENCRYPT_KEY = 'eXsTQiEt9d4gXW7CT1CFub6wB7IhNB5o';

const client = new lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  verificationToken: VERIFICATION_TOKEN,
  encryptKey: ENCRYPT_KEY,
});

// 消息处理
client.event.on('im.message.receive_v1', async (event) => {
  const { message_id, content } = event.event.message;
  const question = JSON.parse(content).text;

  // 自动回复
  await client.im.message.reply({
    path: { message_id },
    data: {
      msg_type: 'text',
      content: JSON.stringify({ text: `你好！已收到你的提问：${question}\n正在检索知识库...` })
    }
  });

  // 记录日志到多维表格
  await client.base.appTableRecord.create({
    path: { app_token: '你的多维表格AppToken', table_id: '你的表格ID' },
    data: {
      fields: {
        提问人: event.event.sender.sender_id.open_id,
        提问时间: new Date().toISOString(),
        提问内容: question
      }
    }
  });
});

// 启动长连接（飞书云函数自动托管，7×24小时在线）
client.startLongConnection();
