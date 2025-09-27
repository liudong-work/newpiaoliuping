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
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
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
    // 不自动登录，每次启动都显示登录界面
    setIsLoading(false);
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

  const handleLogout = async () => {
    try {
      // Web端兼容性处理
      if (Platform.OS === 'web') {
        localStorage.removeItem('user');
      } else {
        await AsyncStorage.removeItem('user');
      }
      setUser(null);
      setIsLoggedIn(false);
      
      // 断开WebSocket连接
      socketService.disconnect();
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  if (isLoading) {
    return null; // 可以添加加载页面
  }

  if (!isLoggedIn) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
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