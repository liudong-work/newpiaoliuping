import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from './src/services/socketService';

// 导入页面组件
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import MessageScreen from './src/screens/MessageScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ThrowBottleScreen from './src/screens/ThrowBottleScreen';
import PickBottleScreen from './src/screens/PickBottleScreen';
import ConversationDetailScreen from './src/screens/ConversationDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 海的页面栈（包含扔瓶子和捡瓶子）
function SeaStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SeaHome" 
        component={HomeScreen} 
        options={{ title: '海' }}
      />
      <Stack.Screen 
        name="ThrowBottle" 
        component={ThrowBottleScreen} 
        options={{ title: '扔瓶子' }}
      />
      <Stack.Screen 
        name="PickBottle" 
        component={PickBottleScreen} 
        options={{ title: '捡瓶子' }}
      />
    </Stack.Navigator>
  );
}

// 消息页面栈（包含消息列表和对话详情）
function MessageStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MessageList" 
        component={MessageScreen} 
        options={{ title: '消息' }}
      />
      <Stack.Screen 
        name="ConversationDetail" 
        component={ConversationDetailScreen} 
        options={{ title: '对话详情' }}
      />
    </Stack.Navigator>
  );
}

// 主导航
function MainNavigator({ user, onLogout }: { user: any; onLogout: () => Promise<void> }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Sea') {
            iconName = focused ? 'water' : 'water-outline';
          } else if (route.name === 'Message') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Sea" component={SeaStack} options={{ title: '海' }} />
      <Tab.Screen name="Message" component={MessageStack} options={{ title: '消息' }} />
      <Tab.Screen 
        name="Profile" 
        options={{ title: '我的' }}
      >
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // 检查本地存储的用户数据
      let userData = null;
      
      if (Platform.OS === 'web') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          userData = JSON.parse(storedUser);
        }
      } else {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          userData = JSON.parse(storedUser);
        }
      }
      
      if (userData) {
        console.log('🔔 发现已保存的用户数据，自动登录:', userData);
        setUser(userData);
        setIsLoggedIn(true);
        
        // 启用WebSocket连接
        socketService.connect(userData._id);
      } else {
        console.log('🔔 未发现用户数据，显示登录界面');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData: any) => {
    setUser(userData);
    setIsLoggedIn(true);
    
    // Web端兼容性处理
    if (Platform.OS === 'web') {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      AsyncStorage.setItem('user', JSON.stringify(userData));
    }
    
    // 启用WebSocket连接
    socketService.connect(userData._id);
  };

  const handleRegister = (userData: any) => {
    setUser(userData);
    setIsLoggedIn(true);
    
    // Web端兼容性处理
    if (Platform.OS === 'web') {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      AsyncStorage.setItem('user', JSON.stringify(userData));
    }
    
    // 启用WebSocket连接
    socketService.connect(userData._id);
  };

  const handleLogout = async () => {
    try {
      console.log('🔔 App.tsx handleLogout 开始执行');
      
      // 立即设置状态，确保UI立即更新
      console.log('🔔 设置用户状态为null');
      setUser(null);
      setIsLoggedIn(false);
      
      // 清除本地存储的用户数据
      try {
        if (Platform.OS === 'web') {
          console.log('🔔 Web端清除用户数据');
          localStorage.removeItem('user');
          // 清除其他可能的缓存数据
          localStorage.removeItem('bottles');
          localStorage.removeItem('messages');
        } else {
          console.log('🔔 移动端清除用户数据');
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('bottles');
          await AsyncStorage.removeItem('messages');
        }
        console.log('✅ 用户数据清除成功');
      } catch (storageError) {
        console.error('❌ 清除用户数据失败:', storageError);
        // 即使清除失败，也继续执行退出流程
      }
      
      // 断开WebSocket连接
      try {
        console.log('🔔 断开WebSocket连接');
        socketService.disconnect();
        console.log('✅ WebSocket断开成功');
      } catch (socketError) {
        console.error('❌ WebSocket断开失败:', socketError);
        // 即使WebSocket断开失败，也继续执行退出流程
      }
      
      // 强制重新渲染，确保状态更新生效
      setTimeout(() => {
        console.log('🔔 强制状态更新');
        setUser(null);
        setIsLoggedIn(false);
      }, 100);
      
      console.log('✅ 退出登录完成');
    } catch (error) {
      console.error('❌ 退出登录过程中发生错误:', error);
      // 即使发生错误，也强制设置退出状态
      setUser(null);
      setIsLoggedIn(false);
      
      // 延迟再次设置状态，确保退出
      setTimeout(() => {
        setUser(null);
        setIsLoggedIn(false);
      }, 200);
    }
  };

  if (isLoading) {
    return null; // 可以添加加载页面
  }

  if (!isLoggedIn) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Register">
            {(props) => <RegisterScreen {...props} onRegister={handleRegister} navigation={props.navigation} />}
          </Stack.Screen>
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} navigation={props.navigation} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainNavigator user={user} onLogout={handleLogout} />
    </NavigationContainer>
  );
}