import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';

export default function LoginScreen({ navigation, onLogin }: any) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      if (Platform.OS === 'web') {
        alert('请输入用户名');
      } else {
        Alert.alert('提示', '请输入用户名');
      }
      return;
    }

    setIsLoading(true);
    try {
      // 检查用户名是否已存在
      const result = await ApiService.user.checkUsername(username.trim());
      
      if (result.exists) {
        if (Platform.OS === 'web') {
          alert('用户名已存在，请选择其他用户名');
        } else {
          Alert.alert('提示', '用户名已存在，请选择其他用户名');
        }
        return;
      }

      // 创建新用户
      const userResult = await ApiService.user.create({
        username: username.trim(),
        avatar: username.trim().charAt(0).toUpperCase(),
        createdAt: new Date().toISOString(),
      });

      console.log('用户创建成功:', userResult);

      // 登录成功，调用onLogin回调
      onLogin(userResult.user);
      
    } catch (error) {
      console.error('登录失败:', error);
      if (Platform.OS === 'web') {
        alert('登录失败，请重试');
      } else {
        Alert.alert('错误', '登录失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="water" size={60} color="#4A90E2" />
        </View>
        <Text style={styles.title}>漂流瓶</Text>
        <Text style={styles.subtitle}>连接世界，传递温暖</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="请输入用户名"
            value={username}
            onChangeText={setUsername}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.loginButtonText}>创建中...</Text>
          ) : (
            <Text style={styles.loginButtonText}>开始漂流</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.tipText}>
          用户名将作为你的身份标识，请选择一个独特的名字
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#a0c8ff',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
