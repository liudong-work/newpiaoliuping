import { io } from 'socket.io-client';
import { Platform } from 'react-native';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentUserId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1秒
  }

  // 连接WebSocket
  connect(userId) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket已连接，跳过重复连接');
      return;
    }

    try {
      // 根据平台选择不同的连接地址
      let API_BASE;
      if (Platform.OS === 'web') {
        API_BASE = 'http://localhost:3000';
      } else if (Platform.OS === 'android') {
        API_BASE = 'http://10.0.2.2:3000';
      } else {
        API_BASE = 'http://localhost:3000';
      }
      
      console.log('正在连接WebSocket:', API_BASE);
      
      this.socket = io(API_BASE, {
        transports: Platform.OS === 'web' ? ['polling', 'websocket'] : ['websocket', 'polling'],
        timeout: 20000,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        forceNew: true, // 强制创建新连接
      });

      this.currentUserId = userId;

      this.socket.on('connect', () => {
        console.log('WebSocket连接成功:', this.socket.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 发送用户登录事件
        this.socket.emit('user-login', userId);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket连接断开:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
        this.isConnected = false;
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('WebSocket重连成功:', attemptNumber);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 重新发送用户登录事件
        if (this.currentUserId) {
          this.socket.emit('user-login', this.currentUserId);
        }
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('WebSocket重连错误:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('WebSocket重连失败，已达到最大重试次数');
      });

    } catch (error) {
      console.error('WebSocket初始化失败:', error);
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUserId = null;
    }
  }

  // 监听新消息
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  // 监听语音通话事件
  onVoiceCallIncoming(callback) {
    if (this.socket) {
      this.socket.on('voice-call-incoming', callback);
    }
  }

  onVoiceCallAnswered(callback) {
    if (this.socket) {
      this.socket.on('voice-call-answered', callback);
    }
  }

  onVoiceCallRejected(callback) {
    if (this.socket) {
      this.socket.on('voice-call-rejected', callback);
    }
  }

  onVoiceCallEnded(callback) {
    if (this.socket) {
      this.socket.on('voice-call-ended', callback);
    }
  }

  // 移除新消息监听
  offNewMessage(callback) {
    if (this.socket) {
      this.socket.off('new-message', callback);
    }
  }

  // 移除语音通话监听
  offVoiceCallIncoming(callback) {
    if (this.socket) {
      this.socket.off('voice-call-incoming', callback);
    }
  }

  offVoiceCallAnswered(callback) {
    if (this.socket) {
      this.socket.off('voice-call-answered', callback);
    }
  }

  offVoiceCallRejected(callback) {
    if (this.socket) {
      this.socket.off('voice-call-rejected', callback);
    }
  }

  offVoiceCallEnded(callback) {
    if (this.socket) {
      this.socket.off('voice-call-ended', callback);
    }
  }

  // 发送消息（触发实时推送）
  sendMessage(receiverId, message) {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket未连接，无法发送实时推送');
      return false;
    }

    try {
      // 同时向接收者和发送者推送消息
      this.socket.emit('send-message', {
        receiverId,
        message
      });
      
      // 如果是自发送消息，也向发送者推送
      if (message.senderId !== receiverId) {
        this.socket.emit('send-message', {
          receiverId: message.senderId,
          message
        });
      }
      
      console.log('实时推送已发送给用户:', receiverId);
      if (message.senderId !== receiverId) {
        console.log('实时推送已发送给发送者:', message.senderId);
      }
      return true;
    } catch (error) {
      console.error('发送实时推送失败:', error);
      return false;
    }
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
      userId: this.currentUserId
    };
  }

  // 手动重连
  reconnect() {
    if (this.currentUserId) {
      console.log('手动重连WebSocket');
      this.disconnect();
      setTimeout(() => {
        this.connect(this.currentUserId);
      }, 1000);
    }
  }
}

// 创建单例实例
export const socketService = new SocketService();
export default socketService;
