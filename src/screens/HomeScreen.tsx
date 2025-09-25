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

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      // 在web环境中使用模拟位置
      if (Platform.OS === 'web') {
        setLocation({
          latitude: 39.9042 + (Math.random() - 0.5) * 0.01,
          longitude: 116.4074 + (Math.random() - 0.5) * 0.01,
        });
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限被拒绝', '需要位置权限来使用漂流瓶功能');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('获取位置失败:', error);
      // 如果获取位置失败，使用默认位置
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
          onPress={searchNearbyBottles}
          disabled={isLoading}
        >
          <Ionicons name="search" size={24} color="white" />
          <Text style={styles.buttonText}>{isLoading ? '搜索中...' : '捡瓶子'}</Text>
        </TouchableOpacity>
      </View>

      {nearbyBottles.length > 0 && (
        <View style={styles.bottlesContainer}>
          <Text style={styles.sectionTitle}>附近的瓶子</Text>
          {nearbyBottles.map((bottle) => (
            <TouchableOpacity 
              key={bottle._id}
              style={styles.bottleCard}
              onPress={() => navigation.navigate('PickBottle', { bottle })}
            >
              <View style={styles.bottleHeader}>
                <Text style={styles.senderName}>{bottle.senderName}</Text>
                <Text style={styles.time}>
                  {new Date(bottle.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.bottleContent} numberOfLines={3}>
                {bottle.content}
              </Text>
              <View style={styles.bottleFooter}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.locationText}>附近</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
