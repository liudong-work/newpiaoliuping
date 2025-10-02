import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import permissionService from './permissionService';

// 动态导入WebRTC模块，处理不同平台支持情况
let RTCPeerConnection, RTCView, mediaDevices;

// 检查是否在Web环境
const isWeb = typeof window !== 'undefined' && window.RTCPeerConnection;

if (isWeb) {
  // Web环境使用原生WebRTC API
  RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  mediaDevices = navigator.mediaDevices;
  RTCView = () => {};
  console.log('✅ Web环境WebRTC API可用');
} else {
  // React Native环境
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCView = webrtc.RTCView;
    mediaDevices = webrtc.mediaDevices;
    console.log('✅ React Native WebRTC模块导入成功');
  } catch (error) {
    console.warn('⚠️ react-native-webrtc不可用，使用模拟模式:', error.message);
    // 创建模拟对象
    RTCPeerConnection = class MockRTCPeerConnection {
      constructor(config) {
        console.log('📱 模拟PeerConnection创建:', config);
        this.connectionState = 'new';
        this.iceConnectionState = 'new';
      }
      
      async createOffer() {
        console.log('📱 模拟createOffer');
        return { type: 'offer', sdp: 'mock-offer' };
      }
      
      async createAnswer() {
        console.log('📱 模拟createAnswer');
        return { type: 'answer', sdp: 'mock-answer' };
      }
      
      async setLocalDescription(desc) {
        console.log('📱 模拟setLocalDescription:', desc);
      }
      
      async setRemoteDescription(desc) {
        console.log('📱 模拟setRemoteDescription:', desc);
      }
      
      addTrack(track, stream) {
        console.log('📱 模拟addTrack');
      }
      
      addIceCandidate(candidate) {
        console.log('📱 模拟addIceCandidate');
      }
      
      close() {
        console.log('📱 模拟close');
      }
      
      get ontrack() { return null; }
      set ontrack(fn) { console.log('📱 模拟ontrack设置'); }
      
      get onicecandidate() { return null; }
      set onicecandidate(fn) { console.log('📱 模拟onicecandidate设置'); }
      
      get onconnectionstatechange() { return null; }
      set onconnectionstatechange(fn) { console.log('📱 模拟onconnectionstatechange设置'); }
      
      get oniceconnectionstatechange() { return null; }
      set oniceconnectionstatechange(fn) { console.log('📱 模拟oniceconnectionstatechange设置'); }
    };
    
    RTCView = () => {};
    mediaDevices = {
      getUserMedia: async () => {
        console.log('📱 模拟getUserMedia调用');
        return { 
          getAudioTracks: () => [
            {
              enabled: true,
              stop: () => console.log('📱 模拟track stop')
            }
          ],
          getTracks: () => []
        };
      }
    };
  }
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
      
      // 如果是发起方，创建Offer
      if (isInitiator) {
        console.log('🔔 作为发起方，创建Offer');
        await this.createOffer();
      }
      
      return true;
    } catch (error) {
      console.error('初始化WebRTC连接失败:', error);
      return false;
    }
  }

  // 获取本地媒体流
  async getLocalStream() {
    try {
      // 首先请求权限
      const hasPermission = await permissionService.requestAudioPermission();
      if (!hasPermission) {
        throw new Error('音频权限被拒绝');
      }

      // 设置音频模式（移动端）
      await permissionService.setAudioMode();

      if (isWeb) {
        // Web环境使用标准WebRTC
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        };
        
        console.log('🔔 Web环境：请求麦克风权限...');
        this.localStream = await mediaDevices.getUserMedia(constraints);
        console.log('✅ Web环境：获取本地音频流成功');
        
        // 将本地流添加到PeerConnection
        if (this.peerConnection && this.localStream) {
          this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
          });
          console.log('✅ Web环境：本地音频流已添加到PeerConnection');
        }
      } else {
        // Expo Go环境使用expo-av录音
        console.log('🔔 Expo Go环境：使用expo-av录音');
        
        // 创建录音对象
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        this.recording = recording;
        console.log('✅ Expo Go环境：录音对象创建成功');
        
        // 模拟本地流对象
        this.localStream = {
          getAudioTracks: () => [{
            enabled: true,
            kind: 'audio',
            stop: () => {
              if (this.recording) {
                this.recording.stopAndUnloadAsync();
                this.recording = null;
              }
            }
          }],
          getTracks: () => this.localStream.getAudioTracks(),
          active: true
        };
        
        console.log('✅ Expo Go环境：模拟本地流创建成功');
      }
      
      return this.localStream;
    } catch (error) {
      console.error('❌ 获取本地媒体流失败:', error);
      throw error;
    }
  }

  // 设置PeerConnection事件监听器
  setupPeerConnectionListeners() {
    if (!this.peerConnection) {
      console.warn('❌ PeerConnection未初始化，无法设置监听器');
      return;
    }

    // 接收远程流
    this.peerConnection.ontrack = (event) => {
      console.log('🔔 收到远程音频流');
      this.remoteStream = event.streams[0];
      
      // 在Web环境中播放远程音频
      if (isWeb && this.remoteStream) {
        console.log('🔔 Web环境：设置远程音频播放');
        const audio = new Audio();
        audio.srcObject = this.remoteStream;
        audio.autoplay = true;
        audio.volume = 1.0;
        audio.play().then(() => {
          console.log('✅ Web环境：远程音频播放成功');
        }).catch(error => {
          console.warn('❌ Web环境：播放远程音频失败:', error);
        });
      }
      
      // 在Expo Go环境中，使用expo-av播放远程音频
      if (!isWeb && this.remoteStream) {
        console.log('🔔 Expo Go环境：收到远程音频流');
        this.playRemoteAudio();
      }
    };

    // ICE候选
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🔔 发送ICE候选');
        // 通过WebSocket发送ICE候选
        this.sendSignalingMessage('ice-candidate', {
          candidate: event.candidate,
          roomId: this.roomId,
        });
      }
    };

    // 连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔔 连接状态:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'connected') {
        console.log('✅ WebRTC连接已建立');
        // 通知通话服务连接已建立
        this.notifyConnectionEstablished();
      } else if (this.peerConnection.connectionState === 'failed') {
        console.error('❌ WebRTC连接失败');
        this.notifyConnectionFailed();
      } else if (this.peerConnection.connectionState === 'disconnected') {
        console.log('🔔 WebRTC连接已断开');
        this.notifyConnectionDisconnected();
      }
    };

    // ICE连接状态变化
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🔔 ICE连接状态:', this.peerConnection.iceConnectionState);
      if (this.peerConnection.iceConnectionState === 'connected') {
        console.log('✅ ICE连接已建立');
      } else if (this.peerConnection.iceConnectionState === 'failed') {
        console.error('❌ ICE连接失败');
      } else if (this.peerConnection.iceConnectionState === 'disconnected') {
        console.log('🔔 ICE连接已断开');
      }
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
    // 集成到现有的socketService
    console.log('发送信令消息:', type, data);
    
    // 动态导入socketService避免循环依赖
    import('./socketService').then(({ socketService }) => {
      if (socketService.socket && socketService.isConnected) {
        socketService.socket.emit('webrtc-signaling', {
          type,
          data,
          roomId: this.roomId
        });
        console.log('✅ 信令消息已发送:', type);
      } else {
        console.warn('❌ WebSocket未连接，无法发送信令消息');
      }
    }).catch(error => {
      console.error('❌ 导入socketService失败:', error);
    });
  }

  // 静音/取消静音
  toggleMute() {
    if (this.localStream) {
      if (isWeb) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          console.log('🔔 Web环境音频轨道状态:', audioTrack.enabled ? '开启' : '静音');
          return !audioTrack.enabled;
        }
      } else {
        // Expo Go环境
        if (this.recording) {
          // 在Expo Go中，我们无法直接控制录音的静音状态
          // 这里我们只是记录状态变化
          console.log('🔔 Expo Go环境：模拟静音切换');
          return true; // 返回静音状态
        }
      }
    }
    console.warn('❌ 无法切换静音：本地流不存在');
    return false;
  }

  // 结束通话
  async endCall() {
    try {
      console.log('🔔 结束WebRTC通话');
      
      // 停止本地流
      if (this.localStream) {
        if (isWeb) {
          this.localStream.getTracks().forEach(track => {
            track.stop();
          });
        } else {
          // Expo Go环境停止录音
          if (this.recording) {
            await this.recording.stopAndUnloadAsync();
            this.recording = null;
          }
        }
        this.localStream = null;
        console.log('✅ 本地流已停止');
      }
      
      // 停止远程音频
      if (this.remoteSound) {
        await this.remoteSound.unloadAsync();
        this.remoteSound = null;
        console.log('✅ 远程音频已停止');
      }
      
      // 关闭PeerConnection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
        console.log('✅ PeerConnection已关闭');
      }
      
      this.remoteStream = null;
      this.roomId = null;
      this.isInitiator = false;
      
      console.log('✅ WebRTC通话已结束');
    } catch (error) {
      console.error('❌ 结束通话失败:', error);
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

  // 通知连接已建立
  notifyConnectionEstablished() {
    console.log('🔔 WebRTC连接已建立，通知通话服务');
    // 这里可以触发事件或回调，通知通话服务连接已建立
  }

  // 通知连接失败
  notifyConnectionFailed() {
    console.log('🔔 WebRTC连接失败，通知通话服务');
    // 这里可以触发事件或回调，通知通话服务连接失败
  }

  // 通知连接断开
  notifyConnectionDisconnected() {
    console.log('🔔 WebRTC连接断开，通知通话服务');
    // 这里可以触发事件或回调，通知通话服务连接断开
  }

  // 播放远程音频（Expo Go环境）
  async playRemoteAudio() {
    try {
      console.log('🔔 Expo Go环境：开始播放远程音频');
      
      // 在Expo Go中，我们无法直接播放WebRTC音频流
      // 这里我们使用一个简单的提示音来模拟远程音频
      console.log('🔔 模拟远程音频播放（Expo Go限制）');
      
      // 设置音频模式确保能播放
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('✅ Expo Go环境：远程音频播放设置完成');
    } catch (error) {
      console.warn('⚠️ Expo Go环境：播放远程音频失败:', error);
    }
  }

  // 处理WebRTC信令消息
  async handleSignalingMessage(type, data) {
    try {
      console.log('🔔 处理WebRTC信令消息:', type);
      
      switch (type) {
        case 'offer':
          if (!this.isInitiator) {
            console.log('🔔 收到Offer，创建Answer');
            await this.createAnswer(data.offer);
          } else {
            console.log('🔔 作为发起方收到Offer，忽略');
          }
          break;
          
        case 'answer':
          if (this.isInitiator) {
            console.log('🔔 收到Answer，设置远程描述');
            await this.handleAnswer(data.answer);
          } else {
            console.log('🔔 作为接收方收到Answer，忽略');
          }
          break;
          
        case 'ice-candidate':
          console.log('🔔 收到ICE候选');
          if (this.peerConnection && this.peerConnection.remoteDescription) {
            await this.handleIceCandidate(data.candidate);
          } else {
            console.log('🔔 远程描述未设置，缓存ICE候选');
            // 可以在这里缓存ICE候选，等远程描述设置后再添加
          }
          break;
          
        default:
          console.warn('未知的信令消息类型:', type);
      }
    } catch (error) {
      console.error('处理信令消息失败:', error);
    }
  }
}

// 创建单例实例
const webrtcService = new WebRTCService();

export default webrtcService;
