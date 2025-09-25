# 漂流瓶应用 - 后端API服务

## 项目结构

```
backend/
├── server.js          # 主服务器文件
├── package.json       # 依赖管理
└── README.md         # 说明文档

src/services/
├── api.js            # API配置和封装
└── bottleService.js  # 业务服务封装
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动服务器

```bash
# 开发模式（需要安装nodemon）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动

### 3. 测试API

访问 `http://localhost:3000` 查看服务器状态

## API接口文档

### 基础信息

- **基础URL**: `http://localhost:3000/api`
- **Android模拟器**: `http://10.0.2.2:3000/api`
- **真机测试**: `http://你的电脑IP:3000/api`

### 用户相关接口

#### 注册用户
```
POST /api/users/register
Content-Type: application/json

{
  "username": "用户名",
  "email": "邮箱",
  "avatar": "头像URL"
}
```

#### 获取用户信息
```
GET /api/users/:userId
```

#### 获取用户消息
```
GET /api/users/:userId/messages
```

#### 获取用户瓶子
```
GET /api/users/:userId/bottles
```

### 瓶子相关接口

#### 扔瓶子
```
POST /api/bottles
Content-Type: application/json

{
  "content": "瓶子内容",
  "senderId": "发送者ID",
  "senderName": "发送者姓名",
  "location": {
    "latitude": 39.9042,
    "longitude": 116.4074
  }
}
```

#### 获取可捡的瓶子
```
GET /api/bottles/pick?latitude=39.9042&longitude=116.4074
```

#### 捡瓶子
```
POST /api/bottles/:bottleId/pick
Content-Type: application/json

{
  "pickerId": "捡瓶子者ID"
}
```

### 消息相关接口

#### 发送消息
```
POST /api/messages
Content-Type: application/json

{
  "senderId": "发送者ID",
  "receiverId": "接收者ID",
  "content": "消息内容",
  "bottleId": "关联的瓶子ID"
}
```

#### 标记消息为已读
```
PUT /api/messages/:messageId/read
```

## 在React Native中使用

### 1. 导入API服务

```javascript
import { BottleService, MessageService, UserService } from '../services/bottleService';
```

### 2. 使用示例

```javascript
// 扔瓶子
const throwBottle = async () => {
  try {
    const result = await BottleService.throwBottle(
      '这是一个测试瓶子！',
      'user123',
      '测试用户',
      { latitude: 39.9042, longitude: 116.4074 }
    );
    console.log('瓶子扔出成功:', result);
  } catch (error) {
    console.error('扔瓶子失败:', error);
  }
};

// 搜索附近的瓶子
const searchBottles = async () => {
  try {
    const bottles = await BottleService.searchNearbyBottles(39.9042, 116.4074);
    console.log('找到瓶子:', bottles);
  } catch (error) {
    console.error('搜索失败:', error);
  }
};

// 发送消息
const sendMessage = async () => {
  try {
    const result = await MessageService.sendMessage(
      'sender123',
      'receiver456',
      '谢谢你的瓶子！',
      'bottle789'
    );
    console.log('消息发送成功:', result);
  } catch (error) {
    console.error('发送失败:', error);
  }
};
```

## 数据库

使用MongoDB存储数据，包含以下集合：

- **users**: 用户信息
- **bottles**: 瓶子信息
- **messages**: 消息信息

## 环境变量

创建 `.env` 文件配置环境变量：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/piaoliuping
```

## 注意事项

1. **Android模拟器**: 使用 `10.0.2.2` 代替 `localhost`
2. **真机测试**: 需要将 `localhost` 改为你的电脑IP地址
3. **MongoDB**: 确保MongoDB服务正在运行
4. **CORS**: 已配置跨域支持

## 错误处理

所有API都包含完整的错误处理，返回标准的JSON格式：

```json
{
  "message": "错误描述",
  "error": "详细错误信息"
}
```
