import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { BottleService } from '../services/bottleService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Bottle {
  _id: string;
  content: string;
  senderName: string;
  senderId: string;
  createdAt: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isPicked: boolean;
}

export default function HomeScreen({ navigation }: any) {
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [nearbyBottles, setNearbyBottles] = useState<Bottle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
    getCurrentLocation();
  }, []);

  const loadCurrentUser = async () => {
    try {
      // Web端兼容性处理
      if (Platform.OS === 'web') {
        const userData = localStorage.getItem('user');
        if (userData) {
          setCurrentUser(JSON.parse(userData));
        }
      } else {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setCurrentUser(JSON.parse(userData));
        }
      }
    } catch (error) {
      console.error('获取当前用户失败:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('🚀 跳过位置权限检查，直接使用测试位置');
      
      // 所有平台都直接使用模拟位置，无需权限
      setLocation({
        latitude: 39.9042 + (Math.random() - 0.5) * 0.01,  // 北京附近的随机位置
        longitude: 116.4074 + (Math.random() - 0.5) * 0.01,
      });
      
      console.log('✅ 测试位置已设置:', {
        latitude: 39.9042 + (Math.random() - 0.5) * 0.01,
        longitude: 116.4074 + (Math.random() - 0.5) * 0.01,
      });
      
    } catch (error) {
      console.error('设置位置失败:', error);
      // 即使出错也设置一个默认位置
      setLocation({
        latitude: 39.9042,
        longitude: 116.4074,
      });
    }
  };

  const searchNearbyBottles = async () => {
    if (!location) {
      if (Platform.OS === 'web') {
        alert('请先获取位置信息');
      } else {
        Alert.alert('提示', '请先获取位置信息');
      }
      return;
    }

    setIsLoading(true);
    try {
      // 调用后端API获取附近的瓶子
      const bottles = await BottleService.searchNearbyBottles(location.latitude, location.longitude);
      setNearbyBottles(bottles);

      if (bottles.length === 0) {
        if (Platform.OS === 'web') {
          alert('附近暂时没有瓶子，试试扔一个瓶子吧！');
        } else {
          Alert.alert('提示', '附近暂时没有瓶子，试试扔一个瓶子吧！');
        }
      } else {
        if (Platform.OS === 'web') {
          alert(`附近找到 ${bottles.length} 个瓶子`);
        } else {
          Alert.alert('找到瓶子', `附近找到 ${bottles.length} 个瓶子`);
        }
      }
    } catch (error) {
      console.error('搜索瓶子失败:', error);
      if (Platform.OS === 'web') {
        alert('搜索瓶子失败，请检查网络连接');
      } else {
        Alert.alert('错误', '搜索瓶子失败，请检查网络连接');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌊 漂流瓶海</Text>
        <Text style={styles.subtitle}>在这里寻找来自远方的消息</Text>
        {currentUser && (
          <Text style={styles.welcomeText}>欢迎，{currentUser.username}！</Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.throwButton]}
          onPress={() => navigation.navigate('ThrowBottle')}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.buttonText}>扔瓶子</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.pickButton]}
          onPress={() => navigation.navigate('PickBottle')}
        >
          <Ionicons name="search" size={24} color="white" />
          <Text style={styles.buttonText}>捡瓶子</Text>
        </TouchableOpacity>
      </View>


      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            当前位置: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  throwButton: {
    backgroundColor: '#FF6B6B',
  },
  pickButton: {
    backgroundColor: '#4ECDC4',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottlesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  bottleCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  bottleContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 10,
  },
  bottleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  locationInfo: {
    padding: 20,
    alignItems: 'center',
  },
});
