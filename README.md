# 🌊 漂流瓶应用 (PiaoLiuPing App)

一个基于React Native和Node.js的漂流瓶社交应用，支持iOS和Android多端打包。

## ✨ 功能特性

- **🌊 海页面**: 扔瓶子和捡瓶子的主要功能
- **💬 消息页面**: 查看收到的和发送的消息
- **👤 我的页面**: 个人资料管理和我的瓶子统计
- **📍 位置服务**: 基于地理位置的瓶子投放和捡取
- **🎨 现代UI**: 美观的用户界面设计

## 🚀 快速开始

### 环境要求

- Node.js (推荐 v20+)
- npm 或 yarn
- Expo CLI
- MongoDB (可选，用于数据持久化)

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
```

### 运行项目

#### 1. 启动后端服务器

```bash
cd backend
npm start
```

后端服务器将在 `http://localhost:3000` 启动

#### 2. 启动前端应用

```bash
# 返回项目根目录
cd ..

# 启动Expo开发服务器
npm start
```

然后选择运行平台：
- 按 `i` 在iOS模拟器中运行
- 按 `a` 在Android模拟器中运行
- 扫描二维码在真机上运行

## 📱 多端打包

### iOS打包

```bash
# 构建iOS应用
expo build:ios
```

### Android打包

```bash
# 构建Android应用
expo build:android
```

## 🏗️ 项目结构

```
newPiaoLiuPingApp/
├── src/
│   └── screens/           # 页面组件
│       ├── HomeScreen.tsx      # 海页面
│       ├── ThrowBottleScreen.tsx # 扔瓶子页面
│       ├── PickBottleScreen.tsx  # 捡瓶子页面
│       ├── MessageScreen.tsx     # 消息页面
│       └── ProfileScreen.tsx     # 我的页面
├── backend/               # 后端服务器
│   ├── server.js         # 主服务器文件
│   └── package.json      # 后端依赖
├── App.tsx               # 主应用组件
└── package.json          # 前端依赖
```

## 🔧 技术栈

### 前端
- **React Native 0.81.4** - 跨平台移动应用框架
- **Expo SDK 54** - 开发工具和平台服务
- **React Navigation** - 导航管理
- **TypeScript** - 类型安全的JavaScript
- **Expo Location** - 位置服务

### 后端
- **Node.js** - JavaScript运行时
- **Express** - Web应用框架
- **MongoDB** - 数据库
- **Mongoose** - MongoDB对象建模工具

## 📋 API接口

### 用户相关
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### 瓶子相关
- `POST /api/bottles` - 扔瓶子
- `GET /api/bottles/pick` - 搜索附近瓶子
- `POST /api/bottles/:id/pick` - 捡起瓶子
- `GET /api/users/:userId/bottles` - 获取我的瓶子

### 消息相关
- `GET /api/users/:userId/messages` - 获取消息
- `POST /api/messages` - 发送消息

## 🎨 UI设计特色

- **海洋主题**: 蓝色系配色方案，营造海洋氛围
- **卡片设计**: 现代化的卡片式布局
- **图标系统**: 使用Ionicons图标库
- **响应式布局**: 适配不同屏幕尺寸
- **动画效果**: 流畅的页面切换和交互

## 🔒 权限说明

应用需要以下权限：
- **位置权限**: 用于瓶子投放和捡取的位置定位
- **网络权限**: 用于与后端服务器通信

## 🐛 已知问题

- Node.js版本警告：当前使用Node.js v18，建议升级到v20+以获得最佳兼容性
- 位置服务需要真机测试，模拟器可能无法正常获取位置

## 📝 开发说明

1. 当前使用模拟数据，需要连接真实后端API
2. 数据库连接需要配置MongoDB连接字符串
3. 位置服务需要在真机上测试
4. 建议使用Expo Go应用进行开发调试

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License
