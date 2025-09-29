import { socketService } from './socketService';

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

  // 发起语音通话
  initiateCall(receiverId, receiverName) {
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

    // 通过WebSocket发送通话请求
    console.log('📡 发送语音通话请求到后端:', callData);
    socketService.socket.emit('voice-call-initiate', callData);
    
    console.log('✅ 发起语音通话成功:', callData);
    console.log('📱 WebRTC支持状态:', webrtcSupported ? '完整功能' : '模拟模式');
    this.notifyListeners('call-initiated', callData);
    
    return true;
  }

  // 接听通话
  answerCall(callId) {
    if (!this.currentCall || this.currentCall.callId !== callId) {
      console.log('无效的通话ID');
      return false;
    }

    this.currentCall.status = 'connected';
    this.isInCall = true;

    // 通知对方已接听
    if (socketService.socket && socketService.isConnected) {
      socketService.socket.emit('voice-call-answer', {
        callId,
        status: 'answered'
      });
    } else {
      console.warn('WebSocket未连接，无法发送接听通知');
    }

    console.log('接听通话:', callId);
    this.notifyListeners('call-answered', this.currentCall);
    
    return true;
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
  endCall(callId) {
    if (!this.currentCall || this.currentCall.callId !== callId) {
      console.log('无效的通话ID');
      return false;
    }

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

    console.log('结束通话:', callId);
    this.notifyListeners('call-ended', this.currentCall);
    
    this.currentCall = null;
    return true;
  }

  // 重置通话状态
  resetCallState() {
    console.log('🔄 重置通话状态...');
    console.log('重置前状态:');
    console.log('- isInCall:', this.isInCall);
    console.log('- currentCall:', this.currentCall);
    
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
}

// 创建单例实例
const voiceCallService = new VoiceCallService();

export default voiceCallService;
