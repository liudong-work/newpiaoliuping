const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 内存存储（简化版本，不依赖MongoDB）
let bottles = [];
let messages = [];
let users = [];

// 测试路由
app.get('/', (req, res) => {
  res.json({ 
    message: '漂流瓶后端服务器运行正常！', 
    status: 'ok',
    version: '1.0.0',
    endpoints: {
      bottles: '/api/bottles',
      messages: '/api/messages',
      users: '/api/users'
    }
  });
});

// 用户相关接口
app.post('/api/users/register', (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    const user = {
      _id: 'user_' + Date.now(),
      username,
      email,
      avatar,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    res.status(201).json({ message: '用户注册成功', user });
  } catch (error) {
    res.status(400).json({ message: '注册失败', error: error.message });
  }
});

app.get('/api/users/:userId', (req, res) => {
  try {
    const user = users.find(u => u._id === req.params.userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
});

// 瓶子相关接口
app.post('/api/bottles', (req, res) => {
  try {
    const { content, senderId, senderName, location } = req.body;

    const bottle = {
      _id: 'bottle_' + Date.now(),
      content,
      senderId,
      senderName,
      location,
      isPicked: false,
      createdAt: new Date().toISOString()
    };

    bottles.push(bottle);
    console.log('新瓶子已扔出:', bottle);

    res.status(201).json({ message: '瓶子已扔出', bottleId: bottle._id });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.get('/api/bottles/pick', (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    // 查找未捡的瓶子
    const availableBottles = bottles.filter(bottle => !bottle.isPicked);

    console.log('可用瓶子数量:', availableBottles.length);

    res.json({ bottles: availableBottles });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.post('/api/bottles/:id/pick', (req, res) => {
  try {
    const { id } = req.params;
    const { pickerId } = req.body;

    const bottle = bottles.find(b => b._id === id);
    if (!bottle) {
      return res.status(404).json({ message: '瓶子不存在' });
    }

    if (bottle.isPicked) {
      return res.status(400).json({ message: '瓶子已被捡起' });
    }

    bottle.isPicked = true;
    bottle.pickedBy = pickerId;
    bottle.pickedAt = new Date().toISOString();
    console.log('瓶子已捡起:', bottle);

    res.json({ message: '成功捡起瓶子', bottle });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.get('/api/users/:userId/bottles', (req, res) => {
  try {
    const { userId } = req.params;
    const userBottles = bottles.filter(bottle => bottle.senderId === userId);
    res.json({ bottles: userBottles });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 消息相关接口
app.get('/api/users/:userId/messages', (req, res) => {
  try {
    const { userId } = req.params;
    const userMessages = messages.filter(msg =>
      msg.senderId === userId || msg.receiverId === userId
    );
    console.log(`用户 ${userId} 的消息数量: ${userMessages.length}`);
    res.json({ messages: userMessages });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.post('/api/messages', (req, res) => {
  try {
    const { senderId, receiverId, content, bottleId } = req.body;

    const message = {
      _id: 'message_' + Date.now(),
      senderId,
      receiverId,
      content,
      bottleId,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    messages.push(message);
    console.log('新消息已发送:', message);

    res.status(201).json({ message: '消息发送成功', messageId: message._id });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.put('/api/messages/:messageId/read', (req, res) => {
  try {
    const { messageId } = req.params;
    const message = messages.find(m => m._id === messageId);
    
    if (!message) {
      return res.status(404).json({ message: '消息不存在' });
    }
    
    message.isRead = true;
    res.json({ message: '消息已标记为已读', message });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误', error: err.message });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 测试服务器`);
  console.log('使用内存存储（无需MongoDB）');
});
