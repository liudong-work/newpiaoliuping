import ApiService, { API_CONFIG } from '../services/api';
import socketService from './socketService';

// 使用示例
export class BottleService {
  // 扔瓶子
  static async throwBottle(content, senderId, senderName, location) {
    try {
      const result = await ApiService.bottle.create({
        content,
        senderId,
        senderName,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
      
      console.log('瓶子扔出成功:', result);
      return result;
    } catch (error) {
      console.error('扔瓶子失败:', error);
      throw error;
    }
  }

  // 搜索附近的瓶子
  static async searchNearbyBottles(latitude, longitude) {
    try {
      const result = await ApiService.bottle.getPickable(latitude, longitude);
      console.log('找到瓶子:', result.bottles.length, '个');
      return result.bottles;
    } catch (error) {
      console.error('搜索瓶子失败:', error);
      throw error;
    }
  }

  // 捡瓶子
  static async pickBottle(bottleId, pickerId) {
    try {
      const result = await ApiService.bottle.pick(bottleId, pickerId);
      console.log('捡瓶子成功:', result);
      return result;
    } catch (error) {
      console.error('捡瓶子失败:', error);
      throw error;
    }
  }
}

export class MessageService {
  // 发送消息
  static async sendMessage(senderId, receiverId, content, bottleId, senderName) {
    try {
      const result = await ApiService.message.send({
        senderId,
        receiverId,
        content,
        bottleId,
        senderName, // 添加发送者姓名
      });
      
      console.log('消息发送成功:', result);
      
      // 发送实时推送
      if (result.message) {
        const pushResult = socketService.sendMessage(receiverId, result.message);
        if (pushResult) {
          console.log('✅ 实时推送已发送');
        } else {
          console.log('❌ 实时推送失败，但消息已保存');
        }
      }
      
      return result;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 获取用户消息
  static async getUserMessages(userId) {
    try {
      const result = await ApiService.user.getMessages(userId);
      console.log('获取消息成功:', result.messages.length, '条');
      return result.messages;
    } catch (error) {
      console.error('获取消息失败:', error);
      throw error;
    }
  }

  // 获取所有消息（用于消息列表显示）
  static async getAllMessages() {
    try {
      const result = await ApiService.message.getAll();
      console.log('获取所有消息成功:', result.messages.length, '条');
      return result.messages;
    } catch (error) {
      console.error('获取所有消息失败:', error);
      throw error;
    }
  }

  // 获取所有瓶子（用于消息列表显示瓶子信息）
  static async getAllBottles() {
    try {
      const result = await ApiService.bottle.getAll();
      console.log('获取所有瓶子成功:', result.bottles.length, '个');
      return result.bottles;
    } catch (error) {
      console.error('获取所有瓶子失败:', error);
      throw error;
    }
  }

  // 标记消息为已读
  static async markMessageAsRead(messageId) {
    try {
      const result = await ApiService.message.markAsRead(messageId);
      console.log('消息已标记为已读:', result);
      return result;
    } catch (error) {
      console.error('标记消息失败:', error);
      throw error;
    }
  }
}

export class UserService {
  // 注册用户
  static async registerUser(username, email, avatar) {
    try {
      const result = await ApiService.user.register({
        username,
        email,
        avatar,
      });
      
      console.log('用户注册成功:', result);
      return result;
    } catch (error) {
      console.error('用户注册失败:', error);
      throw error;
    }
  }

  // 获取用户信息
  static async getUserInfo(userId) {
    try {
      const result = await ApiService.user.getUser(userId);
      console.log('获取用户信息成功:', result);
      return result.user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }
}

// 系统服务
export class SystemService {
  // 检查服务器状态
  static async checkServerHealth() {
    try {
      const result = await ApiService.system.health();
      console.log('服务器状态正常:', result);
      return result;
    } catch (error) {
      console.error('服务器连接失败:', error);
      throw error;
    }
  }
}

// 导出API配置，方便调试
export { API_CONFIG };
