import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { BottleService } from '../services/bottleService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ThrowBottleScreen({ navigation }: any) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('获取当前用户失败:', error);
    }
  };

  const handleThrowBottle = async () => {
    if (!content.trim()) {
      if (Platform.OS === 'web') {
        alert('请输入瓶子内容');
      } else {
        Alert.alert('提示', '请输入瓶子内容');
      }
      return;
    }

    if (content.length < 10) {
      if (Platform.OS === 'web') {
        alert('瓶子内容至少需要10个字符');
      } else {
        Alert.alert('提示', '瓶子内容至少需要10个字符');
      }
      return;
    }

    setIsLoading(true);

    try {
      // 获取当前位置
      let location;
      if (Platform.OS === 'web') {
        // 在web环境中使用模拟位置
        location = {
          coords: {
            latitude: 39.9042 + (Math.random() - 0.5) * 0.01,
            longitude: 116.4074 + (Math.random() - 0.5) * 0.01,
          }
        };
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('权限被拒绝', '需要位置权限来扔瓶子');
          setIsLoading(false);
          return;
        }
        location = await Location.getCurrentPositionAsync({});
      }

      // 调用后端API保存瓶子
      const result = await BottleService.throwBottle(
        content.trim(),
        currentUser?._id || 'user_' + Date.now(), // 当前用户ID
        currentUser?.username || '用户' + Math.floor(Math.random() * 1000), // 当前用户名
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      );

      console.log('瓶子保存成功:', result);

      if (Platform.OS === 'web') {
        alert('瓶子已经扔到海里了！希望有人能捡到它。');
        setContent('');
        if (navigation && navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else if (navigation && navigation.navigate) {
          navigation.navigate('Sea');
        }
      } else {
        Alert.alert(
          '成功！',
          '瓶子已经扔到海里了！希望有人能捡到它。',
          [
            {
              text: '确定',
              onPress: () => {
                setContent('');
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Sea');
                }
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('扔瓶子失败:', error);
      if (Platform.OS === 'web') {
        alert('扔瓶子失败，请重试');
      } else {
        Alert.alert('错误', '扔瓶子失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>📝 写一个瓶子</Text>
          <Text style={styles.subtitle}>写下你想说的话，让它在海上漂流</Text>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>瓶子内容</Text>
            <TextInput
              style={styles.textInput}
              placeholder="在这里写下你想说的话..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {content.length}/500
            </Text>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 小贴士</Text>
            <Text style={styles.tipText}>• 可以分享你的心情、故事或想法</Text>
            <Text style={styles.tipText}>• 保持友善和积极的态度</Text>
            <Text style={styles.tipText}>• 不要包含个人信息</Text>
            <Text style={styles.tipText}>• 瓶子会随海流漂流到世界各地</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.throwButton,
              (!content.trim() || content.length < 10 || isLoading) && styles.disabledButton
            ]}
            onPress={handleThrowBottle}
            disabled={!content.trim() || content.length < 10 || isLoading}
          >
            <Ionicons 
              name={isLoading ? "hourglass-outline" : "send"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.buttonText}>
              {isLoading ? '扔出中...' : '扔出瓶子'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  tipsContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
  buttonContainer: {
    padding: 20,
  },
  throwButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
