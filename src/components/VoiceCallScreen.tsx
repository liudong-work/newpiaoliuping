import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface VoiceCallScreenProps {
  callerName: string;
  callerId: string;
  isIncoming: boolean;
  isConnected?: boolean;
  onEndCall: () => void;
  onAnswerCall?: () => void;
}

export default function VoiceCallScreen({
  callerName,
  callerId,
  isIncoming,
  isConnected = false,
  onEndCall,
  onAnswerCall,
}: VoiceCallScreenProps) {
  const [callConnected, setCallConnected] = useState(isConnected);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🔔 VoiceCallScreen useEffect 触发:', { isIncoming, callConnected });
    
    if (isIncoming && !callConnected) {
      console.log('🔔 开始播放来电铃声');
      playRingtone();
    } else {
      console.log('🔔 停止来电铃声');
      stopRingtone();
    }
    
    if (callConnected) {
      console.log('🔔 开始通话计时');
      startTimer();
    } else {
      console.log('🔔 停止通话计时');
      stopTimer();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [isIncoming, callConnected]);

  // 监听外部传入的 isConnected 状态变化
  useEffect(() => {
    console.log('🔔 VoiceCallScreen isConnected 状态变化:', isConnected);
    console.log('🔔 当前内部状态 callConnected:', callConnected);
    setCallConnected(isConnected);
  }, [isConnected]);

  const playRingtone = async () => {
    try {
      console.log('🔔 开始播放来电铃声');
      const { sound: ringtone } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { shouldPlay: true, isLooping: true }
      );
      setSound(ringtone);
      console.log('✅ 来电铃声已开始播放');
    } catch (error) {
      console.log('无法播放铃声:', error);
    }
  };

  const stopRingtone = async () => {
    if (sound) {
      console.log('🔔 停止铃声播放');
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        console.log('✅ 铃声已停止');
      } catch (error) {
        console.error('停止铃声失败:', error);
        setSound(null); // 即使失败也要清空状态
      }
    } else {
      console.log('🔔 没有铃声需要停止');
    }
  };

  const startTimer = () => {
    console.log('🔔 开始通话计时器');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setCallDuration(0); // 重置计时器
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => {
        const newDuration = prev + 1;
        console.log('🔔 通话时间更新:', newDuration);
        return newDuration;
      });
    }, 1000);
  };

  const stopTimer = () => {
    console.log('🔔 停止通话计时器');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleAnswerCall = async () => {
    try {
      console.log('🔔 接听通话，停止铃声');
      
      // 先调用父组件的接听方法
      onAnswerCall?.();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('✅ 通话已接听');
    } catch (error) {
      console.error('接听通话失败:', error);
      Alert.alert('错误', '接听通话失败');
    }
  };

  const handleEndCall = async () => {
    try {
      console.log('🔔 结束通话，停止铃声');
      await stopRingtone();
      stopTimer();
      setCallConnected(false);
      onEndCall();
      console.log('✅ 通话已结束，铃声已停止');
    } catch (error) {
      console.error('结束通话失败:', error);
    }
  };

  const handleMuteToggle = async () => {
    try {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      console.log('🔔 静音状态切换:', newMutedState ? '静音' : '开启');
    } catch (error) {
      console.error('切换静音失败:', error);
    }
  };

  const handleSpeakerToggle = async () => {
    try {
      const newSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(newSpeakerState);
      console.log('🔔 扬声器状态切换:', newSpeakerState ? '扬声器' : '听筒');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !newSpeakerState,
      });
    } catch (error) {
      console.error('切换扬声器失败:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {callerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{callerName}</Text>
        <Text style={styles.callStatus}>
          {isIncoming && !callConnected
            ? '来电中...'
            : !isIncoming && !callConnected
            ? '正在呼叫...'
            : callConnected
            ? `通话中 ${formatDuration(callDuration)}`
            : '通话结束'}
        </Text>
        {console.log('🔔 VoiceCallScreen 状态显示:', {
          isIncoming,
          callConnected,
          callDuration,
          isConnected: isConnected
        })}
      </View>

      <View style={styles.controls}>
        {isIncoming && !callConnected ? (
          <View style={styles.incomingControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.declineButton]}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.answerButton]}
              onPress={handleAnswerCall}
            >
              <Ionicons name="call" size={30} color="white" />
            </TouchableOpacity>
          </View>
        ) : !isIncoming && !callConnected ? (
          <View style={styles.callingControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.hangupButton]}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={30} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.muteButton, isMuted && styles.activeButton]}
              onPress={handleMuteToggle}
            >
              <Ionicons
                name={isMuted ? "mic-off" : "mic"}
                size={24}
                color={isMuted ? "#FF6B6B" : "white"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.endButton]}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={30} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.speakerButton, isSpeakerOn && styles.activeButton]}
              onPress={handleSpeakerToggle}
            >
              <Ionicons
                name={isSpeakerOn ? "volume-high" : "volume-low"}
                size={24}
                color={isSpeakerOn ? "#4ECDC4" : "white"}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 16,
    color: '#888',
  },
  controls: {
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  callingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  answerButton: {
    backgroundColor: '#4ECDC4',
  },
  declineButton: {
    backgroundColor: '#FF6B6B',
  },
  hangupButton: {
    backgroundColor: '#FF6B6B',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  endButton: {
    backgroundColor: '#FF6B6B',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  muteButton: {
    backgroundColor: '#555',
  },
  speakerButton: {
    backgroundColor: '#555',
  },
  activeButton: {
    backgroundColor: '#333',
  },
});
