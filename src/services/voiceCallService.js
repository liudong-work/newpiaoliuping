import { socketService } from './socketService';
import webrtcService from './webrtcService';

// 检查WebRTC支持情况
let webrtcSupported = false;
try {
  require('react-native-webrtc');
  webrtcSupported = true;
  console.log('✅ react-native-webrtc可用');
} catch (error) {
  console.warn('⚠️ react-native-webrtc不可用，语音通话将工作在模拟模式');
  webrtcSupported = false;
}

class VoiceCallService {
  constructor() {
    this.isInCall = false;
    this.currentCall = null;
    this.callListeners = [];
    console.log('🎉 VoiceCallService 初始化完成');
  }

  // 设置当前通话（用于接收方）
  setCurrentCall(callData) {
    console.log('🔔 设置当前通话:', callData);
    this.currentCall = callData;
    this.isInCall = true;
  }

  // 发起语音通话
  async initiateCall(receiverId, receiverName) {
    console.log('🚀 VoiceCallService.initiateCall 开始');
    console.log('📊 当前状态检查:');
    console.log('- this.isInCall:', this.isInCall);
    console.log('- this.currentCall:', this.currentCall);
    console.log('- socketService.socket存在:', !!socketService.socket);
    console.log('- socketService.isConnected:', socketService.isConnected);
    console.log('- receiverId:', receiverId);
    console.log('- receiverName:', receiverName);
    
    if (this.isInCall) {
      console.log('❌ 当前正在通话中，无法发起新通话');
      console.log('当前通话状态:', this.currentCall);
      return false;
    }

    // WebSocket连接检查
    if (!socketService.socket || !socketService.isConnected) {
      console.warn('❌ WebSocket未连接，无法发送通话请求');
      console.log('socketService.socket:', !!socketService.socket);
      console.log('socketService.isConnected:', socketService.isConnected);
      return false;
    }

    try {
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const callData = {
        callId,
        receiverId,
        receiverName,
        timestamp: Date.now(),
        status: 'initiating',
        webrtcSupported: webrtcSupported
      };

      this.currentCall = callData;
      this.isInCall = true;

      // 初始化WebRTC连接（作为发起方）
      console.log('🔔 初始化WebRTC连接（发起方）');
      const webrtcSuccess = await webrtcService.initializeCall(callId, true);
      
      if (!webrtcSuccess) {
        console.error('❌ WebRTC初始化失败');
        this.resetCallState();
        return false;
      }

      // 通过WebSocket发送通话请求
      console.log('📡 发送语音通话请求到后端:', callData);
      socketService.socket.emit('voice-call-initiate', callData);
      
      console.log('✅ 发起语音通话成功:', callData);
      console.log('📱 WebRTC支持状态:', webrtcSupported ? '完整功能' : '模拟模式');
      this.notifyListeners('call-initiated', callData);
      
      return true;
    } catch (error) {
      console.error('❌ 发起通话失败:', error);
      this.resetCallState();
      return false;
    }
  }

  // 接听通话
  async answerCall(callId) {
    if (!this.currentCall || this.currentCall.callId !== callId) {
      console.log('无效的通话ID');
      return false;
    }

    try {
      console.log('🔔 开始接听通话，初始化WebRTC连接');
      
      // 初始化WebRTC连接（作为接收方）
      const roomId = this.currentCall.callId;
      const webrtcSuccess = await webrtcService.initializeCall(roomId, false);
      
      if (!webrtcSuccess) {
        console.error('❌ WebRTC初始化失败');
        return false;
      }

      this.currentCall.status = 'connected';
      this.isInCall = true;
      
      // 通过WebSocket通知对方通话已接听
      console.log('📡 发送通话接听通知到后端:', { callId, status: 'answered' });
      if (socketService.socket && socketService.isConnected) {
        socketService.socket.emit('voice-call-answer', {
          callId,
          status: 'answered'
        });
      } else {
        console.warn('WebSocket未连接，无法发送接听通知');
      }

      console.log('✅ 接听通话成功:', callId);
      this.notifyListeners('call-answered', this.currentCall);
      
      return true;
    } catch (error) {
      console.error('❌ 接听通话失败:', error);
      return false;
    }
  }

