import { Platform, Alert, Linking } from 'react-native';
import { Audio } from 'expo-av';

class PermissionService {
  constructor() {
    this.audioPermissionGranted = false;
  }

  // 请求音频权限
  async requestAudioPermission() {
    try {
      console.log('🔔 请求音频权限...', Platform.OS);
      
      if (Platform.OS === 'web') {
        // Web环境直接返回true，浏览器会处理权限
        this.audioPermissionGranted = true;
        return true;
      }

      // 移动端使用Expo Audio权限
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ 音频权限已授予');
        this.audioPermissionGranted = true;
        return true;
      } else {
        console.warn('❌ 音频权限被拒绝');
        this.audioPermissionGranted = false;
        this.showPermissionDeniedAlert();
        return false;
      }
    } catch (error) {
      console.error('❌ 请求音频权限失败:', error);
      this.audioPermissionGranted = false;
      return false;
    }
  }

  // 检查音频权限状态
  async checkAudioPermission() {
    try {
      if (Platform.OS === 'web') {
        return true;
      }

      const { status } = await Audio.getPermissionsAsync();
      this.audioPermissionGranted = status === 'granted';
      return this.audioPermissionGranted;
    } catch (error) {
      console.error('❌ 检查音频权限失败:', error);
      return false;
    }
  }

  // 显示权限被拒绝的提示
  showPermissionDeniedAlert() {
    Alert.alert(
      '需要麦克风权限',
      '语音通话需要麦克风权限才能正常工作。请在设置中允许访问麦克风。',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '去设置', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        }
      ]
    );
  }

  // 获取权限状态
  isAudioPermissionGranted() {
    return this.audioPermissionGranted;
  }

  // 设置音频模式（移动端优化）
  async setAudioMode() {
    try {
      if (Platform.OS === 'web') {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      
      console.log('✅ 音频模式设置成功');
    } catch (error) {
      console.error('❌ 设置音频模式失败:', error);
    }
  }
}

export default new PermissionService();
