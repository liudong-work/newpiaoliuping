import React, { useState, useEffect } from 'react';
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

export default function SimpleVoiceTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  useEffect(() => {
    // 请求音频权限
    requestAudioPermission();
    
    return () => {
      // 清理资源
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const requestAudioPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限错误', '需要麦克风权限才能进行语音测试');
        return false;
      }
      return true;
    } catch (error) {
      console.error('请求音频权限失败:', error);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) return;

      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('开始录音...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('开始录音失败:', error);
      Alert.alert('错误', '开始录音失败');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      console.log('停止录音...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecordingUri(uri);
      setIsRecording(false);
      setRecording(null);
      
      console.log('录音完成，文件路径:', uri);
      Alert.alert('录音完成', `录音已保存到: ${uri}`);
    } catch (error) {
      console.error('停止录音失败:', error);
      Alert.alert('错误', '停止录音失败');
    }
  };

  const playRecording = async () => {
    try {
      if (!recordingUri) {
        Alert.alert('错误', '没有录音文件');
        return;
      }

      console.log('播放录音...');
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);

      // 播放完成回调
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('播放录音失败:', error);
      Alert.alert('错误', '播放录音失败');
    }
  };

  const stopPlaying = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('停止播放失败:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>语音通话测试</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          状态: {isRecording ? '录音中...' : isPlaying ? '播放中...' : '就绪'}
        </Text>
        {recordingUri && (
          <Text style={styles.fileText}>
            录音文件: {recordingUri.split('/').pop()}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.button, styles.recordButton]}
            onPress={startRecording}
          >
            <Ionicons name="mic" size={24} color="white" />
            <Text style={styles.buttonText}>开始录音</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopRecording}
          >
            <Ionicons name="stop" size={24} color="white" />
            <Text style={styles.buttonText}>停止录音</Text>
          </TouchableOpacity>
        )}

        {recordingUri && (
          <>
            {!isPlaying ? (
              <TouchableOpacity
                style={[styles.button, styles.playButton]}
                onPress={playRecording}
              >
                <Ionicons name="play" size={24} color="white" />
                <Text style={styles.buttonText}>播放录音</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={stopPlaying}
              >
                <Ionicons name="stop" size={24} color="white" />
                <Text style={styles.buttonText}>停止播放</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>测试说明:</Text>
        <Text style={styles.infoText}>1. 点击"开始录音"测试麦克风</Text>
        <Text style={styles.infoText}>2. 说话几秒钟后点击"停止录音"</Text>
        <Text style={styles.infoText}>3. 点击"播放录音"测试扬声器</Text>
        <Text style={styles.infoText}>4. 确认能听到自己的声音</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  fileText: {
    fontSize: 14,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  recordButton: {
    backgroundColor: '#FF6B6B',
  },
  playButton: {
    backgroundColor: '#4ECDC4',
  },
  stopButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});
