import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';

export default function RegisterScreen({ navigation, onRegister }: any) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const { username, email, password, confirmPassword } = formData;

    if (!username.trim()) {
      Alert.alert('提示', '请输入用户名');
      return false;
    }

    if (username.length < 3) {
      Alert.alert('提示', '用户名至少需要3个字符');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('提示', '请输入邮箱');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('提示', '请输入有效的邮箱地址');
      return false;
    }

    if (!password) {
      Alert.alert('提示', '请输入密码');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('提示', '密码至少需要6个字符');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    console.log('🔔 注册按钮被点击');
    console.log('🔔 表单数据:', formData);
    
    if (!validateForm()) {
      console.log('❌ 表单验证失败');
      return;
    }

    console.log('✅ 表单验证通过，开始注册');
    setIsLoading(true);
    try {
      // 检查用户名是否已存在
      console.log('🔍 检查用户名是否存在:', formData.username.trim());
      const usernameCheck = await ApiService.user.checkUsername(formData.username.trim());
      console.log('🔍 用户名检查结果:', usernameCheck);
      
      if (usernameCheck.exists) {
        console.log('❌ 用户名已存在');
        Alert.alert('提示', '用户名已存在，请选择其他用户名');
        return;
      }

      // 创建新用户
      console.log('📝 开始创建用户');
      const userResult = await ApiService.user.create({
        username: formData.username.trim(),
        email: formData.email.trim(),
        avatar: formData.username.trim().charAt(0).toUpperCase(),
        createdAt: new Date().toISOString(),
      });

      console.log('✅ 用户注册成功:', userResult);

      // 注册成功，调用onRegister回调
      console.log('🔔 调用onRegister回调');
      onRegister(userResult.user);
      
    } catch (error) {
      console.error('注册失败:', error);
      Alert.alert('错误', '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    if (navigation) {
      navigation.navigate('Login');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="water" size={60} color="#4A90E2" />
          </View>
          <Text style={styles.title}>漂流瓶</Text>
          <Text style={styles.subtitle}>创建账户，开始漂流</Text>
        </View>

        <View style={styles.formContainer}>
          {/* 用户名输入 */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="请输入用户名"
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* 邮箱输入 */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="请输入邮箱"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* 密码输入 */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="请输入密码"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* 确认密码输入 */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="请确认密码"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* 注册按钮 */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.registerButtonText}>注册中...</Text>
            ) : (
              <Text style={styles.registerButtonText}>立即注册</Text>
            )}
          </TouchableOpacity>

          {/* 登录链接 */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>已有账户？</Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={styles.loginLink}>立即登录</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tipText}>
            注册即表示您同意我们的服务条款和隐私政策
          </Text>
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
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
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
    paddingBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
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
  eyeIcon: {
    padding: 5,
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#a0c8ff',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginLinkText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  tipText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
