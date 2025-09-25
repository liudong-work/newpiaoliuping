import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// 导入页面组件
import HomeScreen from './src/screens/HomeScreen';
import MessageScreen from './src/screens/MessageScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ThrowBottleScreen from './src/screens/ThrowBottleScreen';
import PickBottleScreen from './src/screens/PickBottleScreen';

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

// 主导航
function MainNavigator() {
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

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Sea" component={SeaStack} options={{ title: '海' }} />
      <Tab.Screen name="Message" component={MessageScreen} options={{ title: '消息' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}