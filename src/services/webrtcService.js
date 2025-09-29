// 动态导入WebRTC模块，处理Expo Go不支持的情况
let RTCPeerConnection, RTCView, mediaDevices;

try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCView = webrtc.RTCView;
  mediaDevices = webrtc.mediaDevices;
  console.log('✅ WebRTC模块导入成功');
} catch (error) {
  console.warn('⚠️ react-native-webrtc不可用，使用模拟模式:', error.message);
  // 创建模拟对象
  RTCPeerConnection = class MockRTCPeerConnection {
    constructor(config) {
      console.log('📱 模拟PeerConnection创建:', config);
    }
  };
  RTCView = () => {};
  mediaDevices = {
    getUserMedia: async () => {
      console.log('📱 模拟getUserMedia调用');
      return { getAudioTracks: () => [] };
    }
  };
}

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isInitiator = false;
    this.roomId = null;
    
    // WebRTC配置
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }

  // 初始化WebRTC连接
  async initializeCall(roomId, isInitiator = false) {
    try {
      this.roomId = roomId;
      this.isInitiator = isInitiator;
      
      console.log('初始化WebRTC连接:', { roomId, isInitiator });
      
      // 创建PeerConnection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // 设置事件监听器
      this.setupPeerConnectionListeners();
      
      // 获取本地媒体流
      await this.getLocalStream();
      
      return true;
    } catch (error) {
      console.error('初始化WebRTC连接失败:', error);
      return false;
    }
  }

  // 获取本地媒体流
  async getLocalStream() {
    try {
      const constraints = {
        audio: true,
        video: false, // 只使用音频
      };
      
      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('获取本地音频流成功');
      
      // 将本地流添加到PeerConnection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      return this.localStream;
    } catch (error) {
      console.error('获取本地媒体流失败:', error);
      throw error;
    }
  }

  // 设置PeerConnection事件监听器
  setupPeerConnectionListeners() {
    // 接收远程流
    this.peerConnection.ontrack = (event) => {
      console.log('收到远程音频流');
      this.remoteStream = event.streams[0];
    };

    // ICE候选
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('发送ICE候选');
        // 通过WebSocket发送ICE候选
        this.sendSignalingMessage('ice-candidate', {
          candidate: event.candidate,
          roomId: this.roomId,
        });
      }
    };

    // 连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      console.log('连接状态:', this.peerConnection.connectionState);
    };

    // ICE连接状态变化
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE连接状态:', this.peerConnection.iceConnectionState);
    };
  }

  // 创建Offer（发起方）
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('创建Offer成功');
      
      // 通过WebSocket发送Offer
      this.sendSignalingMessage('offer', {
        offer: offer,
        roomId: this.roomId,
      });
      
      return offer;
    } catch (error) {
      console.error('创建Offer失败:', error);
      throw error;
    }
  }

  // 创建Answer（接收方）
  async createAnswer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('创建Answer成功');
      
      // 通过WebSocket发送Answer
      this.sendSignalingMessage('answer', {
        answer: answer,
        roomId: this.roomId,
      });
      
      return answer;
    } catch (error) {
      console.error('创建Answer失败:', error);
      throw error;
    }
  }

  // 处理收到的Answer
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
      console.log('处理Answer成功');
    } catch (error) {
      console.error('处理Answer失败:', error);
      throw error;
    }
  }

  // 处理收到的ICE候选
  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
      console.log('添加ICE候选成功');
    } catch (error) {
      console.error('添加ICE候选失败:', error);
      throw error;
    }
  }

  // 发送信令消息
  sendSignalingMessage(type, data) {
    // 这里需要集成到现有的socketService
    console.log('发送信令消息:', type, data);
    // TODO: 集成到socketService
  }

  // 静音/取消静音
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('音频轨道状态:', audioTrack.enabled ? '开启' : '静音');
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  // 结束通话
  async endCall() {
    try {
      console.log('结束WebRTC通话');
      
      // 停止本地流
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
        this.localStream = null;
      }
      
      // 关闭PeerConnection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      this.remoteStream = null;
      this.roomId = null;
      this.isInitiator = false;
      
      console.log('WebRTC通话已结束');
    } catch (error) {
      console.error('结束通话失败:', error);
    }
  }

  // 获取本地流
  getLocalStream() {
    return this.localStream;
  }

  // 获取远程流
  getRemoteStream() {
    return this.remoteStream;
  }

  // 检查是否已连接
  isConnected() {
    return this.peerConnection && 
           this.peerConnection.connectionState === 'connected';
  }
}

// 创建单例实例
const webrtcService = new WebRTCService();

export default webrtcService;
