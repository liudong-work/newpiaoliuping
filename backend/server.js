const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piaoliuping', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 用户模型
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// 瓶子模型
const bottleSchema = new mongoose.Schema({
  content: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  isPicked: { type: Boolean, default: false },
  pickedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  pickedAt: { type: Date }
});

// 消息模型
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  bottleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bottle' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Bottle = mongoose.model('Bottle', bottleSchema);
const Message = mongoose.model('Message', messageSchema);

// 路由

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: '用户已存在' });
    }

    const user = new User({ username, email, password });
    await user.save();
    
    res.status(201).json({ message: '注册成功', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }
    
    res.json({ message: '登录成功', user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 扔瓶子
app.post('/api/bottles', async (req, res) => {
  try {
    const { content, senderId, senderName, location } = req.body;
    
    const bottle = new Bottle({
      content,
      senderId,
      senderName,
      location
    });
    
    await bottle.save();
    res.status(201).json({ message: '瓶子已扔出', bottleId: bottle._id });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 捡瓶子
app.get('/api/bottles/pick', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    // 查找附近的未捡瓶子
    const bottles = await Bottle.find({ 
      isPicked: false,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 1000 // 1公里范围内
        }
      }
    }).limit(5);
    
    res.json({ bottles });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 捡起瓶子
app.post('/api/bottles/:id/pick', async (req, res) => {
  try {
    const { id } = req.params;
    const { pickerId } = req.body;
    
    const bottle = await Bottle.findById(id);
    if (!bottle) {
      return res.status(404).json({ message: '瓶子不存在' });
    }
    
    if (bottle.isPicked) {
      return res.status(400).json({ message: '瓶子已被捡起' });
    }
    
    bottle.isPicked = true;
    bottle.pickedBy = pickerId;
    bottle.pickedAt = new Date();
    
    await bottle.save();
    
    res.json({ message: '成功捡起瓶子', bottle });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取我的瓶子
app.get('/api/users/:userId/bottles', async (req, res) => {
  try {
    const { userId } = req.params;
    const bottles = await Bottle.find({ senderId: userId }).sort({ createdAt: -1 });
    res.json({ bottles });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取消息
app.get('/api/users/:userId/messages', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({ 
      $or: [{ senderId: userId }, { receiverId: userId }] 
    }).sort({ createdAt: -1 });
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 发送消息
app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content, bottleId } = req.body;
    
    const message = new Message({
      senderId,
      receiverId,
      content,
      bottleId
    });
    
    await message.save();
    res.status(201).json({ message: '消息发送成功', messageId: message._id });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
