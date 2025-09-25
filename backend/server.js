const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 连接MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/piaoliuping';

// 尝试连接MongoDB，如果失败则使用内存存储
let useMemoryStorage = false;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB连接成功: ' + MONGODB_URI);
}).catch(err => {
  console.error('MongoDB连接失败，使用内存存储:', err.message);
  useMemoryStorage = true;
});

// 内存存储作为备用方案
let memoryBottles = [];
let memoryMessages = [];
let memoryUsers = [];

// 用户模型
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  avatar: String,
  createdAt: { type: Date, default: Date.now }
});

// 瓶子模型
const bottleSchema = new mongoose.Schema({
  content: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  isPicked: { type: Boolean, default: false },
  pickedBy: String,
  pickedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// 消息模型
const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  content: { type: String, required: true },
  bottleId: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Bottle = mongoose.model('Bottle', bottleSchema);
const Message = mongoose.model('Message', messageSchema);

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
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    
    if (useMemoryStorage) {
      const user = {
        _id: 'user_' + Date.now(),
        username,
        email,
        avatar,
        createdAt: new Date().toISOString()
      };
      memoryUsers.push(user);
      res.status(201).json({ message: '用户注册成功', user });
    } else {
      const user = new User({ username, email, avatar });
      await user.save();
      res.status(201).json({ message: '用户注册成功', user });
    }
  } catch (error) {
    res.status(400).json({ message: '注册失败', error: error.message });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    let user;
    if (useMemoryStorage) {
      user = memoryUsers.find(u => u._id === req.params.userId);
    } else {
      user = await User.findById(req.params.userId);
    }
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
});

// 瓶子相关接口
app.post('/api/bottles', async (req, res) => {
  try {
    const { content, senderId, senderName, location } = req.body;
    
    if (useMemoryStorage) {
      const bottle = {
        _id: 'bottle_' + Date.now(),
        content,
        senderId,
        senderName,
        location,
        isPicked: false,
        createdAt: new Date().toISOString()
      };
      memoryBottles.push(bottle);
      console.log('新瓶子已扔出:', bottle);
      res.status(201).json({ message: '瓶子已扔出', bottleId: bottle._id });
    } else {
      const bottle = new Bottle({ content, senderId, senderName, location });
      await bottle.save();
      console.log('新瓶子已扔出:', bottle);
      res.status(201).json({ message: '瓶子已扔出', bottleId: bottle._id });
    }
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.get('/api/bottles/pick', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    let availableBottles;
    if (useMemoryStorage) {
      availableBottles = memoryBottles.filter(bottle => !bottle.isPicked);
    } else {
      availableBottles = await Bottle.find({ isPicked: false });
    }
    
    console.log('可用瓶子数量:', availableBottles.length);
    res.json({ bottles: availableBottles });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.post('/api/bottles/:id/pick', async (req, res) => {
  try {
    const { id } = req.params;
    const { pickerId } = req.body;

    let bottle;
    if (useMemoryStorage) {
      bottle = memoryBottles.find(b => b._id === id);
      if (bottle) {
        bottle.isPicked = true;
        bottle.pickedBy = pickerId;
        bottle.pickedAt = new Date().toISOString();
      }
    } else {
      bottle = await Bottle.findById(id);
      if (bottle) {
        bottle.isPicked = true;
        bottle.pickedBy = pickerId;
        bottle.pickedAt = new Date();
        await bottle.save();
      }
    }

    if (!bottle) {
      return res.status(404).json({ message: '瓶子不存在' });
    }

    if (bottle.isPicked && bottle.pickedBy !== pickerId) {
      return res.status(400).json({ message: '瓶子已被捡起' });
    }
    
    console.log('瓶子已捡起:', bottle);
    res.json({ message: '成功捡起瓶子', bottle });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.get('/api/users/:userId/bottles', async (req, res) => {
  try {
    const { userId } = req.params;
    const userBottles = await Bottle.find({ senderId: userId });
    res.json({ bottles: userBottles });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 消息相关接口
app.get('/api/users/:userId/messages', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let userMessages;
    if (useMemoryStorage) {
      userMessages = memoryMessages.filter(msg =>
        msg.senderId === userId || msg.receiverId === userId
      );
    } else {
      userMessages = await Message.find({
        $or: [{ senderId: userId }, { receiverId: userId }]
      }).sort({ createdAt: -1 });
    }
    
    console.log(`用户 ${userId} 的消息数量: ${userMessages.length}`);
    res.json({ messages: userMessages });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content, bottleId } = req.body;
    
    if (useMemoryStorage) {
      const message = {
        _id: 'message_' + Date.now(),
        senderId,
        receiverId,
        content,
        bottleId,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      memoryMessages.push(message);
      console.log('新消息已发送:', message);
      res.status(201).json({ message: '消息发送成功', messageId: message._id });
    } else {
      const message = new Message({ senderId, receiverId, content, bottleId });
      await message.save();
      console.log('新消息已发送:', message);
      res.status(201).json({ message: '消息发送成功', messageId: message._id });
    }
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.put('/api/messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    let message;
    if (useMemoryStorage) {
      message = memoryMessages.find(m => m._id === messageId);
      if (message) {
        message.isRead = true;
      }
    } else {
      message = await Message.findByIdAndUpdate(
        messageId, 
        { isRead: true }, 
        { new: true }
      );
    }
    
    if (!message) {
      return res.status(404).json({ message: '消息不存在' });
    }
    
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
  console.log(`MongoDB连接: ${MONGODB_URI}`);
});