  // 拒绝通话
  rejectCall(callId) {
    if (!this.currentCall || this.currentCall.callId !== callId) {
      console.log('无效的通话ID');
      return false;
    }

    this.currentCall.status = 'rejected';
    this.isInCall = false;

    // 通知对方已拒绝
    if (socketService.socket && socketService.isConnected) {
      socketService.socket.emit('voice-call-reject', {
        callId,
        status: 'rejected'
      });
    } else {
      console.warn('WebSocket未连接，无法发送拒绝通知');
    }

    console.log('拒绝通话:', callId);
    this.notifyListeners('call-rejected', this.currentCall);
    
    this.currentCall = null;
    return true;
  }

  // 结束通话
  async endCall(callId) {
    if (!this.currentCall || this.currentCall.callId !== callId) {
      console.log('无效的通话ID');
      return false;
    }

    try {
      console.log('🔔 开始结束通话，清理WebRTC连接');
      
      // 结束WebRTC连接
      await webrtcService.endCall();
      
      this.currentCall.status = 'ended';
      this.isInCall = false;

      // 通知对方通话已结束
      if (socketService.socket && socketService.isConnected) {
        socketService.socket.emit('voice-call-end', {
          callId,
          status: 'ended'
        });
      } else {
        console.warn('WebSocket未连接，无法发送结束通知');
      }

      console.log('✅ 结束通话成功:', callId);
      this.notifyListeners('call-ended', this.currentCall);
      
      this.currentCall = null;
      return true;
    } catch (error) {
      console.error('❌ 结束通话失败:', error);
      return false;
    }
  }

  // 重置通话状态
  async resetCallState() {
    console.log('🔄 重置通话状态...');
    console.log('重置前状态:');
    console.log('- isInCall:', this.isInCall);
    console.log('- currentCall:', this.currentCall);
    
    try {
      // 清理WebRTC连接
      await webrtcService.endCall();
    } catch (error) {
      console.warn('清理WebRTC连接时出错:', error);
    }
    
    this.isInCall = false;
    this.currentCall = null;
    
    console.log('重置后状态:');
    console.log('- isInCall:', this.isInCall);
    console.log('- currentCall:', this.currentCall);
    console.log('✅ 通话状态已重置');
  }

  // 处理收到的通话请求
  handleIncomingCall(callData) {
    console.log('收到通话请求:', callData);
    this.currentCall = callData;
    this.notifyListeners('incoming-call', callData);
  }

  // 处理通话状态更新
  handleCallStatusUpdate(statusData) {
    console.log('通话状态更新:', statusData);
    
    if (this.currentCall && this.currentCall.callId === statusData.callId) {
      this.currentCall.status = statusData.status;
      
      switch (statusData.status) {
        case 'answered':
          this.isInCall = true;
          this.notifyListeners('call-answered', this.currentCall);
          break;
        case 'rejected':
          this.isInCall = false;
          this.notifyListeners('call-rejected', this.currentCall);
          this.currentCall = null;
          break;
        case 'ended':
          this.isInCall = false;
          this.notifyListeners('call-ended', this.currentCall);
          this.currentCall = null;
          break;
      }
    }
  }

  // 添加通话事件监听器
  addCallListener(callback) {
    this.callListeners.push(callback);
  }

  // 移除通话事件监听器
  removeCallListener(callback) {
    const index = this.callListeners.indexOf(callback);
    if (index > -1) {
      this.callListeners.splice(index, 1);
    }
  }

  // 通知所有监听器
  notifyListeners(event, data) {
    this.callListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('通话事件监听器错误:', error);
      }
    });
  }

  // 获取当前通话状态
  getCurrentCall() {
    return this.currentCall;
  }

  // 检查是否正在通话
  isCurrentlyInCall() {
    return this.isInCall;
  }

  // 静音/取消静音
  toggleMute() {
    if (webrtcSupported) {
      return webrtcService.toggleMute();
    }
    return false;
  }

  // 获取WebRTC连接状态
  getWebRTCStatus() {
    if (webrtcSupported) {
      return {
        isConnected: webrtcService.isConnected(),
        hasLocalStream: !!webrtcService.getLocalStream(),
        hasRemoteStream: !!webrtcService.getRemoteStream()
      };
    }
    return {
      isConnected: false,
      hasLocalStream: false,
      hasRemoteStream: false
    };
  }
}

// 创建单例实例
const voiceCallService = new VoiceCallService();

export default voiceCallService;
